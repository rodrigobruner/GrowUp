import { Component, effect, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { AuthService } from './core/services/auth.service';
import { SessionManagerService } from './core/services/session-manager.service';
import { SessionStateService } from './core/services/session-state.service';
import { AuthDialogsService } from './core/services/auth-dialogs.service';
import { AppStatusService } from './core/services/app-status.service';
import { SyncService } from './core/services/sync.service';
import { DemoModeService } from './core/services/demo-mode.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sessionManager = inject(SessionManagerService);
  private readonly state = inject(SessionStateService);
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly sync = inject(SyncService);
  private readonly demoMode = inject(DemoModeService);
  private readonly router = inject(Router);
  readonly appStatus = inject(AppStatusService);
  readonly accountSettings = this.state.accountSettings;

  private resetDialogOpen = false;
  private errorDialogOpen = false;
  private lastAuthUserId: string | null = null;
  private lastTermsVersion: string | null = null;

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
      void this.state.refreshFromDb(this.shouldSeed());
    });
    effect(() => {
      const tick = this.appStatus.refreshTick();
      if (!this.auth.isLoggedIn() || tick === 0) {
        return;
      }
      void this.state.refreshFromDb(this.shouldSeed());
    });
    effect(() => {
      const user = this.auth.user();
      const nextId = user?.id ?? null;
      const nextTermsVersion = this.accountSettings().termsVersion ?? null;
      const previousId = this.lastAuthUserId;
      if (
        nextId === this.lastAuthUserId &&
        nextTermsVersion === this.lastTermsVersion &&
        this.sync.isStarted()
      ) {
        return;
      }
      if (nextId !== previousId) {
        this.state.resetForAuthChange();
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
    await this.state.refreshFromDb(this.shouldSeed());
  }

  private shouldSeed(): boolean {
    return !this.auth.isLoggedIn() && this.demoMode.isEnabled();
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
    await this.state.refreshFromDb(this.shouldSeed());
    if (userId) {
      const redirectTo = localStorage.getItem('growup.postAuthRedirect');
      if (redirectTo) {
        localStorage.removeItem('growup.postAuthRedirect');
        void this.router.navigate([redirectTo]);
      }
    }
  }
}
