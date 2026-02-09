import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { PwaInstallDialogComponent } from '../pwa-install-dialog/pwa-install-dialog.component';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, TranslateModule],
  templateUrl: './pwa-install-banner.component.html',
  styleUrl: './pwa-install-banner.component.scss'
})
export class PwaInstallBannerComponent {
  private readonly dialog = inject(MatDialog);
  private readonly pwa = inject(PwaInstallService);
  private readonly dismissed = signal(this.wasDismissedRecently());

  readonly showBanner = computed(() => {
    if (this.dismissed()) {
      return false;
    }
    if (!this.pwa.isMobile() || this.pwa.isStandalone()) {
      return false;
    }
    return this.pwa.isIos() || this.pwa.canInstall();
  });

  get isIos(): boolean {
    return this.pwa.isIos();
  }

  async install(): Promise<void> {
    await this.pwa.promptInstall();
  }

  openInstructions(): void {
    this.dialog.open(PwaInstallDialogComponent);
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (this.isIos) {
      this.setDismissCookie();
    }
  }

  private wasDismissedRecently(): boolean {
    const cookie = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith('growup_pwa_ios_dismissed='));
    return cookie?.includes('1') ?? false;
  }

  private setDismissCookie(): void {
    document.cookie = 'growup_pwa_ios_dismissed=1; Max-Age=86400; Path=/; SameSite=Lax';
  }
}
