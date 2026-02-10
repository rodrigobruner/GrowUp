import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileAvatarComponent } from './profile-avatar.component';

const createProfile = (id: string) => ({
  id,
  displayName: `Profile ${id}`,
  avatarId: '01',
  createdAt: Date.now()
});

describe('ProfileAvatarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileAvatarComponent, TranslateModule.forRoot()]
    }).compileComponents();
  });

  it('shows add button when profiles below max', () => {
    const fixture = TestBed.createComponent(ProfileAvatarComponent);
    fixture.componentInstance.profiles = [createProfile('1')];
    fixture.componentInstance.maxProfiles = 5;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.profile-avatar-add');
    expect(button).toBeTruthy();
  });

  it('hides add button when profiles reach max', () => {
    const fixture = TestBed.createComponent(ProfileAvatarComponent);
    fixture.componentInstance.profiles = [
      createProfile('1'),
      createProfile('2'),
      createProfile('3'),
      createProfile('4'),
      createProfile('5')
    ];
    fixture.componentInstance.maxProfiles = 5;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.profile-avatar-add');
    expect(button).toBeFalsy();
  });

  it('hides add button after first profile when max is one', () => {
    const fixture = TestBed.createComponent(ProfileAvatarComponent);
    fixture.componentInstance.profiles = [createProfile('1')];
    fixture.componentInstance.maxProfiles = 1;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.profile-avatar-add');
    expect(button).toBeFalsy();
  });
});
