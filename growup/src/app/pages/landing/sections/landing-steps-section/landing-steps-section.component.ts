import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-steps-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './landing-steps-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingStepsSectionComponent {}
