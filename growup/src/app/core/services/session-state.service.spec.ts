import { TestBed } from '@angular/core/testing';
import { SessionStateService } from './session-state.service';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { AccountSettingsService } from './account-settings.service';
import { SeedService } from './seed.service';
import { AuthService } from './auth.service';
import { SyncService } from './sync.service';

describe('SessionStateService', () => {
  const buildDb = () => ({
    migrateDefaultIds: async () => {},
    migrateLegacyRewardRedemptions: async () => {},
    getTasks: async () => [],
    getRewards: async () => [],
    getCompletions: async () => [],
    getSettings: async () => undefined,
    getRedemptions: async () => [],
    getRewardUses: async () => []
  });

  const buildProfileService = () => ({
    setProfiles: () => {},
    setActiveProfile: () => {}
  });

  const buildAccountSettingsService = () => ({
    loadOrSeed: async () => ({ id: 'account', language: 'en', role: 'USER' })
  });

  const buildSeedService = (profiles: Array<{ id: string }>) => ({
    ensureProfiles: async () => ({
      profiles,
      activeProfileId: profiles[0]?.id ?? null,
      seededProfile: false
    }),
    seedDefaultTasks: async () => [],
    seedDefaultRewards: async () => [],
    defaultProfileName: () => 'Default'
  });

  const buildAuth = (loggedIn: boolean) => ({
    isLoggedIn: () => loggedIn,
    user: () => (loggedIn ? { id: 'user' } : null)
  });

  const buildSync = () => ({
    notifyLocalChange: () => {}
  });

  const setup = (loggedIn: boolean, profiles: Array<{ id: string }>) => {
    TestBed.configureTestingModule({
      providers: [
        SessionStateService,
        { provide: GrowUpDbService, useValue: buildDb() },
        { provide: ProfileService, useValue: buildProfileService() },
        { provide: AccountSettingsService, useValue: buildAccountSettingsService() },
        { provide: SeedService, useValue: buildSeedService(profiles) },
        { provide: AuthService, useValue: buildAuth(loggedIn) },
        { provide: SyncService, useValue: buildSync() }
      ]
    });
    return TestBed.inject(SessionStateService);
  };

  it('sets status to empty when logged in with no profiles', async () => {
    const service = setup(true, []);
    await service.refreshFromDb(true);
    expect(service.status()).toBe('empty');
  });

  it('sets status to idle when logged out with no profiles', async () => {
    const service = setup(false, []);
    await service.refreshFromDb(true);
    expect(service.status()).toBe('idle');
  });

  it('sets status to ready when profiles exist', async () => {
    const service = setup(true, [{ id: 'profile-1' }]);
    await service.refreshFromDb(true);
    expect(service.status()).toBe('ready');
  });
});
