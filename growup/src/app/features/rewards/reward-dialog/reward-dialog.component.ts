import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export type RewardDialogResult = {
  title: string;
  cost: number;
  limitPerCycle: number;
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
  templateUrl: './reward-dialog.component.html',
  styleUrl: './reward-dialog.component.scss'
})
export class RewardDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RewardDialogComponent>);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly data = inject<{ maxLimitPerCycle?: number | null } | null>(MAT_DIALOG_DATA, { optional: true });

  form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    cost: [10, [Validators.required, Validators.min(1)]],
    limitPerCycle: [1, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    const maxLimit = this.data?.maxLimitPerCycle;
    if (typeof maxLimit === 'number' && Number.isFinite(maxLimit)) {
      const control = this.form.controls.limitPerCycle;
      control.addValidators(Validators.max(maxLimit));
      if (maxLimit === 1) {
        control.setValue(1);
        control.disable();
      }
      control.updateValueAndValidity();
    }
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
}
