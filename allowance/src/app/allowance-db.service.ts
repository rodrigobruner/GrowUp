import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

type StoreName = 'tasks' | 'rewards' | 'completions' | 'settings';

type BaseRecord = {
  id: string;
  title: string;
};

export type Task = BaseRecord & {
  points: number;
  createdAt: number;
  updatedAt?: number;
};

export type Reward = BaseRecord & {
  cost: number;
  createdAt: number;
  redeemedAt?: number;
  updatedAt?: number;
};

export type Completion = {
  id: string;
  taskId: string;
  date: string;
  points: number;
  updatedAt?: number;
};

export type Settings = {
  id: 'global';
  cycleType: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  cycleStartDate: string;
  language: 'en' | 'pt';
  levelUpPoints: number;
  avatarId?: string;
  updatedAt?: number;
};

type OutboxEntity = StoreName;
type OutboxAction = 'upsert' | 'delete';

export type OutboxEntry = {
  seq?: number;
  entity: OutboxEntity;
  action: OutboxAction;
  recordId: string;
  payload?: Task | Reward | Completion | Settings;
  createdAt: number;
};

class AllowanceDexie extends Dexie {
  tasks!: Table<Task, string>;
  rewards!: Table<Reward, string>;
  completions!: Table<Completion, string>;
  settings!: Table<Settings, string>;
  outbox!: Table<OutboxEntry, number>;

  constructor() {
    super('allowance-db');
    this.version(1).stores({
      tasks: 'id,createdAt',
      rewards: 'id,createdAt,redeemedAt',
      completions: 'id,taskId,date',
      settings: 'id',
      outbox: '++seq,createdAt,entity,action,recordId'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class AllowanceDbService {
  private readonly db = new AllowanceDexie();

  async getTasks(): Promise<Task[]> {
    return this.getAll<Task>('tasks');
  }

  async getRewards(): Promise<Reward[]> {
    return this.getAll<Reward>('rewards');
  }

  async addTask(task: Task): Promise<void> {
    const next = { ...task, updatedAt: Date.now() };
    await this.add('tasks', next);
    await this.enqueueOutbox('tasks', 'upsert', next.id, next);
  }

  async updateTask(task: Task): Promise<void> {
    const next = { ...task, updatedAt: Date.now() };
    await this.put('tasks', next);
    await this.enqueueOutbox('tasks', 'upsert', next.id, next);
  }

  async removeTask(id: string): Promise<void> {
    await this.remove('tasks', id);
    await this.enqueueOutbox('tasks', 'delete', id);
  }

  async getCompletions(): Promise<Completion[]> {
    return this.getAll<Completion>('completions');
  }

  async addCompletion(completion: Completion): Promise<void> {
    const next = { ...completion, updatedAt: Date.now() };
    await this.put('completions', next);
    await this.enqueueOutbox('completions', 'upsert', next.id, next);
  }

  async removeCompletion(id: string): Promise<void> {
    await this.remove('completions', id);
    await this.enqueueOutbox('completions', 'delete', id);
  }

  async removeCompletionsForTask(taskId: string): Promise<void> {
    const completions = await this.getCompletions();
    const toRemove = completions.filter((completion) => completion.taskId === taskId);
    await Promise.all(toRemove.map((completion) => this.removeCompletion(completion.id)));
  }

  async addReward(reward: Reward): Promise<void> {
    const next = { ...reward, updatedAt: Date.now() };
    await this.add('rewards', next);
    await this.enqueueOutbox('rewards', 'upsert', next.id, next);
  }

  async updateReward(reward: Reward): Promise<void> {
    const next = { ...reward, updatedAt: Date.now() };
    await this.put('rewards', next);
    await this.enqueueOutbox('rewards', 'upsert', next.id, next);
  }

  async removeReward(id: string): Promise<void> {
    await this.remove('rewards', id);
    await this.enqueueOutbox('rewards', 'delete', id);
  }

  async getSettings(): Promise<Settings | undefined> {
    return this.db.settings.get('global');
  }

  async saveSettings(settings: Settings): Promise<void> {
    const next = { ...settings, updatedAt: Date.now() };
    await this.put('settings', next);
    await this.enqueueOutbox('settings', 'upsert', next.id, next);
  }

  createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    return this.db.table(storeName).toArray() as Promise<T[]>;
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

  private async enqueueOutbox(
    entity: OutboxEntity,
    action: OutboxAction,
    recordId: string,
    payload?: Task | Reward | Completion | Settings
  ): Promise<void> {
    await this.db.outbox.add({
      entity,
      action,
      recordId,
      payload,
      createdAt: Date.now()
    });
  }
}
