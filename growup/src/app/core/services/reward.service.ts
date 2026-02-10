import { inject, Injectable } from '@angular/core';
import { RewardDialogResult } from '../../features/rewards/reward-dialog/reward-dialog.component';
import { Reward } from '../models/reward';
import { RewardRedemption } from '../models/redemption';
import { RewardUse } from '../models/reward-use';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { SessionStateService } from './session-state.service';
import { SyncService } from './sync.service';
import { UiDialogsService } from './ui-dialogs.service';

@Injectable({ providedIn: 'root' })
export class RewardService {
  private readonly db = inject(GrowUpDbService);
  private readonly profileService = inject(ProfileService);
  private readonly state = inject(SessionStateService);
  private readonly sync = inject(SyncService);
  private readonly dialogs = inject(UiDialogsService);

  async addFromDialog(result: RewardDialogResult): Promise<Reward | null> {
    const rawTitle = result.title.trim();
    if (!rawTitle) {
      return null;
    }
    const profileId = this.profileService.activeProfileId();
    if (!profileId) {
      return null;
    }
    const maxRewards = this.resolveMaxRewards();
    if (maxRewards !== null) {
      const profileRewards = this.state.rewards().filter((reward) => reward.profileId === profileId).length;
      if (profileRewards >= maxRewards) {
        await this.dialogs.informRewardLimit(maxRewards);
        return null;
      }
    }
    const reward: Reward = {
      id: this.db.createId(),
      profileId,
      title: rawTitle,
      cost: Number(result.cost),
      limitPerCycle: this.resolveLimitPerCycle(Number(result.limitPerCycle)),
      createdAt: Date.now()
    };
    await this.db.addReward(reward);
    this.state.rewards.update((items) => this.sortRewards([reward, ...items]));
    this.sync.notifyLocalChange();
    return reward;
  }

  async redeem(reward: Reward, balance: number, range: { start: string; end: string }): Promise<boolean> {
    if (balance < reward.cost) {
      return false;
    }
    const redeemedInCycle = this.state.redemptions().filter(
      (redemption) =>
        redemption.rewardId === reward.id && redemption.date >= range.start && redemption.date <= range.end
    ).length;
    const limit = this.resolveLimitPerCycle(reward.limitPerCycle ?? 1);
    if (redeemedInCycle >= limit) {
      return false;
    }

    const redemption: RewardRedemption = {
      id: this.db.createId(),
      profileId: reward.profileId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      cost: reward.cost,
      redeemedAt: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    };
    await this.db.addRedemption(redemption);
    this.state.redemptions.update((items) => [redemption, ...items]);
    this.sync.notifyLocalChange();
    return true;
  }

  async consume(redemption: RewardRedemption): Promise<void> {
    const profileId = this.profileService.activeProfileId();
    if (!profileId) {
      return;
    }
    const alreadyUsed = this.state.rewardUses().some((use) => use.redemptionId === redemption.id);
    if (alreadyUsed) {
      return;
    }
    const rewardUse: RewardUse = {
      id: this.db.createId(),
      profileId,
      redemptionId: redemption.id,
      usedAt: Date.now()
    };
    await this.db.addRewardUse(rewardUse);
    this.state.rewardUses.update((items) => [rewardUse, ...items]);
    this.sync.notifyLocalChange();
  }

  async returnRedemption(redemption: RewardRedemption): Promise<void> {
    const isUsed = this.state.rewardUses().some((use) => use.redemptionId === redemption.id);
    if (isUsed) {
      return;
    }
    await this.db.removeRedemption(redemption.id, redemption.profileId);
    this.state.redemptions.update((items) => items.filter((item) => item.id !== redemption.id));
    await this.db.removeRewardUseByRedemption(redemption.id);
    this.state.rewardUses.update((items) => items.filter((item) => item.redemptionId !== redemption.id));
    this.sync.notifyLocalChange();
  }

  async remove(reward: Reward): Promise<void> {
    await this.db.removeReward(reward.id, reward.profileId);
    this.state.rewards.update((items) => items.filter((item) => item.id !== reward.id));
    this.sync.notifyLocalChange();
  }

  private sortRewards(items: Reward[]): Reward[] {
    return [...items]
      .map((reward) => ({ ...reward, limitPerCycle: this.resolveLimitPerCycle(reward.limitPerCycle ?? 1) }))
      .sort((a, b) => a.cost - b.cost);
  }

  private resolveLimitPerCycle(value: number): number {
    if (!this.isAdvancedEnabled()) {
      return 1;
    }
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private resolveMaxRewards(): number | null {
    return this.isAdvancedEnabled() ? null : 10;
  }

  private isAdvancedEnabled(): boolean {
    const flag = this.state.accountSettings().flags?.['rewards'];
    return this.resolveBooleanFlag(flag, false);
  }

  private resolveBooleanFlag(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }
    return fallback;
  }
}
