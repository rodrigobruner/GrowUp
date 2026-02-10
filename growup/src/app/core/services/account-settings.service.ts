import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AccountSettings } from '../models/account-settings';
import { GrowUpDbService } from './growup-db.service';

@Injectable({ providedIn: 'root' })
export class AccountSettingsService {
  private readonly db = inject(GrowUpDbService);
  private readonly translate = inject(TranslateService);

  constructor() {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  async loadOrSeed(seedIfEmpty: boolean): Promise<AccountSettings | null> {
    const settings = await this.db.getAccountSettings();
    if (settings) {
      if (!settings.role || !settings.plan || !settings.flags) {
        const next: AccountSettings = {
          ...settings,
          role: settings.role ?? 'USER',
          plan: settings.plan ?? 'FREE',
          flags: settings.flags ?? {}
        };
        await this.db.saveAccountSettings(next);
        this.applyLanguage(next.language);
        return next;
      }
      this.applyLanguage(settings.language);
      return settings;
    }
    if (!seedIfEmpty) {
      return null;
    }
    const next: AccountSettings = { id: 'account', language: 'en', role: 'USER', plan: 'FREE', flags: {} };
    await this.db.saveAccountSettings(next);
    this.applyLanguage(next.language);
    return next;
  }

  applyLanguage(language: AccountSettings['language']): void {
    this.translate.use(language);
  }

  async updateLanguage(language: AccountSettings['language']): Promise<AccountSettings> {
    const current = this.db.getAccountSettings();
    const resolved = await current;
    const next: AccountSettings = {
      id: 'account',
      language,
      role: resolved?.role ?? 'USER',
      plan: resolved?.plan ?? 'FREE',
      flags: resolved?.flags ?? {}
    };
    await this.db.saveAccountSettings(next);
    this.applyLanguage(language);
    return next;
  }
}
