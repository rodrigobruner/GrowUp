import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsDrawerService {
  readonly settingsOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly profileMode = signal<'create' | 'edit'>('edit');

  openSettings(): void {
    this.profileOpen.set(false);
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  openProfile(): void {
    this.profileMode.set('edit');
    this.settingsOpen.set(false);
    this.profileOpen.set(true);
  }

  openCreateProfile(): void {
    this.profileMode.set('create');
    this.settingsOpen.set(false);
    this.profileOpen.set(true);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }
}
