import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncService } from './sync.service';
import { SyncMapperService } from './sync-mapper.service';

const createSupabaseMock = () => {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })
  });
  const createEqChain = () => {
    const chain: any = {};
    const final = vi.fn().mockResolvedValue({ error: null });
    chain.eq = vi.fn(() => ({
      eq: vi.fn(() => final())
    }));
    return chain;
  };
  const from = vi.fn().mockReturnValue({
    upsert,
    delete: () => ({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }),
    update: () => createEqChain(),
    select
  });
  return { from, upsert, select };
};

describe('SyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const createAuth = (hasSession = true) =>
    ({
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: hasSession ? { user: { id: 'u1' } } : null } }) },
        from: createSupabaseMock().from
      })
    }) as any;

  it('pushes account settings via mapper', async () => {
    const supabase = createSupabaseMock();
    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;

    const db = {
      getOutbox: async () => [
        {
          entity: 'accountSettings',
          action: 'upsert',
          payload: { language: 'en' },
          seq: 1
        }
      ],
      removeOutboxEntry: vi.fn()
    } as any;

    const mapper = {
      toRemoteAccountSettings: vi.fn().mockReturnValue({
        owner_id: 'u1',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: {},
        terms_version: null,
        terms_accepted_at: null
      })
    } as unknown as SyncMapperService;

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);
    await service.pushOutbox();

    expect(mapper.toRemoteAccountSettings).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('account_settings');
  });

  it('pullTable ignores invalid payloads and sets lastError', async () => {
    const supabase = createSupabaseMock();
    const selectList = vi.fn().mockReturnValue({ data: [{ id: '1' }], error: null });
    supabase.from = vi.fn().mockReturnValue({
      select: () => ({
        eq: selectList
      })
    });

    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;

    const db = {
      getRecord: vi.fn().mockResolvedValue(null),
      saveRemoteRecord: vi.fn(),
      deleteRemoteRecord: vi.fn()
    } as any;

    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    await (service as any).pullTable('tasks');

    expect(service.lastError()).toContain('Invalid tasks payload');
    expect(db.saveRemoteRecord).not.toHaveBeenCalled();
  });

  it('pullTable deletes records with deleted_at', async () => {
    const supabase = createSupabaseMock();
    const selectList = vi.fn().mockReturnValue({ data: [{ id: '1', deleted_at: '2026-01-01' }], error: null });
    supabase.from = vi.fn().mockReturnValue({
      select: () => ({
        eq: selectList
      })
    });

    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;

    const db = {
      deleteRemoteRecord: vi.fn(),
      getRecord: vi.fn().mockResolvedValue(null),
      saveRemoteRecord: vi.fn()
    } as any;

    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    await (service as any).pullTable('tasks');

    expect(db.deleteRemoteRecord).toHaveBeenCalledWith('tasks', '1');
  });

  it('requestSync honors gate conditions', async () => {
    const supabase = createSupabaseMock();
    const auth = {
      user: () => null,
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: null } }) },
        from: supabase.from
      })
    } as any;

    const db = {} as any;
    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    await service.requestSync(true);
    expect(service.isSyncing()).toBe(false);
  });

  it('requestSync skips when offline', async () => {
    const supabase = createSupabaseMock();
    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;
    const db = {} as any;
    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    const original = globalThis.navigator.onLine;
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });

    await service.requestSync(true);
    expect(service.isSyncing()).toBe(false);

    Object.defineProperty(globalThis.navigator, 'onLine', { value: original, configurable: true });
  });

  it('requestSync runs when online and session valid', async () => {
    const auth = createAuth(true);

    const db = {
      getOutbox: async () => [],
      getProfiles: async () => [],
      getTasks: async () => [],
      getRewards: async () => [],
      getCompletions: async () => [],
      getSettings: async () => undefined,
      getRedemptions: async () => [],
      saveRemoteRecord: async () => {},
      deleteRemoteRecord: async () => {},
      getRecord: async () => null
    } as any;

    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    const original = globalThis.navigator.onLine;
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

    service.setStartedForTest(true);
    await service.requestSync(true);
    expect(service.lastSyncAt()).not.toBe(null);

    Object.defineProperty(globalThis.navigator, 'onLine', { value: original, configurable: true });
  });

  it('applies backoff and schedules retry on sync error', async () => {
    const auth = createAuth(true);
    const db = {
      getOutbox: async () => [],
      getRecord: async () => null,
      saveRemoteRecord: async () => {},
      deleteRemoteRecord: async () => {}
    } as any;
    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);
    const spy = vi.spyOn(service, 'pushOutbox').mockRejectedValue(new Error('boom'));

    const original = globalThis.navigator.onLine;
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

    service.setStartedForTest(true);
    await service.requestSync(true);

    expect(spy).toHaveBeenCalled();
    expect(service.lastError()).toContain('boom');

    Object.defineProperty(globalThis.navigator, 'onLine', { value: original, configurable: true });
  });

  it('cooldown prevents immediate retry until backoff passes', async () => {
    const auth = createAuth(true);
    const db = {
      getOutbox: async () => [],
      getRecord: async () => null,
      saveRemoteRecord: async () => {},
      deleteRemoteRecord: async () => {}
    } as any;
    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);
    vi.spyOn(service, 'pushOutbox').mockRejectedValue(new Error('boom'));
    const syncAllSpy = vi.spyOn(service, 'syncAll');

    const original = globalThis.navigator.onLine;
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

    service.setStartedForTest(true);
    await service.requestSync(true);
    await service.requestSync(true);

    expect(syncAllSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(globalThis.navigator, 'onLine', { value: original, configurable: true });
  });

  it('stop unsubscribes and clears timers', () => {
    const auth = createAuth(true);
    const db = {} as any;
    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    const unsubscribe = vi.fn();
    (service as any).channel = { unsubscribe };
    (service as any).syncTimer = window.setTimeout(() => {}, 1000);
    (service as any).started = true;

    service.stop();

    expect(unsubscribe).toHaveBeenCalled();
    expect(service.isStarted()).toBe(false);
  });

  it('pullAll aggregates counts per table', async () => {
    const auth = createAuth(true);
    const db = {} as any;
    const mapper = new SyncMapperService();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);
    const pullSpy = vi.spyOn(service as any, 'pullTable')
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(7);

    const result = await service.pullAll();

    expect(pullSpy).toHaveBeenCalledTimes(7);
    expect(result).toEqual({
      profiles: 1,
      tasks: 2,
      rewards: 3,
      completions: 4,
      settings: 5,
      redemptions: 6,
      accountSettings: 7
    });
  });

  it('pushes profile upsert', async () => {
    const supabase = createSupabaseMock();
    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;

    const db = {
      getOutbox: async () => [
        {
          entity: 'profiles',
          action: 'upsert',
          payload: { id: 'p1', displayName: 'Profile', avatarId: '01', createdAt: 1 },
          seq: 1
        }
      ],
      removeOutboxEntry: vi.fn()
    } as any;

    const mapper = {
      toRemoteProfile: vi.fn().mockReturnValue({ owner_id: 'u1', id: 'p1' })
    } as unknown as SyncMapperService;

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    await service.pushOutbox();

    expect(mapper.toRemoteProfile).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('pushes task upsert and delete', async () => {
    const supabase = createSupabaseMock();
    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;

    const db = {
      getOutbox: async () => [
        {
          entity: 'tasks',
          action: 'upsert',
          payload: { id: 't1', profileId: 'p1', title: 'Task', points: 10, createdAt: 1 },
          seq: 1
        },
        {
          entity: 'tasks',
          action: 'delete',
          recordId: 't2',
          seq: 2
        }
      ],
      removeOutboxEntry: vi.fn()
    } as any;

    const mapper = {
      toRemotePayload: vi.fn().mockReturnValue({ owner_id: 'u1', id: 't1' })
    } as any;

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    await service.pushOutbox();

    expect(mapper.toRemotePayload).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('tasks');
  });

  it('pushes reward, completion, settings and redemption upserts', async () => {
    const supabase = createSupabaseMock();
    const auth = {
      user: () => ({ id: 'u1' }),
      getClient: () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: supabase.from
      })
    } as any;

    const db = {
      getOutbox: async () => [
        {
          entity: 'rewards',
          action: 'upsert',
          payload: { id: 'r1', profileId: 'p1', title: 'Reward', cost: 10, limitPerCycle: 1, createdAt: 1 },
          seq: 1
        },
        {
          entity: 'completions',
          action: 'upsert',
          payload: { id: 'c1', profileId: 'p1', taskId: 't1', date: '2026-02-01', points: 10 },
          seq: 2
        },
        {
          entity: 'settings',
          action: 'upsert',
          payload: { profileId: 'p1', cycleType: 'weekly', cycleStartDate: '2026-02-01', levelUpPoints: 100 },
          seq: 3
        },
        {
          entity: 'redemptions',
          action: 'upsert',
          payload: { id: 'red1', profileId: 'p1', rewardId: 'r1', rewardTitle: 'Reward', cost: 10, redeemedAt: 1, date: '2026-02-01' },
          seq: 4
        }
      ],
      getRecord: vi.fn().mockResolvedValue(null),
      removeOutboxEntry: vi.fn()
    } as any;

    const mapper = {
      toRemotePayload: vi.fn().mockReturnValue({ owner_id: 'u1', id: 'payload' })
    } as any;

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const service = new SyncService(auth, db, mapper, logger);

    await service.pushOutbox();

    expect(mapper.toRemotePayload).toHaveBeenCalled();
  });
});
