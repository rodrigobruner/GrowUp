import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface AdminLineChartSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

@Component({
  selector: 'app-admin-line-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
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
  private readonly padding = 24;
  private readonly minZoomRange = 2;
  readonly hiddenSeries = new Set<string>();
  hoverIndex: number | null = null;
  hoverXPercent: number | null = null;
  hoverYPercent: number | null = null;
  private dragStartIndex: number | null = null;
  private dragCurrentIndex: number | null = null;
  private zoomRange: { start: number; end: number } | null = null;

  get viewBox(): string {
    return `0 0 ${this.width} ${this.height}`;
  }

  get hasData(): boolean {
    return this.series.some((item) => item.values.some((value) => value > 0));
  }

  get maxValue(): number {
    const values = this.visibleSeries.flatMap((item) => this.getVisibleValues(item.values));
    const max = values.length ? Math.max(...values) : 0;
    return max <= 0 ? 1 : max;
  }

  get gridLines(): number[] {
    return [0, 1, 2, 3, 4];
  }

  get viewLabels(): string[] {
    if (!this.labels.length) {
      return [];
    }
    const start = this.viewStart;
    const end = this.viewEnd;
    return this.labels.slice(start, end + 1);
  }

  get visibleSeries(): AdminLineChartSeries[] {
    return this.series.filter((item) => !this.hiddenSeries.has(item.id));
  }

  get xTicks(): Array<{ index: number; label: string }> {
    const labels = this.viewLabels;
    if (labels.length === 0) {
      return [];
    }
    if (labels.length <= 4) {
      return labels.map((label, index) => ({ index, label }));
    }
    const tickCount = 4;
    const step = (labels.length - 1) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, idx) => {
      const index = Math.round(idx * step);
      return { index, label: labels[index] };
    });
  }

  get isZoomed(): boolean {
    return this.zoomRange !== null;
  }

  buildPath(values: number[]): string {
    const padding = this.padding;
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
    const padding = this.padding;
    const height = this.height - padding * 2;
    const ratio = position / (this.gridLines.length - 1);
    return padding + ratio * height;
  }

  gridValue(position: number): number {
    const ratio = position / (this.gridLines.length - 1);
    return Math.round(this.maxValue * (1 - ratio));
  }

  labelLeft(): string {
    return this.viewLabels[0] ?? '';
  }

  labelRight(): string {
    const labels = this.viewLabels;
    return labels[labels.length - 1] ?? '';
  }

  getVisibleValues(values: number[]): number[] {
    const start = this.viewStart;
    const end = this.viewEnd;
    return values.slice(start, end + 1);
  }

  getHoverX(): number | null {
    if (this.hoverIndex === null) {
      return null;
    }
    const labels = this.viewLabels;
    if (labels.length <= 1) {
      return this.padding;
    }
    const width = this.width - this.padding * 2;
    const step = width / (labels.length - 1);
    return this.padding + this.hoverIndex * step;
  }

  getHoverY(values: number[]): number | null {
    if (this.hoverIndex === null) {
      return null;
    }
    const visible = this.getVisibleValues(values);
    const value = visible[this.hoverIndex];
    if (value === undefined) {
      return null;
    }
    const height = this.height - this.padding * 2;
    return this.padding + height - (value / this.maxValue) * height;
  }

  getTooltipItems(): Array<{ label: string; value: number; color: string }> {
    if (this.hoverIndex === null) {
      return [];
    }
    const start = this.viewStart;
    const index = start + this.hoverIndex;
    return this.visibleSeries
      .map((item) => ({
        label: item.label,
        value: item.values[index] ?? 0,
        color: item.color
      }))
      .filter((item) => Number.isFinite(item.value));
  }

  toggleSeries(item: AdminLineChartSeries): void {
    if (this.hiddenSeries.has(item.id)) {
      this.hiddenSeries.delete(item.id);
    } else {
      this.hiddenSeries.add(item.id);
    }
  }

  resetZoom(): void {
    this.zoomRange = null;
    this.dragStartIndex = null;
    this.dragCurrentIndex = null;
  }

  onChartMouseMove(event: MouseEvent): void {
    if (!this.viewLabels.length || this.loading) {
      return;
    }
    const container = event.currentTarget as HTMLElement | null;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const innerWidth = rect.width - this.padding * 2;
    const innerHeight = rect.height - this.padding * 2;
    if (innerWidth <= 0 || innerHeight <= 0) {
      return;
    }
    const rawX = Math.min(Math.max(event.clientX - rect.left - this.padding, 0), innerWidth);
    const rawY = Math.min(Math.max(event.clientY - rect.top - this.padding, 0), innerHeight);
    const labels = this.viewLabels;
    const step = labels.length > 1 ? innerWidth / (labels.length - 1) : innerWidth;
    const index = labels.length > 1 ? Math.round(rawX / step) : 0;
    this.hoverIndex = Math.min(Math.max(index, 0), labels.length - 1);
    this.hoverXPercent = ((rawX + this.padding) / rect.width) * 100;
    this.hoverYPercent = ((rawY + this.padding) / rect.height) * 100;
    if (this.dragStartIndex !== null) {
      this.dragCurrentIndex = this.hoverIndex;
    }
  }

  onChartMouseLeave(): void {
    this.hoverIndex = null;
    this.hoverXPercent = null;
    this.hoverYPercent = null;
    this.dragStartIndex = null;
    this.dragCurrentIndex = null;
  }

  onChartMouseDown(): void {
    if (this.hoverIndex === null) {
      return;
    }
    this.dragStartIndex = this.hoverIndex;
    this.dragCurrentIndex = this.hoverIndex;
  }

  onChartMouseUp(): void {
    if (this.dragStartIndex === null || this.dragCurrentIndex === null) {
      return;
    }
    const start = Math.min(this.dragStartIndex, this.dragCurrentIndex);
    const end = Math.max(this.dragStartIndex, this.dragCurrentIndex);
    const rangeSize = end - start + 1;
    if (rangeSize >= this.minZoomRange) {
      const globalStart = this.viewStart + start;
      const globalEnd = this.viewStart + end;
      this.zoomRange = { start: globalStart, end: globalEnd };
    }
    this.dragStartIndex = null;
    this.dragCurrentIndex = null;
  }

  get selectionX(): number | null {
    if (this.dragStartIndex === null || this.dragCurrentIndex === null) {
      return null;
    }
    const start = Math.min(this.dragStartIndex, this.dragCurrentIndex);
    const width = this.width - this.padding * 2;
    const step = this.viewLabels.length > 1 ? width / (this.viewLabels.length - 1) : 0;
    return this.padding + start * step;
  }

  get selectionWidth(): number | null {
    if (this.dragStartIndex === null || this.dragCurrentIndex === null) {
      return null;
    }
    const start = Math.min(this.dragStartIndex, this.dragCurrentIndex);
    const end = Math.max(this.dragStartIndex, this.dragCurrentIndex);
    const width = this.width - this.padding * 2;
    const step = this.viewLabels.length > 1 ? width / (this.viewLabels.length - 1) : 0;
    return Math.max(1, (end - start) * step);
  }

  private get viewStart(): number {
    return this.zoomRange?.start ?? 0;
  }

  private get viewEnd(): number {
    if (!this.labels.length) {
      return 0;
    }
    return this.zoomRange?.end ?? this.labels.length - 1;
  }
}
