import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-levelup-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslateModule],
  templateUrl: './settings-levelup-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsLevelupSectionComponent {
  @Input({ required: true }) form!: FormGroup;
}
