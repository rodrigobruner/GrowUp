import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export type RewardDialogResult = {
  title: string;
  cost: number;
};

@Component({
  selector: 'app-reward-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'rewards.add' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'rewards.name' | translate }}</mat-label>
          <input matInput formControlName="title" [placeholder]="'rewards.placeholder' | translate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'rewards.cost' | translate }}</mat-label>
          <input matInput type="number" formControlName="cost" min="1" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'settingsDialog.cancel' | translate }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ 'rewards.add' | translate }}
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
export class RewardDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RewardDialogComponent>);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    cost: [10, [Validators.required, Validators.min(1)]]
  });

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  close(): void {
    this.dialogRef.close();
  }
}
