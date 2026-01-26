import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [MatCardModule, MatDividerModule, MatProgressBarModule, TranslateModule],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss'
})
export class SummaryCardComponent {
  @Input({ required: true }) avatarSrc = '';
  @Input({ required: true }) level = 1;
  @Input({ required: true }) xpToNext = 0;
  @Input({ required: true }) progressPercent = 0;
  @Input({ required: true }) earned = 0;
  @Input({ required: true }) spent = 0;
  @Input({ required: true }) available = 0;
  @Input({ required: true }) cycleLabel = '';
  @Input({ required: true }) cycleEarned = 0;
  @Input({ required: true }) cycleRangeLabel = '';
  @Input() previousCycleEarned: number | null = null;
  @Input() previousCycleLabel = '';
}
