import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMenuComponent, TranslateModule.forRoot()]
    }).compileComponents();
  });

  it('shows tooltip with user name when logged in', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentInstance.isLoggedIn = true;
    fixture.componentInstance.userDisplayName = 'User Name';
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.avatar-button'));
    const tooltip = button.injector.get(MatTooltip);
    expect(tooltip.message).toBe('User Name');
    expect(tooltip.disabled).toBe(false);
  });

  it('disables tooltip when name is missing', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentInstance.isLoggedIn = true;
    fixture.componentInstance.userDisplayName = null;
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.avatar-button'));
    const tooltip = button.injector.get(MatTooltip);
    expect(tooltip.disabled).toBe(true);
  });
});
