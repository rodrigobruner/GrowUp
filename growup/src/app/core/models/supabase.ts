export type SupabaseUuid = string;

export interface BaseRow {
  id: SupabaseUuid;
  owner_id: SupabaseUuid;
  profile_id?: SupabaseUuid | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface ProfileRow extends BaseRow {
  display_name: string;
  avatar_id: string | null;
  role: 'USER' | 'ADMIN';
}

export interface TaskRow extends BaseRow {
  profile_id: SupabaseUuid;
  title: string;
  points: number;
}

export interface RewardRow extends BaseRow {
  profile_id: SupabaseUuid;
  title: string;
  cost: number;
  limit_per_cycle: number | null;
  redeemed_at: string | null;
}

export interface CompletionRow extends BaseRow {
  profile_id: SupabaseUuid;
  task_id: SupabaseUuid;
  date: string;
  points: number;
}

export interface RedemptionRow extends BaseRow {
  profile_id: SupabaseUuid;
  reward_id: SupabaseUuid;
  reward_title: string;
  cost: number;
  redeemed_at: string;
  date: string;
}

export interface SettingsRow extends BaseRow {
  profile_id: SupabaseUuid;
  cycle_type: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  cycle_start_date: string;
  level_up_points: number;
  avatar_id: string | null;
  display_name: string | null;
}

export interface AccountSettingsRow {
  owner_id: SupabaseUuid;
  language: 'en' | 'pt' | 'fr' | 'es';
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'BETA' | 'PRO';
  flags: Record<string, boolean> | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  updated_at?: string | null;
}

const hasString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isProfileRole = (value: unknown): value is ProfileRow['role'] => value === 'USER' || value === 'ADMIN';

export const isProfileRow = (row: unknown): row is ProfileRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as ProfileRow;
  return hasString(r.id) && hasString(r.owner_id) && hasString(r.display_name) && isProfileRole(r.role);
};

export const isTaskRow = (row: unknown): row is TaskRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as TaskRow;
  return hasString(r.id) && hasString(r.owner_id) && hasString(r.profile_id) && hasString(r.title);
};

export const isRewardRow = (row: unknown): row is RewardRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as RewardRow;
  return hasString(r.id) && hasString(r.owner_id) && hasString(r.profile_id) && hasString(r.title);
};

export const isCompletionRow = (row: unknown): row is CompletionRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as CompletionRow;
  return hasString(r.id) && hasString(r.owner_id) && hasString(r.profile_id) && hasString(r.task_id) && hasString(r.date);
};

export const isRedemptionRow = (row: unknown): row is RedemptionRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as RedemptionRow;
  return (
    hasString(r.id) &&
    hasString(r.owner_id) &&
    hasString(r.profile_id) &&
    hasString(r.reward_id) &&
    hasString(r.reward_title) &&
    hasString(r.redeemed_at) &&
    hasString(r.date)
  );
};

export const isSettingsRow = (row: unknown): row is SettingsRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as SettingsRow;
  return (
    hasString(r.id) &&
    hasString(r.owner_id) &&
    hasString(r.profile_id) &&
    hasString(r.cycle_type) &&
    hasString(r.cycle_start_date)
  );
};

export const isAccountSettingsRow = (row: unknown): row is AccountSettingsRow => {
  if (!row || typeof row !== 'object') return false;
  const r = row as AccountSettingsRow;
  const hasPlan = r.plan === 'FREE' || r.plan === 'BETA' || r.plan === 'PRO';
  const flagsOk = r.flags === null || typeof r.flags === 'object';
  return hasString(r.owner_id) && hasString(r.language) && isProfileRole(r.role) && hasPlan && flagsOk;
};
