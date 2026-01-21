import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, TranslateModule],
  templateUrl: './topbar.component.html',
  styles: [
    `
      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--app-primary);
        color: var(--app-cream);
        box-shadow: 0 6px 24px var(--app-shadow);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
      }

      .brand-title {
        font-family: 'Baloo 2', 'Comic Sans MS', cursive;
        font-size: 1.2rem;
        letter-spacing: 0.02em;
      }

      .spacer {
        flex: 1;
      }

      .balance {
        text-align: right;
        display: grid;
        gap: 0.1rem;
      }

      .balance .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.7;
      }

      .balance .value {
        font-size: 1.1rem;
        font-weight: 600;
      }

      button[mat-icon-button] {
        margin-right: 0.5rem;
        color: var(--app-cream);
      }

    `
  ]
})
export class TopbarComponent {
  @Input({ required: true }) balance = 0;
  @Output() settingsClick = new EventEmitter<void>();
}
