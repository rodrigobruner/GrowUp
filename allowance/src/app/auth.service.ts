import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, computed, signal } from '@angular/core';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config';

type AuthError = {
  message: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly supabase: SupabaseClient;
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly needsPasswordReset = signal(false);
  readonly authError = signal<string | null>(null);

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.initSession();
  }

  private async initSession(): Promise<void> {
    await this.handleAuthRedirect();
    this.detectAuthError();
    const { data } = await this.supabase.auth.getSession();
    this.user.set(data.session?.user ?? null);
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.user.set(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        this.needsPasswordReset.set(true);
      }
    });
    this.detectPasswordRecovery();
  }

  async signIn(email: string, password: string): Promise<AuthError | null> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return error ? { message: error.message } : null;
  }

  async signUp(email: string, password: string, fullName?: string): Promise<AuthError | null> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined
      }
    });
    return error ? { message: error.message } : null;
  }

  async signInWithGoogle(): Promise<AuthError | null> {
    const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
    const redirectUrl = new URL(baseHref, window.location.origin).toString();
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    return error ? { message: error.message } : null;
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async resetPassword(email: string): Promise<AuthError | null> {
    const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
    const redirectUrl = new URL(baseHref, window.location.origin).toString();
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return error ? { message: error.message } : null;
  }

  async updatePassword(password: string): Promise<AuthError | null> {
    const { error } = await this.supabase.auth.updateUser({ password });
    return error ? { message: error.message } : null;
  }

  clearPasswordRecoveryFlag(): void {
    this.needsPasswordReset.set(false);
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());
  }

  clearAuthError(): void {
    this.authError.set(null);
  }

  async signOut(): Promise<AuthError | null> {
    const { error } = await this.supabase.auth.signOut();
    return error ? { message: error.message } : null;
  }

  private detectPasswordRecovery(): void {
    const hash = window.location.hash ?? '';
    const search = window.location.search ?? '';
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(search.replace(/^\?/, ''));
    const type = hashParams.get('type') || searchParams.get('type');
    if (type === 'recovery') {
      this.needsPasswordReset.set(true);
    }
  }

  private detectAuthError(): void {
    const hash = window.location.hash ?? '';
    const search = window.location.search ?? '';
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(search.replace(/^\?/, ''));
    const error =
      hashParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error_description') ||
      searchParams.get('error');
    if (error) {
      this.authError.set(decodeURIComponent(error.replace(/\+/g, ' ')));
    }
  }

  private async handleAuthRedirect(): Promise<void> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const type = url.searchParams.get('type');
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashType = hashParams.get('type');

    if (!code) {
      if (accessToken && refreshToken) {
        await this.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (hashType === 'recovery') {
          this.needsPasswordReset.set(true);
        }
        window.location.hash = '';
      }
      return;
    }
    await this.supabase.auth.exchangeCodeForSession(url.toString());
    if (type === 'recovery') {
      this.needsPasswordReset.set(true);
    }
    url.searchParams.delete('code');
    url.searchParams.delete('type');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, document.title, url.toString());
  }
}
