import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { App } from './app';
import { appTestProviders } from './test-utils/app-test-providers';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, TranslateModule.forRoot()],
      providers: appTestProviders
    }).compileComponents();
    TestBed.overrideComponent(App, {
      set: {
        template: '<div></div>'
      }
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement).toBeTruthy();
  });
});
