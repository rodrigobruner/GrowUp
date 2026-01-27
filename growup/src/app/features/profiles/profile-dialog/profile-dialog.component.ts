import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Profile } from '../../../core/models/profile';
import { Settings } from '../../../core/models/settings';

type AvatarOption = {
  id: string;
  name: string;
  description?: string;
};

type AvatarDefinition = {
  id: string;
  name?: string | Record<string, string>;
  'system-name'?: string;
  description?: string | Record<string, string>;
};

@Component({
  selector: 'app-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './profile-dialog.component.html',
  styleUrl: './profile-dialog.component.scss'
})
export class ProfileDialogComponent implements OnChanges {
  @Input() settings: Settings | null = null;
  @Input() profiles: Profile[] = [];
  @Input() activeProfileId: string | null = null;
  @Input() mode: 'create' | 'edit' = 'edit';
  @Output() closeProfile = new EventEmitter<void>();
  @Output() saveProfile = new EventEmitter<
    Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>
  >();
  @Output() selectProfile = new EventEmitter<string>();
  @Output() deleteProfile = new EventEmitter<string>();

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly translateService = inject(TranslateService);
  avatars = signal<AvatarOption[]>([]);

  form = this.formBuilder.group({
    displayName: this.formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(40)]
    }),
    avatarId: this.formBuilder.control<Settings['avatarId']>('01', { validators: [Validators.required] }),
    cycleType: this.formBuilder.control<Settings['cycleType']>('biweekly', { validators: [Validators.required] }),
    cycleStartDate: this.formBuilder.control<Settings['cycleStartDate']>(this.today(), {
      validators: [Validators.required]
    }),
    levelUpPoints: this.formBuilder.control<Settings['levelUpPoints']>(100, {
      validators: [Validators.required, Validators.min(10)]
    })
  });

  constructor() {
    this.loadAvatars();
    this.form
      .get('avatarId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ensureDefaultDisplayName());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && this.mode === 'create') {
      this.form.reset({
        displayName: '',
        avatarId: '01',
        cycleType: 'biweekly',
        cycleStartDate: this.today(),
        levelUpPoints: 100
      });
      this.ensureDefaultDisplayName();
      return;
    }
    if (changes['settings'] && this.settings) {
      this.form.reset({
        displayName: this.settings.displayName ?? '',
        avatarId: this.settings.avatarId ?? '01',
        cycleType: this.settings.cycleType,
        cycleStartDate: this.settings.cycleStartDate,
        levelUpPoints: this.settings.levelUpPoints
      });
      this.ensureDefaultDisplayName();
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saveProfile.emit(this.form.getRawValue());
  }

  close(): void {
    this.closeProfile.emit();
  }

  useSelectedProfile(): void {
    if (this.activeProfileId) {
      this.selectProfile.emit(this.activeProfileId);
    }
  }

  onSelectProfile(profileId: string): void {
    this.selectProfile.emit(profileId);
  }

  onDeleteProfile(profileId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.deleteProfile.emit(profileId);
  }

  avatarPreviewSrc(): string {
    return this.avatarOptionSrc(this.form.get('avatarId')?.value ?? '01');
  }

  avatarOptionSrc(avatarId: string): string {
    return `assets/avatar/${avatarId}/avatar.png`;
  }

  selectedAvatarDescription(): string | null {
    const avatarId = this.form.get('avatarId')?.value ?? '01';
    return this.avatars().find((avatar) => avatar.id === avatarId)?.description ?? null;
  }

  private today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async loadAvatars(): Promise<void> {
    const fallback = [{ id: '01', name: 'Default' }];
    try {
      const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
      const normalized = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
      const response = await fetch(`${normalized}avatars.json`);
      if (!response.ok) {
        this.avatars.set(fallback);
        return;
      }
      const data = (await response.json()) as AvatarDefinition[];
      if (Array.isArray(data)) {
        const language = this.getLanguageKey();
        this.avatars.set(
          data
            .filter((item) => item && typeof item.id === 'string')
            .map((item) => ({
              id: item.id,
              name: this.resolveAvatarName(item, language),
              description: this.resolveAvatarDescription(item, language)
            }))
        );
        this.ensureDefaultDisplayName();
      } else {
        this.avatars.set(fallback);
      }
    } catch {
      this.avatars.set(fallback);
    }
  }

  private resolveAvatarName(item: AvatarDefinition, language: string): string {
    if (!item.name) {
      return item['system-name'] ?? item.id;
    }
    if (typeof item.name === 'string') {
      return item.name;
    }
    return item.name[language] ?? item.name['en'] ?? item['system-name'] ?? item.id;
  }

  private resolveAvatarDescription(item: AvatarDefinition, language: string): string | undefined {
    if (!item.description) {
      return undefined;
    }
    if (typeof item.description === 'string') {
      return item.description;
    }
    return item.description[language] ?? item.description['en'];
  }

  private getLanguageKey(): string {
    const current = this.translateService.currentLang;
    const fallback = this.translateService.getDefaultLang() ?? 'en';
    return (current ?? fallback).startsWith('pt') ? 'pt' : (current ?? fallback).startsWith('fr') ? 'fr' : 'en';
  }

  private ensureDefaultDisplayName(): void {
    const displayName = this.form.get('displayName')?.value ?? '';
    if (displayName.trim()) {
      return;
    }
    const avatarId = this.form.get('avatarId')?.value ?? '01';
    const match = this.avatars().find((avatar) => avatar.id === avatarId);
    if (match) {
      this.form.get('displayName')?.setValue(match.name);
    }
  }
}
