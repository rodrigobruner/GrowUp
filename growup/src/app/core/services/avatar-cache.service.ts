import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AvatarCacheService {
  private readonly cacheName = 'growup-avatar-cache-v1';

  async getCachedUrl(url: string): Promise<string | null> {
    if (!url) {
      return null;
    }
    if (!('caches' in window)) {
      return url;
    }
    try {
      const cache = await caches.open(this.cacheName);
      let response = await cache.match(url);
      if (!response) {
        response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) {
          return null;
        }
        await cache.put(url, response.clone());
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }
}
