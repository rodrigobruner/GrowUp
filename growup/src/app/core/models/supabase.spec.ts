import { describe, expect, it } from 'vitest';
import {
  isAccountSettingsRow,
  isCompletionRow,
  isProfileRow,
  isRedemptionRow,
  isRewardRow,
  isSettingsRow,
  isTaskRow
} from './supabase';

describe('supabase row guards', () => {
  it('accepts valid profile row', () => {
    expect(isProfileRow({ id: '1', owner_id: '2', display_name: 'Kid' })).toBe(true);
  });

  it('rejects invalid task row', () => {
    expect(isTaskRow({ id: '1', owner_id: '2' })).toBe(false);
  });

  it('accepts valid reward row', () => {
    expect(isRewardRow({ id: '1', owner_id: '2', profile_id: '3', title: 'Reward' })).toBe(true);
  });

  it('accepts valid completion row', () => {
    expect(isCompletionRow({ id: '1', owner_id: '2', profile_id: '3', task_id: '4', date: '2026-01-01' })).toBe(true);
  });

  it('accepts valid redemption row', () => {
    expect(
      isRedemptionRow({
        id: '1',
        owner_id: '2',
        profile_id: '3',
        reward_id: '4',
        reward_title: 'Reward',
        cost: 10,
        redeemed_at: '2026-01-01T00:00:00.000Z',
        date: '2026-01-01'
      })
    ).toBe(true);
  });

  it('accepts valid settings row', () => {
    expect(
      isSettingsRow({
        id: '1',
        owner_id: '2',
        profile_id: '3',
        cycle_type: 'weekly',
        cycle_start_date: '2026-01-01',
        level_up_points: 100,
        avatar_id: '01',
        display_name: 'Kid'
      })
    ).toBe(true);
  });

  it('accepts valid account settings row', () => {
    expect(isAccountSettingsRow({ owner_id: '1', language: 'en', terms_version: null, terms_accepted_at: null })).toBe(
      true
    );
  });
});
