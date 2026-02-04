import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { AvatarService } from '../../core/services/avatar.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { AppFooterComponent } from '../../components/app-footer/app-footer.component';
import { TranslateModule } from '@ngx-translate/core';
import { AuthDialogsService } from '../../core/services/auth-dialogs.service';
import { TermsDialogComponent } from '../../features/auth/terms-dialog/terms-dialog.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, TopbarComponent, AppFooterComponent, TranslateModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly auth = inject(AuthService);
  private readonly demoMode = inject(DemoModeService);
  private readonly router = inject(Router);
  private readonly avatar = inject(AvatarService);
  private readonly state = inject(SessionStateService);
  private readonly dialog = inject(MatDialog);

  readonly avatarSrc = this.avatar.avatarSrc;
  currentYear = new Date().getFullYear();

  constructor() {}

  openAuth(): void {
    this.authDialogs.openAuth();
  }

  async startDemo(): Promise<void> {
    this.demoMode.enable();
    await this.state.refreshFromDb(true);
    void this.router.navigate(['/dashboard']);
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
