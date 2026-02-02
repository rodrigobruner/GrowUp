import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-text-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-text-field.component.html',
  styleUrl: './ui-text-field.component.scss'
})
export class UiTextFieldComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() value = '';
  @Input() type: 'text' | 'email' | 'password' | 'search' | 'number' = 'text';
  @Input() required = false;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
}
