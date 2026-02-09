import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface AdminLineChartSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

@Component({
  selector: 'app-admin-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-line-chart.component.html',
  styleUrl: './admin-line-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLineChartComponent {
  @Input() labels: string[] = [];
  @Input() series: AdminLineChartSeries[] = [];
  @Input() loading = false;
  @Input() emptyLabel = '';
  @Input() width = 720;
  @Input() height = 260;

  get viewBox(): string {
    return `0 0 ${this.width} ${this.height}`;
  }

  get hasData(): boolean {
    return this.series.some((item) => item.values.some((value) => value > 0));
  }

  get maxValue(): number {
    const values = this.series.flatMap((item) => item.values);
    const max = values.length ? Math.max(...values) : 0;
    return max <= 0 ? 1 : max;
  }

  get gridLines(): number[] {
    return [0, 1, 2, 3, 4];
  }

  buildPath(values: number[]): string {
    const padding = 24;
    const width = this.width - padding * 2;
    const height = this.height - padding * 2;
    const maxValue = this.maxValue;
    const step = values.length > 1 ? width / (values.length - 1) : 0;

    return values
      .map((value, index) => {
        const x = padding + index * step;
        const y = padding + height - (value / maxValue) * height;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  gridY(position: number): number {
    const padding = 24;
    const height = this.height - padding * 2;
    const ratio = position / (this.gridLines.length - 1);
    return padding + height - ratio * height;
  }

  labelLeft(): string {
    return this.labels[0] ?? '';
  }

  labelRight(): string {
    return this.labels[this.labels.length - 1] ?? '';
  }
}
