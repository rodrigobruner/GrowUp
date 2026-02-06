import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ui-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-checkbox.component.html',
  styleUrl: './ui-checkbox.component.scss'
})
export class UiCheckboxComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() checked = false;
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  handleChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.checkedChange.emit(input?.checked ?? false);
  }
}
