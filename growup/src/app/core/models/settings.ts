export type Settings = {
  id: string;
  profileId: string;
  cycleType: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  cycleStartDate: string;
  levelUpPoints: number;
  avatarId?: string;
  displayName?: string;
  updatedAt?: number;
};
