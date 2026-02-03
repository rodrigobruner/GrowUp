import { Routes } from '@angular/router';
import { DevuiPageComponent } from './pages/devui/devui-page.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';

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
    path: 'devui',
    component: DevuiPageComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
