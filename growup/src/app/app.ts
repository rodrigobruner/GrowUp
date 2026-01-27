import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AccountSettings } from './core/models/account-settings';
import { Reward } from './core/models/reward';
import { RewardRedemption } from './core/models/redemption';
import { Settings } from './core/models/settings';
import { Task } from './core/models/task';
import { AuthService } from './core/services/auth.service';
import { ProfileService } from './core/services/profile.service';
import { SessionManagerService } from './core/services/session-manager.service';
import { SessionStateService } from './core/services/session-state.service';
import { TaskService } from './core/services/task.service';
import { RewardService } from './core/services/reward.service';
import { ProfileManagementService } from './core/services/profile-management.service';
import { UiDialogsService } from './core/services/ui-dialogs.service';
import { AuthDialogsService } from './core/services/auth-dialogs.service';
import { LevelupDialogService } from './core/services/levelup-dialog.service';
import { SettingsDrawerService } from './core/services/settings-drawer.service';
import { AppStatusService } from './core/services/app-status.service';
import { SummaryService } from './core/services/summary.service';
import { CalendarStateService } from './core/services/calendar-state.service';
import { AvatarService } from './core/services/avatar.service';
import { SyncService } from './core/services/sync.service';
import { SettingsDialogComponent } from './features/settings/settings-dialog/settings-dialog.component';
import { TaskDialogResult } from './features/tasks/task-dialog/task-dialog.component';
import { RewardDialogResult } from './features/rewards/reward-dialog/reward-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SummaryCardComponent } from './features/summary/summary-card/summary-card.component';
import { TasksPanelComponent } from './features/tasks/tasks-panel/tasks-panel.component';
import { RewardsPanelComponent } from './features/rewards/rewards-panel/rewards-panel.component';
import { environment } from '../environments/environment';
import { ProfileDialogComponent } from './features/profiles/profile-dialog/profile-dialog.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
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
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly sessionManager = inject(SessionManagerService);
  private readonly state = inject(SessionStateService);
  private readonly taskService = inject(TaskService);
  private readonly rewardService = inject(RewardService);
  private readonly profileManagement = inject(ProfileManagementService);
  private readonly dialogs = inject(UiDialogsService);
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly levelupDialogs = inject(LevelupDialogService);
  private readonly drawer = inject(SettingsDrawerService);
  private readonly sync = inject(SyncService);
  readonly appStatus = inject(AppStatusService);
  private readonly summary = inject(SummaryService);
  private readonly calendar = inject(CalendarStateService);
  private readonly avatar = inject(AvatarService);

  readonly tasks = this.state.tasks;
  readonly rewards = this.state.rewards;
  readonly completions = this.state.completions;
  readonly redemptions = this.state.redemptions;
  readonly settings = this.state.settings;
  readonly accountSettings = this.state.accountSettings;
  readonly profiles = this.profileService.profiles;
  readonly activeProfileId = this.profileService.activeProfileId;

  readonly earned = this.summary.earned;
  readonly spent = this.summary.spent;
  readonly balance = this.summary.balance;
  readonly cycleEarned = this.summary.cycleEarned;
  readonly currentCycleRange = this.summary.cycleRange;
  readonly previousCycleEarned = this.summary.previousCycleEarned;
  readonly previousCycleLabel = this.summary.previousCycleLabel;
  readonly level = this.summary.level;
  readonly xpIntoLevel = this.summary.xpIntoLevel;
  readonly xpToNext = this.summary.xpToNext;
  readonly progressPercent = this.summary.progressPercent;
  readonly avatarSrc = this.avatar.avatarSrc;
  currentYear = new Date().getFullYear();
  buildTime = environment.buildTime;

  readonly selectedDate = this.calendar.selectedDate;
  readonly todayKey = this.calendar.todayKey;
  readonly completedCount = this.calendar.completedCount;
  readonly redeemedCount = this.calendar.redeemedCount;
  readonly todayDoneIds = this.calendar.todayDoneIds;

  private resetDialogOpen = false;
  private errorDialogOpen = false;
  private lastAuthUserId: string | null = null;
  private lastTermsVersion: string | null = null;
  readonly settingsOpen = this.drawer.settingsOpen;
  readonly profileOpen = this.drawer.profileOpen;
  readonly profileMode = this.drawer.profileMode;
  readonly isOnline = this.appStatus.isOnline;

  constructor() {
    effect(() => {
      if (this.auth.needsPasswordReset() && !this.resetDialogOpen) {
        this.resetDialogOpen = true;
        this.authDialogs.openResetPassword();
      }
    });
    effect(() => {
      const error = this.auth.authError();
      if (error && !this.errorDialogOpen) {
        this.errorDialogOpen = true;
        const ref = this.authDialogs.openAuthError(error);
        ref.afterClosed().subscribe(() => {
          this.errorDialogOpen = false;
          this.auth.clearAuthError();
        });
      }
    });
    effect(() => {
      const lastSyncAt = this.appStatus.lastSyncAt();
      if (!this.auth.isLoggedIn() || !lastSyncAt) {
        return;
      }
      void this.state.refreshFromDb(true);
    });
    effect(() => {
      const tick = this.appStatus.refreshTick();
      if (!this.auth.isLoggedIn() || tick === 0) {
        return;
      }
      void this.state.refreshFromDb(true);
    });
    effect(() => {
      const user = this.auth.user();
      const nextId = user?.id ?? null;
      const nextTermsVersion = this.accountSettings().termsVersion ?? null;
      if (
        nextId === this.lastAuthUserId &&
        nextTermsVersion === this.lastTermsVersion &&
        this.sync.isStarted()
      ) {
        return;
      }
      this.lastAuthUserId = nextId;
      this.lastTermsVersion = nextTermsVersion;
      void this.handleAuthChange(nextId);
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
    await this.state.refreshFromDb(!this.auth.isLoggedIn());
  }

  private async handleAuthChange(userId: string | null): Promise<void> {
    const accepted = await this.sessionManager.handleAuthChange(
      userId,
      this.accountSettings().language ?? 'en',
      this.accountSettings().termsVersion ?? null
    );
    if (!accepted) {
      return;
    }
    await this.state.refreshFromDb(true);
  }


  

  async addTask(): Promise<void> {
    await this.openTaskDialog();
  }

  async openTaskDialog(): Promise<void> {
    const result = await this.dialogs.openTaskDialog();
    if (!result) {
      return;
    }
    await this.taskService.addFromDialog(result);
  }

  async toggleTask(task: Task): Promise<void> {
    const date = this.selectedDate();
    const leveledUp = await this.taskService.toggle(task, date);
    if (leveledUp) {
      this.showLevelUp();
    }
  }

  async removeTask(task: Task): Promise<void> {
    const confirmed = await this.dialogs.confirmDeleteTask(task.title);
    if (!confirmed) {
      return;
    }
    await this.taskService.remove(task);
  }

  async addReward(): Promise<void> {
    await this.openRewardDialog();
  }

  async openRewardDialog(): Promise<void> {
    const result = await this.dialogs.openRewardDialog();
    if (!result) {
      return;
    }
    await this.rewardService.addFromDialog(result);
  }

  async redeemReward(reward: Reward): Promise<void> {
    const { start, end } = this.currentCycleRange();
    await this.rewardService.redeem(reward, this.balance(), { start, end });
  }

  async consumeReward(redemption: RewardRedemption): Promise<void> {
    const confirmed = await this.dialogs.confirmUseRedemption(redemption.rewardTitle);
    if (!confirmed) {
      return;
    }
    await this.rewardService.consume(redemption);
  }

  async removeReward(reward: Reward): Promise<void> {
    const confirmed = await this.dialogs.confirmDeleteReward(reward.title);
    if (!confirmed) {
      return;
    }
    await this.rewardService.remove(reward);
  }

  openSettings(): void {
    this.drawer.openSettings();
  }

  closeSettings(): void {
    this.drawer.closeSettings();
  }

  async saveSettings(result: {
    language: AccountSettings['language'];
    profile: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>;
  }): Promise<void> {
    await this.profileManagement.saveSettings(result);
    this.settingsOpen.set(false);
  }

  openProfile(): void {
    this.drawer.openProfile();
  }

  openCreateProfile(): void {
    this.drawer.openCreateProfile();
  }

  closeProfile(): void {
    this.drawer.closeProfile();
  }

  async saveProfile(
    result: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>
  ): Promise<void> {
    const mode = this.profileMode();
    const outcome = await this.profileManagement.saveProfile(mode, result);
    if (outcome === 'duplicate') {
      await this.dialogs.informProfileDuplicate();
      return;
    }
    if (outcome !== 'ok') {
      return;
    }
    this.profileOpen.set(false);
  }

  async selectProfile(profileId: string): Promise<void> {
    await this.profileManagement.selectProfile(profileId);
    this.profileOpen.set(false);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.profileManagement.deleteProfile(profileId);
  }

  private showLevelUp(): void {
    this.levelupDialogs.openLevelUp(this.settings().avatarId ?? '01');
  }

  setSelectedDate(dateKey: string): void {
    this.calendar.setSelectedDate(dateKey);
  }

  goToToday(): void {
    this.calendar.goToToday();
  }

  cycleLabel(): string {
    return this.summary.cycleLabel();
  }

  cycleRangeLabel(): string {
    return this.summary.cycleRangeLabel();
  }


}
