export type AccountSettings = {
  id: 'account';
  language: 'en' | 'pt' | 'fr' | 'es';
  termsVersion?: string;
  termsAcceptedAt?: number;
  updatedAt?: number;
};
