import { Injectable } from '@angular/core';
import { LogEntry } from './logger.service';

const STORAGE_KEY = 'growup.logs';

@Injectable({ providedIn: 'root' })
export class LogStorageService {
  load(): LogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        return [];
      }
      return data as LogEntry[];
    } catch {
      return [];
    }
  }

  save(entries: LogEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage failures.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
}
