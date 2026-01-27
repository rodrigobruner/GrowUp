import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LevelupDialogComponent } from '../../features/levelup/levelup-dialog/levelup-dialog.component';

@Injectable({ providedIn: 'root' })
export class LevelupDialogService {
  private readonly dialog = inject(MatDialog);

  openLevelUp(avatarId: string): void {
    this.dialog.open(LevelupDialogComponent, {
      data: {
        avatarId
      },
      panelClass: 'levelup-dialog',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw'
    });
  }
}
