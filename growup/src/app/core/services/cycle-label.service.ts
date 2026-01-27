import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Settings } from '../models/settings';

@Injectable({ providedIn: 'root' })
export class CycleLabelService {
  private readonly translate = inject(TranslateService);

  cycleLabel(cycleType: Settings['cycleType']): string {
    const keyMap: Record<Settings['cycleType'], string> = {
      weekly: 'cycle.weekly',
      biweekly: 'cycle.biweekly',
      monthly: 'cycle.monthly',
      yearly: 'cycle.yearly'
    };
    return this.translate.instant(keyMap[cycleType]);
  }
}
