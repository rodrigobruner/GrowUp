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
      if (!settings.role) {
        const next: AccountSettings = { ...settings, role: 'USER' };
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
    const next: AccountSettings = { id: 'account', language: 'en', role: 'USER' };
    await this.db.saveAccountSettings(next);
    this.applyLanguage(next.language);
    return next;
  }

  applyLanguage(language: AccountSettings['language']): void {
    this.translate.use(language);
  }

  async updateLanguage(language: AccountSettings['language']): Promise<AccountSettings> {
    const current = this.db.getAccountSettings();
    const resolvedRole = (await current)?.role ?? 'USER';
    const next: AccountSettings = { id: 'account', language, role: resolvedRole };
    await this.db.saveAccountSettings(next);
    this.applyLanguage(language);
    return next;
  }
}
