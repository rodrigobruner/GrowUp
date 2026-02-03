import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialogComponent } from '../../features/auth/auth-dialog/auth-dialog.component';
import { AuthErrorDialogComponent } from '../../features/auth/auth-error-dialog/auth-error-dialog.component';
import { ResetPasswordDialogComponent } from '../../features/auth/reset-password-dialog/reset-password-dialog.component';

@Injectable({ providedIn: 'root' })
export class AuthDialogsService {
  private readonly dialog = inject(MatDialog);

  openResetPassword(): void {
    this.dialog.open(ResetPasswordDialogComponent, {
      disableClose: true
    });
  }

  openAuth(): void {
    this.dialog.open(AuthDialogComponent, {
      backdropClass: 'auth-backdrop'
    });
  }

  openAuthError(data: unknown) {
    return this.dialog.open(AuthErrorDialogComponent, {
      data
    });
  }
}
