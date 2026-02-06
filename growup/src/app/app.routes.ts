import { Routes } from '@angular/router';
import { DevuiPageComponent } from './pages/devui/devui-page.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { SigninPageComponent } from './pages/signin/signin-page.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardPageComponent
  },
  {
    path: 'signin',
    component: SigninPageComponent
  },
  {
    path: 'devui',
    component: DevuiPageComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
