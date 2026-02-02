import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-orb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-orb.component.html',
  styleUrl: './ui-orb.component.scss'
})
export class UiOrbComponent {
  @Input() size = 160;
  @Input() tone: 'sun' | 'ocean' | 'coral' = 'sun';
}
