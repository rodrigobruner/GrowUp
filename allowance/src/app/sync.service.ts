import { Injectable, computed, signal } from '@angular/core';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { AllowanceDbService, Completion, Reward, Settings, Task } from './allowance-db.service';
import { AuthService } from './auth.service';

type SyncTable = 'tasks' | 'rewards' | 'completions' | 'settings';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private channel: RealtimeChannel | null = null;
  readonly isSyncing = signal(false);
  readonly lastSyncAt = signal<number | null>(null);
  readonly lastError = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  constructor(
    private readonly auth: AuthService,
    private readonly db: AllowanceDbService
  ) {}

  async start(): Promise<void> {
    if (!this.auth.user()) {
      return;
    }
    await this.syncAll();
    this.subscribeRealtime();
  }

  stop(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  async syncAll(): Promise<void> {
    if (!this.auth.user()) {
      return;
    }
    this.isSyncing.set(true);
    this.lastError.set(null);
    try {
      await this.pushOutbox();
      await this.pullAll();
      this.lastSyncAt.set(Date.now());
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
        entity === 'tasks' ? 0 : entity === 'rewards' ? 1 : entity === 'settings' ? 2 : 3;
      return priority(a.entity) - priority(b.entity);
    });

    for (const entry of ordered) {
      try {
        if (entry.entity === 'settings') {
          if (entry.action === 'upsert' && entry.payload) {
            const payload = this.toRemoteSettings(entry.payload as Settings, user.id);
            const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
            if (error) {
              throw error;
            }
          } else if (entry.action === 'delete') {
            const { error } = await supabase.from('settings').delete().eq('id', user.id);
            if (error) {
              throw error;
            }
          }
          if (entry.seq !== undefined) {
            await this.db.removeOutboxEntry(entry.seq);
          }
          continue;
        }

        const table = entry.entity;
        if (entry.action === 'upsert' && entry.payload) {
          if (table === 'completions') {
            const completion = entry.payload as Completion;
            const task = await this.db.getRecord<Task>('tasks', completion.taskId);
            if (task) {
              const taskPayload = this.toRemotePayload('tasks', task, user.id);
              const { error: taskError } = await supabase
                .from('tasks')
                .upsert(taskPayload, { onConflict: 'id' });
              if (taskError) {
                throw taskError;
              }
            }
          }
          const payload = this.toRemotePayload(table, entry.payload as Task | Reward | Completion, user.id);
          const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
          if (error) {
            throw error;
          }
        } else if (entry.action === 'delete') {
          const { error } = await supabase
            .from(table)
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
      } catch (error) {
        this.lastError.set(this.errorToMessage(error));
        throw error;
      }
    }
  }

  async pullAll(): Promise<void> {
    await Promise.all([
      this.pullTable('tasks'),
      this.pullTable('rewards'),
      this.pullTable('completions'),
      this.pullTable('settings')
    ]);
  }

  private async pullTable(table: SyncTable): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    const supabase = this.auth.getClient();
    if (table === 'settings') {
      const { data, error } = await supabase.from('settings').select('*').eq('owner_id', user.id).maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return;
      }
      const local = this.toLocalSettings(data);
      await this.db.saveRemoteRecord('settings', local);
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
        continue;
      }
      const localRecord = await this.db.getRecord<Task | Reward | Completion>(table, row.id);
      const localUpdatedAt = localRecord?.updatedAt ?? 0;
      const remoteUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (remoteUpdatedAt >= localUpdatedAt) {
        const local = this.toLocalRecord(table, row);
        await this.db.saveRemoteRecord(table, local);
      }
    }
  }

  private subscribeRealtime(): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    const supabase = this.auth.getClient();
    this.channel = supabase
      .channel('allowance-sync')
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
      .subscribe();
  }

  private toRemotePayload(
    table: Exclude<SyncTable, 'settings'>,
    payload: Task | Reward | Completion,
    ownerId: string
  ): Record<string, unknown> {
    if (table === 'tasks') {
      const task = payload as Task;
      return {
        id: task.id,
        owner_id: ownerId,
        title: task.title,
        points: task.points,
        created_at: new Date(task.createdAt).toISOString()
      };
    }
    if (table === 'rewards') {
      const reward = payload as Reward;
      return {
        id: reward.id,
        owner_id: ownerId,
        title: reward.title,
        cost: reward.cost,
        created_at: new Date(reward.createdAt).toISOString(),
        redeemed_at: reward.redeemedAt ? new Date(reward.redeemedAt).toISOString() : null
      };
    }
    const completion = payload as Completion;
    return {
      id: completion.id,
      owner_id: ownerId,
      task_id: completion.taskId,
      date: completion.date,
      points: completion.points
    };
  }

  private toRemoteSettings(settings: Settings, ownerId: string): Record<string, unknown> {
    return {
      id: ownerId,
      owner_id: ownerId,
      cycle_type: settings.cycleType,
      cycle_start_date: settings.cycleStartDate,
      language: settings.language,
      level_up_points: settings.levelUpPoints,
      avatar_id: settings.avatarId ?? '01'
    };
  }

  private toLocalRecord(table: Exclude<SyncTable, 'settings'>, row: any): Task | Reward | Completion {
    if (table === 'tasks') {
      return {
        id: row.id,
        title: row.title,
        points: row.points,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      };
    }
    if (table === 'rewards') {
      return {
        id: row.id,
        title: row.title,
        cost: row.cost,
        createdAt: new Date(row.created_at).getTime(),
        redeemedAt: row.redeemed_at ? new Date(row.redeemed_at).getTime() : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
      };
    }
    return {
      id: row.id,
      taskId: row.task_id,
      date: row.date,
      points: row.points,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
    };
  }

  private toLocalSettings(row: any): Settings {
    return {
      id: 'global',
      cycleType: row.cycle_type,
      cycleStartDate: row.cycle_start_date,
      language: row.language,
      levelUpPoints: row.level_up_points,
      avatarId: row.avatar_id ?? '01',
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
