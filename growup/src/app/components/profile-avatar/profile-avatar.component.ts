import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Profile } from '../../core/models/profile';
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
  @Input() profiles: Profile[] = [];
  @Input() activeProfileId: string | null = null;
  @Input() maxProfiles = 5;
  @Output() createProfile = new EventEmitter<void>();
  @Output() editProfile = new EventEmitter<void>();
  @Output() profileSelect = new EventEmitter<string>();

  get reachedLimit(): boolean {
    return this.profiles.length >= this.maxProfiles;
  }

  onCreateProfile(): void {
    if (this.reachedLimit) {
      return;
    }
    this.createProfile.emit();
  }

  onEditProfile(): void {
    this.editProfile.emit();
  }

  selectProfile(profileId: string): void {
    this.profileSelect.emit(profileId);
  }

  profileAvatarSrc(avatarId?: string): string {
    const resolved = avatarId ?? '01';
    return `assets/avatar/${resolved}/avatar.webp`;
  }

  trackProfileId(_: number, profile: Profile): string {
    return profile.id;
  }
}
