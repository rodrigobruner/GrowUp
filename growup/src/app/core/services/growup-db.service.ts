import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

type StoreName = 'profiles' | 'tasks' | 'rewards' | 'completions' | 'settings' | 'redemptions' | 'accountSettings';

type BaseRecord = {
  id: string;
  title: string;
  profileId: string;
};

export type Task = BaseRecord & {
  points: number;
  createdAt: number;
  updatedAt?: number;
};

export type Reward = BaseRecord & {
  cost: number;
  limitPerCycle: number;
  createdAt: number;
  redeemedAt?: number;
  updatedAt?: number;
};

export type RewardRedemption = {
  id: string;
  profileId: string;
  rewardId: string;
  rewardTitle: string;
  cost: number;
  redeemedAt: number;
  date: string;
  updatedAt?: number;
};

export type Completion = {
  id: string;
  profileId: string;
  taskId: string;
  date: string;
  points: number;
  updatedAt?: number;
};

export type Profile = {
  id: string;
  displayName: string;
  avatarId: string;
  createdAt: number;
  updatedAt?: number;
};

export type Settings = {
  id: string;
  profileId: string;
  cycleType: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  cycleStartDate: string;
  levelUpPoints: number;
  avatarId?: string;
  displayName?: string;
  updatedAt?: number;
};

export type AccountSettings = {
  id: 'account';
  language: 'en' | 'pt' | 'fr';
  updatedAt?: number;
};

type OutboxEntity = StoreName;
type OutboxAction = 'upsert' | 'delete';

export type OutboxEntry = {
  seq?: number;
  entity: OutboxEntity;
  action: OutboxAction;
  recordId: string;
  profileId?: string;
  payload?: Task | Reward | Completion | Settings | RewardRedemption | Profile | AccountSettings;
  createdAt: number;
};

class GrowUpDexie extends Dexie {
  profiles!: Table<Profile, string>;
  tasks!: Table<Task, string>;
  rewards!: Table<Reward, string>;
  redemptions!: Table<RewardRedemption, string>;
  completions!: Table<Completion, string>;
  settings!: Table<Settings, string>;
  accountSettings!: Table<AccountSettings, string>;
  outbox!: Table<OutboxEntry, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      profiles: 'id,createdAt',
      tasks: 'id,createdAt,profileId',
      rewards: 'id,createdAt,redeemedAt,profileId',
      redemptions: 'id,rewardId,redeemedAt,date,profileId',
      completions: 'id,taskId,date,profileId',
      settings: 'id,profileId',
      accountSettings: 'id',
      outbox: '++seq,createdAt,entity,action,recordId,profileId'
    });
    this.version(2).stores({
      profiles: 'id,createdAt',
      tasks: 'id,createdAt,profileId',
      rewards: 'id,createdAt,redeemedAt,profileId',
      redemptions: 'id,rewardId,redeemedAt,date,profileId',
      completions: 'id,taskId,date,profileId',
      settings: 'id,profileId',
      accountSettings: 'id',
      outbox: '++seq,createdAt,entity,action,recordId,profileId'
    });
    this.version(3).stores({
      profiles: 'id,createdAt',
      tasks: 'id,createdAt,profileId',
      rewards: 'id,createdAt,redeemedAt,profileId',
      redemptions: 'id,rewardId,redeemedAt,date,profileId',
      completions: 'id,taskId,date,profileId',
      settings: 'id,profileId',
      accountSettings: 'id',
      outbox: '++seq,createdAt,entity,action,recordId,profileId'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class GrowUpDbService {
  private db = this.createDb('growup-db-anon');
  private currentUserKey = 'anon';
  private currentProfileId: string | null = null;

  setUser(userId: string | null): void {
    const nextKey = userId ?? 'anon';
    if (nextKey === this.currentUserKey) {
      return;
    }
    this.currentUserKey = nextKey;
    this.db.close();
    this.db = this.createDb(`growup-db-${nextKey}`);
  }

  setActiveProfile(profileId: string | null): void {
    this.currentProfileId = profileId;
  }

  async getProfiles(): Promise<Profile[]> {
    return this.getAll<Profile>('profiles');
  }

  async addProfile(profile: Profile): Promise<void> {
    const next = { ...profile, updatedAt: Date.now() };
    await this.add('profiles', next);
    await this.enqueueOutbox('profiles', 'upsert', next.id, next);
  }

  async updateProfile(profile: Profile): Promise<void> {
    const next = { ...profile, updatedAt: Date.now() };
    await this.put('profiles', next);
    await this.enqueueOutbox('profiles', 'upsert', next.id, next);
  }

  async removeProfile(id: string): Promise<void> {
    await this.remove('profiles', id);
    await this.enqueueOutbox('profiles', 'delete', id);
  }

  async getTasks(profileId?: string): Promise<Task[]> {
    return this.getAllForProfile<Task>('tasks', profileId);
  }

  async getRewards(profileId?: string): Promise<Reward[]> {
    return this.getAllForProfile<Reward>('rewards', profileId);
  }

  async addTask(task: Task): Promise<void> {
    const next = { ...task, updatedAt: Date.now() };
    await this.add('tasks', next);
    await this.enqueueOutbox('tasks', 'upsert', next.id, next, next.profileId);
  }

  async updateTask(task: Task): Promise<void> {
    const next = { ...task, updatedAt: Date.now() };
    await this.put('tasks', next);
    await this.enqueueOutbox('tasks', 'upsert', next.id, next, next.profileId);
  }

  async removeTask(id: string, profileId: string): Promise<void> {
    await this.remove('tasks', id);
    await this.enqueueOutbox('tasks', 'delete', id, undefined, profileId);
  }

  async getCompletions(profileId?: string): Promise<Completion[]> {
    return this.getAllForProfile<Completion>('completions', profileId);
  }

  async addCompletion(completion: Completion): Promise<void> {
    const next = { ...completion, updatedAt: Date.now() };
    await this.put('completions', next);
    await this.enqueueOutbox('completions', 'upsert', next.id, next, next.profileId);
  }

  async removeCompletion(id: string, profileId: string): Promise<void> {
    await this.remove('completions', id);
    await this.enqueueOutbox('completions', 'delete', id, undefined, profileId);
  }

  async removeCompletionsForTask(taskId: string, profileId: string): Promise<void> {
    const completions = await this.getCompletions(profileId);
    const toRemove = completions.filter((completion) => completion.taskId === taskId);
    await Promise.all(toRemove.map((completion) => this.removeCompletion(completion.id, profileId)));
  }

  async addReward(reward: Reward): Promise<void> {
    const next = { ...reward, updatedAt: Date.now() };
    await this.add('rewards', next);
    await this.enqueueOutbox('rewards', 'upsert', next.id, next, next.profileId);
  }

  async updateReward(reward: Reward): Promise<void> {
    const next = { ...reward, updatedAt: Date.now() };
    await this.put('rewards', next);
    await this.enqueueOutbox('rewards', 'upsert', next.id, next, next.profileId);
  }

  async removeReward(id: string, profileId: string): Promise<void> {
    await this.remove('rewards', id);
    await this.enqueueOutbox('rewards', 'delete', id, undefined, profileId);
  }

  async getRedemptions(profileId?: string): Promise<RewardRedemption[]> {
    return this.getAllForProfile<RewardRedemption>('redemptions', profileId);
  }

  async addRedemption(redemption: RewardRedemption): Promise<void> {
    const next = { ...redemption, updatedAt: Date.now() };
    await this.add('redemptions', next);
    await this.enqueueOutbox('redemptions', 'upsert', next.id, next, next.profileId);
  }

  async removeRedemption(id: string, profileId: string): Promise<void> {
    await this.remove('redemptions', id);
    await this.enqueueOutbox('redemptions', 'delete', id, undefined, profileId);
  }

  async getSettings(profileId: string): Promise<Settings | undefined> {
    return this.db.settings.get(profileId);
  }

  async saveSettings(settings: Settings): Promise<void> {
    const next = { ...settings, updatedAt: Date.now() };
    await this.put('settings', next);
    await this.enqueueOutbox('settings', 'upsert', next.id, next, next.profileId);
  }

  async getAccountSettings(): Promise<AccountSettings | undefined> {
    return this.db.accountSettings.get('account');
  }

  async saveAccountSettings(settings: AccountSettings): Promise<void> {
    const next = { ...settings, updatedAt: Date.now() };
    await this.put('accountSettings', next);
    await this.enqueueOutbox('accountSettings', 'upsert', next.id, next);
  }

  createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    return this.db.table(storeName).toArray() as Promise<T[]>;
  }

  private async getAllForProfile<T extends { profileId: string }>(
    storeName: StoreName,
    profileId?: string
  ): Promise<T[]> {
    const resolved = profileId ?? this.currentProfileId;
    if (!resolved) {
      return [];
    }
    return this.db.table(storeName).where('profileId').equals(resolved).toArray() as Promise<T[]>;
  }

  private async add<T>(storeName: StoreName, value: T): Promise<void> {
    await this.db.table(storeName).add(value);
  }

  private async put<T>(storeName: StoreName, value: T): Promise<void> {
    await this.db.table(storeName).put(value);
  }

  private async remove(storeName: StoreName, key: string): Promise<void> {
    await this.db.table(storeName).delete(key);
  }

  async getOutbox(): Promise<OutboxEntry[]> {
    return this.db.outbox.orderBy('createdAt').toArray();
  }

  async removeOutboxEntry(seq: number): Promise<void> {
    await this.db.outbox.delete(seq);
  }

  async clearOutbox(): Promise<void> {
    await this.db.outbox.clear();
  }

  async saveRemoteRecord<T>(storeName: StoreName, value: T): Promise<void> {
    await this.db.table(storeName).put(value);
  }

  async deleteRemoteRecord(storeName: StoreName, key: string): Promise<void> {
    await this.db.table(storeName).delete(key);
  }

  async getRecord<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    return this.db.table(storeName).get(key) as Promise<T | undefined>;
  }

  async migrateDefaultIds(): Promise<void> {
    const defaultTaskPattern = /^default-task-(pt|en)-(\d+)$/;
    const defaultRewardPattern = /^default-reward-(pt|en)-(\d+)$/;
    const tasks = await this.getAll<Task>('tasks');
    const rewards = await this.getAll<Reward>('rewards');
    const completions = await this.getAll<Completion>('completions');
    const outbox = await this.getOutbox();

    const taskIdMap = new Map<string, string>();
    const rewardIdMap = new Map<string, string>();

    for (const task of tasks) {
      const match = defaultTaskPattern.exec(task.id);
      if (!match) {
        continue;
      }
      const seed = `default-task-${match[1]}-${match[2]}`;
      const nextId = this.uuidFromString(seed);
      if (nextId !== task.id) {
        taskIdMap.set(task.id, nextId);
        await this.db.table('tasks').put({ ...task, id: nextId });
        await this.db.table('tasks').delete(task.id);
      }
    }

    for (const reward of rewards) {
      const match = defaultRewardPattern.exec(reward.id);
      if (!match) {
        continue;
      }
      const seed = `default-reward-${match[1]}-${match[2]}`;
      const nextId = this.uuidFromString(seed);
      if (nextId !== reward.id) {
        rewardIdMap.set(reward.id, nextId);
        await this.db.table('rewards').put({ ...reward, id: nextId });
        await this.db.table('rewards').delete(reward.id);
      }
    }

    for (const completion of completions) {
      const nextTaskId = taskIdMap.get(completion.taskId);
      if (!nextTaskId) {
        continue;
      }
      const nextId = completion.id.startsWith(`${completion.taskId}-`)
        ? `${nextTaskId}-${completion.date}`
        : completion.id;
      await this.db.table('completions').put({
        ...completion,
        id: nextId,
        taskId: nextTaskId
      });
      if (nextId !== completion.id) {
        await this.db.table('completions').delete(completion.id);
      }
    }

    for (const entry of outbox) {
      let changed = false;
      const updated = { ...entry };
      if (entry.entity === 'tasks') {
        const nextId = taskIdMap.get(entry.recordId);
        if (nextId) {
          updated.recordId = nextId;
          if (updated.payload && typeof updated.payload === 'object') {
            (updated.payload as Task).id = nextId;
          }
          changed = true;
        }
      } else if (entry.entity === 'rewards') {
        const nextId = rewardIdMap.get(entry.recordId);
        if (nextId) {
          updated.recordId = nextId;
          if (updated.payload && typeof updated.payload === 'object') {
            (updated.payload as Reward).id = nextId;
          }
          changed = true;
        }
      } else if (entry.entity === 'completions') {
        const payload = updated.payload as Completion | undefined;
        const nextTaskId = payload ? taskIdMap.get(payload.taskId) : undefined;
        if (nextTaskId) {
          const nextId = payload?.id && payload.id.startsWith(`${payload.taskId}-`)
            ? `${nextTaskId}-${payload.date}`
            : payload?.id;
          if (nextId && updated.recordId !== nextId) {
            updated.recordId = nextId;
          }
          if (payload) {
            payload.taskId = nextTaskId;
            if (nextId) {
              payload.id = nextId;
            }
          }
          changed = true;
        }
      }
      if (changed && entry.seq !== undefined) {
        await this.db.outbox.put({ ...updated, seq: entry.seq });
      }
    }
  }

  async migrateLegacyRewardRedemptions(): Promise<void> {
    const rewards = await this.getAll<Reward>('rewards');
    const redemptions = await this.getAll<RewardRedemption>('redemptions');
    const existing = new Set(redemptions.map((entry) => `${entry.profileId}-${entry.rewardId}-${entry.redeemedAt}`));
    for (const reward of rewards) {
      if (!reward.redeemedAt) {
        continue;
      }
      const key = `${reward.profileId}-${reward.id}-${reward.redeemedAt}`;
      if (existing.has(key)) {
        continue;
      }
      const redeemedAt = reward.redeemedAt;
      const date = new Date(redeemedAt);
      const redemption: RewardRedemption = {
        id: this.createId(),
        profileId: reward.profileId,
        rewardId: reward.id,
        rewardTitle: reward.title,
        cost: reward.cost,
        redeemedAt,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`
      };
      await this.addRedemption(redemption);
      existing.add(key);
    }
  }

  private async enqueueOutbox(
    entity: OutboxEntity,
    action: OutboxAction,
    recordId: string,
    payload?: Task | Reward | Completion | Settings | RewardRedemption | Profile | AccountSettings,
    profileId?: string
  ): Promise<void> {
    await this.db.outbox.add({
      entity,
      action,
      recordId,
      profileId,
      payload,
      createdAt: Date.now()
    });
  }

  private createDb(name: string): GrowUpDexie {
    return new GrowUpDexie(name);
  }

  private uuidFromString(value: string): string {
    const hash = (seed: number) => {
      let h = 2166136261 ^ seed;
      for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const toHex = (num: number, length: number) => num.toString(16).padStart(length, '0');
    const a = hash(1);
    const b = hash(2);
    const c = hash(3);
    const d = hash(4);

    const part1 = toHex(a, 8);
    const part2 = toHex(b >>> 16, 4);
    const part3 = toHex((b & 0x0fff) | 0x5000, 4);
    const part4 = toHex((c & 0x3fff) | 0x8000, 4);
    const part5 = toHex(d, 8) + toHex(c >>> 16, 4);

    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }
}
