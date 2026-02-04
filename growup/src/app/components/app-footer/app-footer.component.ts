import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TermsDialogComponent } from '../../features/auth/terms-dialog/terms-dialog.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, MatDialogModule, TranslateModule],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  @Input() currentYear = new Date().getFullYear();
  @Input() buildTime = '';
  @Input() showBuildTime = false;
  @Input() variant: 'default' | 'landing' = 'default';
  private readonly dialog = inject(MatDialog);

  @HostBinding('class') get hostClass(): string {
    return `app-footer app-footer--${this.variant}`;
  }

  openTerms(): void {
    this.dialog.open(TermsDialogComponent, {
      panelClass: 'terms-dialog',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw'
    });
  }
}
