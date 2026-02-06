import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthErrorDialogComponent } from '../../features/auth/auth-error-dialog/auth-error-dialog.component';
import { ResetPasswordDialogComponent } from '../../features/auth/reset-password-dialog/reset-password-dialog.component';

@Injectable({ providedIn: 'root' })
export class AuthDialogsService {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  openResetPassword(): void {
    this.dialog.open(ResetPasswordDialogComponent, {
      disableClose: true
    });
  }

  openAuth(): void {
    void this.router.navigate(['/signin']);
  }

  openAuthError(data: unknown) {
    return this.dialog.open(AuthErrorDialogComponent, {
      data
    });
  }
}
