import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { SummaryService } from './summary.service';
import { SessionStateService } from './session-state.service';
import { CycleService } from './cycle.service';
import { CycleLabelService } from './cycle-label.service';

describe('SummaryService', () => {
  it('computes earned, spent and balance', () => {
    const state = {
      completions: signal([
        { id: 'c1', profileId: 'p1', taskId: 't1', date: '2026-02-01', points: 10 },
        { id: 'c2', profileId: 'p1', taskId: 't2', date: '2026-02-02', points: 30 }
      ]),
      redemptions: signal([
        { id: 'r1', profileId: 'p1', rewardId: 'rw1', rewardTitle: 'Reward', cost: 15, redeemedAt: 1, date: '2026-02-02' }
      ]),
      settings: signal({ levelUpPoints: 100, cycleType: 'monthly' })
    } as unknown as SessionStateService;

    const cycle = {
      getCycleRange: () => ({ start: '2026-02-01', end: '2026-02-28' }),
      getPreviousCycleRange: () => ({ start: '2026-01-01', end: '2026-01-31' }),
      formatDate: (date: string) => date
    } as unknown as CycleService;

    const labels = { cycleLabel: (type: string) => `label-${type}` } as CycleLabelService;

    TestBed.configureTestingModule({
      providers: [
        SummaryService,
        { provide: SessionStateService, useValue: state },
        { provide: CycleService, useValue: cycle },
        { provide: CycleLabelService, useValue: labels }
      ]
    });

    const service = TestBed.inject(SummaryService);

    expect(service.earned()).toBe(40);
    expect(service.spent()).toBe(15);
    expect(service.balance()).toBe(25);
    expect(service.cycleLabel()).toBe('label-monthly');
    expect(service.cycleRangeLabel()).toBe('2026-02-01 - 2026-02-28');
    expect(service.level()).toBe(1);
    expect(service.xpIntoLevel()).toBe(40);
    expect(service.xpToNext()).toBe(60);
    expect(service.progressPercent()).toBe(40);
  });

  it('returns null previousCycleEarned when no previous range', () => {
    const state = {
      completions: signal([]),
      redemptions: signal([]),
      settings: signal({ levelUpPoints: 100, cycleType: 'weekly' })
    } as unknown as SessionStateService;

    const cycle = {
      getCycleRange: () => ({ start: '2026-02-01', end: '2026-02-07' }),
      getPreviousCycleRange: () => null,
      formatDate: (date: string) => date
    } as unknown as CycleService;

    const labels = { cycleLabel: (type: string) => `label-${type}` } as CycleLabelService;

    TestBed.configureTestingModule({
      providers: [
        SummaryService,
        { provide: SessionStateService, useValue: state },
        { provide: CycleService, useValue: cycle },
        { provide: CycleLabelService, useValue: labels }
      ]
    });

    const service = TestBed.inject(SummaryService);

    expect(service.previousCycleEarned()).toBeNull();
    expect(service.previousCycleLabel()).toBe('');
  });

  it('computes cycleEarned within range and previousCycleEarned', () => {
    const state = {
      completions: signal([
        { id: 'c1', profileId: 'p1', taskId: 't1', date: '2026-02-01', points: 10 },
        { id: 'c2', profileId: 'p1', taskId: 't2', date: '2026-02-05', points: 20 },
        { id: 'c3', profileId: 'p1', taskId: 't3', date: '2026-01-28', points: 5 }
      ]),
      redemptions: signal([]),
      settings: signal({ levelUpPoints: 100, cycleType: 'weekly' })
    } as unknown as SessionStateService;

    const cycle = {
      getCycleRange: () => ({ start: '2026-02-01', end: '2026-02-07' }),
      getPreviousCycleRange: () => ({ start: '2026-01-25', end: '2026-01-31' }),
      formatDate: (date: string) => date
    } as unknown as CycleService;

    const labels = { cycleLabel: (type: string) => `label-${type}` } as CycleLabelService;

    TestBed.configureTestingModule({
      providers: [
        SummaryService,
        { provide: SessionStateService, useValue: state },
        { provide: CycleService, useValue: cycle },
        { provide: CycleLabelService, useValue: labels }
      ]
    });

    const service = TestBed.inject(SummaryService);

    expect(service.cycleEarned()).toBe(30);
    expect(service.previousCycleEarned()).toBe(5);
  });
});
