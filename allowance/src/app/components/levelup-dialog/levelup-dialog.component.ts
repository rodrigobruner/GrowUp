import { Component, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
        height: 100%;
        align-content: center;
        padding: 1.5rem;
        color: #fdf4e3;
      }

      .levelup-title {
        margin: 0;
        font-family: 'Baloo 2', 'Comic Sans MS', cursive;
        font-size: 4rem;
        line-height: 1.1;
        color: #feb21a;
      }

      .levelup-subtitle {
        margin: 0;
        font-size: 1.2rem;
      }

      .levelup video {
        max-width: 90vw;
        max-height: 60vh;
        border-radius: 16px;
        background: #000;
        margin: 0 auto;
      }

      .close-button {
        width: 480px;
        max-width: 90vw;
        margin: 0 auto;
        display: inline-flex;
        justify-content: center;
        background: #feb21a;
        color: #fde7b6;
        border: 1px solid #f0a914;
      }

      .close-button:hover {
        background: #f0a914;
      }
    `
  ]
})
export class LevelupDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<LevelupDialogComponent>);
  private readonly document = inject(DOCUMENT);
  private readonly data = inject<{ avatarId?: string }>(MAT_DIALOG_DATA, { optional: true });

  ngOnInit(): void {
    setTimeout(() => this.dialogRef.close(), 10000);
  }

  get videoSrc(): string {
    const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
    const normalized = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
    const avatarId = this.data?.avatarId ?? '01';
    return `${normalized}assets/avatar/${avatarId}/levelup.mov`;
  }

  close(): void {
    this.dialogRef.close();
  }
}
