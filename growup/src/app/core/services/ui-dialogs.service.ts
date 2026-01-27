import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { TaskDialogComponent, TaskDialogResult } from '../../features/tasks/task-dialog/task-dialog.component';
import { RewardDialogComponent, RewardDialogResult } from '../../features/rewards/reward-dialog/reward-dialog.component';

@Injectable({ providedIn: 'root' })
export class UiDialogsService {
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  async openTaskDialog(): Promise<TaskDialogResult | undefined> {
    const dialogRef = this.dialog.open(TaskDialogComponent);
    return firstValueFrom<TaskDialogResult | undefined>(dialogRef.afterClosed());
  }

  async openRewardDialog(): Promise<RewardDialogResult | undefined> {
    const dialogRef = this.dialog.open(RewardDialogComponent);
    return firstValueFrom<RewardDialogResult | undefined>(dialogRef.afterClosed());
  }

  async confirmDeleteTask(title: string): Promise<boolean> {
    return this.confirm(
      this.translate.instant('confirm.deleteTaskTitle'),
      this.translate.instant('confirm.deleteTaskMessage', { title })
    );
  }

  async confirmDeleteReward(title: string): Promise<boolean> {
    return this.confirm(
      this.translate.instant('confirm.deleteRewardTitle'),
      this.translate.instant('confirm.deleteRewardMessage', { title })
    );
  }

  async confirmUseRedemption(title: string): Promise<boolean> {
    return this.confirm(
      this.translate.instant('confirm.useRedemptionTitle'),
      this.translate.instant('confirm.useRedemptionMessage', { title }),
      this.translate.instant('confirm.use')
    );
  }

  async informProfileDuplicate(): Promise<void> {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translate.instant('profiles.duplicateTitle'),
        message: this.translate.instant('profiles.duplicateMessage'),
        confirmLabel: this.translate.instant('profiles.ok')
      }
    });
  }

  private async confirm(title: string, message: string, confirmLabel?: string): Promise<boolean> {
    return firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title,
          message,
          confirmLabel: confirmLabel ?? this.translate.instant('confirm.confirm'),
          cancelLabel: this.translate.instant('confirm.cancel')
        }
      }).afterClosed()
    );
  }
}
