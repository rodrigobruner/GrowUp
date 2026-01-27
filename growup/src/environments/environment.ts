export const environment = {
  production: false,
  supabaseUrl: 'CHANGE_ME_SUPABASE_URL',
  supabaseAnonKey: 'CHANGE_ME_SUPABASE_ANON_KEY',
  buildTime: 'local',
  buildTimestamp: 'local',
  logging: {
    minLevel: 'debug',
    saveDebounceMs: 750,
    persistLevel: 'debug',
    consoleLevel: 'debug'
  },
  sync: {
    backoffBaseMs: 5000,
    maxBackoffMs: 300000,
    pollIntervalMs: 30000
  }
};
