import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-avatar',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, TranslateModule],
  templateUrl: './profile-avatar.component.html',
  styleUrl: './profile-avatar.component.scss'
})
export class ProfileAvatarComponent {
  @Input() src = '';
  @Output() createProfile = new EventEmitter<void>();
  @Output() editProfile = new EventEmitter<void>();

  onCreateProfile(): void {
    this.createProfile.emit();
  }

  onEditProfile(): void {
    this.editProfile.emit();
  }
}
