import { Injectable, signal } from '@angular/core';

const DEMO_MODE_KEY = 'growup.demo.enabled';

@Injectable({ providedIn: 'root' })
export class DemoModeService {
  readonly enabled = signal(localStorage.getItem(DEMO_MODE_KEY) === '1');

  enable(): void {
    localStorage.setItem(DEMO_MODE_KEY, '1');
    this.enabled.set(true);
  }

  disable(): void {
    localStorage.removeItem(DEMO_MODE_KEY);
    this.enabled.set(false);
  }

  isEnabled(): boolean {
    return this.enabled();
  }
}
