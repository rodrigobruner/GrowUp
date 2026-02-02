import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-badge.component.html',
  styleUrl: './ui-badge.component.scss'
})
export class UiBadgeComponent {
  @Input() label = '';
  @Input() tone: 'sun' | 'ocean' | 'coral' | 'neutral' = 'neutral';
  @Input() size: 'sm' | 'md' = 'md';
}
