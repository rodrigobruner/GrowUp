import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

export type PlanType = 'FREE' | 'BETA' | 'PRO';

export type FeatureFlag = {
  key: string;
  description: string | null;
  defaultEnabled: boolean;
};

export type PlanFeatureToggle = {
  plan: PlanType;
  featureKey: string;
  enabled: boolean;
};

@Injectable({ providedIn: 'root' })
export class FeatureTogglesService {
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  async loadFeatureFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await this.auth
      .getClient()
      .from('feature_flags')
      .select('key,description,default_enabled')
      .order('key');

    if (error) {
      this.logger.warn('admin.features.flags.failed', { message: error.message });
      return [];
    }

    return (data ?? []).map((row) => ({
      key: row.key,
      description: row.description,
      defaultEnabled: Boolean(row.default_enabled)
    }));
  }

  async loadPlanToggles(): Promise<PlanFeatureToggle[]> {
    const { data, error } = await this.auth
      .getClient()
      .from('plan_features')
      .select('plan,feature_key,enabled');

    if (error) {
      this.logger.warn('admin.features.plan.failed', { message: error.message });
      return [];
    }

    return (data ?? []).map((row) => ({
      plan: row.plan,
      featureKey: row.feature_key,
      enabled: Boolean(row.enabled)
    }));
  }

  async savePlanToggle(toggle: PlanFeatureToggle): Promise<boolean> {
    const { error } = await this.auth
      .getClient()
      .from('plan_features')
      .upsert(
        {
          plan: toggle.plan,
          feature_key: toggle.featureKey,
          enabled: toggle.enabled
        },
        { onConflict: 'plan,feature_key' }
      );

    if (error) {
      this.logger.warn('admin.features.plan.update.failed', { message: error.message });
      return false;
    }

    return true;
  }
}
