import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { AppFooterComponent } from '../../components/app-footer/app-footer.component';
import { AuthDialogsService } from '../../core/services/auth-dialogs.service';
import { AvatarService } from '../../core/services/avatar.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminMetricsService, AdminUserRecord } from '../../core/services/admin-metrics.service';
import { AdminLineChartComponent, AdminLineChartSeries } from '../../components/admin-line-chart/admin-line-chart.component';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, TopbarComponent, AppFooterComponent, TranslateModule, AdminLineChartComponent, AgGridAngular],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss'
})
export class AdminPageComponent {
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly avatar = inject(AvatarService);
  private readonly sessionState = inject(SessionStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly metrics = inject(AdminMetricsService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly avatarSrc = this.avatar.avatarSrc;
  readonly isAdmin = computed(() => {
    return this.sessionState.accountSettings().role === 'ADMIN';
  });
  readonly chartLabels = signal<string[]>([]);
  readonly chartSeries = signal<AdminLineChartSeries[]>([]);
  readonly chartLoading = signal(true);
  readonly users = signal<AdminUserRecord[]>([]);
  readonly usersLoading = signal(true);
  readonly usersColumns = signal<ColDef<AdminUserRecord>[]>([]);
  readonly usersGridOptions: GridOptions<AdminUserRecord> = {
    defaultColDef: {
      sortable: true,
      resizable: true
    },
    rowHeight: 44,
    headerHeight: 46,
    theme: 'legacy',
    enableCellTextSelection: true,
    enableRangeSelection: true,
    pagination: true,
    paginationPageSize: 20,
    paginationPageSizeSelector: false
  };
  private readonly metricsLoaded = signal(false);
  private readonly usersLoaded = signal(false);
  private usersGridApi?: GridApi<AdminUserRecord>;
  readonly usersColumnVisibility = signal<{
    ownerId: boolean;
    role: boolean;
    plan: boolean;
    createdAt: boolean;
    lastAccessedAt: boolean;
  }>({
    ownerId: true,
    role: true,
    plan: true,
    createdAt: true,
    lastAccessedAt: true
  });
  readonly usersTotalCount = signal(0);
  readonly usersPage = signal(1);
  readonly usersTotalPages = signal(1);
  readonly activeTab = signal<'overview' | 'features' | 'users' | 'logs'>('overview');
  currentYear = new Date().getFullYear();

  constructor() {
    this.usersColumns.set(this.buildUsersColumns());
    this.updateUsersGridOverlays();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.usersColumns.set(this.buildUsersColumns());
      this.updateUsersGridOverlays();
    });

    effect(() => {
      if (!this.auth.isLoggedIn()) {
        void this.router.navigate(['/']);
        return;
      }
      const status = this.sessionState.status();
      if (status === 'idle' || status === 'loading') {
        return;
      }
      if (!this.isAdmin()) {
        void this.router.navigate(['/dashboard']);
      }
    });

    effect(() => {
      if (this.metricsLoaded() && this.usersLoaded()) {
        return;
      }
      if (!this.auth.isLoggedIn()) {
        this.chartLoading.set(false);
        this.usersLoading.set(false);
        return;
      }
      const status = this.sessionState.status();
      if (status === 'idle' || status === 'loading') {
        return;
      }
      if (!this.isAdmin()) {
        this.chartLoading.set(false);
        this.usersLoading.set(false);
        return;
      }
      if (!this.metricsLoaded()) {
        void this.loadMetrics();
      }
      if (!this.usersLoaded()) {
        void this.loadUsers();
      }
    });
  }

  openAuth(): void {
    this.authDialogs.openAuth();
  }

  setTab(tab: 'overview' | 'features' | 'users' | 'logs'): void {
    this.activeTab.set(tab);
  }

  onUsersGridReady(event: GridReadyEvent<AdminUserRecord>): void {
    this.usersGridApi = event.api;
    this.attachUsersGridListeners();
    this.usersGridApi.sizeColumnsToFit();
    if (this.usersLoading()) {
      this.usersGridApi.showLoadingOverlay();
    } else if (this.users().length === 0) {
      this.usersGridApi.showNoRowsOverlay();
    } else {
      this.usersGridApi.hideOverlay();
    }
  }

  onUsersSearch(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.usersGridApi?.setGridOption('quickFilterText', value);
  }

  toggleUsersColumn(key: keyof AdminUserRecord): void {
    const current = this.usersColumnVisibility();
    const next = !current[key];
    this.usersColumnVisibility.set({ ...current, [key]: next });
    this.usersGridApi?.setColumnsVisible([key], next);
  }

  previousUsersPage(): void {
    this.usersGridApi?.paginationGoToPreviousPage();
  }

  nextUsersPage(): void {
    this.usersGridApi?.paginationGoToNextPage();
  }

  goToUsersPage(raw: string): void {
    const total = this.usersTotalPages();
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    const next = Math.min(Math.max(Math.trunc(value), 1), total);
    this.usersGridApi?.paginationGoToPage(next - 1);
  }

  exportUsersCsv(): void {
    this.usersGridApi?.exportDataAsCsv({ fileName: 'growup-users.csv' });
  }

  async copyUsersCsv(): Promise<void> {
    if (!this.usersGridApi) {
      return;
    }
    const csv = this.usersGridApi.getDataAsCsv() ?? '';
    try {
      await navigator.clipboard.writeText(csv);
    } catch {
      // fallback: select + copy
      const textarea = document.createElement('textarea');
      textarea.value = csv;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  private async loadMetrics(): Promise<void> {
    this.chartLoading.set(true);
    const data = await this.metrics.loadDailyMetrics(30);
    const series = data.series.map((item) => ({
      ...item,
      label:
        item.id === 'users'
          ? this.translate.instant('admin.overview.usersSeries')
          : this.translate.instant('admin.overview.accessSeries')
    }));
    this.chartLabels.set(data.labels);
    this.chartSeries.set(series);
    this.chartLoading.set(false);
    this.metricsLoaded.set(true);
  }

  private async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.usersGridApi?.showLoadingOverlay();
    const data = await this.metrics.loadUsers();
    this.users.set(data);
    this.usersTotalCount.set(data.length);
    this.usersLoading.set(false);
    this.usersGridApi?.sizeColumnsToFit();
    if (data.length === 0) {
      this.usersGridApi?.showNoRowsOverlay();
    } else {
      this.usersGridApi?.hideOverlay();
    }
    this.usersLoaded.set(true);
    this.updateUsersPaginationState();
  }

  private buildUsersColumns(): ColDef<AdminUserRecord>[] {
    return [
      {
        field: 'ownerId',
        headerName: this.translate.instant('admin.users.columns.userId'),
        flex: 1,
        minWidth: 220,
        pinned: 'left'
      },
      {
        field: 'role',
        headerName: this.translate.instant('admin.users.columns.role'),
        width: 140
      },
      {
        field: 'plan',
        headerName: this.translate.instant('admin.users.columns.plan'),
        width: 140,
        cellRenderer: ({ value }) => {
          const label = value ?? 'FREE';
          const normalized = String(label).toLowerCase();
          return `<span class="plan-badge plan-badge--${normalized}">${label}</span>`;
        }
      },
      {
        field: 'createdAt',
        headerName: this.translate.instant('admin.users.columns.createdAt'),
        width: 160,
        valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString() : '-')
      },
      {
        field: 'lastAccessedAt',
        headerName: this.translate.instant('admin.users.columns.lastAccessedAt'),
        width: 190,
        valueFormatter: ({ value }) => (value ? new Date(value).toLocaleString() : '-')
      }
    ];
  }

  private updateUsersGridOverlays(): void {
    this.usersGridOptions.overlayNoRowsTemplate = `<span class="ag-overlay">${this.translate.instant(
      'admin.users.empty'
    )}</span>`;
    this.usersGridOptions.overlayLoadingTemplate = `<span class="ag-overlay">${this.translate.instant(
      'admin.users.loading'
    )}</span>`;
  }

  private attachUsersGridListeners(): void {
    if (!this.usersGridApi) {
      return;
    }
    this.usersGridApi.addEventListener('paginationChanged', () => this.updateUsersPaginationState());
    this.usersGridApi.addEventListener('modelUpdated', () => this.updateUsersPaginationState());
  }

  private updateUsersPaginationState(): void {
    const total = this.users().length;
    if (!this.usersGridApi) {
      const pageSize = this.usersGridOptions.paginationPageSize ?? 20;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      this.usersTotalCount.set(total);
      this.usersTotalPages.set(totalPages);
      this.usersPage.set(1);
      return;
    }
    const totalPages = this.usersGridApi.paginationGetTotalPages() || 1;
    const currentPage = this.usersGridApi.paginationGetCurrentPage() + 1;
    this.usersTotalCount.set(total);
    this.usersTotalPages.set(totalPages);
    this.usersPage.set(currentPage);
  }
}
