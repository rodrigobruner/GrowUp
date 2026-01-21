import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { TaskDialogComponent, TaskDialogResult } from './task-dialog';
import { RewardDialogComponent, RewardDialogResult } from './reward-dialog';
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
    return `avatar/${avatarNumber}/level-${this.level()}.png`;
  });

  completedCount = computed(() => this.completions().filter((completion) => completion.date === this.today()).length);
  redeemedCount = computed(() => this.rewards().filter((reward) => reward.redeemedAt).length);
  todayDoneIds = computed(() => new Set(this.completions().filter((completion) => completion.date === this.today())
    .map((completion) => completion.taskId)));

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
    if (tasks.length === 0) {
      const seeded = await this.seedDefaultTasks();
      this.tasks.set(this.sortTasks(seeded));
    } else {
      this.tasks.set(this.sortTasks(tasks));
    }
    if (rewards.length === 0) {
      const seededRewards = await this.seedDefaultRewards();
      this.rewards.set(this.sortRewards(seededRewards));
    } else {
      this.rewards.set(this.sortRewards(rewards));
    }
    this.completions.set(completions);
    if (settings) {
      this.settings.set(settings);
    }
  }

  async addTask(): Promise<void> {
    await this.openTaskDialog();
  }

  async openTaskDialog(): Promise<void> {
    const dialogRef = this.dialog.open(TaskDialogComponent);
    const result = await firstValueFrom<TaskDialogResult | undefined>(dialogRef.afterClosed());
    if (!result) {
      return;
    }
    await this.addTaskFromDialog(result);
  }

  private async addTaskFromDialog(result: TaskDialogResult): Promise<void> {
    const rawTitle = result.title.trim();
    if (!rawTitle) {
      return;
    }
    const task: Task = {
      id: this.db.createId(),
      title: rawTitle,
      points: Number(result.points),
      createdAt: Date.now()
    };
    await this.db.addTask(task);
    this.tasks.update((items) => this.sortTasks([task, ...items]));
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
    await this.openRewardDialog();
  }

  async openRewardDialog(): Promise<void> {
    const dialogRef = this.dialog.open(RewardDialogComponent);
    const result = await firstValueFrom<RewardDialogResult | undefined>(dialogRef.afterClosed());
    if (!result) {
      return;
    }
    await this.addRewardFromDialog(result);
  }

  private async addRewardFromDialog(result: RewardDialogResult): Promise<void> {
    const rawTitle = result.title.trim();
    if (!rawTitle) {
      return;
    }
    const reward: Reward = {
      id: this.db.createId(),
      title: rawTitle,
      cost: Number(result.cost),
      createdAt: Date.now()
    };
    await this.db.addReward(reward);
    this.rewards.update((items) => this.sortRewards([reward, ...items]));
  }

  async redeemReward(reward: Reward): Promise<void> {
    if (reward.redeemedAt) {
      const updated: Reward = { ...reward, redeemedAt: undefined };
      await this.db.updateReward(updated);
      this.rewards.update((items) => items.map((item) => (item.id === reward.id ? updated : item)));
      return;
    }

    if (this.balance() < reward.cost) {
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

  private async seedDefaultTasks(): Promise<Task[]> {
    const language = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    const defaults = language.startsWith('pt') ? this.defaultTasksPt() : this.defaultTasksEn();
    const seeded = defaults.map((entry) => ({
      id: this.db.createId(),
      title: entry.title,
      points: entry.points,
      createdAt: Date.now()
    }));
    await Promise.all(seeded.map((task) => this.db.addTask(task)));
    return seeded;
  }

  private async seedDefaultRewards(): Promise<Reward[]> {
    const defaults = this.defaultRewardsEn();
    const seeded = defaults.map((entry) => ({
      id: this.db.createId(),
      title: entry.title,
      cost: entry.cost,
      createdAt: Date.now()
    }));
    await Promise.all(seeded.map((reward) => this.db.addReward(reward)));
    return seeded;
  }

  private defaultTasksPt(): Array<{ title: string; points: number }> {
    return [
      { title: '🎒 Organizar o material escolar e mochila', points: 1 },
      { title: '📖 Estudar', points: 3 },
      { title: '🚂 Guardar os brinquedos', points: 1 },
      { title: '🛏️ Arrumar a cama', points: 1 },
      { title: '☕️ Ajudar com a louça e lixo', points: 1 },
      { title: '🛀 Tomar banho e escovar os dentes', points: 1 },
      { title: '🙋🏻‍♂️ Ajudar o papai e a mamãe', points: 2 },
      { title: '😴 Ir para cama no horário', points: 1 },
      { title: '👍 Outras tarefas de casa', points: 1 },
      { title: '🍉 Eu experimentei', points: 4 }
    ];
  }

  private defaultTasksEn(): Array<{ title: string; points: number }> {
    return [
      { title: '🎒 Pack school supplies and backpack', points: 1 },
      { title: '📖 Study', points: 3 },
      { title: '🚂 Put away toys', points: 1 },
      { title: '🛏️ Make the bed', points: 1 },
      { title: '☕️ Help with dishes and trash', points: 1 },
      { title: '🛀 Shower and brush teeth', points: 1 },
      { title: '🙋🏻‍♂️ Help mom and dad', points: 2 },
      { title: '😴 Go to bed on time', points: 1 },
      { title: '👍 Other house chores', points: 1 },
      { title: '🍉 I tried a new food', points: 4 }
    ];
  }

  private defaultRewardsEn(): Array<{ title: string; cost: number }> {
    return [
      { title: '🎶 Choose the music in the car', cost: 10 },
      { title: '📚 Visit the library or bookstore', cost: 15 },
      { title: '♟️ Family game time', cost: 20 },
      { title: '🍿 Family movie night', cost: 20 },
      { title: '🎮 Extra video game time', cost: 30 },
      { title: '🍕 Special coffee/lunch/dinner', cost: 35 },
      { title: '🎥 Movie theater', cost: 50 },
      { title: '🍔 Eat out', cost: 50 }
    ];
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
