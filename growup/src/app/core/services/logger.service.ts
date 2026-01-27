import { Injectable } from '@angular/core';
import { LogStorageService } from './log-storage.service';
import { environment } from '../../../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

const isLogLevel = (value: unknown): value is LogLevel =>
  value === 'debug' || value === 'info' || value === 'warn' || value === 'error';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  constructor(private readonly storage: LogStorageService) {
    const stored = storage.load();
    if (stored.length) {
      this.entries = stored;
    }
  }
  private entries: LogEntry[] = [];
  private maxEntries = 200;
  private enabled = true;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private readonly fallbackLevel: LogLevel = environment.production ? 'warn' : 'debug';
  private readonly minLevel: LogLevel = isLogLevel(environment.logging?.minLevel)
    ? environment.logging!.minLevel
    : this.fallbackLevel;
  private readonly persistLevel: LogLevel = isLogLevel(environment.logging?.persistLevel)
    ? environment.logging!.persistLevel
    : this.minLevel;
  private readonly consoleLevel: LogLevel = isLogLevel(environment.logging?.consoleLevel)
    ? environment.logging!.consoleLevel
    : this.fallbackLevel;
  private readonly saveDebounceMs =
    typeof environment.logging?.saveDebounceMs === 'number' ? environment.logging.saveDebounceMs : 750;

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.dirty = false;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.storage.clear();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }
    if (!this.shouldLog(level)) {
      return;
    }
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now()
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    this.scheduleSave(level);

    if (this.shouldLogFor(level, this.consoleLevel)) {
      const prefix = `[${level.toUpperCase()}] ${message}`;
      if (level === 'error') {
        console.error(prefix, context ?? '');
      } else if (level === 'warn') {
        console.warn(prefix, context ?? '');
      } else if (level === 'info') {
        console.info(prefix, context ?? '');
      } else {
        console.debug(prefix, context ?? '');
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.shouldLogFor(level, this.minLevel);
  }

  private shouldLogFor(level: LogLevel, minLevel: LogLevel): boolean {
    const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
    return order[level] >= order[minLevel];
  }

  private scheduleSave(level: LogLevel): void {
    if (!this.shouldLogFor(level, this.persistLevel)) {
      return;
    }
    this.dirty = true;
    if (level === 'warn' || level === 'error') {
      this.flush();
      return;
    }
    if (this.saveTimer) {
      return;
    }
    this.saveTimer = setTimeout(() => this.flush(), this.saveDebounceMs);
  }

  private flush(): void {
    if (!this.dirty) {
      return;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.dirty = false;
    this.storage.save(this.entries);
  }
}
