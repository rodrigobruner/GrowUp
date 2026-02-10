import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LogEntry, LogLevel } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-admin-logs-tab',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-logs-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLogsTabComponent {
  @Input() logEntriesView: LogEntry[] = [];
  @Input() logLevelFilter: LogLevel | 'all' = 'all';
  @Input() loggingEnabled = false;

  @Output() refreshLogs = new EventEmitter<void>();
  @Output() clearLogs = new EventEmitter<void>();
  @Output() exportLogs = new EventEmitter<void>();
  @Output() toggleLogging = new EventEmitter<void>();
  @Output() logFilterChange = new EventEmitter<LogLevel | 'all'>();
}
