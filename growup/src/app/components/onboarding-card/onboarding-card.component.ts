import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-onboarding-card',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, TranslateModule],
  templateUrl: './onboarding-card.component.html',
  styleUrl: './onboarding-card.component.scss'
})
export class OnboardingCardComponent {
  @Output() createProfile = new EventEmitter<void>();

  onCreateProfile(): void {
    this.createProfile.emit();
  }
}
