import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ui-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-toggle.component.html',
  styleUrl: './ui-toggle.component.scss'
})
export class UiToggleComponent {
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
