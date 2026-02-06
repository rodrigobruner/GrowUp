import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-textarea-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-textarea-field.component.html',
  styleUrl: './ui-textarea-field.component.scss'
})
export class UiTextareaFieldComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() value = '';
  @Input() rows = 4;
  @Input() required = false;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
}
