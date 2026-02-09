export type AccountSettings = {
  id: 'account';
  language: 'en' | 'pt' | 'fr' | 'es';
  role: 'USER' | 'ADMIN';
  termsVersion?: string;
  termsAcceptedAt?: number;
  updatedAt?: number;
};
