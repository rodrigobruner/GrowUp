import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
  AccountSettings,
  Completion,
  GrowUpDbService,
  Profile,
  Reward,
  RewardRedemption,
  Settings,
  Task
} from './core/services/growup-db.service';
import { AuthService } from './core/services/auth.service';
import { SyncService } from './core/services/sync.service';
import { ResetPasswordDialogComponent } from './features/auth/reset-password-dialog/reset-password-dialog.component';
import { AuthErrorDialogComponent } from './features/auth/auth-error-dialog/auth-error-dialog.component';
import { SettingsDialogComponent } from './features/settings/settings-dialog/settings-dialog.component';
import { TaskDialogComponent, TaskDialogResult } from './features/tasks/task-dialog/task-dialog.component';
import { RewardDialogComponent, RewardDialogResult } from './features/rewards/reward-dialog/reward-dialog.component';
import { firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SummaryCardComponent } from './features/summary/summary-card/summary-card.component';
import { TasksPanelComponent } from './features/tasks/tasks-panel/tasks-panel.component';
import { RewardsPanelComponent } from './features/rewards/rewards-panel/rewards-panel.component';
import { LevelupDialogComponent } from './features/levelup/levelup-dialog/levelup-dialog.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { environment } from '../environments/environment';
import { ProfileDialogComponent } from './features/profiles/profile-dialog/profile-dialog.component';

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
    MatDialogModule,
    MatSidenavModule,
    TopbarComponent,
    SummaryCardComponent,
    TasksPanelComponent,
    RewardsPanelComponent,
    SettingsDialogComponent,
    ProfileDialogComponent,
    TranslateModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  tasks = signal<Task[]>([]);
  rewards = signal<Reward[]>([]);
  completions = signal<Completion[]>([]);
  redemptions = signal<RewardRedemption[]>([]);
  settings = signal<Settings>({
    id: 'profile',
    profileId: 'profile',
    cycleType: 'weekly',
    cycleStartDate: currentDateKey(),
    levelUpPoints: 100,
    avatarId: '01',
    displayName: ''
  });
  accountSettings = signal<AccountSettings>({
    id: 'account',
    language: 'en'
  });
  profiles = signal<Profile[]>([]);
  activeProfileId = signal<string | null>(null);

  earned = computed(() => this.completions().reduce((sum, completion) => sum + completion.points, 0));
  spent = computed(() => this.redemptions().reduce((sum, redemption) => sum + redemption.cost, 0));
  balance = computed(() => this.earned() - this.spent());
  cycleEarned = computed(() => {
    const { start, end } = this.getCycleRange();
    return this.completions().filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });
  currentCycleRange = computed(() => this.getCycleRange());
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
  level = computed(() => Math.floor(this.earned() / this.settings().levelUpPoints) + 1);
  xpIntoLevel = computed(() => this.earned() % this.settings().levelUpPoints);
  xpToNext = computed(() => this.settings().levelUpPoints - this.xpIntoLevel());
  progressPercent = computed(() => (this.xpIntoLevel() / this.settings().levelUpPoints) * 100);
  avatarSrc = computed(() => {
    const avatarNumber = this.settings().avatarId || '01';
    return `assets/avatar/${avatarNumber}/level-${this.level()}.png`;
  });
  currentYear = new Date().getFullYear();
  buildTime = environment.buildTime;

  selectedDate = signal(this.today());
  todayKey = computed(() => this.today());
  completedCount = computed(() =>
    this.completions().filter((completion) => completion.date === this.selectedDate()).length
  );
  redeemedCount = computed(() => this.redemptions().length);
  todayDoneIds = computed(() =>
    new Set(
      this.completions()
        .filter((completion) => completion.date === this.selectedDate())
        .map((completion) => completion.taskId)
    )
  );

  private resetDialogOpen = false;
  private errorDialogOpen = false;
  private tasksSeeded = new Set<string>();
  private rewardsSeeded = new Set<string>();
  private isRefreshing = false;
  private pendingRefresh = false;
  settingsOpen = signal(false);
  profileOpen = signal(false);
  profileMode = signal<'create' | 'edit'>('edit');
  private lastRefreshSeed = false;
  readonly isOnline = signal(navigator.onLine);

  constructor(
    private readonly db: GrowUpDbService,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService,
    private readonly auth: AuthService,
    public readonly sync: SyncService
  ) {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
    effect(() => {
      if (this.auth.needsPasswordReset() && !this.resetDialogOpen) {
        this.resetDialogOpen = true;
        this.dialog.open(ResetPasswordDialogComponent, {
          disableClose: true
        });
      }
    });
    effect(() => {
      const error = this.auth.authError();
      if (error && !this.errorDialogOpen) {
        this.errorDialogOpen = true;
        const ref = this.dialog.open(AuthErrorDialogComponent, {
          data: error
        });
        ref.afterClosed().subscribe(() => {
          this.errorDialogOpen = false;
          this.auth.clearAuthError();
        });
      }
    });
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.sync.start();
        if (this.isOnline()) {
          this.sync.syncAll();
        }
      } else {
        this.sync.stop();
      }
    });
    effect(() => {
      if (this.auth.isLoggedIn() && this.isOnline()) {
        this.sync.syncAll();
      }
    });
    effect(() => {
      const lastSyncAt = this.sync.lastSyncAt();
      if (!this.auth.isLoggedIn() || !lastSyncAt) {
        return;
      }
      void this.refreshFromDb(true);
    });
    effect(() => {
      const tick = this.sync.refreshTick();
      if (!this.auth.isLoggedIn() || tick === 0) {
        return;
      }
      void this.refreshFromDb(true);
    });
    effect(() => {
      const user = this.auth.user();
      this.db.setUser(user?.id ?? null);
      void this.refreshFromDb(!user);
    });

    const swUpdate = inject(SwUpdate, { optional: true });
    if (swUpdate?.isEnabled) {
      swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          void swUpdate.activateUpdate().then(() => window.location.reload());
        }
      });
    }
  }

  async ngOnInit(): Promise<void> {
    await this.refreshFromDb(!this.auth.isLoggedIn());
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
    const profileId = this.activeProfileId();
    if (!profileId) {
      return;
    }
    const task: Task = {
      id: this.db.createId(),
      profileId,
      title: rawTitle,
      points: Number(result.points),
      createdAt: Date.now()
    };
    await this.db.addTask(task);
    this.tasks.update((items) => this.sortTasks([task, ...items]));
    this.maybeSync();
  }

  async toggleTask(task: Task): Promise<void> {
    const date = this.selectedDate();
    const completionId = `${task.profileId}-${task.id}-${date}`;
    const alreadyDone = this.todayDoneIds().has(task.id);
    if (alreadyDone) {
      await this.db.removeCompletion(completionId, task.profileId);
      this.completions.update((items) => items.filter((item) => item.id !== completionId));
      this.maybeSync();
      return;
    }

    const currentEarned = this.earned();
    const previousLevel = this.level();
    const completion: Completion = {
      id: completionId,
      profileId: task.profileId,
      taskId: task.id,
      date,
      points: task.points
    };
    await this.db.addCompletion(completion);
    this.completions.update((items) => [completion, ...items]);
    this.maybeSync();
    const nextLevel = Math.floor((currentEarned + task.points) / this.settings().levelUpPoints) + 1;
    if (nextLevel > previousLevel) {
      this.showLevelUp();
    }
  }

  async removeTask(task: Task): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: this.translate.instant('confirm.deleteTaskTitle'),
          message: this.translate.instant('confirm.deleteTaskMessage', { title: task.title }),
          confirmLabel: this.translate.instant('confirm.confirm'),
          cancelLabel: this.translate.instant('confirm.cancel')
        }
      }).afterClosed()
    );
    if (!confirmed) {
      return;
    }
    await this.db.removeTask(task.id, task.profileId);
    await this.db.removeCompletionsForTask(task.id, task.profileId);
    this.tasks.update((items) => items.filter((item) => item.id !== task.id));
    this.completions.update((items) => items.filter((item) => item.taskId !== task.id));
    this.maybeSync();
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
    const profileId = this.activeProfileId();
    if (!profileId) {
      return;
    }
    const reward: Reward = {
      id: this.db.createId(),
      profileId,
      title: rawTitle,
      cost: Number(result.cost),
      limitPerCycle: Number(result.limitPerCycle),
      createdAt: Date.now()
    };
    await this.db.addReward(reward);
    this.rewards.update((items) => this.sortRewards([reward, ...items]));
    this.maybeSync();
  }

  async redeemReward(reward: Reward): Promise<void> {
    if (this.balance() < reward.cost) {
      return;
    }

    const { start, end } = this.getCycleRange();
    const redeemedInCycle = this.redemptions().filter(
      (redemption) =>
        redemption.rewardId === reward.id && redemption.date >= start && redemption.date <= end
    ).length;
    const limit = reward.limitPerCycle ?? 1;
    if (redeemedInCycle >= limit) {
      return;
    }

    const redemption: RewardRedemption = {
      id: this.db.createId(),
      profileId: reward.profileId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      cost: reward.cost,
      redeemedAt: Date.now(),
      date: this.today()
    };
    await this.db.addRedemption(redemption);
    this.redemptions.update((items) => [redemption, ...items]);
    this.maybeSync();
  }

  async consumeReward(redemption: RewardRedemption): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: this.translate.instant('confirm.useRedemptionTitle'),
          message: this.translate.instant('confirm.useRedemptionMessage', { title: redemption.rewardTitle }),
          confirmLabel: this.translate.instant('confirm.use'),
          cancelLabel: this.translate.instant('confirm.cancel')
        }
      }).afterClosed()
    );
    if (!confirmed) {
      return;
    }
    await this.db.removeRedemption(redemption.id, redemption.profileId);
    this.redemptions.update((items) => items.filter((item) => item.id !== redemption.id));
    this.maybeSync();
  }

  async removeReward(reward: Reward): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: this.translate.instant('confirm.deleteRewardTitle'),
          message: this.translate.instant('confirm.deleteRewardMessage', { title: reward.title }),
          confirmLabel: this.translate.instant('confirm.confirm'),
          cancelLabel: this.translate.instant('confirm.cancel')
        }
      }).afterClosed()
    );
    if (!confirmed) {
      return;
    }
    await this.db.removeReward(reward.id, reward.profileId);
    this.rewards.update((items) => items.filter((item) => item.id !== reward.id));
    this.maybeSync();
  }

  openSettings(): void {
    this.profileOpen.set(false);
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  async saveSettings(result: {
    language: AccountSettings['language'];
    profile: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>;
  }): Promise<void> {
    const accountSettings: AccountSettings = { ...this.accountSettings(), language: result.language, id: 'account' };
    await this.db.saveAccountSettings(accountSettings);
    this.accountSettings.set(accountSettings);
    this.translate.use(accountSettings.language);

    const profileId = this.activeProfileId();
    if (profileId) {
      const profile: Profile = {
        id: profileId,
        displayName: result.profile.displayName ?? '',
        avatarId: result.profile.avatarId ?? '01',
        createdAt: this.profiles().find((item) => item.id === profileId)?.createdAt ?? Date.now()
      };
      await this.db.updateProfile(profile);
      this.profiles.update((items) => items.map((item) => (item.id === profileId ? { ...item, ...profile } : item)));

      const settings: Settings = {
        ...this.settings(),
        ...result.profile,
        id: profileId,
        profileId
      };
      await this.db.saveSettings(settings);
      this.settings.set(settings);
    }
    this.maybeSync();
    this.settingsOpen.set(false);
  }

  openProfile(): void {
    this.profileMode.set('edit');
    this.settingsOpen.set(false);
    this.profileOpen.set(true);
  }

  openCreateProfile(): void {
    this.profileMode.set('create');
    this.settingsOpen.set(false);
    this.profileOpen.set(true);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  async saveProfile(
    result: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>
  ): Promise<void> {
    const mode = this.profileMode();
    const profileId = mode === 'create' ? this.db.createId() : this.activeProfileId();
    if (!profileId) {
      return;
    }

    const rawName = (result.displayName ?? '').trim();
    const nameKey = rawName.toLowerCase();
    if (mode === 'create') {
      const exists = this.profiles().some((profile) => profile.displayName.trim().toLowerCase() === nameKey);
      if (exists) {
        this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: this.translate.instant('profiles.duplicateTitle'),
            message: this.translate.instant('profiles.duplicateMessage'),
            confirmLabel: this.translate.instant('profiles.ok')
          }
        });
        return;
      }
    }

    const profile: Profile = {
      id: profileId,
      displayName: rawName,
      avatarId: result.avatarId ?? '01',
      createdAt: mode === 'create' ? Date.now() : (this.profiles().find((p) => p.id === profileId)?.createdAt ?? Date.now())
    };

    if (mode === 'create') {
      await this.db.addProfile(profile);
      this.profiles.update((items) => [...items, profile]);
      this.activeProfileId.set(profileId);
      this.db.setActiveProfile(profileId);
    } else {
      await this.db.updateProfile(profile);
      this.profiles.update((items) => items.map((item) => (item.id === profileId ? { ...item, ...profile } : item)));
    }

    const settings: Settings = {
      ...this.settings(),
      ...result,
      id: profileId,
      profileId
    };
    await this.db.saveSettings(settings);
    this.settings.set(settings);
    this.maybeSync();
    this.profileOpen.set(false);
  }

  async selectProfile(profileId: string): Promise<void> {
    this.activeProfileId.set(profileId);
    this.db.setActiveProfile(profileId);
    await this.refreshFromDb(this.lastRefreshSeed);
    this.profileOpen.set(false);
  }

  async deleteProfile(profileId: string): Promise<void> {
    if (this.profiles().length <= 1) {
      return;
    }
    const profile = this.profiles().find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    await this.db.removeProfileData(profileId);
    await this.db.removeProfile(profileId);
    this.profiles.update((items) => items.filter((item) => item.id !== profileId));

    if (this.activeProfileId() === profileId) {
      const next = this.profiles()[0]?.id ?? null;
      this.activeProfileId.set(next);
      this.db.setActiveProfile(next);
      if (next) {
        localStorage.setItem('activeProfileId', next);
      } else {
        localStorage.removeItem('activeProfileId');
      }
      await this.refreshFromDb(this.lastRefreshSeed);
    }
  }

  private showLevelUp(): void {
    this.dialog.open(LevelupDialogComponent, {
      data: {
        avatarId: this.settings().avatarId ?? '01'
      },
      panelClass: 'levelup-dialog',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw'
    });
  }

  setSelectedDate(dateKey: string): void {
    this.selectedDate.set(dateKey);
  }

  goToToday(): void {
    this.selectedDate.set(this.today());
  }

  private maybeSync(): void {
    if (this.auth.isLoggedIn() && this.isOnline()) {
      this.sync.syncAll();
    }
  }

  private defaultProfileName(language: AccountSettings['language']): string {
    if (language === 'pt') {
      return 'Super Amigo';
    }
    if (language === 'fr') {
      return 'Super Copain';
    }
    return 'Super Buddy';
  }

  private async hasRemoteProfiles(): Promise<boolean | null> {
    const user = this.auth.user();
    if (!user) {
      return false;
    }
    const supabase = this.auth.getClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    if (error) {
      return null;
    }
    return (count ?? 0) > 0;
  }

  private async refreshFromDb(seedIfEmpty: boolean): Promise<void> {
    if (this.isRefreshing) {
      this.pendingRefresh = true;
      this.lastRefreshSeed = seedIfEmpty;
      return;
    }
    this.isRefreshing = true;
    this.lastRefreshSeed = seedIfEmpty;
    try {
      await this.db.migrateDefaultIds();
      await this.db.migrateLegacyRewardRedemptions();
      const allowProfileSeed = seedIfEmpty && !this.auth.isLoggedIn();

      let [profiles, accountSettings] = await Promise.all([
        this.db.getProfiles(),
        this.db.getAccountSettings()
      ]);

      if (accountSettings) {
        this.accountSettings.set(accountSettings);
        this.translate.use(accountSettings.language);
      } else if (seedIfEmpty) {
        const nextAccount: AccountSettings = { id: 'account', language: 'en' };
        await this.db.saveAccountSettings(nextAccount);
        this.accountSettings.set(nextAccount);
        this.translate.use(nextAccount.language);
      }

      let activeProfileId = this.activeProfileId();
      const storedProfileId = localStorage.getItem('activeProfileId');
      if (!activeProfileId && storedProfileId && profiles.some((profile) => profile.id === storedProfileId)) {
        activeProfileId = storedProfileId;
      }

      if (!profiles.length && seedIfEmpty && this.auth.isLoggedIn() && this.isOnline()) {
        const hasRemote = await this.hasRemoteProfiles();
        if (hasRemote === true) {
          await this.sync.syncAll();
          [profiles, accountSettings] = await Promise.all([
            this.db.getProfiles(),
            this.db.getAccountSettings()
          ]);
        } else if (hasRemote === null) {
          seedIfEmpty = false;
        }
      }

      if (!profiles.length && allowProfileSeed) {
        const fallbackLanguage = accountSettings?.language ?? 'en';
        const profileId = this.db.createId();
        const displayName = this.defaultProfileName(fallbackLanguage);
        const profile: Profile = {
          id: profileId,
          displayName,
          avatarId: '01',
          createdAt: Date.now()
        };
        await this.db.addProfile(profile);
        const profileSettings: Settings = {
          id: profileId,
          profileId,
          cycleType: 'weekly',
          cycleStartDate: currentDateKey(),
          levelUpPoints: 100,
          avatarId: '01',
          displayName
        };
        await this.db.saveSettings(profileSettings);
        profiles.push(profile);
        activeProfileId = profileId;
      }

      this.profiles.set(profiles);
      if (!activeProfileId && profiles.length) {
        activeProfileId = profiles[0].id;
      }
      this.activeProfileId.set(activeProfileId);
      if (activeProfileId) {
        this.db.setActiveProfile(activeProfileId);
        localStorage.setItem('activeProfileId', activeProfileId);
      }

      const [tasks, rewards, completions, settings, redemptions] = await Promise.all([
        this.db.getTasks(activeProfileId ?? undefined),
        this.db.getRewards(activeProfileId ?? undefined),
        this.db.getCompletions(activeProfileId ?? undefined),
        activeProfileId ? this.db.getSettings(activeProfileId) : undefined,
        this.db.getRedemptions(activeProfileId ?? undefined)
      ]);
      let didSeed = false;
      if (tasks.length === 0 && seedIfEmpty && activeProfileId && !this.tasksSeeded.has(activeProfileId)) {
        const seeded = await this.seedDefaultTasks();
        this.tasks.set(this.sortTasks(seeded));
        this.tasksSeeded.add(activeProfileId);
        didSeed = true;
      } else {
        this.tasks.set(this.sortTasks(tasks));
      }
      if (rewards.length === 0 && seedIfEmpty && activeProfileId && !this.rewardsSeeded.has(activeProfileId)) {
        const seededRewards = await this.seedDefaultRewards();
        this.rewards.set(this.sortRewards(seededRewards));
        this.rewardsSeeded.add(activeProfileId);
        didSeed = true;
      } else {
        this.rewards.set(this.sortRewards(rewards));
      }
      this.completions.set(completions);
      this.redemptions.set(redemptions);
      if (settings) {
        this.settings.set({
          ...settings,
          levelUpPoints: settings.levelUpPoints ?? 100,
          avatarId: settings.avatarId ?? '01',
          displayName: settings.displayName ?? ''
        });
      }
      if (didSeed && this.auth.isLoggedIn() && this.isOnline()) {
        await this.sync.syncAll();
      }
    } finally {
      this.isRefreshing = false;
      if (this.pendingRefresh) {
        this.pendingRefresh = false;
        void this.refreshFromDb(this.lastRefreshSeed);
      }
    }
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


  private sortTasks(items: Task[]): Task[] {
    return [...items].sort((a, b) => b.points - a.points);
  }

  private sortRewards(items: Reward[]): Reward[] {
    return [...items]
      .map((reward) => ({ ...reward, limitPerCycle: reward.limitPerCycle ?? 1 }))
      .sort((a, b) => a.cost - b.cost);
  }

  private async seedDefaultTasks(): Promise<Task[]> {
    const language = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    const defaults = language.startsWith('pt') ? this.defaultTasksPt() : this.defaultTasksEn();
    const profileId = this.activeProfileId() ?? this.db.createId();
    const seeded = defaults.map((entry, index) => ({
      id: this.defaultId('task', language, index, profileId),
      profileId,
      title: entry.title,
      points: entry.points,
      createdAt: Date.now()
    }));
    await Promise.all(seeded.map((task) => this.db.addTask(task)));
    return seeded;
  }

  private async seedDefaultRewards(): Promise<Reward[]> {
    const language = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    const defaults = language.startsWith('pt') ? this.defaultRewardsPt() : this.defaultRewardsEn();
    const profileId = this.activeProfileId() ?? this.db.createId();
    const seeded = defaults.map((entry, index) => ({
      id: this.defaultId('reward', language, index, profileId),
      profileId,
      title: entry.title,
      cost: entry.cost,
      limitPerCycle: entry.limitPerCycle,
      createdAt: Date.now()
    }));
    await Promise.all(seeded.map((reward) => this.db.addReward(reward)));
    return seeded;
  }

  private defaultId(kind: 'task' | 'reward', language: string, index: number, profileId: string): string {
    const langKey = language.startsWith('pt') ? 'pt' : 'en';
    const seed = `default-${kind}-${langKey}-${index + 1}-${profileId}`;
    return this.uuidFromString(seed);
  }

  private uuidFromString(value: string): string {
    const hash = (seed: number) => {
      let h = 2166136261 ^ seed;
      for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const toHex = (num: number, length: number) => num.toString(16).padStart(length, '0');
    const a = hash(1);
    const b = hash(2);
    const c = hash(3);
    const d = hash(4);

    const part1 = toHex(a, 8);
    const part2 = toHex(b >>> 16, 4);
    const part3 = toHex((b & 0x0fff) | 0x5000, 4);
    const part4 = toHex((c & 0x3fff) | 0x8000, 4);
    const part5 = toHex(d, 8) + toHex(c >>> 16, 4);

    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
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

  private defaultRewardsEn(): Array<{ title: string; cost: number; limitPerCycle: number }> {
    return [
      { title: '🎶 Choose the music in the car', cost: 10, limitPerCycle: 3 },
      { title: '📚 Visit the library or bookstore', cost: 15, limitPerCycle: 3 },
      { title: '♟️ Family game time', cost: 20, limitPerCycle: 3 },
      { title: '🍿 Family movie night', cost: 20, limitPerCycle: 3 },
      { title: '🎮 Extra video game time', cost: 30, limitPerCycle: 3 },
      { title: '🍕 Special coffee/lunch/dinner', cost: 35, limitPerCycle: 3 },
      { title: '🎥 Movie theater', cost: 50, limitPerCycle: 3 },
      { title: '🍔 Eat out', cost: 50, limitPerCycle: 3 }
    ];
  }

  private defaultRewardsPt(): Array<{ title: string; cost: number; limitPerCycle: number }> {
    return [
      { title: '🎶 Escolher a música no carro', cost: 10, limitPerCycle: 3 },
      { title: '📚 Visitar a biblioteca ou livraria', cost: 15, limitPerCycle: 3 },
      { title: '♟️ Jogo em família', cost: 20, limitPerCycle: 3 },
      { title: '🍿 Cinema em família', cost: 20, limitPerCycle: 3 },
      { title: '🎮 Tempo extra de videogame', cost: 30, limitPerCycle: 3 },
      { title: '🍕 Café/lanche/jantar especial', cost: 35, limitPerCycle: 3 },
      { title: '🎥 Cinema', cost: 50, limitPerCycle: 3 },
      { title: '🍔 Comer fora', cost: 50, limitPerCycle: 3 }
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
