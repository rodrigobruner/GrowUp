import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { AppFooterComponent } from '../../components/app-footer/app-footer.component';
import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../core/services/avatar.service';
import { TermsDialogComponent } from '../../features/auth/terms-dialog/terms-dialog.component';

@Component({
  selector: 'app-signin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    TranslateModule,
    TopbarComponent,
    AppFooterComponent
  ],
  templateUrl: './signin-page.component.html',
  styleUrl: './signin-page.component.scss'
})
export class SigninPageComponent {
  private readonly termsVersion = '2026-01-26';
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly avatar = inject(AvatarService);

  readonly avatarSrc = this.avatar.avatarSrc;
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  busy = signal(false);
  error = signal<string | null>(null);
  info = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        void this.router.navigate(['/dashboard']);
      }
    });
  }

  async signIn(): Promise<void> {
    this.clearMessages();
    this.busy.set(true);
    const error = await this.auth.signIn(this.email.trim(), this.password);
    this.busy.set(false);
    if (error) {
      this.error.set(this.translate.instant('auth.genericError'));
      return;
    }
    void this.router.navigate(['/dashboard']);
  }

  async signUp(): Promise<void> {
    this.clearMessages();
    if (!this.acceptTerms) {
      this.error.set(this.translate.instant('auth.acceptTermsRequired'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set(this.translate.instant('auth.passwordMismatch'));
      return;
    }
    this.busy.set(true);
    const error = await this.auth.signUp(
      this.email.trim(),
      this.password,
      this.fullName.trim(),
      this.termsVersion,
      new Date().toISOString()
    );
    this.busy.set(false);
    if (error) {
      this.error.set(this.translate.instant('auth.genericError'));
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
      this.error.set(this.translate.instant('auth.genericError'));
    }
  }

  async resetPassword(): Promise<void> {
    this.clearMessages();
    this.busy.set(true);
    const error = await this.auth.resetPassword(this.email.trim());
    this.busy.set(false);
    if (error) {
      this.error.set(this.translate.instant('auth.genericError'));
      return;
    }
    this.info.set(this.translate.instant('auth.resetSent'));
  }

  async openTerms(): Promise<void> {
    const accepted = await firstValueFrom(this.dialog.open(TermsDialogComponent, {
      panelClass: 'terms-dialog',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw'
    }).afterClosed());
    if (accepted) {
      this.acceptTerms = true;
    }
  }

  goHome(): void {
    void this.router.navigate(['/']);
  }

  goSignin(): void {
    void this.router.navigate(['/signin']);
  }

  private clearMessages(): void {
    this.error.set(null);
    this.info.set(null);
  }
}
