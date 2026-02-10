import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FeatureFlag, PlanType } from '../../../../core/services/feature-toggles.service';

@Component({
  selector: 'app-admin-features-tab',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-features-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFeaturesTabComponent {
  @Input() featureFlags: FeatureFlag[] = [];
  @Input() featuresLoading = false;
  @Input() featureToggleMap: Record<PlanType, Record<string, boolean>> = {
    FREE: {},
    BETA: {},
    PRO: {},
    DEV: {}
  };
  @Input() featuresSaving: Record<string, boolean> = {};

  @Output() toggleFeature = new EventEmitter<{ plan: PlanType; featureKey: string; enabled: boolean }>();

  isFeatureEnabled(plan: PlanType, featureKey: string): boolean {
    return Boolean(this.featureToggleMap[plan]?.[featureKey]);
  }

  isFeatureSaving(plan: PlanType, featureKey: string): boolean {
    return Boolean(this.featuresSaving[`${plan}:${featureKey}`]);
  }
}
