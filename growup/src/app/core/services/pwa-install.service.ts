import { Injectable, signal } from '@angular/core';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  readonly canInstall = signal(false);
  readonly isIos = signal(false);
  readonly isMobile = signal(false);
  readonly isStandalone = signal(false);

  constructor() {
    this.isIos.set(this.detectIos());
    this.isMobile.set(this.detectMobile());
    this.isStandalone.set(this.detectStandalone());

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
    });
  }

  async promptInstall(): Promise<void> {
    if (!this.deferredPrompt) {
      return;
    }
    await this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
    }
  }

  private detectIos(): boolean {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  }

  private detectMobile(): boolean {
    const ua = window.navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod/.test(ua);
  }

  private detectStandalone(): boolean {
    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      return true;
    }
    return (window.navigator as { standalone?: boolean }).standalone === true;
  }
}
