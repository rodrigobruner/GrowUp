import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

export type SyncStatusData = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
};

@Component({
  selector: 'app-sync-status-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, TranslateModule],
  templateUrl: './sync-status-dialog.component.html'
})
export class SyncStatusDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: SyncStatusData) {}
}
