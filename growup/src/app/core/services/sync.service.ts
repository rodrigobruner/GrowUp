import { Injectable, computed, signal } from '@angular/core';
import { type RealtimeChannel } from '@supabase/supabase-js';
import {
  AccountSettings,
  Completion,
  GrowUpDbService,
  Profile,
  Reward,
  RewardRedemption,
  Settings,
  Task
} from './growup-db.service';
import { AuthService } from './auth.service';

type SyncTable = 'profiles' | 'tasks' | 'rewards' | 'completions' | 'settings' | 'redemptions' | 'accountSettings';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private channel: RealtimeChannel | null = null;
  private pollHandle: number | null = null;
  readonly isSyncing = signal(false);
  readonly lastSyncAt = signal<number | null>(null);
  readonly lastError = signal<string | null>(null);
  readonly refreshTick = signal(0);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  constructor(
    private readonly auth: AuthService,
    private readonly db: GrowUpDbService
  ) {}

  async start(): Promise<void> {
    if (!this.auth.user()) {
      return;
    }
    await this.syncAll();
    this.subscribeRealtime();
    this.startPolling();
  }

  stop(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.stopPolling();
  }

  async syncAll(): Promise<void> {
    if (!this.auth.user()) {
      return;
    }
    if (!navigator.onLine) {
      return;
    }
    this.isSyncing.set(true);
    this.lastError.set(null);
    try {
      await this.pushOutbox();
      await this.pullAll();
      this.lastSyncAt.set(Date.now());
      this.refreshTick.update((value) => value + 1);
    } catch (error) {
      this.lastError.set(this.errorToMessage(error));
    } finally {
      this.isSyncing.set(false);
    }
  }

  async pushOutbox(): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    const supabase = this.auth.getClient();
    const entries = await this.db.getOutbox();
    const ordered = [...entries].sort((a, b) => {
      const priority = (entity: string) =>
        entity === 'profiles'
          ? 0
          : entity === 'tasks'
            ? 1
            : entity === 'rewards'
              ? 2
              : entity === 'redemptions'
                ? 3
                : entity === 'settings'
                  ? 4
                  : 5;
      return priority(a.entity) - priority(b.entity);
    });

    for (const entry of ordered) {
      try {
        if (entry.entity === 'accountSettings') {
          if (entry.action === 'upsert' && entry.payload && this.isAccountSettings(entry.payload)) {
            const payload = {
              ...this.toRemoteAccountSettings(entry.payload, user.id),
              owner_id: user.id
            };
            const { error } = await supabase
              .from('account_settings')
              .upsert(payload, { onConflict: 'owner_id' });
            if (error) {
              throw error;
            }
          }
          if (entry.seq !== undefined) {
            await this.db.removeOutboxEntry(entry.seq);
          }
          continue;
        }

        if (entry.entity === 'profiles') {
          if (entry.action === 'upsert' && entry.payload && this.isProfile(entry.payload)) {
            const payload = {
              ...this.toRemoteProfile(entry.payload, user.id),
              owner_id: user.id
            };
            const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'owner_id,id' });
            if (error) {
              throw error;
            }
          } else if (entry.action === 'delete') {
            const { error } = await supabase
              .from('profiles')
              .delete()
              .eq('id', entry.recordId)
              .eq('owner_id', user.id);
            if (error) {
              throw error;
            }
          }
          if (entry.seq !== undefined) {
            await this.db.removeOutboxEntry(entry.seq);
          }
          continue;
        }

        const table = entry.entity as Exclude<SyncTable, 'accountSettings' | 'profiles'>;
        if (entry.action === 'upsert' && entry.payload) {
          if (table === 'completions') {
            const completion = entry.payload as Completion;
            const task = await this.db.getRecord<Task>('tasks', completion.taskId);
            if (task) {
              const taskPayload = {
                ...this.toRemotePayload('tasks', task, user.id),
                owner_id: user.id
              };
              const { error: taskError } = await supabase
                .from('tasks')
                .upsert(taskPayload, { onConflict: 'owner_id,profile_id,id' });
              if (taskError) {
                throw taskError;
              }
            }
          }
          const payload = {
            ...this.toRemotePayload(table, entry.payload as Task | Reward | Completion | Settings | RewardRedemption, user.id),
            owner_id: user.id
          };
          const { error } = await supabase
            .from(table)
            .upsert(payload, {
              onConflict: table === 'redemptions' ? 'id' : 'owner_id,profile_id,id'
            });
          if (error) {
            throw error;
          }
        } else if (entry.action === 'delete') {
          let query = supabase
            .from(table)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', entry.recordId)
            .eq('owner_id', user.id);
          if (entry.profileId) {
            query = query.eq('profile_id', entry.profileId);
          }
          const { error } = await query;
          if (error) {
            throw error;
          }
        }
        if (entry.seq !== undefined) {
          await this.db.removeOutboxEntry(entry.seq);
        }
      } catch (error) {
        this.lastError.set(this.errorToMessage(error));
        throw error;
      }
    }
  }

  async pullAll(): Promise<void> {
    await Promise.all([
      this.pullTable('profiles'),
      this.pullTable('tasks'),
      this.pullTable('rewards'),
      this.pullTable('completions'),
      this.pullTable('settings'),
      this.pullTable('redemptions'),
      this.pullTable('accountSettings')
    ]);
  }

  private async pullTable(table: SyncTable): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    const supabase = this.auth.getClient();
    let didUpdate = false;
    if (table === 'accountSettings') {
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return;
      }
      const local = this.toLocalAccountSettings(data);
      await this.db.saveRemoteRecord('accountSettings', local);
      didUpdate = true;
      if (didUpdate) {
        this.lastSyncAt.set(Date.now());
        this.refreshTick.update((value) => value + 1);
      }
      return;
    }

    const { data, error } = await supabase.from(table).select('*').eq('owner_id', user.id);
    if (error) {
      throw error;
    }
    if (!data) {
      return;
    }

    for (const row of data) {
      if (row.deleted_at) {
        await this.db.deleteRemoteRecord(table, row.id);
        didUpdate = true;
        continue;
      }
      const localRecord = await this.db.getRecord<Task | Reward | Completion | RewardRedemption | Settings | Profile>(
        table,
        row.id
      );
      const localUpdatedAt = localRecord?.updatedAt ?? 0;
      const remoteUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (remoteUpdatedAt >= localUpdatedAt) {
        const local = this.toLocalRecord(table, row);
        await this.db.saveRemoteRecord(table, local);
        didUpdate = true;
      }
    }
    if (didUpdate) {
      this.lastSyncAt.set(Date.now());
      this.refreshTick.update((value) => value + 1);
    }
  }

  private subscribeRealtime(): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    const supabase = this.auth.getClient();
    this.channel = supabase
      .channel('growup-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('profiles')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('tasks')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('rewards')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'completions', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('completions')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('settings')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'redemptions', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('redemptions')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_settings', filter: `owner_id=eq.${user.id}` },
        () => this.pullTable('accountSettings')
      )
      .subscribe();
  }

  private startPolling(): void {
    if (this.pollHandle !== null) {
      return;
    }
    this.pollHandle = window.setInterval(() => {
      void this.syncAll();
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollHandle === null) {
      return;
    }
    window.clearInterval(this.pollHandle);
    this.pollHandle = null;
  }

  private toRemotePayload(
    table: Exclude<SyncTable, 'accountSettings' | 'profiles'>,
    payload: Task | Reward | Completion | RewardRedemption | Settings,
    ownerId: string
  ): Record<string, unknown> {
    if (table === 'tasks') {
      const task = payload as Task;
      return {
        id: task.id,
        owner_id: ownerId,
        profile_id: task.profileId,
        title: task.title,
        points: task.points,
        created_at: new Date(task.createdAt).toISOString(),
        deleted_at: null
      };
    }
    if (table === 'rewards') {
      const reward = payload as Reward;
      return {
        id: reward.id,
        owner_id: ownerId,
        profile_id: reward.profileId,
        title: reward.title,
        cost: reward.cost,
        limit_per_cycle: reward.limitPerCycle ?? 1,
        created_at: new Date(reward.createdAt).toISOString(),
        redeemed_at: reward.redeemedAt ? new Date(reward.redeemedAt).toISOString() : null,
        deleted_at: null
      };
    }
    if (table === 'redemptions') {
      const redemption = payload as RewardRedemption;
      return {
        id: redemption.id,
        owner_id: ownerId,
        profile_id: redemption.profileId,
        reward_id: redemption.rewardId,
        reward_title: redemption.rewardTitle,
        cost: redemption.cost,
        redeemed_at: new Date(redemption.redeemedAt).toISOString(),
        date: redemption.date,
        deleted_at: null
      };
    }
    if (table === 'settings') {
      const settings = payload as Settings;
      return {
        id: settings.id,
        owner_id: ownerId,
        profile_id: settings.profileId,
        cycle_type: settings.cycleType,
        cycle_start_date: settings.cycleStartDate,
        level_up_points: settings.levelUpPoints,
        avatar_id: settings.avatarId ?? '01',
        display_name: settings.displayName ?? null
      };
    }
    const completion = payload as Completion;
    return {
      id: completion.id,
      owner_id: ownerId,
      profile_id: completion.profileId,
      task_id: completion.taskId,
      date: completion.date,
      points: completion.points,
      deleted_at: null
    };
  }

  private toRemoteAccountSettings(settings: AccountSettings, ownerId: string): Record<string, unknown> {
    return {
      owner_id: ownerId,
      language: settings.language
    };
  }

  private toRemoteProfile(profile: Profile, ownerId: string): Record<string, unknown> {
    return {
      id: profile.id,
      owner_id: ownerId,
      display_name: profile.displayName,
      avatar_id: profile.avatarId ?? '01'
    };
  }

  private isAccountSettings(payload: unknown): payload is AccountSettings {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'language' in payload &&
      typeof (payload as { language?: unknown }).language === 'string'
    );
  }

  private isProfile(payload: unknown): payload is Profile {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'displayName' in payload &&
      'avatarId' in payload
    );
  }

  private toLocalRecord(
    table: Exclude<SyncTable, 'accountSettings'>,
    row: any
  ): Task | Reward | Completion | RewardRedemption | Settings | Profile {
    if (table === 'profiles') {
      return {
        id: row.id,
        displayName: row.display_name,
        avatarId: row.avatar_id ?? '01',
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      };
    }
    if (table === 'tasks') {
      return {
        id: row.id,
        profileId: row.profile_id,
        title: row.title,
        points: row.points,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      };
    }
    if (table === 'rewards') {
      return {
        id: row.id,
        profileId: row.profile_id,
        title: row.title,
        cost: row.cost,
        limitPerCycle: row.limit_per_cycle ?? 1,
        createdAt: new Date(row.created_at).getTime(),
        redeemedAt: row.redeemed_at ? new Date(row.redeemed_at).getTime() : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      };
    }
    if (table === 'redemptions') {
      return {
        id: row.id,
        profileId: row.profile_id,
        rewardId: row.reward_id,
        rewardTitle: row.reward_title,
        cost: row.cost,
        redeemedAt: row.redeemed_at ? new Date(row.redeemed_at).getTime() : Date.now(),
        date: row.date,
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      } as RewardRedemption;
    }
    if (table === 'settings') {
      return {
        id: row.id,
        profileId: row.profile_id,
        cycleType: row.cycle_type,
        cycleStartDate: row.cycle_start_date,
        levelUpPoints: row.level_up_points,
        avatarId: row.avatar_id ?? '01',
        displayName: row.display_name ?? '',
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      };
    }
    return {
      id: row.id,
      profileId: row.profile_id,
      taskId: row.task_id,
      date: row.date,
      points: row.points,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
    };
  }

  private toLocalAccountSettings(row: any): AccountSettings {
    return {
      id: 'account',
      language: row.language,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
    };
  }

  private errorToMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
