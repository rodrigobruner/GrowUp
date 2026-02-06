import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  @Input({ required: true }) isLoggedIn = false;
  @Input() avatarSrc = '';
  @Input() userAvatarUrl: string | null = null;
  @Input() avatarLoadFailed = false;
  @Input() authProvider: string | null = null;
  @Input() showSettings = true;
  @Output() settingsClick = new EventEmitter<void>();
  @Output() openAuthDialog = new EventEmitter<void>();
  @Output() openResetPassword = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  handleAvatarError(): void {
    this.avatarLoadFailed = true;
  }

  get canChangePassword(): boolean {
    return !this.authProvider || this.authProvider === 'email';
  }
}
