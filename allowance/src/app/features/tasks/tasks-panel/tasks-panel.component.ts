import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { Task } from '../../../core/services/allowance-db.service';

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
  styles: [
    `
      .panel {
        padding: 1.5rem;
        background: #ffffffeb;
        animation: fade-up 700ms ease both;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .panel-header h2 {
        margin-bottom: 0;
        align-self: center;
        line-height: 1;
      }

      .date-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0 auto;
        flex-wrap: wrap;
        align-self: center;
      }

      .date-controls mat-form-field {
        flex: 0 0 auto;
      }

      .today-button {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        height: 36px;
      }

      .date-field {
        width: 160px;
        align-self: center;
        display: flex;
        align-items: center;
      }

      .date-controls button[mat-icon-button] {
        height: 36px;
        width: 36px;
      }

      .date-field ::ng-deep .mat-mdc-text-field-wrapper {
        padding-inline: 8px;
        height: 36px;
      }

      .date-field ::ng-deep .mat-mdc-form-field-infix {
        padding: 0;
        min-height: 36px;
      }

      .date-field ::ng-deep .mat-mdc-input-element {
        height: 36px;
        line-height: 36px;
      }

      .date-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      .panel h2 {
        margin-top: 0;
        font-size: 1.4rem;
        font-family: 'Baloo 2', 'Comic Sans MS', cursive;
      }

      .add-fab {
        background: var(--app-gold);
        color: var(--app-ink);
        align-self: center;
      }

      .list-header {
        display: grid;
        grid-template-columns: 1.4fr 0.5fr 0.6fr 40px;
        gap: 0.75rem;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(19, 70, 134, 0.6);
        margin-bottom: 0.5rem;
      }

      .item-row {
        display: grid;
        grid-template-columns: 1.4fr 0.5fr 0.6fr 40px;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(19, 70, 134, 0.1);
      }

      .item-main {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .item-title {
        font-weight: 600;
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        color: inherit;
        cursor: pointer;
        font: inherit;
      }

      .check-toggle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #c7ceda;
        background: #ffffff;
        display: grid;
        place-items: center;
        color: #c7ceda;
        cursor: pointer;
        padding: 0;
      }

      .check-toggle .material-icons {
        font-size: 20px;
      }

      .check-toggle.done {
        border-color: #35b26b;
        color: #35b26b;
      }

      .status {
        font-size: 0.85rem;
        font-weight: 600;
        color: #d28a05;
      }

      .status.done {
        color: var(--app-primary);
      }

      .danger {
        color: var(--app-coral);
      }

      .empty-state {
        padding: 1rem 0;
        margin: 0;
        color: rgba(19, 70, 134, 0.6);
      }

      @media (max-width: 720px) {
        .date-controls {
          gap: 0.5rem;
          margin: 0;
        }

        .list-header {
          display: none;
        }

        .item-row {
          grid-template-columns: 1fr;
          align-items: start;
        }

        .item-row span {
          margin-left: 2.5rem;
        }
      }
    `
  ]
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
