import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AccountSettings } from '../models/account-settings';
import { Profile } from '../models/profile';
import { Settings } from '../models/settings';
import { AuthService } from './auth.service';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { SessionStateService } from './session-state.service';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class ProfileManagementService {
  private readonly db = inject(GrowUpDbService);
  private readonly profileService = inject(ProfileService);
  private readonly state = inject(SessionStateService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly sync = inject(SyncService);

  async saveSettings(result: {
    language: AccountSettings['language'];
    profile: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>;
  }): Promise<void> {
    const accountSettings: AccountSettings = {
      ...this.state.accountSettings(),
      language: result.language,
      id: 'account'
    };
    await this.db.saveAccountSettings(accountSettings);
    this.state.accountSettings.set(accountSettings);
    this.translate.use(accountSettings.language);

    const profileId = this.profileService.activeProfileId();
    if (!profileId) {
      return;
    }

    const profile: Profile = {
      id: profileId,
      displayName: result.profile.displayName ?? '',
      avatarId: result.profile.avatarId ?? '01',
      createdAt: this.profileService.profiles().find((item) => item.id === profileId)?.createdAt ?? Date.now()
    };
    await this.db.updateProfile(profile);
    this.profileService.setProfiles(
      this.profileService.profiles().map((item) => (item.id === profileId ? { ...item, ...profile } : item))
    );

    const settings: Settings = {
      ...this.state.settings(),
      ...result.profile,
      id: profileId,
      profileId
    };
    await this.db.saveSettings(settings);
    this.state.settings.set(settings);

    this.sync.notifyLocalChange();
  }

  async saveProfile(
    mode: 'create' | 'edit',
    result: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>
  ): Promise<'ok' | 'duplicate' | 'missing' | 'limit'> {
    const profileId = mode === 'create' ? this.db.createId() : this.profileService.activeProfileId();
    if (!profileId) {
      return 'missing';
    }

    const rawName = (result.displayName ?? '').trim();
    const nameKey = rawName.toLowerCase();
    if (mode === 'create') {
      const maxProfiles = this.resolveMaxProfiles();
      if (this.profileService.profiles().length >= maxProfiles) {
        return 'limit';
      }
      const exists = this.profileService
        .profiles()
        .some((profile) => profile.displayName.trim().toLowerCase() === nameKey);
      if (exists) {
        return 'duplicate';
      }
    }

    const profile: Profile = {
      id: profileId,
      displayName: rawName,
      avatarId: result.avatarId ?? '01',
      createdAt:
        mode === 'create'
          ? Date.now()
          : (this.profileService.profiles().find((p) => p.id === profileId)?.createdAt ?? Date.now())
    };

    if (mode === 'create') {
      this.markProfileCreated();
      await this.db.addProfile(profile);
      this.profileService.setProfiles([...this.profileService.profiles(), profile]);
      this.profileService.setActiveProfile(profileId);
    } else {
      await this.db.updateProfile(profile);
      this.profileService.setProfiles(
        this.profileService.profiles().map((item) => (item.id === profileId ? { ...item, ...profile } : item))
      );
    }

    const settings: Settings = {
      ...this.state.settings(),
      ...result,
      id: profileId,
      profileId
    };
    await this.db.saveSettings(settings);
    this.state.settings.set(settings);

    this.sync.notifyLocalChange();
    return 'ok';
  }

  private markProfileCreated(): void {
    const userId = this.auth.user()?.id ?? 'anon';
    localStorage.setItem(`growup.onboarding.profileCreated.${userId}`, '1');
  }

  private resolveMaxProfiles(): number {
    const flag = this.state.accountSettings().flags?.['profiles'];
    const enabled = typeof flag === 'boolean' ? flag : true;
    return enabled ? 5 : 1;
  }

  async selectProfile(profileId: string): Promise<void> {
    this.profileService.setActiveProfile(profileId);
    await this.state.refreshFromDb(false);
  }

  async deleteProfile(profileId: string): Promise<boolean> {
    if (this.profileService.profiles().length <= 1) {
      return false;
    }
    const profile = this.profileService.profiles().find((item) => item.id === profileId);
    if (!profile) {
      return false;
    }

    await this.db.removeProfileData(profileId);
    await this.db.removeProfile(profileId);
    this.profileService.setProfiles(this.profileService.profiles().filter((item) => item.id !== profileId));

    if (this.profileService.activeProfileId() === profileId) {
      const next = this.profileService.profiles()[0]?.id ?? null;
      this.profileService.setActiveProfile(next);
      if (next) {
        localStorage.setItem('activeProfileId', next);
      } else {
        localStorage.removeItem('activeProfileId');
      }
      await this.state.refreshFromDb(false);
    }

    this.sync.notifyLocalChange();
    return true;
  }
}
