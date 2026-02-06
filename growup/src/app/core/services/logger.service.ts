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
    if (this.persistEnabled) {
      const stored = storage.load();
      if (stored.length) {
        this.entries = stored;
      }
    }
  }
  private entries: LogEntry[] = [];
  private maxEntries = 200;
  private enabled = true;
  private readonly persistEnabled =
    environment.production ? false : (environment.logging?.persistEnabled ?? true);
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
    const safeContext = this.sanitizeContext(context);
    const entry: LogEntry = {
      level,
      message,
      context: safeContext,
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
        console.error(prefix, safeContext ?? '');
      } else if (level === 'warn') {
        console.warn(prefix, safeContext ?? '');
      } else if (level === 'info') {
        console.info(prefix, safeContext ?? '');
      } else {
        console.debug(prefix, safeContext ?? '');
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
    if (!this.persistEnabled) {
      return;
    }
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

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) {
      return undefined;
    }
    return this.sanitizeValue(context, 0) as Record<string, unknown>;
  }

  private sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > 4) {
      return '[REDACTED]';
    }
    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item, depth + 1));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    const sanitized: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      sanitized[key] = this.sanitizeValue(entryValue, depth + 1);
    }
    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    const markers = ['password', 'pass', 'token', 'authorization', 'email', 'secret', 'apikey', 'api_key', 'otp', 'code'];
    return markers.some((marker) => lower.includes(marker));
  }
}
