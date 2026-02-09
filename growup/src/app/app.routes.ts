import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { DevuiPageComponent } from './pages/devui/devui-page.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { SigninPageComponent } from './pages/signin/signin-page.component';
import { AdminPageComponent } from './pages/admin/admin-page.component';
import { AuthService } from './core/services/auth.service';
import { SessionStateService } from './core/services/session-state.service';

const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/']);
  }

  const status = sessionState.status();
  if (status === 'idle' || status === 'loading') {
    return true;
  }

  if (sessionState.accountSettings().role === 'ADMIN') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

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
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard]
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
