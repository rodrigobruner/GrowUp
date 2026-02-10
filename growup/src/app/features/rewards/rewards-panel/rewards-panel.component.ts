import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Reward } from '../../../core/models/reward';
import { RewardRedemption } from '../../../core/models/redemption';
import { RewardUse } from '../../../core/models/reward-use';

@Component({
  selector: 'app-rewards-panel',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatPaginatorModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './rewards-panel.component.html',
  styleUrl: './rewards-panel.component.scss'
})
export class RewardsPanelComponent {
  @Input({ required: true }) rewards: Reward[] = [];
  @Input({ required: true }) balance = 0;
  @Input({ required: true }) redemptions: RewardRedemption[] = [];
  @Input({ required: true }) rewardUses: RewardUse[] = [];
  @Input() loading = false;
  @Input({ required: true }) cycleStart = '';
  @Input({ required: true }) cycleEnd = '';
  @Input() advancedEnabled = true;
  @Input() maxRewards: number | null = null;
  @Input() showUsedTab: boolean | null = null;
  @Output() addReward = new EventEmitter<void>();
  @Output() redeemReward = new EventEmitter<Reward>();
  @Output() consumeReward = new EventEmitter<RewardRedemption>();
  @Output() returnRedemption = new EventEmitter<RewardRedemption>();
  @Output() removeReward = new EventEmitter<Reward>();
  private swipeStartX = 0;
  private swipeStartOffset = 0;
  private swipeActiveId: string | null = null;
  private swipeOffsets = signal<Record<string, number>>({});
  private readonly swipeMax = 72;
  private readonly swipeThreshold = 36;

  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];

  get reachedRewardLimit(): boolean {
    if (this.maxRewards === null) {
      return false;
    }
    return this.rewards.length >= this.maxRewards;
  }

  get shouldShowUsedTab(): boolean {
    return this.showUsedTab ?? this.advancedEnabled;
  }

  get availableRewards(): Reward[] {
    return this.rewards.filter((reward) => {
      return this.remainingForReward(reward) > 0;
    });
  }

  get redeemedRewards(): RewardRedemption[] {
    const usedIds = this.usedRedemptionIds;
    return this.redemptions
      .filter((redemption) => !usedIds.has(redemption.id))
      .sort((a, b) => b.redeemedAt - a.redeemedAt);
  }

  get pagedRedeemedRewards(): RewardRedemption[] {
    const start = this.pageIndex * this.pageSize;
    return this.redeemedRewards.slice(start, start + this.pageSize);
  }

  get usedRewards(): Array<{ redemption: RewardRedemption; usedAt: number }> {
    const useMap = new Map(this.rewardUses.map((use) => [use.redemptionId, use.usedAt]));
    return this.redemptions
      .filter((redemption) => useMap.has(redemption.id))
      .map((redemption) => ({ redemption, usedAt: useMap.get(redemption.id) ?? redemption.redeemedAt }))
      .sort((a, b) => b.usedAt - a.usedAt);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  swipeOffset(rewardId: string): number {
    return this.swipeOffsets()[rewardId] ?? 0;
  }

  onTouchStart(rewardId: string, event: TouchEvent): void {
    if (event.touches.length !== 1) {
      return;
    }
    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartOffset = this.swipeOffsets()[rewardId] ?? 0;
    this.swipeActiveId = rewardId;
    const offsets = this.swipeOffsets();
    const openId = Object.keys(offsets).find((id) => offsets[id] < 0 && id !== rewardId);
    if (openId) {
      this.setSwipeOffset(openId, 0);
    }
  }

  onTouchMove(rewardId: string, event: TouchEvent): void {
    if (this.swipeActiveId !== rewardId || event.touches.length !== 1) {
      return;
    }
    const delta = event.touches[0].clientX - this.swipeStartX;
    const next = this.swipeStartOffset + delta;
    const clamped = Math.min(0, Math.max(next, -this.swipeMax));
    this.setSwipeOffset(rewardId, clamped);
  }

  onTouchEnd(rewardId: string): void {
    if (this.swipeActiveId !== rewardId) {
      return;
    }
    const offset = this.swipeOffsets()[rewardId] ?? 0;
    const finalOffset = offset <= -this.swipeThreshold ? -this.swipeMax : 0;
    this.setSwipeOffset(rewardId, finalOffset);
    this.swipeActiveId = null;
  }

  clearSwipe(rewardId: string): void {
    this.setSwipeOffset(rewardId, 0);
  }

  remainingForReward(reward: Reward): number {
    const redeemedInCycle = this.redemptions.filter(
      (redemption) =>
        redemption.rewardId === reward.id &&
        redemption.date >= this.cycleStart &&
        redemption.date <= this.cycleEnd
    ).length;
    const limit = this.resolveLimitPerCycle(reward.limitPerCycle ?? 1);
    return Math.max(limit - redeemedInCycle, 0);
  }

  isUsed(redemption: RewardRedemption): boolean {
    return this.usedRedemptionIds.has(redemption.id);
  }

  private get usedRedemptionIds(): Set<string> {
    return new Set(this.rewardUses.map((use) => use.redemptionId));
  }

  private resolveLimitPerCycle(value: number): number {
    if (!this.advancedEnabled) {
      return 1;
    }
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private setSwipeOffset(rewardId: string, offset: number): void {
    this.swipeOffsets.update((current) => ({ ...current, [rewardId]: offset }));
  }
}
