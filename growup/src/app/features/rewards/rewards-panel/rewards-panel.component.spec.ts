import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { describe, expect, it } from 'vitest';
import { RewardsPanelComponent } from './rewards-panel.component';
import { RewardRedemption } from '../../../core/models/redemption';
import { RewardUse } from '../../../core/models/reward-use';

describe('RewardsPanelComponent', () => {
  const baseInputs = {
    rewards: [],
    balance: 0,
    redemptions: [],
    rewardUses: [],
    cycleStart: '2026-02-01',
    cycleEnd: '2026-02-28'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RewardsPanelComponent, TranslateModule.forRoot()]
    }).compileComponents();
  });

  it('shows used tab when advanced rewards enabled', () => {
    const fixture = TestBed.createComponent(RewardsPanelComponent);
    Object.assign(fixture.componentInstance, baseInputs, { advancedEnabled: true });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('rewards.tabUsed');
  });

  it('hides used tab when explicitly disabled', () => {
    const fixture = TestBed.createComponent(RewardsPanelComponent);
    Object.assign(fixture.componentInstance, baseInputs, { advancedEnabled: true, showUsedTab: false });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('rewards.tabUsed');
  });

  it('paginates redeemed rewards based on page change', () => {
    const fixture = TestBed.createComponent(RewardsPanelComponent);
    const redemptions: RewardRedemption[] = [
      { id: 'r1', profileId: 'p1', rewardId: 'rw1', rewardTitle: 'A', cost: 10, redeemedAt: 3, date: '2026-02-01' },
      { id: 'r2', profileId: 'p1', rewardId: 'rw2', rewardTitle: 'B', cost: 10, redeemedAt: 2, date: '2026-02-02' }
    ];
    Object.assign(fixture.componentInstance, baseInputs, {
      redemptions,
      rewardUses: [] as RewardUse[]
    });

    fixture.componentInstance.pageSize = 1;
    fixture.componentInstance.onPageChange({ pageIndex: 1, pageSize: 1 } as any);

    expect(fixture.componentInstance.pagedRedeemedRewards).toHaveLength(1);
    expect(fixture.componentInstance.pagedRedeemedRewards[0].id).toBe('r2');
  });

  it('updates swipe offset on touch interactions', () => {
    const fixture = TestBed.createComponent(RewardsPanelComponent);
    Object.assign(fixture.componentInstance, baseInputs, {
      rewards: [{ id: 'rw1', profileId: 'p1', title: 'Reward', cost: 10, limitPerCycle: 1, createdAt: 1 }]
    });

    const component = fixture.componentInstance;
    const startEvent = { touches: [{ clientX: 100 }] } as unknown as TouchEvent;
    const moveEvent = { touches: [{ clientX: 40 }] } as unknown as TouchEvent;

    component.onTouchStart('rw1', startEvent);
    component.onTouchMove('rw1', moveEvent);
    component.onTouchEnd('rw1');

    expect(component.swipeOffset('rw1')).toBe(-72);
  });
});
