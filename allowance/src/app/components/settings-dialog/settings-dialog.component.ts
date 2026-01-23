import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { Settings } from '../../allowance-db.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

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
    MatTabsModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './settings-dialog.component.html',
  styles: [
    `
      .dialog-form {
        display: grid;
        gap: 1rem;
        margin-top: 0.5rem;
        min-width: min(360px, 80vw);
      }

      .section-title {
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 0.7rem;
        color: rgba(19, 70, 134, 0.7);
        margin-top: 0.25rem;
      }

      .avatar-option {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .avatar-option-img {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(19, 70, 134, 0.25);
        background: #f2f6fb;
      }

      .avatar-preview {
        display: flex;
        justify-content: center;
        padding: 0.5rem 0;
      }

      .avatar-preview img {
        width: 120px;
        height: 120px;
        border-radius: 18px;
        object-fit: contain;
        border: 1px solid rgba(19, 70, 134, 0.25);
        background: #f2f6fb;
      }
    `
  ]
})
export class SettingsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);
  avatars = signal<AvatarOption[]>([]);

  form = this.formBuilder.group({
    cycleType: ['weekly', Validators.required],
    cycleStartDate: [this.today(), Validators.required],
    language: ['en', Validators.required],
    levelUpPoints: [100, [Validators.required, Validators.min(10)]],
    avatarId: ['01', Validators.required]
  });

  ngOnInit(): void {
    this.loadAvatars();
  }

  setSettings(settings: Settings): void {
    this.form.reset({
      ...settings,
      avatarId: settings.avatarId ?? '01'
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
