import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Settings } from './allowance-db.service';
import { TranslateModule } from '@ngx-translate/core';

export type SettingsDialogData = Settings;

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'settingsDialog.title' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'settingsDialog.cycle' | translate }}</mat-label>
          <mat-select formControlName="cycleType">
            <mat-option value="weekly">{{ 'cycle.weekly' | translate }}</mat-option>
            <mat-option value="biweekly">{{ 'cycle.biweekly' | translate }}</mat-option>
            <mat-option value="monthly">{{ 'cycle.monthly' | translate }}</mat-option>
            <mat-option value="yearly">{{ 'cycle.yearly' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'settingsDialog.start' | translate }}</mat-label>
          <input matInput type="date" formControlName="cycleStartDate" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'settingsDialog.cancel' | translate }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ 'settingsDialog.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: grid;
        gap: 1rem;
        margin-top: 0.5rem;
        min-width: min(360px, 80vw);
      }
    `
  ]
})
export class SettingsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  form = this.formBuilder.group({
    cycleType: ['weekly', Validators.required],
    cycleStartDate: [this.today(), Validators.required]
  });

  setSettings(settings: Settings): void {
    this.form.reset(settings);
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

  private today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
