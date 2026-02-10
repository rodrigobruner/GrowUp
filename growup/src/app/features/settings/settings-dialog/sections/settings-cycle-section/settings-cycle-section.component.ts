import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-cycle-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, TranslateModule],
  templateUrl: './settings-cycle-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsCycleSectionComponent {
  @Input({ required: true }) form!: FormGroup;
}
