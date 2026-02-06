import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AccountSettings } from '../models/account-settings';
import { Profile } from '../models/profile';
import { Reward } from '../models/reward';
import { Settings } from '../models/settings';
import { Task } from '../models/task';
import { AuthService } from './auth.service';
import { GrowUpDbService } from './growup-db.service';
import { SyncService } from './sync.service';

export const currentDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Injectable({ providedIn: 'root' })
export class SeedService {
  private readonly db = inject(GrowUpDbService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly sync = inject(SyncService);

  async ensureProfiles(seedIfEmpty: boolean, accountLanguage: AccountSettings['language']): Promise<{
    profiles: Profile[];
    activeProfileId: string | null;
    seededProfile: boolean;
  }> {
    let profiles = await this.db.getProfiles();
    let activeProfileId: string | null = null;
    const storedProfileId = localStorage.getItem('activeProfileId');
    if (storedProfileId && profiles.some((profile) => profile.id === storedProfileId)) {
      activeProfileId = storedProfileId;
    }

    if (!profiles.length && seedIfEmpty && this.auth.isLoggedIn() && navigator.onLine) {
      const hasRemote = await this.hasRemoteProfiles();
      if (hasRemote === true) {
        await this.sync.requestSync(true);
        profiles = await this.db.getProfiles();
      } else if (hasRemote === null) {
        seedIfEmpty = false;
      }
    }

    let seededProfile = false;

    if (!profiles.length && seedIfEmpty && this.auth.isLoggedIn() && !navigator.onLine) {
      const profileId = this.db.createId();
      const displayName = this.defaultProfileName();
      const profile: Profile = {
        id: profileId,
        displayName,
        avatarId: '01',
        role: 'USER',
        createdAt: Date.now()
      };
      await this.db.addProfile(profile);
      const profileSettings: Settings = {
        id: profileId,
        profileId,
        cycleType: 'biweekly',
        cycleStartDate: currentDateKey(),
        levelUpPoints: 100,
        avatarId: '01',
        displayName
      };
      await this.db.saveSettings(profileSettings);
      profiles = [profile];
      activeProfileId = profileId;
      seededProfile = true;
    }

    if (!profiles.length && this.auth.isLoggedIn()) {
      localStorage.removeItem('activeProfileId');
    }

    if (!profiles.length && seedIfEmpty && !this.auth.isLoggedIn()) {
      const profileId = this.db.createId();
      const displayName = this.defaultProfileName();
      const profile: Profile = {
        id: profileId,
        displayName,
        avatarId: '01',
        role: 'USER',
        createdAt: Date.now()
      };
      await this.db.addProfile(profile);
      const profileSettings: Settings = {
        id: profileId,
        profileId,
        cycleType: 'biweekly',
        cycleStartDate: currentDateKey(),
        levelUpPoints: 100,
        avatarId: '01',
        displayName
      };
      await this.db.saveSettings(profileSettings);
      profiles = [profile];
      activeProfileId = profileId;
      seededProfile = true;
    }

    if (!profiles.length && seedIfEmpty && this.auth.isLoggedIn()) {
      const hasRemote = await this.hasRemoteProfiles();
      if (hasRemote === false) {
        // No remote profiles: keep empty to show onboarding (no auto-seed for logged in users).
        profiles = [];
        activeProfileId = null;
      }
    }

    if (!activeProfileId && profiles.length) {
      activeProfileId = profiles[0].id;
    }

    return { profiles, activeProfileId, seededProfile };
  }

  async seedDefaultTasks(profileId: string): Promise<Task[]> {
    const language = this.seedLanguage();
    const defaults = this.seedDefaults<Array<{ title: string; points: number }>>('seed.defaultTasks');
    const seeded = defaults.map((entry, index) => ({
      id: this.defaultId('task', language, index, profileId),
      profileId,
      title: entry.title,
      points: entry.points,
      createdAt: Date.now()
    }));
    await Promise.all(seeded.map((task) => this.db.addTask(task)));
    return seeded;
  }

  async seedDefaultRewards(profileId: string): Promise<Reward[]> {
    const language = this.seedLanguage();
    const defaults = this.seedDefaults<Array<{ title: string; cost: number; limitPerCycle: number }>>(
      'seed.defaultRewards'
    );
    const seeded = defaults.map((entry, index) => ({
      id: this.defaultId('reward', language, index, profileId),
      profileId,
      title: entry.title,
      cost: entry.cost,
      limitPerCycle: entry.limitPerCycle,
      createdAt: Date.now()
    }));
    await Promise.all(seeded.map((reward) => this.db.addReward(reward)));
    return seeded;
  }

  defaultProfileName(): string {
    const name = this.translate.instant('seed.defaultProfileName');
    return typeof name === 'string' ? name : '';
  }

  private async hasRemoteProfiles(): Promise<boolean | null> {
    const user = this.auth.user();
    if (!user) {
      return false;
    }
    const supabase = this.auth.getClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    if (error) {
      return null;
    }
    return (count ?? 0) > 0;
  }

  private defaultId(kind: 'task' | 'reward', language: string, index: number, profileId: string): string {
    const langKey = this.seedLanguageKey(language);
    const seed = `default-${kind}-${langKey}-${index + 1}-${profileId}`;
    return this.uuidFromString(seed);
  }

  private seedLanguage(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  private seedLanguageKey(language: string): string {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('pt')) {
      return 'pt';
    }
    if (normalized.startsWith('fr')) {
      return 'fr';
    }
    if (normalized.startsWith('es')) {
      return 'es';
    }
    return 'en';
  }

  private seedDefaults<T extends unknown[]>(key: string): T {
    const defaults = this.translate.instant(key);
    return Array.isArray(defaults) ? (defaults as T) : ([] as unknown as T);
  }

  private uuidFromString(value: string): string {
    const hash = (seed: number) => {
      let h = 2166136261 ^ seed;
      for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const toHex = (num: number, length: number) => num.toString(16).padStart(length, '0');
    const a = hash(1);
    const b = hash(2);
    const c = hash(3);
    const d = hash(4);

    const part1 = toHex(a, 8);
    const part2 = toHex(b >>> 16, 4);
    const part3 = toHex((b & 0x0fff) | 0x5000, 4);
    const part4 = toHex((c & 0x3fff) | 0x8000, 4);
    const part5 = toHex(d, 8) + toHex(c >>> 16, 4);

    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }

}
