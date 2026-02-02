import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-card.component.html',
  styleUrl: './ui-card.component.scss'
})
export class UiCardComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() tone: 'sun' | 'ocean' | 'coral' | 'sand' = 'ocean';
}
