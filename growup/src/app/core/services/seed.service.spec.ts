import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TranslateService } from '@ngx-translate/core';
import { SeedService } from './seed.service';
import { GrowUpDbService } from './growup-db.service';
import { AuthService } from './auth.service';
import { SyncService } from './sync.service';
import type { AccountSettings } from '../models/account-settings';

describe('SeedService', () => {
  it('forces limitPerCycle to 1 for FREE plan when seeding rewards', async () => {
    const addReward = vi.fn();
    const getAccountSettings = vi.fn().mockResolvedValue({
      id: 'account',
      language: 'en',
      role: 'USER',
      plan: 'FREE',
      flags: {}
    } satisfies AccountSettings);
    const translate = {
      currentLang: 'en',
      getDefaultLang: () => 'en',
      instant: (key: string) => {
        if (key === 'seed.defaultRewards') {
          return [
            { title: 'Reward 1', cost: 10, limitPerCycle: 3 },
            { title: 'Reward 2', cost: 20, limitPerCycle: 2 }
          ];
        }
        if (key === 'seed.defaultProfileName') {
          return 'Profile';
        }
        return [];
      }
    } as unknown as TranslateService;

    TestBed.configureTestingModule({
      providers: [
        SeedService,
        { provide: GrowUpDbService, useValue: { addReward, getAccountSettings, createId: vi.fn() } },
        { provide: TranslateService, useValue: translate },
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        { provide: SyncService, useValue: { requestSync: vi.fn() } }
      ]
    });

    const service = TestBed.inject(SeedService);
    await service.seedDefaultRewards('p1');

    expect(addReward).toHaveBeenCalledTimes(2);
    expect(addReward).toHaveBeenCalledWith(
      expect.objectContaining({
        limitPerCycle: 1
      })
    );
  });
});
