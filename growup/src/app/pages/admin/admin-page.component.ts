import { CommonModule, DOCUMENT } from '@angular/common';
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
import {
  FeatureFlag,
  FeatureTogglesService,
  PlanType
} from '../../core/services/feature-toggles.service';
import { LoggerService, LogLevel } from '../../core/services/logger.service';

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
  private readonly featureToggles = inject(FeatureTogglesService);
  private readonly logger = inject(LoggerService);
  private readonly document = inject(DOCUMENT);

  readonly avatarSrc = this.avatar.avatarSrc;
  private readonly featurePlans: PlanType[] = ['FREE', 'BETA', 'PRO'];
  private readonly allowedFeatureKeys = new Set(['tasks', 'rewards', 'profiles']);
  private static readonly LOG_LEVEL_KEY = 'growup.debug.logLevel';
  private static readonly LOG_ENABLED_KEY = 'growup.debug.loggingEnabled';
  private static readonly LOG_LIMIT_KEY = 'growup.debug.logLimit';
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
  readonly featureFlags = signal<FeatureFlag[]>([]);
  readonly featureToggleMap = signal<Record<PlanType, Record<string, boolean>>>({
    FREE: {},
    BETA: {},
    PRO: {}
  });
  readonly featuresLoading = signal(true);
  readonly featuresSaving = signal<Record<string, boolean>>({});
  private readonly featuresLoaded = signal(false);
  logEntries = signal(this.logger.getEntries());
  logViewLimit = signal(100);
  logEntriesView = computed(() => {
    const entries = this.logEntries();
    const limit = this.logViewLimit();
    if (!entries.length) {
      return [];
    }
    const start = Math.max(0, entries.length - limit);
    return entries.slice(start).reverse();
  });
  logLevelFilter = signal<LogLevel | 'all'>('all');
  loggingEnabled = signal(this.logger.isEnabled());
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
      if (!this.featuresLoaded()) {
        void this.loadFeatureToggles();
      }
    });

    this.restoreDebugPrefs();
    this.refreshLogs();
  }

  openAuth(): void {
    this.authDialogs.openAuth();
  }

  setTab(tab: 'overview' | 'features' | 'users' | 'logs'): void {
    this.activeTab.set(tab);
    if (tab === 'logs') {
      this.refreshLogs();
    }
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

  refreshLogs(): void {
    const entries = this.logger.getEntries();
    const filter = this.logLevelFilter();
    this.logEntries.set(filter === 'all' ? entries : entries.filter((entry) => entry.level === filter));
    this.loggingEnabled.set(this.logger.isEnabled());
  }

  onLogFilterChange(value: LogLevel | 'all'): void {
    this.logLevelFilter.set(value);
    localStorage.setItem(AdminPageComponent.LOG_LEVEL_KEY, value);
    this.refreshLogs();
  }

  clearLogs(): void {
    this.logger.clear();
    this.refreshLogs();
  }

  toggleLogging(): void {
    const next = !this.logger.isEnabled();
    this.logger.setEnabled(next);
    this.loggingEnabled.set(next);
    localStorage.setItem(AdminPageComponent.LOG_ENABLED_KEY, String(next));
    this.refreshLogs();
  }

  exportLogs(): void {
    const payload = JSON.stringify(this.logEntries(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'growup-logs.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  isFeatureEnabled(plan: PlanType, featureKey: string): boolean {
    return Boolean(this.featureToggleMap()[plan]?.[featureKey]);
  }

  isFeatureSaving(plan: PlanType, featureKey: string): boolean {
    return Boolean(this.featuresSaving()[`${plan}:${featureKey}`]);
  }

  async toggleFeature(plan: PlanType, featureKey: string, enabled: boolean): Promise<void> {
    const savingKey = `${plan}:${featureKey}`;
    if (this.isFeatureSaving(plan, featureKey)) {
      return;
    }
    this.featuresSaving.set({ ...this.featuresSaving(), [savingKey]: true });
    const currentMap = this.featureToggleMap();
    const previous = currentMap[plan]?.[featureKey];
    this.featureToggleMap.set({
      ...currentMap,
      [plan]: {
        ...currentMap[plan],
        [featureKey]: enabled
      }
    });

    const success = await this.featureToggles.savePlanToggle({
      plan,
      featureKey,
      enabled
    });

    if (!success) {
      this.featureToggleMap.set({
        ...currentMap,
        [plan]: {
          ...currentMap[plan],
          [featureKey]: previous ?? false
        }
      });
    }

    const nextSaving = { ...this.featuresSaving() };
    delete nextSaving[savingKey];
    this.featuresSaving.set(nextSaving);
  }

  trackByFeatureKey(_index: number, feature: FeatureFlag): string {
    return feature.key;
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

  private async loadFeatureToggles(): Promise<void> {
    this.featuresLoading.set(true);
    const [flags, toggles] = await Promise.all([
      this.featureToggles.loadFeatureFlags(),
      this.featureToggles.loadPlanToggles()
    ]);
    const filteredFlags = flags.filter((flag) => this.allowedFeatureKeys.has(flag.key));
    const nextMap: Record<PlanType, Record<string, boolean>> = {
      FREE: {},
      BETA: {},
      PRO: {}
    };

    for (const plan of this.featurePlans) {
      for (const flag of filteredFlags) {
        nextMap[plan][flag.key] = flag.defaultEnabled;
      }
    }

    for (const toggle of toggles) {
      if (!this.allowedFeatureKeys.has(toggle.featureKey)) {
        continue;
      }
      if (!nextMap[toggle.plan]) {
        continue;
      }
      nextMap[toggle.plan][toggle.featureKey] = toggle.enabled;
    }

    this.featureFlags.set(filteredFlags);
    this.featureToggleMap.set(nextMap);
    this.featuresLoading.set(false);
    this.featuresLoaded.set(true);
  }

  private restoreDebugPrefs(): void {
    try {
      const levelRaw = localStorage.getItem(AdminPageComponent.LOG_LEVEL_KEY);
      if (levelRaw === 'debug' || levelRaw === 'info' || levelRaw === 'warn' || levelRaw === 'error' || levelRaw === 'all') {
        this.logLevelFilter.set(levelRaw);
      }
      const enabledRaw = localStorage.getItem(AdminPageComponent.LOG_ENABLED_KEY);
      if (enabledRaw !== null) {
        const enabled = enabledRaw === 'true';
        this.logger.setEnabled(enabled);
        this.loggingEnabled.set(enabled);
      }
      const limitRaw = localStorage.getItem(AdminPageComponent.LOG_LIMIT_KEY);
      if (limitRaw) {
        const parsed = Number(limitRaw);
        if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 500) {
          this.logViewLimit.set(parsed);
        }
      }
    } catch {
      // Ignore storage failures.
    }
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
        cellRenderer: (params: { value?: string | null }) => {
          const label = params.value ?? 'FREE';
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
