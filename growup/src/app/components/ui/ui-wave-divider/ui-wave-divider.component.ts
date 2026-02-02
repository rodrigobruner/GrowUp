import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-wave-divider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-wave-divider.component.html',
  styleUrl: './ui-wave-divider.component.scss'
})
export class UiWaveDividerComponent {
  @Input() height = 80;
}
