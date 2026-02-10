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
import { RewardRedemption } from '../models/redemption';
import { RewardUse } from '../models/reward-use';

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

  it('blocks redeem when limit per cycle reached', async () => {
    const addRedemption = vi.fn();
    const reward: Reward = {
      id: 'r1',
      profileId: 'p1',
      title: 'Reward',
      cost: 10,
      limitPerCycle: 1,
      createdAt: Date.now()
    };
    const redemptionsSignal = signal<RewardRedemption[]>([
      {
        id: 'rd1',
        profileId: 'p1',
        rewardId: 'r1',
        rewardTitle: 'Reward',
        cost: 10,
        redeemedAt: Date.now(),
        date: '2026-02-02'
      }
    ]);
    const state = {
      rewards: signal<Reward[]>([reward]),
      redemptions: redemptionsSignal,
      rewardUses: signal<RewardUse[]>([]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { rewards: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addRedemption } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    const result = await service.redeem(reward, 100, { start: '2026-02-01', end: '2026-02-28' });

    expect(result).toBe(false);
    expect(addRedemption).not.toHaveBeenCalled();
  });

  it('redeems reward when balance and limit allow', async () => {
    const addRedemption = vi.fn();
    const notifyLocalChange = vi.fn();
    const reward: Reward = {
      id: 'r1',
      profileId: 'p1',
      title: 'Reward',
      cost: 10,
      limitPerCycle: 3,
      createdAt: Date.now()
    };
    const state = {
      rewards: signal<Reward[]>([reward]),
      redemptions: signal<RewardRedemption[]>([]),
      rewardUses: signal<RewardUse[]>([]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { rewards: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addRedemption } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    const result = await service.redeem(reward, 100, { start: '2026-02-01', end: '2026-02-28' });

    expect(result).toBe(true);
    expect(addRedemption).toHaveBeenCalled();
    expect(notifyLocalChange).toHaveBeenCalled();
  });

  it('ignores consume when redemption already used', async () => {
    const addRewardUse = vi.fn();
    const state = {
      rewards: signal<Reward[]>([]),
      redemptions: signal<RewardRedemption[]>([]),
      rewardUses: signal<RewardUse[]>([{ id: 'use1', profileId: 'p1', redemptionId: 'red1', usedAt: 1 }]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { rewards: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addRewardUse } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    await service.consume({
      id: 'red1',
      profileId: 'p1',
      rewardId: 'r1',
      rewardTitle: 'Reward',
      cost: 10,
      redeemedAt: 1,
      date: '2026-02-01'
    });

    expect(addRewardUse).not.toHaveBeenCalled();
  });

  it('does not remove redemption when already used', async () => {
    const removeRedemption = vi.fn();
    const removeRewardUseByRedemption = vi.fn();
    const state = {
      rewards: signal<Reward[]>([]),
      redemptions: signal<RewardRedemption[]>([
        {
          id: 'red1',
          profileId: 'p1',
          rewardId: 'r1',
          rewardTitle: 'Reward',
          cost: 10,
          redeemedAt: 1,
          date: '2026-02-01'
        }
      ]),
      rewardUses: signal<RewardUse[]>([{ id: 'use1', profileId: 'p1', redemptionId: 'red1', usedAt: 1 }]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { rewards: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { removeRedemption, removeRewardUseByRedemption } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    await service.returnRedemption({
      id: 'red1',
      profileId: 'p1',
      rewardId: 'r1',
      rewardTitle: 'Reward',
      cost: 10,
      redeemedAt: 1,
      date: '2026-02-01'
    });

    expect(removeRedemption).not.toHaveBeenCalled();
    expect(removeRewardUseByRedemption).not.toHaveBeenCalled();
  });

  it('removes redemption and reward use when not used', async () => {
    const removeRedemption = vi.fn();
    const removeRewardUseByRedemption = vi.fn();
    const notifyLocalChange = vi.fn();
    const state = {
      rewards: signal<Reward[]>([]),
      redemptions: signal<RewardRedemption[]>([
        {
          id: 'red1',
          profileId: 'p1',
          rewardId: 'r1',
          rewardTitle: 'Reward',
          cost: 10,
          redeemedAt: 1,
          date: '2026-02-01'
        }
      ]),
      rewardUses: signal<RewardUse[]>([]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { rewards: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { removeRedemption, removeRewardUseByRedemption } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    await service.returnRedemption({
      id: 'red1',
      profileId: 'p1',
      rewardId: 'r1',
      rewardTitle: 'Reward',
      cost: 10,
      redeemedAt: 1,
      date: '2026-02-01'
    });

    expect(removeRedemption).toHaveBeenCalledWith('red1', 'p1');
    expect(removeRewardUseByRedemption).toHaveBeenCalledWith('red1');
    expect(notifyLocalChange).toHaveBeenCalled();
  });

  it('skips consume when active profile is missing', async () => {
    const addRewardUse = vi.fn();
    const state = {
      rewards: signal<Reward[]>([]),
      redemptions: signal<RewardRedemption[]>([]),
      rewardUses: signal<RewardUse[]>([]),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { rewards: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        RewardService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addRewardUse } },
        { provide: ProfileService, useValue: { activeProfileId: () => null } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informRewardLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(RewardService);
    await service.consume({
      id: 'red1',
      profileId: 'p1',
      rewardId: 'r1',
      rewardTitle: 'Reward',
      cost: 10,
      redeemedAt: 1,
      date: '2026-02-01'
    });

    expect(addRewardUse).not.toHaveBeenCalled();
  });
});
