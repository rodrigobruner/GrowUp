import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-stat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-stat.component.html',
  styleUrl: './ui-stat.component.scss'
})
export class UiStatComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() delta = '';
  @Input() trend: 'up' | 'down' | 'flat' = 'flat';
}
