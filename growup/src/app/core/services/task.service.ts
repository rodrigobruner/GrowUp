import { inject, Injectable } from '@angular/core';
import { TaskDialogResult } from '../../features/tasks/task-dialog/task-dialog.component';
import { Completion } from '../models/completion';
import { Task } from '../models/task';
import { GrowUpDbService } from './growup-db.service';
import { ProfileService } from './profile.service';
import { SessionStateService } from './session-state.service';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly db = inject(GrowUpDbService);
  private readonly profileService = inject(ProfileService);
  private readonly state = inject(SessionStateService);
  private readonly sync = inject(SyncService);

  async addFromDialog(result: TaskDialogResult): Promise<Task | null> {
    const rawTitle = result.title.trim();
    if (!rawTitle) {
      return null;
    }
    const profileId = this.profileService.activeProfileId();
    if (!profileId) {
      return null;
    }
    const task: Task = {
      id: this.db.createId(),
      profileId,
      title: rawTitle,
      points: Number(result.points),
      createdAt: Date.now()
    };
    await this.db.addTask(task);
    this.state.tasks.update((items) => this.sortTasks([task, ...items]));
    this.sync.notifyLocalChange();
    return task;
  }

  async toggle(task: Task, dateKey: string): Promise<boolean> {
    const completionId = `${task.profileId}-${task.id}-${dateKey}`;
    const completions = this.state.completions();
    const alreadyDone = completions.some((completion) => completion.id === completionId);
    if (alreadyDone) {
      await this.db.removeCompletion(completionId, task.profileId);
      this.state.completions.update((items) => items.filter((item) => item.id !== completionId));
      this.sync.notifyLocalChange();
      return false;
    }

    const earned = completions.reduce((sum, completion) => sum + completion.points, 0);
    const previousLevel = Math.floor(earned / this.state.settings().levelUpPoints) + 1;

    const completion: Completion = {
      id: completionId,
      profileId: task.profileId,
      taskId: task.id,
      date: dateKey,
      points: task.points
    };
    await this.db.addCompletion(completion);
    this.state.completions.update((items) => [completion, ...items]);
    this.sync.notifyLocalChange();

    const nextLevel = Math.floor((earned + task.points) / this.state.settings().levelUpPoints) + 1;
    return nextLevel > previousLevel;
  }

  async remove(task: Task): Promise<void> {
    await this.db.removeTask(task.id, task.profileId);
    await this.db.removeCompletionsForTask(task.id, task.profileId);
    this.state.tasks.update((items) => items.filter((item) => item.id !== task.id));
    this.state.completions.update((items) => items.filter((item) => item.taskId !== task.id));
    this.sync.notifyLocalChange();
  }

  private sortTasks(items: Task[]): Task[] {
    return [...items].sort((a, b) => b.points - a.points);
  }
}
