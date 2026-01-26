import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AccountSettings } from '../../../core/services/growup-db.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';
import { AuthErrorDialogComponent } from '../../auth/auth-error-dialog/auth-error-dialog.component';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent implements OnChanges {
  @Input() settings: AccountSettings | null = null;
  @Output() closeSettings = new EventEmitter<void>();
  @Output() saveSettings = new EventEmitter<{ language: AccountSettings['language'] }>();

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly translateService = inject(TranslateService);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  form = this.formBuilder.group({
    language: this.formBuilder.control<AccountSettings['language']>('en', { validators: [Validators.required] })
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['settings'] && this.settings) {
      this.form.reset({
        language: this.settings.language
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saveSettings.emit(this.form.getRawValue());
  }

  close(): void {
    this.closeSettings.emit();
  }

  async clearCacheAndReload(): Promise<void> {
    await this.clearCache();
    window.location.reload();
  }

  async clearAllDataAndReload(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: this.translateService.instant('settingsDialog.clearAllConfirmTitle'),
          message: this.translateService.instant('settingsDialog.clearAllConfirmMessage'),
          confirmLabel: this.translateService.instant('settingsDialog.clearAllConfirmAction'),
          cancelLabel: this.translateService.instant('confirm.cancel')
        }
      }).afterClosed()
    );
    if (!confirmed) {
      return;
    }

    await this.clearCache();
    localStorage.clear();
    sessionStorage.clear();
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases?.();
      if (databases?.length) {
        await Promise.all(
          databases
            .map((db) => db.name)
            .filter((name): name is string => Boolean(name))
            .map((name) => {
              return new Promise<void>((resolve) => {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              });
            })
        );
      }
    }
    window.location.reload();
  }

  private async clearCache(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    sessionStorage.clear();
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
    this.closeSettings.emit();
  }

  
}
