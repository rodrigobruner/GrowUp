import { describe, expect, it, vi } from 'vitest';
import { CycleService } from './cycle.service';

describe('CycleService', () => {
  it('calculates weekly cycle range based on start date', () => {
    const service = new CycleService();
    vi.spyOn(service, 'today').mockReturnValue('2026-02-10');

    const range = service.getCycleRange({ cycleType: 'weekly', cycleStartDate: '2026-02-01' } as any);

    expect(range).toEqual({ start: '2026-02-07', end: '2026-02-13' });
  });

  it('calculates biweekly cycle range based on start date', () => {
    const service = new CycleService();
    vi.spyOn(service, 'today').mockReturnValue('2026-02-10');

    const range = service.getCycleRange({ cycleType: 'biweekly', cycleStartDate: '2026-02-01' } as any);

    expect(range).toEqual({ start: '2026-01-31', end: '2026-02-13' });
  });

  it('calculates monthly cycle range and clamps day', () => {
    const service = new CycleService();
    vi.spyOn(service, 'today').mockReturnValue('2026-02-10');

    const range = service.getCycleRange({ cycleType: 'monthly', cycleStartDate: '2026-01-31' } as any);

    expect(range).toEqual({ start: '2026-01-30', end: '2026-03-01' });
  });

  it('calculates yearly cycle range', () => {
    const service = new CycleService();
    vi.spyOn(service, 'today').mockReturnValue('2026-06-10');

    const range = service.getCycleRange({ cycleType: 'yearly', cycleStartDate: '2025-03-15' } as any);

    expect(range).toEqual({ start: '2026-03-14', end: '2027-03-13' });
  });

  it('returns previous cycle range when available', () => {
    const service = new CycleService();
    vi.spyOn(service, 'today').mockReturnValue('2026-02-10');

    const range = service.getPreviousCycleRange({ cycleType: 'weekly', cycleStartDate: '2026-02-01' } as any);

    expect(range).toEqual({ start: '2026-01-30', end: '2026-02-05' });
  });

  it('formats date keys as dd/mm/yyyy', () => {
    const service = new CycleService();

    expect(service.formatDate('2026-02-10')).toBe('10/02/2026');
  });
});
