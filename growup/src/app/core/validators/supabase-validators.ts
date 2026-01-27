import {
  AccountSettingsRow,
  CompletionRow,
  ProfileRow,
  RedemptionRow,
  RewardRow,
  SettingsRow,
  TaskRow,
  isAccountSettingsRow,
  isCompletionRow,
  isProfileRow,
  isRedemptionRow,
  isRewardRow,
  isSettingsRow,
  isTaskRow
} from '../models/supabase';

export type SyncRow = ProfileRow | TaskRow | RewardRow | CompletionRow | RedemptionRow | SettingsRow;

export const isValidSyncRow = (
  table: Exclude<string, 'accountSettings'>,
  row: unknown
): row is SyncRow => {
  if (table === 'profiles') return isProfileRow(row);
  if (table === 'tasks') return isTaskRow(row);
  if (table === 'rewards') return isRewardRow(row);
  if (table === 'completions') return isCompletionRow(row);
  if (table === 'redemptions') return isRedemptionRow(row);
  return isSettingsRow(row);
};

export const isValidAccountSettingsRow = (row: unknown): row is AccountSettingsRow => isAccountSettingsRow(row);
