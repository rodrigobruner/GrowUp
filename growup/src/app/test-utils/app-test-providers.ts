import { signal } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import { ProfileService } from '../core/services/profile.service';
import { SessionManagerService } from '../core/services/session-manager.service';
import { SessionStateService } from '../core/services/session-state.service';
import { SummaryService } from '../core/services/summary.service';
import { CalendarStateService } from '../core/services/calendar-state.service';
import { AvatarService } from '../core/services/avatar.service';
import { SettingsDrawerService } from '../core/services/settings-drawer.service';
import { AppStatusService } from '../core/services/app-status.service';
import { UiDialogsService } from '../core/services/ui-dialogs.service';
import { AuthDialogsService } from '../core/services/auth-dialogs.service';
import { LevelupDialogService } from '../core/services/levelup-dialog.service';
import { TaskService } from '../core/services/task.service';
import { RewardService } from '../core/services/reward.service';
import { ProfileManagementService } from '../core/services/profile-management.service';
import { SyncService } from '../core/services/sync.service';
import { DemoModeService } from '../core/services/demo-mode.service';

export const appTestProviders = [
  {
    provide: AuthService,
    useValue: {
      needsPasswordReset: () => false,
      authError: () => null,
      clearAuthError: () => {},
      user: () => null,
      isLoggedIn: () => false
    }
  },
  {
    provide: ProfileService,
    useValue: {
      profiles: signal([]),
      activeProfileId: signal(null),
      setProfiles: () => {},
      setActiveProfile: () => {}
    }
  },
  {
    provide: SessionManagerService,
    useValue: {
      handleAuthChange: async () => true
    }
  },
  {
    provide: SessionStateService,
    useValue: {
      tasks: signal([]),
      rewards: signal([]),
      completions: signal([]),
      redemptions: signal([]),
      rewardUses: signal([]),
      settings: signal({
        id: 'profile',
        profileId: 'profile',
        cycleType: 'biweekly',
        cycleStartDate: '2026-01-01',
        levelUpPoints: 100,
        avatarId: '01',
        displayName: ''
      }),
      accountSettings: signal({ id: 'account', language: 'en', role: 'USER' }),
      refreshFromDb: async () => {}
    }
  },
  {
    provide: SummaryService,
    useValue: {
      earned: signal(0),
      spent: signal(0),
      balance: signal(0),
      cycleEarned: signal(0),
      cycleRange: signal({ start: '2026-01-01', end: '2026-01-07' }),
      previousCycleEarned: signal(null),
      previousCycleLabel: signal(''),
      level: signal(1),
      xpIntoLevel: signal(0),
      xpToNext: signal(100),
      progressPercent: signal(0),
      cycleLabel: () => 'Weekly',
      cycleRangeLabel: () => '01/01/2026 - 07/01/2026'
    }
  },
  {
    provide: CalendarStateService,
    useValue: {
      selectedDate: signal('2026-01-01'),
      todayKey: signal('2026-01-01'),
      completedCount: signal(0),
      redeemedCount: signal(0),
      todayDoneIds: signal(new Set()),
      setSelectedDate: () => {},
      goToToday: () => {}
    }
  },
  {
    provide: AvatarService,
    useValue: {
      avatarSrc: signal('assets/avatar/01/level-1.webp')
    }
  },
  {
    provide: SettingsDrawerService,
    useValue: {
      settingsOpen: signal(false),
      profileOpen: signal(false),
      profileMode: signal('edit'),
      openSettings: () => {},
      closeSettings: () => {},
      openProfile: () => {},
      openCreateProfile: () => {},
      closeProfile: () => {}
    }
  },
  {
    provide: AppStatusService,
    useValue: {
      isOnline: signal(true),
      isSyncing: signal(false),
      lastSyncAt: signal(null),
      syncError: signal(null),
      refreshTick: signal(0)
    }
  },
  { provide: UiDialogsService, useValue: {} },
  { provide: AuthDialogsService, useValue: {} },
  { provide: LevelupDialogService, useValue: {} },
  { provide: TaskService, useValue: {} },
  { provide: RewardService, useValue: {} },
  { provide: ProfileManagementService, useValue: {} },
  {
    provide: SyncService,
    useValue: {
      isStarted: () => false
    }
  },
  {
    provide: DemoModeService,
    useValue: {
      isEnabled: () => false
    }
  }
];
