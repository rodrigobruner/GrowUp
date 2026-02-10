import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { TaskService } from './task.service';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { SessionStateService } from './session-state.service';
import { SyncService } from './sync.service';
import { UiDialogsService } from './ui-dialogs.service';
import { Task } from '../models/task';
import { AccountSettings } from '../models/account-settings';

const createTask = (id: string, profileId: string): Task => ({
  id,
  profileId,
  title: `Task ${id}`,
  points: 10,
  createdAt: Date.now()
});

describe('TaskService', () => {
  it('blocks adding task when max limit reached and advanced tasks disabled', async () => {
    const addTask = vi.fn();
    const informTaskLimit = vi.fn();
    const tasksSignal = signal<Task[]>(
      Array.from({ length: 10 }, (_value, index) => createTask(`t${index}`, 'p1'))
    );
    const state = {
      tasks: tasksSignal,
      completions: signal([]),
      settings: signal({ levelUpPoints: 100 }),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: { tasks: false }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addTask } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informTaskLimit } }
      ]
    });

    const service = TestBed.inject(TaskService);
    const result = await service.addFromDialog({ title: 'New Task', points: 10 });

    expect(result).toBeNull();
    expect(addTask).not.toHaveBeenCalled();
    expect(informTaskLimit).toHaveBeenCalledWith(10);
  });

  it('allows adding task when advanced tasks enabled', async () => {
    const addTask = vi.fn();
    const tasksSignal = signal<Task[]>(
      Array.from({ length: 10 }, (_value, index) => createTask(`t${index}`, 'p1'))
    );
    const state = {
      tasks: tasksSignal,
      completions: signal([]),
      settings: signal({ levelUpPoints: 100 }),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'PRO',
        flags: { tasks: true }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: GrowUpDbService, useValue: { createId: () => 'new', addTask } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informTaskLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(TaskService);
    const result = await service.addFromDialog({ title: 'New Task', points: 10 });

    expect(result).not.toBeNull();
    expect(addTask).toHaveBeenCalled();
  });

  it('returns true when toggling completes a new level', async () => {
    const addCompletion = vi.fn();
    const removeCompletion = vi.fn();
    const state = {
      tasks: signal([]),
      completions: signal([{ id: 'p1-t1-2026-02-01', profileId: 'p1', taskId: 't1', date: '2026-02-01', points: 90 }]),
      settings: signal({ levelUpPoints: 100 }),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: { tasks: false }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: GrowUpDbService, useValue: { addCompletion, removeCompletion } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informTaskLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(TaskService);
    const leveledUp = await service.toggle(
      { id: 't2', profileId: 'p1', title: 'Task', points: 15, createdAt: Date.now() },
      '2026-02-02'
    );

    expect(leveledUp).toBe(true);
    expect(addCompletion).toHaveBeenCalled();
    expect(removeCompletion).not.toHaveBeenCalled();
  });

  it('returns false when toggling removes an existing completion', async () => {
    const addCompletion = vi.fn();
    const removeCompletion = vi.fn();
    const state = {
      tasks: signal([]),
      completions: signal([
        { id: 'p1-t1-2026-02-01', profileId: 'p1', taskId: 't1', date: '2026-02-01', points: 10 }
      ]),
      settings: signal({ levelUpPoints: 100 }),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: { tasks: false }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: GrowUpDbService, useValue: { addCompletion, removeCompletion } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange: vi.fn() } },
        { provide: UiDialogsService, useValue: { informTaskLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(TaskService);
    const leveledUp = await service.toggle(
      { id: 't1', profileId: 'p1', title: 'Task', points: 10, createdAt: Date.now() },
      '2026-02-01'
    );

    expect(leveledUp).toBe(false);
    expect(removeCompletion).toHaveBeenCalled();
    expect(addCompletion).not.toHaveBeenCalled();
  });

  it('removes task and related completions', async () => {
    const removeTask = vi.fn();
    const removeCompletionsForTask = vi.fn();
    const notifyLocalChange = vi.fn();
    const state = {
      tasks: signal<Task[]>([
        { id: 't1', profileId: 'p1', title: 'Task', points: 10, createdAt: Date.now() }
      ]),
      completions: signal([
        { id: 'p1-t1-2026-02-01', profileId: 'p1', taskId: 't1', date: '2026-02-01', points: 10 },
        { id: 'p1-t2-2026-02-01', profileId: 'p1', taskId: 't2', date: '2026-02-01', points: 10 }
      ]),
      settings: signal({ levelUpPoints: 100 }),
      accountSettings: signal<AccountSettings>({
        id: 'account',
        language: 'en',
        role: 'USER',
        plan: 'FREE',
        flags: { tasks: false }
      })
    } as unknown as SessionStateService;

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: GrowUpDbService, useValue: { removeTask, removeCompletionsForTask } },
        { provide: ProfileService, useValue: { activeProfileId: () => 'p1' } },
        { provide: SessionStateService, useValue: state },
        { provide: SyncService, useValue: { notifyLocalChange } },
        { provide: UiDialogsService, useValue: { informTaskLimit: vi.fn() } }
      ]
    });

    const service = TestBed.inject(TaskService);
    await service.remove({ id: 't1', profileId: 'p1', title: 'Task', points: 10, createdAt: Date.now() });

    expect(removeTask).toHaveBeenCalledWith('t1', 'p1');
    expect(removeCompletionsForTask).toHaveBeenCalledWith('t1', 'p1');
    expect(state.tasks().length).toBe(0);
    expect(state.completions().length).toBe(1);
    expect(notifyLocalChange).toHaveBeenCalled();
  });
});
