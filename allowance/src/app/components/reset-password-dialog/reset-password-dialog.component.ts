import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  templateUrl: './reset-password-dialog.component.html',
  styleUrl: './reset-password-dialog.component.scss'
})
export class ResetPasswordDialogComponent {
  password = '';
  confirmPassword = '';
  busy = signal(false);
  error = signal<string | null>(null);
  info = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly dialogRef: MatDialogRef<ResetPasswordDialogComponent>,
    private readonly translate: TranslateService
  ) {}

  async submit(): Promise<void> {
    this.error.set(null);
    this.info.set(null);
    if (this.password !== this.confirmPassword) {
      this.error.set(this.translate.instant('auth.passwordMismatch'));
      return;
    }
    this.busy.set(true);
    const error = await this.auth.updatePassword(this.password);
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.info.set(this.translate.instant('auth.passwordUpdated'));
    this.auth.clearPasswordRecoveryFlag();
    this.dialogRef.close();
  }
}
