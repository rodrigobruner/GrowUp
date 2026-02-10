import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { Profile } from '../../../../../core/models/profile';

type AvatarItem = { id: string; name: string; description?: string };

@Component({
  selector: 'app-settings-profiles-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, TranslateModule],
  templateUrl: './settings-profiles-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsProfilesSectionComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() profiles: Profile[] = [];
  @Input() activeProfileId: string | null = null;
  @Input() avatars: AvatarItem[] = [];
  @Input({ required: true }) avatarPreviewSrc!: () => string;
  @Input({ required: true }) avatarOptionSrc!: (avatarId: string) => string;
  @Input({ required: true }) selectedAvatarDescription!: () => string | null;
  @Input({ required: true }) trackProfileById!: (index: number, profile: Profile) => string;

  @Output() selectProfile = new EventEmitter<string>();
  @Output() deleteProfile = new EventEmitter<{ profileId: string; event: MouseEvent }>();
}
