import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { AdminUserRecord } from '../../../../core/services/admin-metrics.service';

@Component({
  selector: 'app-admin-users-tab',
  standalone: true,
  imports: [CommonModule, TranslateModule, AgGridAngular],
  templateUrl: './admin-users-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersTabComponent {
  @Input({ required: true }) users: AdminUserRecord[] = [];
  @Input({ required: true }) usersColumns: ColDef<AdminUserRecord>[] = [];
  @Input({ required: true }) usersGridOptions!: GridOptions<AdminUserRecord>;
  @Input({ required: true }) usersColumnVisibility!: Record<string, boolean>;
  @Input() usersTotalCount = 0;
  @Input() usersPage = 1;
  @Input() usersTotalPages = 1;

  @Output() usersSearch = new EventEmitter<Event>();
  @Output() copyUsersCsv = new EventEmitter<void>();
  @Output() exportUsersCsv = new EventEmitter<void>();
  @Output() toggleUsersColumn = new EventEmitter<keyof AdminUserRecord>();
  @Output() usersGridReady = new EventEmitter<GridReadyEvent<AdminUserRecord>>();
  @Output() previousUsersPage = new EventEmitter<void>();
  @Output() nextUsersPage = new EventEmitter<void>();
  @Output() goToUsersPage = new EventEmitter<string>();
}
