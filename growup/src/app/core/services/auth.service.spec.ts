import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { DOCUMENT } from '@angular/common';

const authMock = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  setSession: vi.fn()
};

const supabaseMock = {
  auth: authMock,
  rpc: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseMock
}));

describe('AuthService', () => {
  const documentMock = {
    querySelector: () => ({ getAttribute: () => '/' }),
    title: 'GrowUp'
  } as unknown as Document;

  const originalLocalStorage = window.localStorage;
  const originalLocation = window.location;
  const originalReplaceState = window.history.replaceState;

  const setMockLocation = (url: string) => {
    const parsed = new URL(url);
    Object.defineProperty(window, 'location', {
      value: {
        href: parsed.toString(),
        origin: parsed.origin,
        search: parsed.search,
        hash: parsed.hash
      },
      configurable: true
    });
  };

  it('returns error when signIn fails', async () => {
    authMock.signInWithPassword.mockResolvedValueOnce({ error: { message: 'bad' } });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.signIn('test@mail.com', 'pass');

    expect(result).toEqual({ message: 'bad' });
  });

  it('passes metadata on signUp', async () => {
    authMock.signUp.mockResolvedValueOnce({ error: null });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    await service.signUp('test@mail.com', 'pass', 'User', 'v1', '2026-02-10T00:00:00Z');

    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'test@mail.com',
      password: 'pass',
      options: {
        data: {
          full_name: 'User',
          terms_version: 'v1',
          terms_accepted_at: '2026-02-10T00:00:00Z'
        }
      }
    });
  });

  it('returns null when signOut succeeds', async () => {
    authMock.signOut.mockResolvedValueOnce({ error: null });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.signOut();

    expect(result).toBeNull();
  });

  it('clears password recovery flag and hash', () => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    service.needsPasswordReset.set(true);

    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    service.clearPasswordRecoveryFlag();

    expect(service.needsPasswordReset()).toBe(false);
    expect(replaceSpy).toHaveBeenCalled();
  });

  it('signs in with Google and sets redirect', async () => {
    authMock.signInWithOAuth.mockResolvedValueOnce({ error: null });
    const storageSpy = vi.fn();
    Object.defineProperty(window, 'localStorage', {
      value: { ...originalLocalStorage, setItem: storageSpy },
      configurable: true
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.signInWithGoogle();

    expect(storageSpy).toHaveBeenCalledWith('growup.postAuthRedirect', '/dashboard');
    expect(authMock.signInWithOAuth).toHaveBeenCalled();
    expect(result).toBeNull();

    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true
    });
  });

  it('returns error when resetPassword fails', async () => {
    authMock.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'reset-fail' } });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.resetPassword('test@mail.com');

    expect(result).toEqual({ message: 'reset-fail' });
  });

  it('returns error when updatePassword fails', async () => {
    authMock.updateUser.mockResolvedValueOnce({ error: { message: 'update-fail' } });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.updatePassword('new-password');

    expect(result).toEqual({ message: 'update-fail' });
  });

  it('deleteAccount returns error on rpc failure', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: { message: 'delete-fail' } });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.deleteAccount();

    expect(result).toEqual({ message: 'delete-fail' });
  });

  it('deleteAccount signs out on success', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ error: null });
    authMock.signOut.mockResolvedValueOnce({ error: null });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    const result = await service.deleteAccount();

    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_user_account');
    expect(authMock.signOut).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('detects auth error from URL params and clears them', async () => {
    Object.defineProperty(window.history, 'replaceState', { value: vi.fn(), configurable: true });
    setMockLocation('http://localhost/?error=access_denied#');

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    (service as any).detectAuthError();

    expect(service.authError()).toBe('generic');
    expect(window.history.replaceState).toHaveBeenCalled();

    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    Object.defineProperty(window.history, 'replaceState', { value: originalReplaceState, configurable: true });
  });

  it('handles auth redirect with code and recovery type', async () => {
    Object.defineProperty(window.history, 'replaceState', { value: vi.fn(), configurable: true });
    setMockLocation('http://localhost/?code=abc&type=recovery');

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    await (service as any).handleAuthRedirect();

    expect(authMock.exchangeCodeForSession).toHaveBeenCalledWith('http://localhost/?code=abc&type=recovery');
    expect(service.needsPasswordReset()).toBe(true);

    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    Object.defineProperty(window.history, 'replaceState', { value: originalReplaceState, configurable: true });
  });

  it('handles auth redirect from hash session tokens', async () => {
    Object.defineProperty(window.history, 'replaceState', { value: vi.fn(), configurable: true });
    setMockLocation('http://localhost/#access_token=token&refresh_token=refresh&type=recovery');

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });

    const service = TestBed.inject(AuthService);
    await (service as any).handleAuthRedirect();

    expect(authMock.setSession).toHaveBeenCalledWith({ access_token: 'token', refresh_token: 'refresh' });
    expect(service.needsPasswordReset()).toBe(true);

    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    Object.defineProperty(window.history, 'replaceState', { value: originalReplaceState, configurable: true });
  });
});
