import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

export interface AdminChartSeries {
  id: 'users' | 'accesses';
  label: string;
  color: string;
  values: number[];
}

export interface AdminChartData {
  labels: string[];
  series: AdminChartSeries[];
}

export interface AdminUserRecord {
  ownerId: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'BETA' | 'PRO' | 'DEV';
  createdAt: string | null;
  lastAccessedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminMetricsService {
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  async loadDailyMetrics(rangeDays: number): Promise<AdminChartData> {
    const labels = this.buildDateRange(rangeDays);
    if (!labels.length) {
      return { labels: [], series: [] };
    }

    const [accounts, accessEvents] = await Promise.all([
      this.loadAccountCreatedAt(),
      this.loadAccessEvents(labels[0], labels[labels.length - 1])
    ]);

    const totalUsersSeries = this.buildCumulativeSeries(labels, accounts);
    const accessSeries = this.buildDailySeries(labels, accessEvents);

    return {
      labels,
      series: [
        {
          id: 'users',
          label: 'Users',
          color: 'var(--app-coral)',
          values: totalUsersSeries
        },
        {
          id: 'accesses',
          label: 'Accesses',
          color: 'var(--app-primary-hover)',
          values: accessSeries
        }
      ]
    };
  }

  async loadUsers(): Promise<AdminUserRecord[]> {
    const { data, error } = await this.auth
      .getClient()
      .from('account_settings')
      .select('owner_id,role,plan,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.warn('admin.metrics.users.failed', { message: error.message });
      return [];
    }

    const owners = (data ?? []).map((row) => row.owner_id);
    const lastAccessMap = await this.loadLastAccessByOwner(owners);

    return (data ?? []).map((row) => ({
      ownerId: row.owner_id,
      role: row.role,
      plan: row.plan ?? 'FREE',
      createdAt: typeof row.created_at === 'string' ? row.created_at : null,
      lastAccessedAt: lastAccessMap.get(row.owner_id) ?? null
    }));
  }

  private async loadAccountCreatedAt(): Promise<string[]> {
    const { data, error } = await this.auth.getClient().from('account_settings').select('created_at');
    if (error) {
      this.logger.warn('admin.metrics.accounts.failed', { message: error.message });
      return [];
    }
    return (data ?? [])
      .map((row) => (typeof row.created_at === 'string' ? row.created_at : null))
      .filter((value): value is string => Boolean(value));
  }

  private async loadAccessEvents(startDate: string, endDate: string): Promise<string[]> {
    const { data, error } = await this.auth
      .getClient()
      .from('daily_access_events')
      .select('accessed_at')
      .gte('accessed_at', startDate)
      .lte('accessed_at', endDate);

    if (error) {
      this.logger.warn('admin.metrics.accesses.failed', { message: error.message });
      return [];
    }

    return (data ?? [])
      .map((row) => (typeof row.accessed_at === 'string' ? row.accessed_at : null))
      .filter((value): value is string => Boolean(value));
  }

  private async loadLastAccessByOwner(ownerIds: string[]): Promise<Map<string, string>> {
    if (!ownerIds.length) {
      return new Map();
    }
    const { data, error } = await this.auth
      .getClient()
      .from('daily_access_events')
      .select('owner_id,last_accessed_at')
      .in('owner_id', ownerIds);

    if (error) {
      this.logger.warn('admin.metrics.lastAccess.failed', { message: error.message });
      return new Map();
    }

    const map = new Map<string, string>();
    (data ?? []).forEach((row) => {
      if (!row.last_accessed_at) {
        return;
      }
      const current = map.get(row.owner_id);
      if (!current || row.last_accessed_at > current) {
        map.set(row.owner_id, row.last_accessed_at);
      }
    });
    return map;
  }

  private buildDateRange(rangeDays: number): string[] {
    if (rangeDays <= 0) {
      return [];
    }
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (rangeDays - 1));

    const labels: string[] = [];
    for (let i = 0; i < rangeDays; i += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      labels.push(this.formatDateKey(current));
    }
    return labels;
  }

  private buildCumulativeSeries(labels: string[], createdAtValues: string[]): number[] {
    const countsByDate = new Map<string, number>();
    let totalBefore = 0;
    const startKey = labels[0];

    createdAtValues.forEach((value) => {
      const dateKey = this.formatDateKey(new Date(value));
      if (dateKey < startKey) {
        totalBefore += 1;
        return;
      }
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
    });

    let runningTotal = totalBefore;
    return labels.map((label) => {
      runningTotal += countsByDate.get(label) ?? 0;
      return runningTotal;
    });
  }

  private buildDailySeries(labels: string[], accessValues: string[]): number[] {
    const countsByDate = new Map<string, number>();
    accessValues.forEach((value) => {
      const dateKey = this.formatDateKey(new Date(value));
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
    });

    return labels.map((label) => countsByDate.get(label) ?? 0);
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
