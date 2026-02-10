import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class AccessTrackingService {
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  async trackDailyAccess(userId: string): Promise<void> {
    const accessDate = this.formatDateKey(new Date());
    const { error } = await this.auth
      .getClient()
      .from('daily_access_events')
      .upsert(
        {
          owner_id: userId,
          accessed_at: accessDate,
          last_accessed_at: new Date().toISOString()
        },
        { onConflict: 'owner_id,accessed_at' }
      );

    if (error) {
      this.logger.warn('admin.access.track.failed', { message: error.message });
    }
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
