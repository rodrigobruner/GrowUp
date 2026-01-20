import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AllowanceDbService, Completion, Reward, Settings, Task } from './allowance-db.service';
import { SettingsDialogComponent } from './settings-dialog';
import { firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const currentDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  tasks = signal<Task[]>([]);
  rewards = signal<Reward[]>([]);
  completions = signal<Completion[]>([]);
  settings = signal<Settings>({
    id: 'global',
    cycleType: 'weekly',
    cycleStartDate: currentDateKey()
  });

  earned = computed(() => this.completions().reduce((sum, completion) => sum + completion.points, 0));
  spent = computed(() =>
    this.rewards()
      .filter((reward) => reward.redeemedAt)
      .reduce((sum, reward) => sum + reward.cost, 0)
  );
  balance = computed(() => this.earned() - this.spent());
  cycleEarned = computed(() => {
    const { start, end } = this.getCycleRange();
    return this.completions().filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });
  previousCycleEarned = computed(() => {
    const range = this.getPreviousCycleRange();
    if (!range) {
      return null;
    }
    const { start, end } = range;
    return this.completions().filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });
  previousCycleLabel = computed(() => {
    const range = this.getPreviousCycleRange();
    if (!range) {
      return '';
    }
    return `${this.formatDate(range.start)} - ${this.formatDate(range.end)}`;
  });
  level = computed(() => Math.floor(this.earned() / 100) + 1);
  xpIntoLevel = computed(() => this.earned() % 100);
  xpToNext = computed(() => 100 - this.xpIntoLevel());
  progressPercent = computed(() => (this.xpIntoLevel() / 100) * 100);
  avatarSrc = computed(() => {
    const avatarNumber = '01';
    return `/avatar/${avatarNumber}/level-${this.level()}.png`;
  });

  completedCount = computed(() => this.completions().filter((completion) => completion.date === this.today()).length);
  redeemedCount = computed(() => this.rewards().filter((reward) => reward.redeemedAt).length);
  todayDoneIds = computed(() => new Set(this.completions().filter((completion) => completion.date === this.today())
    .map((completion) => completion.taskId)));

  private readonly formBuilder = inject(NonNullableFormBuilder);

  taskForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    points: [5, [Validators.required, Validators.min(1)]]
  });

  rewardForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    cost: [10, [Validators.required, Validators.min(1)]]
  });

  constructor(
    private readonly db: AllowanceDbService,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService
  ) {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  async ngOnInit(): Promise<void> {
    const [tasks, rewards, completions, settings] = await Promise.all([
      this.db.getTasks(),
      this.db.getRewards(),
      this.db.getCompletions(),
      this.db.getSettings()
    ]);
    this.tasks.set(this.sortTasks(tasks));
    this.rewards.set(this.sortRewards(rewards));
    this.completions.set(completions);
    if (settings) {
      this.settings.set(settings);
    }
  }

  async addTask(): Promise<void> {
    if (this.taskForm.invalid) {
      return;
    }

    const rawTitle = this.taskForm.getRawValue().title.trim();
    const points = this.taskForm.getRawValue().points;
    if (!rawTitle) {
      return;
    }
    const task: Task = {
      id: this.db.createId(),
      title: rawTitle,
      points: Number(points),
      createdAt: Date.now()
    };

    await this.db.addTask(task);
    this.tasks.update((items) => this.sortTasks([task, ...items]));
    this.taskForm.reset({ title: '', points: 5 });
  }

  async toggleTask(task: Task): Promise<void> {
    const date = this.today();
    const completionId = `${task.id}-${date}`;
    const alreadyDone = this.todayDoneIds().has(task.id);
    if (alreadyDone) {
      await this.db.removeCompletion(completionId);
      this.completions.update((items) => items.filter((item) => item.id !== completionId));
      return;
    }

    const completion: Completion = {
      id: completionId,
      taskId: task.id,
      date,
      points: task.points
    };
    await this.db.addCompletion(completion);
    this.completions.update((items) => [completion, ...items]);
  }

  async removeTask(task: Task): Promise<void> {
    await this.db.removeTask(task.id);
    await this.db.removeCompletionsForTask(task.id);
    this.tasks.update((items) => items.filter((item) => item.id !== task.id));
    this.completions.update((items) => items.filter((item) => item.taskId !== task.id));
  }

  async addReward(): Promise<void> {
    if (this.rewardForm.invalid) {
      return;
    }

    const rawTitle = this.rewardForm.getRawValue().title.trim();
    const cost = this.rewardForm.getRawValue().cost;
    if (!rawTitle) {
      return;
    }
    const reward: Reward = {
      id: this.db.createId(),
      title: rawTitle,
      cost: Number(cost),
      createdAt: Date.now()
    };

    await this.db.addReward(reward);
    this.rewards.update((items) => this.sortRewards([reward, ...items]));
    this.rewardForm.reset({ title: '', cost: 10 });
  }

  async redeemReward(reward: Reward): Promise<void> {
    if (reward.redeemedAt || this.balance() < reward.cost) {
      return;
    }

    const updated: Reward = { ...reward, redeemedAt: Date.now() };
    await this.db.updateReward(updated);
    this.rewards.update((items) => items.map((item) => (item.id === reward.id ? updated : item)));
  }

  async removeReward(reward: Reward): Promise<void> {
    await this.db.removeReward(reward.id);
    this.rewards.update((items) => items.filter((item) => item.id !== reward.id));
  }

  async openSettings(): Promise<void> {
    const dialogRef = this.dialog.open(SettingsDialogComponent);
    dialogRef.componentInstance.setSettings(this.settings());
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      return;
    }
    const settings: Settings = { id: 'global', ...result };
    await this.db.saveSettings(settings);
    this.settings.set(settings);
  }

  cycleLabel(): string {
    const keyMap: Record<Settings['cycleType'], string> = {
      weekly: 'cycle.weekly',
      biweekly: 'cycle.biweekly',
      monthly: 'cycle.monthly',
      yearly: 'cycle.yearly'
    };
    return this.translate.instant(keyMap[this.settings().cycleType]);
  }

  cycleRangeLabel(): string {
    const { start, end } = this.getCycleRange();
    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  setLanguage(language: 'en' | 'pt'): void {
    this.translate.use(language);
  }

  private sortTasks(items: Task[]): Task[] {
    return [...items].sort((a, b) => b.points - a.points);
  }

  private sortRewards(items: Reward[]): Reward[] {
    return [...items].sort((a, b) => a.cost - b.cost);
  }

  private getCycleRange(): { start: string; end: string } {
    const { cycleType, cycleStartDate } = this.settings();
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

  private getPreviousCycleRange(): { start: string; end: string } | null {
    const current = this.getCycleRange();
    const start = new Date(current.start);
    if (isNaN(start.getTime())) {
      return null;
    }
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    if (previousEnd.getTime() < new Date(this.settings().cycleStartDate).getTime()) {
      return null;
    }
    const previousStart = new Date(previousEnd);
    const { cycleType } = this.settings();

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

  private today(): string {
    return this.toDateKey(new Date());
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private clampDay(day: number, year: number, month: number): number {
    return Math.min(day, new Date(year, month + 1, 0).getDate());
  }

  private formatDate(dateKey: string): string {
    const [year, month, day] = dateKey.split('-');
    return `${day}/${month}/${year}`;
  }
}
