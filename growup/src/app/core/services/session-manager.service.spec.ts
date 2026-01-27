import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SessionManagerService } from './session-manager.service';
import { AuthService } from './auth.service';
import { GrowUpDbService } from './growup-db.service';
import { SyncService } from './sync.service';
import { TermsService } from './terms.service';
import { LoggerService } from './logger.service';

const createService = (overrides?: Partial<{
  lastUserId: string | null;
  isStarted: boolean;
}>) => {
  const sync = {
    stop: vi.fn(),
    start: vi.fn(),
    isStarted: () => overrides?.isStarted ?? true
  } as any;
  const auth = {
    signOut: vi.fn()
  } as any;
  const db = {
    clearAnonymousDatabase: vi.fn(),
    setUser: vi.fn()
  } as any;
  const terms = {
    ensureAccepted: vi.fn().mockResolvedValue(true)
  } as any;
  const logger = {
    info: vi.fn(),
    warn: vi.fn()
  } as any;

  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: GrowUpDbService, useValue: db },
      { provide: SyncService, useValue: sync },
      { provide: TermsService, useValue: terms },
      { provide: LoggerService, useValue: logger },
      SessionManagerService
    ]
  });
  const service = TestBed.inject(SessionManagerService);
  (service as any).lastUserId = overrides?.lastUserId ?? null;
  return { service, sync };
};

describe('SessionManagerService', () => {
  it('short-circuits when user unchanged, sync started, and terms unchanged', async () => {
    const { service, sync } = createService({ lastUserId: 'u1', isStarted: true });
    (service as any).lastTermsVersion = 'v1';
    const result = await service.handleAuthChange('u1', 'en', 'v1');
    expect(result).toBe(true);
    expect(sync.stop).not.toHaveBeenCalled();
  });

  it('runs when user unchanged but sync stopped', async () => {
    const { service, sync } = createService({ lastUserId: 'u1', isStarted: false });
    const result = await service.handleAuthChange('u1', 'en', 'v1');
    expect(result).toBe(true);
    expect(sync.stop).toHaveBeenCalled();
  });

  it('runs when terms version changed for same user', async () => {
    const { service, sync } = createService({ lastUserId: 'u1', isStarted: true });
    (service as any).lastTermsVersion = 'v1';
    const result = await service.handleAuthChange('u1', 'en', 'v2');
    expect(result).toBe(true);
    expect(sync.stop).toHaveBeenCalled();
  });

  it('re-prompts terms when version changes for same user', async () => {
    const { service } = createService({ lastUserId: 'u1', isStarted: true });
    (service as any).lastTermsVersion = 'v1';
    await service.handleAuthChange('u1', 'en', 'v2');
    const terms = TestBed.inject(TermsService) as any;
    expect(terms.ensureAccepted).toHaveBeenCalledWith('u1', 'en');
  });
});
