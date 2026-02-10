import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-solution-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './landing-solution-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingSolutionSectionComponent {}
