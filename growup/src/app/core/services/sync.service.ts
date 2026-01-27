import { Injectable, computed, signal } from '@angular/core';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { GrowUpDbService } from './growup-db.service';
import { SyncMapperService } from './sync-mapper.service';
import { LoggerService } from './logger.service';
import { AccountSettings } from '../models/account-settings';
import { Completion } from '../models/completion';
import { Profile } from '../models/profile';
import { Reward } from '../models/reward';
import { RewardRedemption } from '../models/redemption';
import { Settings } from '../models/settings';
import { Task } from '../models/task';
import { AuthService } from './auth.service';
import { AccountSettingsRow, CompletionRow, ProfileRow, RedemptionRow, RewardRow, SettingsRow, TaskRow } from '../models/supabase';
import { isValidAccountSettingsRow, isValidSyncRow } from '../validators/supabase-validators';
import { environment } from '../../../environments/environment';

type SyncTable = 'profiles' | 'tasks' | 'rewards' | 'completions' | 'settings' | 'redemptions' | 'accountSettings';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private channel: RealtimeChannel | null = null;
  private pollHandle: number | null = null;
  private started = false;
  private syncRequested = false;
  private syncTimer: number | null = null;
  private readonly minSyncIntervalMs = 60000;
  private readonly backoffBaseMs = environment.sync?.backoffBaseMs ?? 5000;
  private readonly maxBackoffMs = environment.sync?.maxBackoffMs ?? 300000;
  private readonly pollIntervalMs = environment.sync?.pollIntervalMs ?? 30000;
  private consecutiveErrors = 0;
  private nextSyncAllowedAt: number | null = null;
  readonly isSyncing = signal(false);
  readonly lastSyncAt = signal<number | null>(null);
  readonly lastError = signal<string | null>(null);
  readonly refreshTick = signal(0);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  constructor(
    private readonly auth: AuthService,
    private readonly db: GrowUpDbService,
    private readonly mapper: SyncMapperService,
    private readonly logger: LoggerService
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      await this.requestSync(true);
      return;
    }
    this.started = true;
    this.subscribeRealtime();
    this.startPolling();
    await this.requestSync(true);
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.stopPolling();
    if (this.syncTimer !== null) {
      window.clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.started = false;
    this.syncRequested = false;
  }

  isStarted(): boolean {
    return this.started;
  }

  // Test-only hook to avoid accessing private state in specs.
  setStartedForTest(value: boolean): void {
    this.started = value;
  }

  notifyLocalChange(): void {
    void this.requestSync(false);
  }

  async requestSync(awaitCompletion: boolean): Promise<void> {
    this.syncRequested = true;
    if (!this.started) {
      return;
    }
    if (awaitCompletion) {
      await this.runSyncGate();
      return;
    }
    void this.runSyncGate();
  }

  private async runSyncGate(): Promise<void> {
    if (!this.syncRequested || !this.started) {
      return;
    }
    if (!this.auth.user()) {
      return;
    }
    if (!navigator.onLine) {
      return;
    }
    if (this.isSyncing()) {
      return;
    }
    const session = await this.auth.getClient().auth.getSession();
    if (!session.data.session) {
      return;
    }
    const now = Date.now();
    if (this.nextSyncAllowedAt && now < this.nextSyncAllowedAt) {
      this.scheduleSync(this.nextSyncAllowedAt - now);
      return;
    }
    const lastSyncAt = this.lastSyncAt();
    if (lastSyncAt) {
      const elapsed = now - lastSyncAt;
      if (elapsed < this.minSyncIntervalMs) {
        this.scheduleSync(this.minSyncIntervalMs - elapsed);
        return;
      }
    }
    this.syncRequested = false;
    await this.syncAll();
    if (this.syncRequested) {
      await this.runSyncGate();
    }
  }

  private scheduleSync(delayMs: number): void {
    if (this.syncTimer !== null) {
      return;
    }
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null;
      void this.runSyncGate();
    }, delayMs);
  }

  async syncAll(): Promise<void> {
    const startedAt = Date.now();
    if (!this.auth.user()) {
      return;
    }
    if (!navigator.onLine) {
      return;
    }
    const session = await this.auth.getClient().auth.getSession();
    if (!session.data.session) {
      return;
    }
    this.isSyncing.set(true);
    this.lastError.set(null);
    try {
      this.logger.info('sync.start');
      const pushCount = await this.pushOutbox();
      const pullCounts = await this.pullAll();
      this.lastSyncAt.set(Date.now());
      this.refreshTick.update((value) => value + 1);
      this.consecutiveErrors = 0;
      this.nextSyncAllowedAt = null;
      this.logger.info('sync.complete', {
        durationMs: Date.now() - startedAt,
        pushCount,
        pullCounts
      });
    } catch (error) {
      this.lastError.set(this.errorToMessage(error));
      this.consecutiveErrors += 1;
      const backoffMs = Math.min(this.maxBackoffMs, this.backoffBaseMs * 2 ** (this.consecutiveErrors - 1));
      this.nextSyncAllowedAt = Date.now() + backoffMs;
      this.syncRequested = true;
      this.scheduleSync(backoffMs);
      this.logger.error('sync.error', { error: this.lastError() });
    } finally {
      this.isSyncing.set(false);
    }
  }

  async pushOutbox(): Promise<number> {
    const user = this.auth.user();
    if (!user) {
      return 0;
    }
    const session = await this.auth.getClient().auth.getSession();
    if (!session.data.session) {
      return 0;
    }
    const supabase = this.auth.getClient();
    const entries = await this.db.getOutbox();
    this.logger.info('sync.outbox', { count: entries.length });
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

    let pushed = 0;
    for (const entry of ordered) {
      try {
        if (entry.entity === 'accountSettings') {
          if (entry.action === 'upsert' && entry.payload && this.isAccountSettings(entry.payload)) {
            const payload = this.mapper.toRemoteAccountSettings(entry.payload, user.id);
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
          pushed += 1;
          continue;
        }

        if (entry.entity === 'profiles') {
          if (entry.action === 'upsert' && entry.payload && this.isProfile(entry.payload)) {
            const payload = this.mapper.toRemoteProfile(entry.payload, user.id);
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
          pushed += 1;
          continue;
        }

        const table = entry.entity as Exclude<SyncTable, 'accountSettings' | 'profiles'>;
        if (entry.action === 'upsert' && entry.payload) {
          if (table === 'completions') {
            const completion = entry.payload as Completion;
            const task = await this.db.getRecord<Task>('tasks', completion.taskId);
            if (task) {
              const taskPayload = this.mapper.toRemotePayload('tasks', task, user.id);
              const { error: taskError } = await supabase
                .from('tasks')
                .upsert(taskPayload, { onConflict: 'owner_id,profile_id,id' });
              if (taskError) {
                throw taskError;
              }
            }
          }
          const payload = this.mapper.toRemotePayload(table, entry.payload as Task | Reward | Completion | Settings | RewardRedemption, user.id);
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
        pushed += 1;
      } catch (error) {
        this.lastError.set(this.errorToMessage(error));
        this.logger.error('sync.push.error', { error: this.lastError(), entity: entry.entity });
        throw error;
      }
    }
    return pushed;
  }

  async pullAll(): Promise<Record<SyncTable, number>> {
    const results = await Promise.all([
      this.pullTable('profiles'),
      this.pullTable('tasks'),
      this.pullTable('rewards'),
      this.pullTable('completions'),
      this.pullTable('settings'),
      this.pullTable('redemptions'),
      this.pullTable('accountSettings')
    ]);
    return {
      profiles: results[0],
      tasks: results[1],
      rewards: results[2],
      completions: results[3],
      settings: results[4],
      redemptions: results[5],
      accountSettings: results[6]
    };
  }

  private async pullTable(table: SyncTable): Promise<number> {
    const user = this.auth.user();
    if (!user) {
      return 0;
    }
    const supabase = this.auth.getClient();
    let didUpdate = false;
    let pulled = 0;
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
        return 0;
      }
      if (!isValidAccountSettingsRow(data)) {
        this.lastError.set('Invalid account_settings payload');
        return 0;
      }
      const local = this.mapper.toLocalAccountSettings(data);
      await this.db.saveRemoteRecord('accountSettings', local);
      didUpdate = true;
      pulled = 1;
      if (didUpdate) {
        this.lastSyncAt.set(Date.now());
        this.refreshTick.update((value) => value + 1);
      }
      return pulled;
    }

    const { data, error } = await supabase.from(table).select('*').eq('owner_id', user.id);
    if (error) {
      throw error;
    }
    if (!data) {
      return 0;
    }

    for (const row of data) {
      if (row.deleted_at) {
        await this.db.deleteRemoteRecord(table, row.id);
        didUpdate = true;
        pulled += 1;
        continue;
      }
      if (!isValidSyncRow(table, row)) {
        this.lastError.set(`Invalid ${table} payload`);
        this.logger.warn('sync.pull.invalid', { table });
        continue;
      }
      const localRecord = await this.db.getRecord<Task | Reward | Completion | RewardRedemption | Settings | Profile>(
        table,
        row.id
      );
      const localUpdatedAt = localRecord?.updatedAt ?? 0;
      const remoteUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (remoteUpdatedAt >= localUpdatedAt) {
        const local = this.mapper.toLocalRecord(table, row);
        await this.db.saveRemoteRecord(table, local);
        didUpdate = true;
        pulled += 1;
      }
    }
    if (didUpdate) {
      this.lastSyncAt.set(Date.now());
      this.refreshTick.update((value) => value + 1);
    }
    return pulled;
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
      void this.requestSync(false);
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollHandle === null) {
      return;
    }
    window.clearInterval(this.pollHandle);
    this.pollHandle = null;
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
