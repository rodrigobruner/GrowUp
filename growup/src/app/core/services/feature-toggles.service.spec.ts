import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FeatureTogglesService } from './feature-toggles.service';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

describe('FeatureTogglesService', () => {
  it('loads feature flags and maps defaults', async () => {
    const client = {
      from: () => ({
        select: () => ({
          order: async () => ({
            data: [
              { key: 'tasks', description: 'Tasks', default_enabled: true },
              { key: 'rewards', description: null, default_enabled: false }
            ],
            error: null
          })
        })
      })
    };

    TestBed.configureTestingModule({
      providers: [
        FeatureTogglesService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn: vi.fn() } }
      ]
    });

    const service = TestBed.inject(FeatureTogglesService);
    const result = await service.loadFeatureFlags();

    expect(result).toEqual([
      { key: 'tasks', description: 'Tasks', defaultEnabled: true },
      { key: 'rewards', description: null, defaultEnabled: false }
    ]);
  });

  it('returns empty list and logs when feature flags request fails', async () => {
    const warn = vi.fn();
    const client = {
      from: () => ({
        select: () => ({
          order: async () => ({
            data: null,
            error: { message: 'boom' }
          })
        })
      })
    };

    TestBed.configureTestingModule({
      providers: [
        FeatureTogglesService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn } }
      ]
    });

    const service = TestBed.inject(FeatureTogglesService);
    const result = await service.loadFeatureFlags();

    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalledWith('admin.features.flags.failed', { message: 'boom' });
  });

  it('loads plan toggles and maps values', async () => {
    const client = {
      from: () => ({
        select: async () => ({
          data: [
            { plan: 'FREE', feature_key: 'rewards', enabled: 0 },
            { plan: 'PRO', feature_key: 'rewards', enabled: 1 }
          ],
          error: null
        })
      })
    };

    TestBed.configureTestingModule({
      providers: [
        FeatureTogglesService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn: vi.fn() } }
      ]
    });

    const service = TestBed.inject(FeatureTogglesService);
    const result = await service.loadPlanToggles();

    expect(result).toEqual([
      { plan: 'FREE', featureKey: 'rewards', enabled: false },
      { plan: 'PRO', featureKey: 'rewards', enabled: true }
    ]);
  });

  it('returns false when saving plan toggle fails', async () => {
    const warn = vi.fn();
    const client = {
      from: () => ({
        upsert: async () => ({ error: { message: 'failed' } })
      })
    };

    TestBed.configureTestingModule({
      providers: [
        FeatureTogglesService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn } }
      ]
    });

    const service = TestBed.inject(FeatureTogglesService);
    const result = await service.savePlanToggle({
      plan: 'PRO',
      featureKey: 'rewards',
      enabled: true
    });

    expect(result).toBe(false);
    expect(warn).toHaveBeenCalledWith('admin.features.plan.update.failed', { message: 'failed' });
  });

  it('returns true when saving plan toggle succeeds', async () => {
    const client = {
      from: () => ({
        upsert: async () => ({ error: null })
      })
    };

    TestBed.configureTestingModule({
      providers: [
        FeatureTogglesService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn: vi.fn() } }
      ]
    });

    const service = TestBed.inject(FeatureTogglesService);
    const result = await service.savePlanToggle({
      plan: 'DEV',
      featureKey: 'tasks',
      enabled: true
    });

    expect(result).toBe(true);
  });
});
