import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-terms-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslateModule],
  templateUrl: './terms-dialog.component.html',
  styleUrl: './terms-dialog.component.scss'
})
export class TermsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data?: { showActions?: boolean }
  ) {}

  get showActions(): boolean {
    return this.data?.showActions !== false;
  }

  readonly today = new Date();
}
