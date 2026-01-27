import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { Profile } from '../../core/models/profile';
import { AuthDialogComponent } from '../../features/auth/auth-dialog/auth-dialog.component';
import { ResetPasswordDialogComponent } from '../../features/auth/reset-password-dialog/reset-password-dialog.component';
import { SyncStatusDialogComponent } from '../sync-status-dialog/sync-status-dialog.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { ProfileAvatarComponent } from '../profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    TranslateModule,
    ProfileAvatarComponent,
    UserMenuComponent
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
  @Input() profiles: Profile[] = [];
  @Input() activeProfileId: string | null = null;
  @Output() settingsClick = new EventEmitter<void>();
  @Output() profileCreate = new EventEmitter<void>();
  @Output() profileEdit = new EventEmitter<void>();
  @Output() profileSelect = new EventEmitter<string>();

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
  readonly authProvider = computed(() => this.auth.user()?.app_metadata?.provider ?? null);

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

  openCreateProfile(): void {
    this.profileCreate.emit();
  }

  openEditProfile(): void {
    this.profileEdit.emit();
  }

  selectProfile(profileId: string): void {
    this.profileSelect.emit(profileId);
  }

  profileAvatarSrc(avatarId?: string): string {
    const resolved = avatarId ?? '01';
    return `assets/avatar/${resolved}/avatar.png`;
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }
}
