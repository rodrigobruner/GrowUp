const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const targetPath = path.join(
  __dirname,
  '..',
  'src',
  'environments',
  'environment.local.ts'
);

const contents = `export const environment = {
  production: false,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
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
`;

fs.writeFileSync(targetPath, contents, 'utf8');
console.log('Wrote local environment config to src/environments/environment.local.ts');
