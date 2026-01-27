import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { Task } from '../../../core/models/task';

@Component({
  selector: 'app-tasks-panel',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    TranslateModule
  ],
  templateUrl: './tasks-panel.component.html',
  styleUrl: './tasks-panel.component.scss'
})
export class TasksPanelComponent {
  @Input({ required: true }) tasks: Task[] = [];
  @Input({ required: true }) todayDoneIds = new Set<string>();
  @Input({ required: true }) selectedDate = '';
  @Input({ required: true }) todayKey = '';
  @Output() addTask = new EventEmitter<void>();
  @Output() toggleTask = new EventEmitter<Task>();
  @Output() removeTask = new EventEmitter<Task>();
  @Output() selectedDateChange = new EventEmitter<string>();

  get selectedDateValue(): Date | null {
    return this.parseDateKey(this.selectedDate);
  }

  get maxDate(): Date | null {
    return this.parseDateKey(this.todayKey);
  }

  goPreviousDay(): void {
    const base = this.selectedDateValue ?? new Date();
    const next = new Date(base);
    next.setDate(base.getDate() - 1);
    this.emitDate(next);
  }

  goToday(): void {
    if (!this.todayKey) {
      return;
    }
    const today = this.parseDateKey(this.todayKey);
    if (today) {
      this.emitDate(today);
    }
  }

  onDateChange(date: Date | null): void {
    if (!date) {
      return;
    }
    this.emitDate(date);
  }

  private emitDate(date: Date): void {
    const key = this.toDateKey(date);
    if (key !== this.selectedDate) {
      this.selectedDateChange.emit(key);
    }
  }

  private parseDateKey(value: string): Date | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
