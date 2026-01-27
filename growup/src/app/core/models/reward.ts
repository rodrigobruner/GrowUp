export type Reward = {
  id: string;
  profileId: string;
  title: string;
  cost: number;
  limitPerCycle: number;
  createdAt: number;
  redeemedAt?: number;
  updatedAt?: number;
};
