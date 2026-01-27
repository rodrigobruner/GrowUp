import { computed, inject, Injectable, signal } from '@angular/core';
import { CycleService } from './cycle.service';
import { SessionStateService } from './session-state.service';

@Injectable({ providedIn: 'root' })
export class CalendarStateService {
  private readonly cycle = inject(CycleService);
  private readonly state = inject(SessionStateService);

  readonly selectedDate = signal(this.cycle.today());
  readonly todayKey = computed(() => this.cycle.today());

  readonly completedCount = computed(() =>
    this.state.completions().filter((completion) => completion.date === this.selectedDate()).length
  );

  readonly redeemedCount = computed(() => this.state.redemptions().length);

  readonly todayDoneIds = computed(() =>
    new Set(
      this.state.completions()
        .filter((completion) => completion.date === this.selectedDate())
        .map((completion) => completion.taskId)
    )
  );

  setSelectedDate(dateKey: string): void {
    this.selectedDate.set(dateKey);
  }

  goToToday(): void {
    this.selectedDate.set(this.cycle.today());
  }
}
