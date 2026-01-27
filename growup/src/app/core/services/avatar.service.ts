import { computed, inject, Injectable } from '@angular/core';
import { SessionStateService } from './session-state.service';
import { SummaryService } from './summary.service';

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly state = inject(SessionStateService);
  private readonly summary = inject(SummaryService);

  readonly avatarSrc = computed(() => {
    const avatarNumber = this.state.settings().avatarId || '01';
    return `assets/avatar/${avatarNumber}/level-${this.summary.level()}.png`;
  });
}
