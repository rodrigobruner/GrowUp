import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type UiRadioOption = {
  label: string;
  value: string;
  hint?: string;
};

@Component({
  selector: 'app-ui-radio-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-radio-group.component.html',
  styleUrl: './ui-radio-group.component.scss'
})
export class UiRadioGroupComponent {
  @Input() label = '';
  @Input() name = 'ui-radio-group';
  @Input() options: UiRadioOption[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  select(value: string): void {
    if (this.disabled) {
      return;
    }
    this.valueChange.emit(value);
  }
}
