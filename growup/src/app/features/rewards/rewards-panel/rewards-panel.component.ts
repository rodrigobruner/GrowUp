import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { Reward, RewardRedemption } from '../../../core/services/growup-db.service';

@Component({
  selector: 'app-rewards-panel',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatPaginatorModule,
    TranslateModule
  ],
  templateUrl: './rewards-panel.component.html',
  styleUrl: './rewards-panel.component.scss'
})
export class RewardsPanelComponent {
  @Input({ required: true }) rewards: Reward[] = [];
  @Input({ required: true }) balance = 0;
  @Input({ required: true }) redemptions: RewardRedemption[] = [];
  @Input({ required: true }) cycleStart = '';
  @Input({ required: true }) cycleEnd = '';
  @Output() addReward = new EventEmitter<void>();
  @Output() redeemReward = new EventEmitter<Reward>();
  @Output() consumeReward = new EventEmitter<RewardRedemption>();
  @Output() removeReward = new EventEmitter<Reward>();

  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];

  get availableRewards(): Reward[] {
    return this.rewards.filter((reward) => {
      return this.remainingForReward(reward) > 0;
    });
  }

  get redeemedRewards(): RewardRedemption[] {
    return [...this.redemptions].sort((a, b) => b.redeemedAt - a.redeemedAt);
  }

  get pagedRedeemedRewards(): RewardRedemption[] {
    const start = this.pageIndex * this.pageSize;
    return this.redeemedRewards.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  remainingForReward(reward: Reward): number {
    const redeemedInCycle = this.redemptions.filter(
      (redemption) =>
        redemption.rewardId === reward.id &&
        redemption.date >= this.cycleStart &&
        redemption.date <= this.cycleEnd
    ).length;
    const limit = reward.limitPerCycle ?? 1;
    return Math.max(limit - redeemedInCycle, 0);
  }
}
