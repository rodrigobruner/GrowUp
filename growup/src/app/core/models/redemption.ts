export type RewardRedemption = {
  id: string;
  profileId: string;
  rewardId: string;
  rewardTitle: string;
  cost: number;
  redeemedAt: number;
  date: string;
  updatedAt?: number;
};
