import { Injectable } from '@angular/core';

type StoreName = 'tasks' | 'rewards' | 'completions' | 'settings';

type BaseRecord = {
  id: string;
  title: string;
};

export type Task = BaseRecord & {
  points: number;
  createdAt: number;
};

export type Reward = BaseRecord & {
  cost: number;
  createdAt: number;
  redeemedAt?: number;
};

export type Completion = {
  id: string;
  taskId: string;
  date: string;
  points: number;
};

export type Settings = {
  id: 'global';
  cycleType: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  cycleStartDate: string;
  language: 'en' | 'pt';
};

@Injectable({
  providedIn: 'root'
})
export class AllowanceDbService {
  private readonly dbName = 'allowance-db';
  private readonly dbVersion = 1;

  async getTasks(): Promise<Task[]> {
    return this.getAll<Task>('tasks');
  }

  async getRewards(): Promise<Reward[]> {
    return this.getAll<Reward>('rewards');
  }

  async addTask(task: Task): Promise<void> {
    await this.add('tasks', task);
  }

  async updateTask(task: Task): Promise<void> {
    await this.put('tasks', task);
  }

  async removeTask(id: string): Promise<void> {
    await this.remove('tasks', id);
  }

  async getCompletions(): Promise<Completion[]> {
    return this.getAll<Completion>('completions');
  }

  async addCompletion(completion: Completion): Promise<void> {
    await this.put('completions', completion);
  }

  async removeCompletion(id: string): Promise<void> {
    await this.remove('completions', id);
  }

  async removeCompletionsForTask(taskId: string): Promise<void> {
    const completions = await this.getCompletions();
    const toRemove = completions.filter((completion) => completion.taskId === taskId);
    await Promise.all(toRemove.map((completion) => this.removeCompletion(completion.id)));
  }

  async addReward(reward: Reward): Promise<void> {
    await this.add('rewards', reward);
  }

  async updateReward(reward: Reward): Promise<void> {
    await this.put('rewards', reward);
  }

  async removeReward(id: string): Promise<void> {
    await this.remove('rewards', id);
  }

  async getSettings(): Promise<Settings | undefined> {
    const store = await this.getStore('settings', 'readonly');
    const request = store.get('global');
    return this.requestToPromise<Settings | undefined>(request);
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.put('settings', settings);
  }

  createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    const request = store.getAll();
    return this.requestToPromise<T[]>(request);
  }

  private async add<T>(storeName: StoreName, value: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.requestToPromise(store.add(value));
  }

  private async put<T>(storeName: StoreName, value: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.requestToPromise(store.put(value));
  }

  private async remove(storeName: StoreName, key: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    await this.requestToPromise(store.delete(key));
  }

  private async getStore(storeName: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.openDb();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('rewards')) {
          db.createObjectStore('rewards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('completions')) {
          db.createObjectStore('completions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
