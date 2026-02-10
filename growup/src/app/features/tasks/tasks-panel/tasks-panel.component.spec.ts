import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { describe, expect, it, vi } from 'vitest';
import { TasksPanelComponent } from './tasks-panel.component';

describe('TasksPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksPanelComponent, TranslateModule.forRoot()]
    }).compileComponents();
  });

  it('emits previous day when goPreviousDay is called', () => {
    const fixture = TestBed.createComponent(TasksPanelComponent);
    fixture.componentInstance.selectedDate = '2026-02-10';
    const emitSpy = vi.spyOn(fixture.componentInstance.selectedDateChange, 'emit');

    fixture.componentInstance.goPreviousDay();

    expect(emitSpy).toHaveBeenCalledWith('2026-02-09');
  });

  it('emits today when goToday is called with valid todayKey', () => {
    const fixture = TestBed.createComponent(TasksPanelComponent);
    fixture.componentInstance.todayKey = '2026-02-10';
    fixture.componentInstance.selectedDate = '2026-02-09';
    const emitSpy = vi.spyOn(fixture.componentInstance.selectedDateChange, 'emit');

    fixture.componentInstance.goToday();

    expect(emitSpy).toHaveBeenCalledWith('2026-02-10');
  });

  it('does not emit when goToday is called without todayKey', () => {
    const fixture = TestBed.createComponent(TasksPanelComponent);
    fixture.componentInstance.todayKey = '';
    const emitSpy = vi.spyOn(fixture.componentInstance.selectedDateChange, 'emit');

    fixture.componentInstance.goToday();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('updates swipe offset on touch interactions', () => {
    const fixture = TestBed.createComponent(TasksPanelComponent);
    const component = fixture.componentInstance;
    const startEvent = { touches: [{ clientX: 100 }] } as unknown as TouchEvent;
    const moveEvent = { touches: [{ clientX: 40 }] } as unknown as TouchEvent;

    component.onTouchStart('t1', startEvent);
    component.onTouchMove('t1', moveEvent);
    component.onTouchEnd('t1');

    expect(component.swipeOffset('t1')).toBe(-72);
  });
});
