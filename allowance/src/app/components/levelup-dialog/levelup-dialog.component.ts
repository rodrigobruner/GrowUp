import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-levelup-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslateModule],
  templateUrl: './levelup-dialog.component.html',
  styles: [
    `
      .levelup {
        display: grid;
        gap: 0.75rem;
        text-align: center;
      }

      .levelup h2 {
        margin: 0;
        font-family: 'Baloo 2', 'Comic Sans MS', cursive;
      }

      .levelup video {
        width: 100%;
        border-radius: 16px;
        background: #000;
      }
    `
  ]
})
export class LevelupDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<LevelupDialogComponent>);

  ngOnInit(): void {
    setTimeout(() => this.dialogRef.close(), 5200);
  }

  close(): void {
    this.dialogRef.close();
  }
}
