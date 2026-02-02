import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-design-system',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatRadioModule,
    MatProgressBarModule
  ],
  templateUrl: './design-system.component.html',
  styleUrl: './design-system.component.scss'
})
export class DesignSystemComponent {
  readonly personaOptions = [
    { label: 'Exploradora', value: 'explorer' },
    { label: 'Construtora', value: 'builder' },
    { label: 'Guardiã', value: 'guardian' }
  ];

  readonly moodOptions = [
    { label: 'Energizada', value: 'energized', hint: 'Modo turbo' },
    { label: 'Equilibrada', value: 'balanced', hint: 'Ritmo regular' },
    { label: 'Tranquila', value: 'calm', hint: 'Menos pressa' }
  ];

  readonly name = signal('');
  readonly persona = signal('explorer');
  readonly notes = signal('');
  readonly notifications = signal(true);
  readonly shareProgress = signal(false);
  readonly mood = signal('balanced');
}
