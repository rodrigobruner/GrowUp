import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-cache-section',
  standalone: true,
  imports: [CommonModule, MatButtonModule, TranslateModule],
  templateUrl: './settings-cache-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsCacheSectionComponent {
  @Output() clearCache = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
}
