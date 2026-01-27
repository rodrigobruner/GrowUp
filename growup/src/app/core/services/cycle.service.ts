import { Injectable } from '@angular/core';
import { Settings } from '../models/settings';

@Injectable({ providedIn: 'root' })
export class CycleService {
  getCycleRange(settings: Settings): { start: string; end: string } {
    const { cycleType, cycleStartDate } = settings;
    const today = new Date(this.today());
    const startAnchor = new Date(cycleStartDate);

    if (cycleType === 'weekly' || cycleType === 'biweekly') {
      const length = cycleType === 'weekly' ? 7 : 14;
      const diffDays = Math.floor((today.getTime() - startAnchor.getTime()) / 86400000);
      const cycleIndex = diffDays >= 0 ? Math.floor(diffDays / length) : 0;
      const start = new Date(startAnchor);
      start.setDate(start.getDate() + cycleIndex * length);
      const end = new Date(start);
      end.setDate(end.getDate() + length - 1);
      return { start: this.toDateKey(start), end: this.toDateKey(end) };
    }

    if (cycleType === 'monthly') {
      const startDay = startAnchor.getDate();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDate = this.clampDay(startDay, start.getFullYear(), start.getMonth());
      start.setDate(startDate);
      if (today < start) {
        start.setMonth(start.getMonth() - 1);
        start.setDate(this.clampDay(startDay, start.getFullYear(), start.getMonth()));
      }
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      return { start: this.toDateKey(start), end: this.toDateKey(end) };
    }

    const startMonth = startAnchor.getMonth();
    const startDay = startAnchor.getDate();
    let start = new Date(today.getFullYear(), startMonth, 1);
    start.setDate(this.clampDay(startDay, start.getFullYear(), startMonth));
    if (today < start) {
      start = new Date(today.getFullYear() - 1, startMonth, 1);
      start.setDate(this.clampDay(startDay, start.getFullYear(), startMonth));
    }
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    return { start: this.toDateKey(start), end: this.toDateKey(end) };
  }

  getPreviousCycleRange(settings: Settings): { start: string; end: string } | null {
    const current = this.getCycleRange(settings);
    const start = new Date(current.start);
    if (isNaN(start.getTime())) {
      return null;
    }
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    if (previousEnd.getTime() < new Date(settings.cycleStartDate).getTime()) {
      return null;
    }
    const previousStart = new Date(previousEnd);
    const { cycleType } = settings;

    if (cycleType === 'weekly') {
      previousStart.setDate(previousStart.getDate() - 6);
    } else if (cycleType === 'biweekly') {
      previousStart.setDate(previousStart.getDate() - 13);
    } else if (cycleType === 'monthly') {
      previousStart.setMonth(previousStart.getMonth() - 1);
      previousStart.setDate(previousStart.getDate() + 1);
    } else {
      previousStart.setFullYear(previousStart.getFullYear() - 1);
      previousStart.setDate(previousStart.getDate() + 1);
    }

    return { start: this.toDateKey(previousStart), end: this.toDateKey(previousEnd) };
  }

  today(): string {
    return this.toDateKey(new Date());
  }

  toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  clampDay(day: number, year: number, month: number): number {
    return Math.min(day, new Date(year, month + 1, 0).getDate());
  }

  formatDate(dateKey: string): string {
    const [year, month, day] = dateKey.split('-');
    return `${day}/${month}/${year}`;
  }
}
