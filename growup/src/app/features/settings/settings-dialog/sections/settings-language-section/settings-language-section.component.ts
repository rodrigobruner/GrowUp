import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-language-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, TranslateModule],
  templateUrl: './settings-language-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsLanguageSectionComponent {
  @Input({ required: true }) form!: FormGroup;
}
