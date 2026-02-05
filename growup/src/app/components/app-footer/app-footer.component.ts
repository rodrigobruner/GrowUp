import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { PrivacyDialogComponent } from '../../features/auth/privacy-dialog/privacy-dialog.component';
import { TermsDialogComponent } from '../../features/auth/terms-dialog/terms-dialog.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, MatDialogModule, TranslateModule],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  @Input() currentYear = new Date().getFullYear();
  @Input() buildTime = environment.buildTime;
  @Input() showBuildTime = true;
  @Input() variant: 'default' | 'landing' = 'default';
  private readonly dialog = inject(MatDialog);
  private readonly environmentLabel = environment.production ? 'prod' : 'dev';

  @HostBinding('class') get hostClass(): string {
    return `app-footer app-footer--${this.variant}`;
  }

  get buildLabel(): string {
    return `${this.environmentLabel}/${this.buildTime}`;
  }

  openTermsOfUse(): void {
    this.dialog.open(TermsDialogComponent, {
      panelClass: 'terms-dialog',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      data: { showActions: false }
    });
  }

  openPrivacy(): void {
    this.dialog.open(PrivacyDialogComponent, {
      panelClass: 'terms-dialog',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw'
    });
  }
}
