import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-landing-hero-section',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatButtonModule],
  templateUrl: './landing-hero-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingHeroSectionComponent {
  @Output() openAuth = new EventEmitter<void>();
  @Output() startDemo = new EventEmitter<void>();
}
