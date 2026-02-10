import { describe, expect, it } from 'vitest';
import { SyncMapperService } from './sync-mapper.service';

const mapper = new SyncMapperService();

describe('SyncMapperService', () => {
  it('maps task to remote row', () => {
    const row = mapper.toRemotePayload(
      'tasks',
      { id: 't1', profileId: 'p1', title: 'Task', points: 3, createdAt: 1700000000000 },
      'u1'
    );
    expect(row.owner_id).toBe('u1');
    expect(row.profile_id).toBe('p1');
  });

  it('maps settings row to local', () => {
    const local = mapper.toLocalRecord('settings', {
      id: 's1',
      owner_id: 'u1',
      profile_id: 'p1',
      cycle_type: 'weekly',
      cycle_start_date: '2026-01-01',
      level_up_points: 100,
      avatar_id: '01',
      display_name: 'Kid'
    }) as { profileId: string; cycleType: string };
    expect(local.profileId).toBe('p1');
    expect(local.cycleType).toBe('weekly');
  });

  it('maps account settings row to local', () => {
    const local = mapper.toLocalAccountSettings({
      owner_id: 'u1',
      language: 'en',
      role: 'USER',
      plan: 'FREE',
      flags: {},
      terms_version: null,
      terms_accepted_at: null
    });
    expect(local.language).toBe('en');
  });
});
