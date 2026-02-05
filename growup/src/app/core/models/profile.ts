export type Profile = {
  id: string;
  displayName: string;
  avatarId: string;
  role: 'USER' | 'ADMIN';
  createdAt: number;
  updatedAt?: number;
};
