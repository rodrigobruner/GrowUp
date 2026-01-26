import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Settings } from '../../../core/services/growup-db.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';
import { AuthErrorDialogComponent } from '../../auth/auth-error-dialog/auth-error-dialog.component';
import { firstValueFrom } from 'rxjs';

export type SettingsDialogData = Settings;

type AvatarOption = {
  id: string;
  name: string;
};

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  avatars = signal<AvatarOption[]>([]);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  form = this.formBuilder.group({
    cycleType: ['weekly', Validators.required],
    cycleStartDate: [this.today(), Validators.required],
    language: ['en', Validators.required],
    levelUpPoints: [100, [Validators.required, Validators.min(10)]],
    avatarId: ['01', Validators.required],
    displayName: ['', [Validators.maxLength(40)]]
  });

  ngOnInit(): void {
    this.loadAvatars();
  }

  setSettings(settings: Settings): void {
    this.form.reset({
      ...settings,
      avatarId: settings.avatarId ?? '01',
      displayName: settings.displayName ?? ''
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  close(): void {
    this.dialogRef.close();
  }

  async openDeleteAccount(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    const ref = this.dialog.open(DeleteAccountDialogComponent);
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) {
      return;
    }
    const error = await this.auth.deleteAccount();
    if (error) {
      this.dialog.open(AuthErrorDialogComponent, { data: error.message });
      return;
    }
    this.dialogRef.close();
  }

  avatarPreviewSrc(): string {
    return this.avatarOptionSrc(this.form.get('avatarId')?.value ?? '01');
  }

  avatarOptionSrc(avatarId: string): string {
    return `assets/avatar/${avatarId}/avatar.png`;
  }

  private today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async loadAvatars(): Promise<void> {
    const fallback = [{ id: '01', name: 'Default' }];
    try {
      const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
      const normalized = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
      const response = await fetch(`${normalized}avatars.json`);
      if (!response.ok) {
        this.avatars.set(fallback);
        return;
      }
      const data = (await response.json()) as AvatarOption[];
      if (Array.isArray(data)) {
        this.avatars.set(
          data
            .filter((item) => item && typeof item.id === 'string')
            .map((item) => ({ id: item.id, name: item.name ?? item.id }))
        );
      } else {
        this.avatars.set(fallback);
      }
    } catch {
      this.avatars.set(fallback);
    }
  }
}
