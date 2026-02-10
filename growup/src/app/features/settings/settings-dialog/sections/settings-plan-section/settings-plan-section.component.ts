import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AccountSettings } from '../../../../../core/models/account-settings';

@Component({
  selector: 'app-settings-plan-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './settings-plan-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPlanSectionComponent {
  @Input() accountSettings: AccountSettings | null = null;
}
