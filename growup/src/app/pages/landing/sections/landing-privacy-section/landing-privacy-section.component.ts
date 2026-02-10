import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-privacy-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './landing-privacy-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPrivacySectionComponent {
  @Output() openTerms = new EventEmitter<void>();
}
