import { computed, Injectable, signal } from '@angular/core';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class AppStatusService {
  readonly isOnline = signal(navigator.onLine);

  constructor(private readonly sync: SyncService) {
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }

  readonly isSyncing = computed(() => this.sync.isSyncing());
  readonly lastSyncAt = computed(() => this.sync.lastSyncAt());
  readonly syncError = computed(() => this.sync.lastError());
  readonly refreshTick = computed(() => this.sync.refreshTick());
}
