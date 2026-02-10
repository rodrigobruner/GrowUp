import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-danger-section',
  standalone: true,
  imports: [CommonModule, MatButtonModule, TranslateModule],
  templateUrl: './settings-danger-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsDangerSectionComponent {
  @Input() isLoggedIn = false;
  @Output() openDeleteAccount = new EventEmitter<void>();
}
