import { describe, expect, it } from 'vitest';
import { isValidAccountSettingsRow, isValidSyncRow } from './supabase-validators';

describe('supabase validators', () => {
  it('accepts valid profile row', () => {
    expect(isValidSyncRow('profiles', { id: '1', owner_id: '2', display_name: 'Kid' })).toBe(true);
  });

  it('rejects invalid profile row', () => {
    expect(isValidSyncRow('profiles', { id: '1' })).toBe(false);
  });

  it('accepts valid account settings row', () => {
    expect(isValidAccountSettingsRow({ owner_id: '1', language: 'en', terms_version: null, terms_accepted_at: null })).toBe(
      true
    );
  });
});
