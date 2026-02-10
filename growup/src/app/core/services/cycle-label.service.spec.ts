import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CycleLabelService } from './cycle-label.service';
import { TranslateService } from '@ngx-translate/core';

describe('CycleLabelService', () => {
  it('returns translated label for cycle type', () => {
    const translate = { instant: vi.fn((key: string) => `t:${key}`) };

    TestBed.configureTestingModule({
      providers: [
        CycleLabelService,
        { provide: TranslateService, useValue: translate }
      ]
    });

    const service = TestBed.inject(CycleLabelService);
    const result = service.cycleLabel('monthly');

    expect(translate.instant).toHaveBeenCalledWith('cycle.monthly');
    expect(result).toBe('t:cycle.monthly');
  });
});
