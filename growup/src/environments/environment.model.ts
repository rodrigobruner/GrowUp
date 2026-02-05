export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Environment = {
  production: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  buildTime: string;
  buildTimestamp: string;
  logging?: {
    minLevel?: LogLevel;
    saveDebounceMs?: number;
    persistLevel?: LogLevel;
    consoleLevel?: LogLevel;
    persistEnabled?: boolean;
  };
  sync?: {
    backoffBaseMs?: number;
    maxBackoffMs?: number;
    pollIntervalMs?: number;
  };
};
