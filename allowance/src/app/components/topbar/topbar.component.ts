import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../auth.service';
import { AuthDialogComponent } from '../auth-dialog/auth-dialog.component';
import { ResetPasswordDialogComponent } from '../reset-password-dialog/reset-password-dialog.component';
import { SyncStatusDialogComponent } from '../sync-status-dialog/sync-status-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './topbar.component.html',
  styles: [
    `
      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--app-primary);
        color: var(--app-cream);
        box-shadow: 0 6px 24px var(--app-shadow);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
      }

      .brand-title {
        font-family: 'Baloo 2', 'Comic Sans MS', cursive;
        font-size: 1.2rem;
        letter-spacing: 0.02em;
      }

      .spacer {
        flex: 1;
      }

      .balance {
        text-align: right;
        display: grid;
        gap: 0.1rem;
      }

      .balance .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.7;
      }

      .balance .value {
        font-size: 1.1rem;
        font-weight: 600;
      }

      .sync-status {
        display: grid;
        justify-items: end;
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.75;
      }

      .sync-status .status {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
      }

      .sync-status .dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        display: inline-block;
        background: #cfe9ff;
      }

      .sync-status .status.offline {
        color: #ffd7a3;
      }

      .sync-status .status.syncing {
        color: #cfe9ff;
      }

      .sync-status .status.synced {
        color: #d2f3d0;
      }

      .sync-status .status.error {
        color: #ffd1d1;
      }

      .sync-status .status.offline .dot {
        background: #ff5e5e;
      }

      .sync-status .status.error .dot {
        background: #ff5e5e;
      }

      .sync-status .status.syncing .dot {
        background: #ffd166;
      }

      .sync-status .status.synced .dot {
        background: #6ee7a5;
      }

      button[mat-icon-button] {
        margin-right: 0.5rem;
        color: var(--app-cream);
        background: transparent;
        box-shadow: none;
        border: none;
        padding: 0;
      }

      .avatar-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
      }

      .avatar-icon {
        font-size: 2rem;
      }

      .avatar-image {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        object-fit: cover;
        border: 2px solid rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.15);
      }

      .mat-mdc-icon-button {
        background: transparent;
        box-shadow: none;
        border: none;
      }

      .mat-mdc-icon-button::before,
      .mat-mdc-icon-button::after {
        display: none;
      }

      .mat-mdc-icon-button .mat-mdc-button-touch-target {
        display: none;
      }

    `
  ]
})
export class TopbarComponent {
  @Input({ required: true }) balance = 0;
  @Input() isOnline = true;
  @Input() isSyncing = false;
  @Input() lastSyncAt: number | null = null;
  @Input() syncError: string | null = null;
  @Input() avatarSrc = '';
  @Output() settingsClick = new EventEmitter<void>();

  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly avatarLoadFailed = signal(false);
  private readonly lastAvatarUrl = signal<string | null>(null);
  readonly userAvatarUrl = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return null;
    }
    const provider = user.app_metadata?.provider;
    const metadata = user.user_metadata as Record<string, unknown> | null;
    const avatarUrl = typeof metadata?.['avatar_url'] === 'string' ? metadata['avatar_url'] : null;
    const pictureUrl = typeof metadata?.['picture'] === 'string' ? metadata['picture'] : null;
    if (provider === 'google') {
      return avatarUrl ?? pictureUrl ?? null;
    }
    return null;
  });

  constructor() {
    effect(() => {
      const url = this.userAvatarUrl();
      if (this.lastAvatarUrl() !== url) {
        this.lastAvatarUrl.set(url);
        this.avatarLoadFailed.set(false);
      }
    });
  }

  handleAvatarError(): void {
    this.avatarLoadFailed.set(true);
  }

  openAuthDialog(): void {
    this.dialog.open(AuthDialogComponent);
  }

  openResetPassword(): void {
    this.dialog.open(ResetPasswordDialogComponent);
  }

  openSyncStatus(): void {
    this.dialog.open(SyncStatusDialogComponent, {
      data: {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSyncAt: this.lastSyncAt,
        lastError: this.syncError
      }
    });
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }
}
