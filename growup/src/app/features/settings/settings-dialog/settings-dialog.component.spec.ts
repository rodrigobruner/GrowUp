import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SettingsDialogComponent } from './settings-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

describe('SettingsDialogComponent', () => {
  const dialogMock = {
    open: vi.fn(() => ({
      afterClosed: () => of(true)
    }))
  };

  beforeEach(async () => {
    dialogMock.open.mockClear();
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: vi.fn().mockResolvedValue([]) },
      configurable: true
    });
    Object.defineProperty(window, 'caches', {
      value: { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() },
      configurable: true
    });
    Object.defineProperty(globalThis, 'indexedDB', {
      value: { databases: vi.fn().mockResolvedValue([]), deleteDatabase: vi.fn() },
      configurable: true
    });

    await TestBed.configureTestingModule({
      imports: [SettingsDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialog, useValue: dialogMock },
        { provide: AuthService, useValue: { isLoggedIn: () => true, deleteAccount: vi.fn().mockResolvedValue(null) } }
      ]
    }).compileComponents();
  });

  it('emits selectProfile when selecting a profile', () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const emitSpy = vi.spyOn(fixture.componentInstance.selectProfile, 'emit');

    fixture.componentInstance.onSelectProfile('profile-1');

    expect(emitSpy).toHaveBeenCalledWith('profile-1');
  });

  it('emits deleteProfile when confirmed', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    fixture.componentInstance.profiles = [
      { id: 'p1', displayName: 'Profile', avatarId: '01', createdAt: Date.now() }
    ];
    const emitSpy = vi.spyOn(fixture.componentInstance.deleteProfile, 'emit');
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;

    await fixture.componentInstance.onDeleteProfile('p1', event);

    expect(dialogMock.open).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('p1');
  });

  it('returns avatar description for selected avatar', () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;

    component.avatars.set([
      { id: '01', name: 'Default', description: 'Default avatar' },
      { id: '02', name: 'Alt', description: 'Alt avatar' }
    ]);
    component.form.patchValue({ avatarId: '02' });

    expect(component.selectedAvatarDescription()).toBe('Alt avatar');
  });

  it('resolves avatar source path', () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;

    expect(component.avatarOptionSrc('05')).toBe('assets/avatar/05/avatar.webp');
  });

  it('uses language from TranslateService for avatar data', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;
    const translate = TestBed.inject(TranslateService);
    translate.use('pt');

    const data = [
      { id: '01', name: { pt: 'Padrão', en: 'Default' }, description: { pt: 'Descrição', en: 'Description' } }
    ];

    const response = {
      ok: true,
      json: () => Promise.resolve(data)
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);

    await (component as unknown as { loadAvatars(): Promise<void> }).loadAvatars();

    expect(component.avatars()).toEqual([{ id: '01', name: 'Padrão', description: 'Descrição' }]);
    fetchSpy.mockRestore();
  });

  it('clears cache and reloads when clearCacheAndReload is called', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;

    const reloadSpy = vi.spyOn(window.location, 'reload');

    await component.clearCacheAndReload();

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('clears storage and reloads when clearAllDataAndReload is confirmed', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;

    const reloadSpy = vi.spyOn(window.location, 'reload');
    const localSpy = vi.fn();
    const sessionSpy = vi.fn();
    Object.defineProperty(window, 'localStorage', {
      value: { ...window.localStorage, clear: localSpy },
      configurable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: { ...window.sessionStorage, clear: sessionSpy },
      configurable: true
    });

    await component.clearAllDataAndReload();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(localSpy).toHaveBeenCalled();
    expect(sessionSpy).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('does not emit save when form is invalid', () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;
    const emitSpy = vi.spyOn(component.saveSettings, 'emit');

    component.form.patchValue({ displayName: '' });
    component.save();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('uses fallback avatars when fetch fails', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'));

    await (component as unknown as { loadAvatars(): Promise<void> }).loadAvatars();

    expect(component.avatars()).toEqual([{ id: '01', name: 'Default' }]);
    fetchSpy.mockRestore();
  });

  it('skips delete flow when user is logged out', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;
    const auth = TestBed.inject(AuthService);
    const closeSpy = vi.spyOn(component.closeSettings, 'emit');
    vi.spyOn(auth, 'isLoggedIn').mockReturnValue(false);

    await component.openDeleteAccount();

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('deletes account and clears data when confirmed', async () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    const component = fixture.componentInstance;
    const auth = TestBed.inject(AuthService);
    const closeSpy = vi.spyOn(component.closeSettings, 'emit');
    const clearSpy = vi
      .spyOn(component as unknown as { clearAllDataAfterDelete: () => Promise<void> }, 'clearAllDataAfterDelete')
      .mockResolvedValue();

    await component.openDeleteAccount();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(auth.deleteAccount).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });
});
