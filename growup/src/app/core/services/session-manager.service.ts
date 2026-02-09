import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { GrowUpDbService } from './growup-db.service';
import { SyncService } from './sync.service';
import { TermsService } from './terms.service';
import { LoggerService } from './logger.service';
import { AccountSettings } from '../models/account-settings';
import { AccessTrackingService } from './access-tracking.service';

const SESSION_TERMS_KEY = 'growup.lastTermsVersion';

@Injectable({ providedIn: 'root' })
export class SessionManagerService {
  private lastUserId: string | null = null;
  private lastTermsVersion: string | null = null;
  private readonly auth = inject(AuthService);
  private readonly db = inject(GrowUpDbService);
  private readonly sync = inject(SyncService);
  private readonly terms = inject(TermsService);
  private readonly logger = inject(LoggerService);
  private readonly accessTracking = inject(AccessTrackingService);

  constructor() {
    const stored = localStorage.getItem(SESSION_TERMS_KEY);
    this.lastTermsVersion = stored ? stored : null;
  }

  async handleAuthChange(
    userId: string | null,
    language: AccountSettings['language'],
    termsVersion?: string | null
  ): Promise<boolean> {
    if (userId === this.lastUserId && this.sync.isStarted() && termsVersion === this.lastTermsVersion) {
      return true;
    }
    this.logger.info('session.change.start', { userId });
    this.sync.stop();

    if (userId && this.lastUserId !== userId) {
      this.logger.info('session.change.user', { from: this.lastUserId, to: userId });
      await this.db.clearAnonymousDatabase();
      localStorage.removeItem('activeProfileId');
    }

    this.db.setUser(userId);
    this.lastUserId = userId;

    if (!userId) {
      this.logger.info('session.change.anon');
      this.logger.clear();
      return true;
    }

    const accepted = await this.terms.ensureAccepted(userId, language ?? 'en');
    if (!accepted) {
      this.logger.warn('session.terms.declined');
      await this.auth.signOut();
      return false;
    }
    this.lastTermsVersion = termsVersion ?? null;
    if (this.lastTermsVersion) {
      localStorage.setItem(SESSION_TERMS_KEY, this.lastTermsVersion);
    } else {
      localStorage.removeItem(SESSION_TERMS_KEY);
    }

    await this.sync.start();
    void this.accessTracking.trackDailyAccess(userId);
    this.logger.info('session.change.done', { userId });
    return true;
  }
}
