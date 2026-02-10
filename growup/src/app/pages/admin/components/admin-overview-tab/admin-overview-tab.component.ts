import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AdminLineChartComponent, AdminLineChartSeries } from '../../../../components/admin-line-chart/admin-line-chart.component';

@Component({
  selector: 'app-admin-overview-tab',
  standalone: true,
  imports: [CommonModule, TranslateModule, AdminLineChartComponent],
  templateUrl: './admin-overview-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOverviewTabComponent {
  @Input({ required: true }) labels: string[] = [];
  @Input({ required: true }) series: AdminLineChartSeries[] = [];
  @Input() loading = false;
  @Input() emptyLabel = '';
}
