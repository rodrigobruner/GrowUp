import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { TermsDialogComponent } from '../../features/auth/terms-dialog/terms-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class TermsService {
  readonly termsVersion = '2026-01-26';
  private termsDialogPromise: Promise<boolean> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly dialog: MatDialog
  ) {}

  async ensureAccepted(userId: string, language: string): Promise<boolean> {
    const supabase = this.auth.getClient();
    const { data, error } = await supabase
      .from('account_settings')
      .select('terms_version, terms_accepted_at')
      .eq('owner_id', userId)
      .maybeSingle();
    if (!error && data?.terms_version === this.termsVersion && data?.terms_accepted_at) {
      return true;
    }

    const metadata = this.auth.user()?.user_metadata as Record<string, unknown> | null;
    const metaVersion = typeof metadata?.['terms_version'] === 'string' ? metadata['terms_version'] : null;
    const metaAcceptedAt =
      typeof metadata?.['terms_accepted_at'] === 'string' ? metadata['terms_accepted_at'] : null;
    if (metaVersion === this.termsVersion && metaAcceptedAt) {
      const payload = {
        owner_id: userId,
        language,
        terms_version: metaVersion,
        terms_accepted_at: metaAcceptedAt
      };
      await supabase.from('account_settings').upsert(payload, { onConflict: 'owner_id' });
      return true;
    }

    const accepted = await this.openTermsDialog();
    if (!accepted) {
      return false;
    }

    const payload = {
      owner_id: userId,
      language,
      terms_version: this.termsVersion,
      terms_accepted_at: new Date().toISOString()
    };
    await supabase.from('account_settings').upsert(payload, { onConflict: 'owner_id' });
    return true;
  }

  async openTermsDialog(): Promise<boolean> {
    if (!this.termsDialogPromise) {
      this.termsDialogPromise = firstValueFrom(
        this.dialog.open(TermsDialogComponent, {
          panelClass: 'terms-dialog',
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw'
        }).afterClosed()
      ).then((value) => Boolean(value));
    }
    const accepted = await this.termsDialogPromise;
    this.termsDialogPromise = null;
    return accepted;
  }
}
