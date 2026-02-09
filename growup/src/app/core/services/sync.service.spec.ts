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
  const from = vi.fn().mockReturnValue({
    upsert,
    delete: () => ({
      eq: vi.fn().mockReturnValue({ error: null })
    }),
    update: () => ({
      eq: vi.fn().mockReturnValue({ error: null })
    }),
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
      toRemoteAccountSettings: vi
        .fn()
        .mockReturnValue({ owner_id: 'u1', language: 'en', role: 'USER', terms_version: null, terms_accepted_at: null })
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
});
