import { Injectable } from '@angular/core';
import { AccountSettings } from '../models/account-settings';
import { Completion } from '../models/completion';
import { Profile } from '../models/profile';
import { Reward } from '../models/reward';
import { RewardRedemption } from '../models/redemption';
import { Settings } from '../models/settings';
import { Task } from '../models/task';
import {
  AccountSettingsRow,
  CompletionRow,
  ProfileRow,
  RedemptionRow,
  RewardRow,
  SettingsRow,
  TaskRow
} from '../models/supabase';

export type SyncPayload = Task | Reward | Completion | Settings | RewardRedemption;
export type SyncRow = ProfileRow | TaskRow | RewardRow | CompletionRow | RedemptionRow | SettingsRow;

@Injectable({ providedIn: 'root' })
export class SyncMapperService {
  toRemotePayload(
    table: Exclude<string, 'accountSettings' | 'profiles'>,
    payload: SyncPayload,
    ownerId: string
  ): TaskRow | RewardRow | CompletionRow | RedemptionRow | SettingsRow {
    if (table === 'tasks') {
      const task = payload as Task;
      return {
        id: task.id,
        owner_id: ownerId,
        profile_id: task.profileId,
        title: task.title,
        points: task.points,
        created_at: new Date(task.createdAt).toISOString(),
        deleted_at: null
      };
    }
    if (table === 'rewards') {
      const reward = payload as Reward;
      return {
        id: reward.id,
        owner_id: ownerId,
        profile_id: reward.profileId,
        title: reward.title,
        cost: reward.cost,
        limit_per_cycle: reward.limitPerCycle ?? 1,
        created_at: new Date(reward.createdAt).toISOString(),
        redeemed_at: reward.redeemedAt ? new Date(reward.redeemedAt).toISOString() : null,
        deleted_at: null
      };
    }
    if (table === 'redemptions') {
      const redemption = payload as RewardRedemption;
      return {
        id: redemption.id,
        owner_id: ownerId,
        profile_id: redemption.profileId,
        reward_id: redemption.rewardId,
        reward_title: redemption.rewardTitle,
        cost: redemption.cost,
        redeemed_at: new Date(redemption.redeemedAt).toISOString(),
        date: redemption.date,
        deleted_at: null
      };
    }
    if (table === 'settings') {
      const settings = payload as Settings;
      return {
        id: settings.id,
        owner_id: ownerId,
        profile_id: settings.profileId,
        cycle_type: settings.cycleType,
        cycle_start_date: settings.cycleStartDate,
        level_up_points: settings.levelUpPoints,
        avatar_id: settings.avatarId ?? '01',
        display_name: settings.displayName ?? null
      };
    }
    const completion = payload as Completion;
    return {
      id: completion.id,
      owner_id: ownerId,
      profile_id: completion.profileId,
      task_id: completion.taskId,
      date: completion.date,
      points: completion.points,
      deleted_at: null
    };
  }

  toRemoteAccountSettings(settings: AccountSettings, ownerId: string): AccountSettingsRow {
    return {
      owner_id: ownerId,
      language: settings.language,
      role: settings.role,
      terms_version: settings.termsVersion ?? null,
      terms_accepted_at: settings.termsAcceptedAt ? new Date(settings.termsAcceptedAt).toISOString() : null
    };
  }

  toRemoteProfile(profile: Profile, ownerId: string): ProfileRow {
    return {
      id: profile.id,
      owner_id: ownerId,
      display_name: profile.displayName,
      avatar_id: profile.avatarId ?? '01',
      role: 'USER'
    };
  }

  toLocalRecord(
    table: Exclude<string, 'accountSettings'>,
    row: SyncRow
  ): Task | Reward | Completion | RewardRedemption | Settings | Profile {
    if (table === 'profiles') {
      const profile = row as ProfileRow;
      return {
        id: profile.id,
        displayName: profile.display_name,
        avatarId: profile.avatar_id ?? '01',
        createdAt: profile.created_at ? new Date(profile.created_at).getTime() : Date.now(),
        updatedAt: profile.updated_at ? new Date(profile.updated_at).getTime() : undefined
      };
    }
    if (table === 'tasks') {
      const task = row as TaskRow;
      return {
        id: task.id,
        profileId: task.profile_id,
        title: task.title,
        points: task.points,
        createdAt: task.created_at ? new Date(task.created_at).getTime() : Date.now(),
        updatedAt: task.updated_at ? new Date(task.updated_at).getTime() : undefined
      };
    }
    if (table === 'rewards') {
      const reward = row as RewardRow;
      return {
        id: reward.id,
        profileId: reward.profile_id,
        title: reward.title,
        cost: reward.cost,
        limitPerCycle: reward.limit_per_cycle ?? 1,
        createdAt: reward.created_at ? new Date(reward.created_at).getTime() : Date.now(),
        redeemedAt: reward.redeemed_at ? new Date(reward.redeemed_at).getTime() : undefined,
        updatedAt: reward.updated_at ? new Date(reward.updated_at).getTime() : undefined
      };
    }
    if (table === 'redemptions') {
      const redemption = row as RedemptionRow;
      return {
        id: redemption.id,
        profileId: redemption.profile_id,
        rewardId: redemption.reward_id,
        rewardTitle: redemption.reward_title,
        cost: redemption.cost,
        redeemedAt: redemption.redeemed_at ? new Date(redemption.redeemed_at).getTime() : Date.now(),
        date: redemption.date,
        updatedAt: redemption.updated_at ? new Date(redemption.updated_at).getTime() : undefined
      } as RewardRedemption;
    }
    if (table === 'settings') {
      const settings = row as SettingsRow;
      return {
        id: settings.id,
        profileId: settings.profile_id,
        cycleType: settings.cycle_type,
        cycleStartDate: settings.cycle_start_date,
        levelUpPoints: settings.level_up_points,
        avatarId: settings.avatar_id ?? '01',
        displayName: settings.display_name ?? '',
        updatedAt: settings.updated_at ? new Date(settings.updated_at).getTime() : undefined
      };
    }
    const completion = row as CompletionRow;
    return {
      id: completion.id,
      profileId: completion.profile_id,
      taskId: completion.task_id,
      date: completion.date,
      points: completion.points,
      updatedAt: completion.updated_at ? new Date(completion.updated_at).getTime() : undefined
    };
  }

  toLocalAccountSettings(row: AccountSettingsRow): AccountSettings {
    return {
      id: 'account',
      language: row.language,
      role: row.role,
      termsVersion: row.terms_version ?? undefined,
      termsAcceptedAt: row.terms_accepted_at ? new Date(row.terms_accepted_at).getTime() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
    };
  }
}
