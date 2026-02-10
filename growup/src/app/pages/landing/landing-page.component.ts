import { CommonModule } from '@angular/common';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { AvatarService } from '../../core/services/avatar.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { ProfileService } from '../../core/services/profile.service';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { AppFooterComponent } from '../../components/app-footer/app-footer.component';
import { TranslateModule } from '@ngx-translate/core';
import { AuthDialogsService } from '../../core/services/auth-dialogs.service';
import { TermsDialogComponent } from '../../features/auth/terms-dialog/terms-dialog.component';
import { LandingHeroSectionComponent } from './sections/landing-hero-section/landing-hero-section.component';
import { LandingProblemSectionComponent } from './sections/landing-problem-section/landing-problem-section.component';
import { LandingSolutionSectionComponent } from './sections/landing-solution-section/landing-solution-section.component';
import { LandingStepsSectionComponent } from './sections/landing-steps-section/landing-steps-section.component';
import { LandingSkillsSectionComponent } from './sections/landing-skills-section/landing-skills-section.component';
import { LandingDifferenceSectionComponent } from './sections/landing-difference-section/landing-difference-section.component';
import { LandingAudienceSectionComponent } from './sections/landing-audience-section/landing-audience-section.component';
import { LandingPrivacySectionComponent } from './sections/landing-privacy-section/landing-privacy-section.component';
import { LandingCtaSectionComponent } from './sections/landing-cta-section/landing-cta-section.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    TopbarComponent,
    AppFooterComponent,
    TranslateModule,
    LandingHeroSectionComponent,
    LandingProblemSectionComponent,
    LandingSolutionSectionComponent,
    LandingStepsSectionComponent,
    LandingSkillsSectionComponent,
    LandingDifferenceSectionComponent,
    LandingAudienceSectionComponent,
    LandingPrivacySectionComponent,
    LandingCtaSectionComponent
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LandingPageComponent {
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly auth = inject(AuthService);
  private readonly demoMode = inject(DemoModeService);
  private readonly router = inject(Router);
  private readonly avatar = inject(AvatarService);
  private readonly state = inject(SessionStateService);
  private readonly profileService = inject(ProfileService);
  private readonly dialog = inject(MatDialog);

  readonly avatarSrc = this.avatar.avatarSrc;
  readonly profiles = this.profileService.profiles;
  readonly activeProfileId = this.profileService.activeProfileId;
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
