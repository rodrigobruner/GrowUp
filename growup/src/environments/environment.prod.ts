export const environment = {
  production: true,
  supabaseUrl: 'CHANGE_ME_SUPABASE_URL',
  supabaseAnonKey: 'CHANGE_ME_SUPABASE_ANON_KEY',
  buildTime: 'local',
  buildTimestamp: 'local',
  logging: {
    minLevel: 'warn',
    saveDebounceMs: 1000,
    persistLevel: 'warn',
    consoleLevel: 'warn'
  },
  sync: {
    backoffBaseMs: 10000,
    maxBackoffMs: 300000,
    pollIntervalMs: 60000
  }
};
