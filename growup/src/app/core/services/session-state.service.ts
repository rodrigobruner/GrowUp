import { Injectable, signal } from '@angular/core';
import { AccountSettings } from '../models/account-settings';
import { Completion } from '../models/completion';
import { Reward } from '../models/reward';
import { RewardRedemption } from '../models/redemption';
import { RewardUse } from '../models/reward-use';
import { Settings } from '../models/settings';
import { Task } from '../models/task';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { AccountSettingsService } from './account-settings.service';
import { SeedService, currentDateKey } from './seed.service';
import { AuthService } from './auth.service';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  readonly status = signal<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  private tasksSeeded = new Set<string>();
  private rewardsSeeded = new Set<string>();
  private isRefreshing = false;
  private pendingRefresh = false;
  private lastRefreshSeed = false;
  private readonly defaultSettings: Settings = {
    id: 'profile',
    profileId: 'profile',
    cycleType: 'biweekly',
    cycleStartDate: currentDateKey(),
    levelUpPoints: 100,
    avatarId: '01',
    displayName: ''
  };
  private readonly defaultAccountSettings: AccountSettings = {
    id: 'account',
    language: 'en'
  };
  tasks = signal<Task[]>([]);
  rewards = signal<Reward[]>([]);
  completions = signal<Completion[]>([]);
  redemptions = signal<RewardRedemption[]>([]);
  rewardUses = signal<RewardUse[]>([]);
  settings = signal<Settings>({ ...this.defaultSettings });
  accountSettings = signal<AccountSettings>({ ...this.defaultAccountSettings });

  constructor(
    private readonly db: GrowUpDbService,
    private readonly profileService: ProfileService,
    private readonly accountSettingsService: AccountSettingsService,
    private readonly seedService: SeedService,
    private readonly auth: AuthService,
    private readonly sync: SyncService
  ) {}

  async refreshFromDb(seedIfEmpty: boolean): Promise<void> {
    if (this.isRefreshing) {
      this.pendingRefresh = true;
      this.lastRefreshSeed = seedIfEmpty;
      return;
    }
    this.isRefreshing = true;
    this.lastRefreshSeed = seedIfEmpty;
    this.status.set('loading');
    try {
      await this.db.migrateDefaultIds();
      await this.db.migrateLegacyRewardRedemptions();
      const allowProfileSeed = seedIfEmpty && !this.auth.isLoggedIn();

      const accountSettings = await this.accountSettingsService.loadOrSeed(seedIfEmpty);
      if (accountSettings) {
        this.accountSettings.set(accountSettings);
      }

      const profileState = await this.seedService.ensureProfiles(seedIfEmpty, accountSettings?.language ?? 'en');
      const profiles = profileState.profiles;
      let activeProfileId = profileState.activeProfileId;

      this.profileService.setProfiles(profiles);
      if (!activeProfileId && profiles.length) {
        activeProfileId = profiles[0].id;
      }
      this.profileService.setActiveProfile(activeProfileId);
      if (activeProfileId) {
        localStorage.setItem('activeProfileId', activeProfileId);
      }
      if (profileState.seededProfile) {
        this.sync.notifyLocalChange();
      }

      const [tasks, rewards, completions, settings, redemptions, rewardUses] = await Promise.all([
        this.db.getTasks(activeProfileId ?? undefined),
        this.db.getRewards(activeProfileId ?? undefined),
        this.db.getCompletions(activeProfileId ?? undefined),
        activeProfileId ? this.db.getSettings(activeProfileId) : undefined,
        this.db.getRedemptions(activeProfileId ?? undefined),
        this.db.getRewardUses(activeProfileId ?? undefined)
      ]);

      let didSeed = false;
      if (tasks.length === 0 && seedIfEmpty && activeProfileId && !this.tasksSeeded.has(activeProfileId)) {
        const seeded = await this.seedService.seedDefaultTasks(activeProfileId);
        this.tasks.set(this.sortTasks(seeded));
        this.tasksSeeded.add(activeProfileId);
        didSeed = true;
      } else {
        this.tasks.set(this.sortTasks(tasks));
      }

      if (rewards.length === 0 && seedIfEmpty && activeProfileId && !this.rewardsSeeded.has(activeProfileId)) {
        const seededRewards = await this.seedService.seedDefaultRewards(activeProfileId);
        this.rewards.set(this.sortRewards(seededRewards));
        this.rewardsSeeded.add(activeProfileId);
        didSeed = true;
      } else {
        this.rewards.set(this.sortRewards(rewards));
      }

      this.completions.set(completions);
      this.redemptions.set(redemptions);
      this.rewardUses.set(rewardUses);
      if (settings) {
        this.settings.set({
          ...settings,
          cycleType: settings.cycleType ?? 'biweekly',
          cycleStartDate: settings.cycleStartDate ?? currentDateKey(),
          levelUpPoints: settings.levelUpPoints ?? 100,
          avatarId: settings.avatarId ?? '01',
          displayName: settings.displayName ?? ''
        });
      } else if (allowProfileSeed && activeProfileId) {
        const fallbackName = this.seedService.defaultProfileName();
        this.settings.set({
          id: activeProfileId,
          profileId: activeProfileId,
          cycleType: 'biweekly',
          cycleStartDate: currentDateKey(),
          levelUpPoints: 100,
          avatarId: '01',
          displayName: fallbackName
        });
      }

      if (didSeed) {
        this.sync.notifyLocalChange();
      }

      if (!this.auth.isLoggedIn()) {
        this.status.set(profiles.length ? 'ready' : 'idle');
      } else {
        this.status.set(profiles.length ? 'ready' : 'empty');
      }
    } catch {
      this.status.set('error');
    } finally {
      this.isRefreshing = false;
      if (this.pendingRefresh) {
        this.pendingRefresh = false;
        void this.refreshFromDb(this.lastRefreshSeed);
      }
    }
  }

  resetForAuthChange(): void {
    this.tasks.set([]);
    this.rewards.set([]);
    this.completions.set([]);
    this.redemptions.set([]);
    this.rewardUses.set([]);
    this.settings.set({ ...this.defaultSettings });
    this.accountSettings.set({ ...this.defaultAccountSettings });
    this.profileService.setProfiles([]);
    this.profileService.setActiveProfile(null);
    this.tasksSeeded.clear();
    this.rewardsSeeded.clear();
    this.status.set('loading');
  }

  private sortTasks(items: Task[]): Task[] {
    return [...items].sort((a, b) => b.points - a.points);
  }

  private sortRewards(items: Reward[]): Reward[] {
    return [...items]
      .map((reward) => ({ ...reward, limitPerCycle: reward.limitPerCycle ?? 1 }))
      .sort((a, b) => a.cost - b.cost);
  }
}
