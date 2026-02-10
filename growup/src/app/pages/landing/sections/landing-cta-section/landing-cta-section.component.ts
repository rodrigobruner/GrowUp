import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-landing-cta-section',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatButtonModule],
  templateUrl: './landing-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingCtaSectionComponent {
  @Output() openAuth = new EventEmitter<void>();
}
