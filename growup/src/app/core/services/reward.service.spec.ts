import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { RewardService } from './reward.service';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { SessionStateService } from './session-state.service';
import { SyncService } from './sync.service';
import { UiDialogsService } from './ui-dialogs.service';
import { Reward } from '../models/reward';
import { AccountSettings } from '../models/account-settings';

const createReward = (id: string, profileId: string): Reward => ({
  id,
  profileId,
  title: `Reward ${id}`,
  cost: 10,
  limitPerCycle: 1,
  createdAt: Date.now()
});

describe('RewardService', () => {
  it('blocks adding reward when max limit reached and advanced rewards disabled', async () => {
    const addReward = vi.fn();
    const informRewardLimit = vi.fn();
    const rewardsSignal = signal<Reward[]>(
      Array.from({ length: 10 }, (_value, index) => createReward(`r${index}`, 'p1'))
    );
    const state = {
      rewards: rewardsSignal,
      redemptions: signal([]),
      rewardUses: signal([]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: { rewards: false }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addReward } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informRewardLimit } }
      ]
    });

    const service = TestBed.inject(RewardService);
    const result = await service.addFromDialog({ title: 'New Reward', cost: 10, limitPerCycle: 2 });

    expect(result).toBeNull();
    expect(addReward).not.toHaveBeenCalled();
    expect(informRewardLimit).toHaveBeenCalledWith(10);
  });

  it('caps limit per cycle to 1 when advanced rewards disabled', async () => {
    const addReward = vi.fn();
    const rewardsSignal = signal<Reward[]>([]);
    const state = {
      rewards: rewardsSignal,
      redemptions: signal([]),
      rewardUses: signal([]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: { rewards: false }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addReward } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    await service.addFromDialog({ title: 'Reward', cost: 10, limitPerCycle: 5 });

    expect(addReward).toHaveBeenCalledWith(
      expect.objectContaining({
        limitPerCycle: 1
      })
    );
  });
});
