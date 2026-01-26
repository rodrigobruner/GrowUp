import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { AuthDialogComponent } from '../../features/auth/auth-dialog/auth-dialog.component';
import { ResetPasswordDialogComponent } from '../../features/auth/reset-password-dialog/reset-password-dialog.component';
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
  styleUrl: './topbar.component.scss'
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
