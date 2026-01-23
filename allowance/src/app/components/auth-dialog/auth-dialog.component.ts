import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-auth-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    TranslateModule
  ],
  templateUrl: './auth-dialog.component.html',
  styleUrl: './auth-dialog.component.scss'
})
export class AuthDialogComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  busy = signal(false);
  error = signal<string | null>(null);
  info = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly dialogRef: MatDialogRef<AuthDialogComponent>,
    private readonly translate: TranslateService
  ) {}

  async signIn(): Promise<void> {
    this.clearMessages();
    this.busy.set(true);
    const error = await this.auth.signIn(this.email.trim(), this.password);
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.dialogRef.close();
  }

  async signUp(): Promise<void> {
    this.clearMessages();
    if (this.password !== this.confirmPassword) {
      this.error.set(this.translate.instant('auth.passwordMismatch'));
      return;
    }
    this.busy.set(true);
    const error = await this.auth.signUp(this.email.trim(), this.password, this.fullName.trim());
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.info.set(this.translate.instant('auth.checkEmail'));
  }

  async signInWithGoogle(): Promise<void> {
    this.clearMessages();
    this.busy.set(true);
    const error = await this.auth.signInWithGoogle();
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
    }
  }

  async resetPassword(): Promise<void> {
    this.clearMessages();
    this.busy.set(true);
    const error = await this.auth.resetPassword(this.email.trim());
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.info.set(this.translate.instant('auth.resetSent'));
  }

  private clearMessages(): void {
    this.error.set(null);
    this.info.set(null);
  }
}
