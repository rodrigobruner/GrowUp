import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type UiSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-ui-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-select-field.component.html',
  styleUrl: './ui-select-field.component.scss'
})
export class UiSelectFieldComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() value = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() options: UiSelectOption[] = [];
  @Output() valueChange = new EventEmitter<string>();
}
