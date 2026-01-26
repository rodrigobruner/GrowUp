import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-levelup-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslateModule],
  templateUrl: './levelup-dialog.component.html',
  styleUrl: './levelup-dialog.component.scss'
})
export class LevelupDialogComponent implements OnInit, AfterViewInit {
  private readonly dialogRef = inject(MatDialogRef<LevelupDialogComponent>);
  private readonly document = inject(DOCUMENT);
  private readonly data = inject<{ avatarId?: string }>(MAT_DIALOG_DATA, { optional: true });
  @ViewChild('levelupVideo') private readonly levelupVideo?: ElementRef<HTMLVideoElement>;

  ngOnInit(): void {
    setTimeout(() => this.dialogRef.close(), 10000);
  }

  ngAfterViewInit(): void {
    this.setMaxVolume();
  }

  get videoSrc(): string {
    const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
    const normalized = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
    const avatarId = this.data?.avatarId ?? '01';
    return `${normalized}assets/avatar/${avatarId}/levelup.mp4`;
  }

  setMaxVolume(): void {
    const video = this.levelupVideo?.nativeElement;
    if (!video) {
      return;
    }
    video.muted = false;
    video.volume = 1;
  }

  close(): void {
    this.dialogRef.close();
  }
}
