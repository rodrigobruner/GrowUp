import { computed, inject, Injectable } from '@angular/core';
import { CycleService } from './cycle.service';
import { CycleLabelService } from './cycle-label.service';
import { SessionStateService } from './session-state.service';

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private readonly state = inject(SessionStateService);
  private readonly cycle = inject(CycleService);
  private readonly labels = inject(CycleLabelService);

  readonly earned = computed(() =>
    this.state.completions().reduce((sum, completion) => sum + completion.points, 0)
  );

  readonly spent = computed(() =>
    this.state.redemptions().reduce((sum, redemption) => sum + redemption.cost, 0)
  );

  readonly balance = computed(() => this.earned() - this.spent());

  readonly cycleRange = computed(() => this.cycle.getCycleRange(this.state.settings()));

  readonly cycleEarned = computed(() => {
    const { start, end } = this.cycleRange();
    return this.state.completions()
      .filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });

  readonly previousCycleRange = computed(() => this.cycle.getPreviousCycleRange(this.state.settings()));

  readonly previousCycleEarned = computed(() => {
    const range = this.previousCycleRange();
    if (!range) {
      return null;
    }
    const { start, end } = range;
    return this.state.completions()
      .filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });

  readonly cycleLabel = computed(() => this.labels.cycleLabel(this.state.settings().cycleType));

  readonly cycleRangeLabel = computed(() => {
    const { start, end } = this.cycleRange();
    return `${this.cycle.formatDate(start)} - ${this.cycle.formatDate(end)}`;
  });

  readonly previousCycleLabel = computed(() => {
    const range = this.previousCycleRange();
    if (!range) {
      return '';
    }
    return `${this.cycle.formatDate(range.start)} - ${this.cycle.formatDate(range.end)}`;
  });

  readonly level = computed(() => Math.floor(this.earned() / this.state.settings().levelUpPoints) + 1);

  readonly xpIntoLevel = computed(() => this.earned() % this.state.settings().levelUpPoints);

  readonly xpToNext = computed(() => this.state.settings().levelUpPoints - this.xpIntoLevel());

  readonly progressPercent = computed(() => (this.xpIntoLevel() / this.state.settings().levelUpPoints) * 100);
}
