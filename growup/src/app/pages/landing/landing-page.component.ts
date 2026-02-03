import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { AvatarService } from '../../core/services/avatar.service';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TranslateModule } from '@ngx-translate/core';
import { AuthDialogsService } from '../../core/services/auth-dialogs.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, TopbarComponent, TranslateModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly auth = inject(AuthService);
  private readonly demoMode = inject(DemoModeService);
  private readonly router = inject(Router);
  private readonly avatar = inject(AvatarService);

  readonly avatarSrc = this.avatar.avatarSrc;
  currentYear = new Date().getFullYear();

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn() || this.demoMode.isEnabled()) {
        void this.router.navigate(['/dashboard']);
      }
    });
  }

  openAuth(): void {
    this.authDialogs.openAuth();
  }

  startDemo(): void {
    this.demoMode.enable();
    void this.router.navigate(['/dashboard']);
  }
}
