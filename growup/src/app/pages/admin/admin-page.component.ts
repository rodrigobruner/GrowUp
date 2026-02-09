import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, TopbarComponent, AppFooterComponent, TranslateModule, AdminLineChartComponent],
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

  readonly avatarSrc = this.avatar.avatarSrc;
  readonly isAdmin = computed(() => {
    return this.sessionState.accountSettings().role === 'ADMIN';
  });
  readonly chartLabels = signal<string[]>([]);
  readonly chartSeries = signal<AdminLineChartSeries[]>([]);
  readonly chartLoading = signal(true);
  readonly users = signal<AdminUserRecord[]>([]);
  readonly usersLoading = signal(true);
  private readonly metricsLoaded = signal(false);
  private readonly usersLoaded = signal(false);
  readonly activeTab = signal<'overview' | 'features' | 'users' | 'logs'>('overview');
  currentYear = new Date().getFullYear();

  constructor() {
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
    const data = await this.metrics.loadUsers();
    this.users.set(data);
    this.usersLoading.set(false);
    this.usersLoaded.set(true);
  }
}
