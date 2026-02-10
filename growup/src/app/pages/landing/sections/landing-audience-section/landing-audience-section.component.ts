import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-audience-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './landing-audience-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingAudienceSectionComponent {}
