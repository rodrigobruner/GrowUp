import { Injectable, signal } from '@angular/core';
import { GrowUpDbService } from './growup-db.service';
import { Profile } from '../models/profile';
import { Settings } from '../models/settings';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  readonly profiles = signal<Profile[]>([]);
  readonly activeProfileId = signal<string | null>(null);

  constructor(private readonly db: GrowUpDbService) {}

  setProfiles(next: Profile[]): void {
    this.profiles.set(next);
  }

  setActiveProfile(profileId: string | null): void {
    this.activeProfileId.set(profileId);
    this.db.setActiveProfile(profileId);
  }

  getActiveProfileId(): string | null {
    return this.activeProfileId();
  }

  profileNameExists(name: string): boolean {
    const key = name.trim().toLowerCase();
    return this.profiles().some((profile) => profile.displayName.trim().toLowerCase() === key);
  }

  async createProfile(result: Pick<Settings, 'avatarId' | 'displayName'>): Promise<Profile> {
    const profileId = this.db.createId();
    const profile: Profile = {
      id: profileId,
      displayName: result.displayName ?? '',
      avatarId: result.avatarId ?? '01',
      role: 'USER',
      createdAt: Date.now()
    };
    await this.db.addProfile(profile);
    this.profiles.update((items) => [...items, profile]);
    return profile;
  }

  async updateProfile(profileId: string, result: Pick<Settings, 'avatarId' | 'displayName'>): Promise<Profile> {
    const existing = this.profiles().find((item) => item.id === profileId);
    const profile: Profile = {
      id: profileId,
      displayName: result.displayName ?? existing?.displayName ?? '',
      avatarId: result.avatarId ?? existing?.avatarId ?? '01',
      role: existing?.role ?? 'USER',
      createdAt: existing?.createdAt ?? Date.now()
    };
    await this.db.updateProfile(profile);
    this.profiles.update((items) => items.map((item) => (item.id === profileId ? { ...item, ...profile } : item)));
    return profile;
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.db.removeProfileData(profileId);
    await this.db.removeProfile(profileId);
    this.profiles.update((items) => items.filter((item) => item.id !== profileId));
  }

  async seedDefaultProfile(displayName: string): Promise<Profile> {
    const profileId = this.db.createId();
    const profile: Profile = {
      id: profileId,
      displayName,
      avatarId: '01',
      role: 'USER',
      createdAt: Date.now()
    };
    await this.db.addProfile(profile);
    this.profiles.update((items) => [...items, profile]);
    return profile;
  }
}
