export type AccountSettings = {
  id: 'account';
  language: 'en' | 'pt' | 'fr' | 'es';
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'BETA' | 'PRO' | 'DEV';
  flags: Record<string, boolean>;
  termsVersion?: string;
  termsAcceptedAt?: number;
  updatedAt?: number;
};
