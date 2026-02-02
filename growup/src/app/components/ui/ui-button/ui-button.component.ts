import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type UiButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
export type UiButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.scss'
})
export class UiButtonComponent {
  @Input() variant: UiButtonVariant = 'primary';
  @Input() size: UiButtonSize = 'md';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.buttonClick.emit(event);
  }
}
