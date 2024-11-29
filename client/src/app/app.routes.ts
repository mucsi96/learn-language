import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';
import { HomeComponent } from './home/home.component';
import { MsalGuard, MsalRedirectComponent } from '@azure/msal-angular';

export enum RouterTokens {
  AUTH = 'auth',
  HOME = '',
  SOURCES = 'sources',
}

export const routes: Routes = [
  {
    path: RouterTokens.AUTH,
    pathMatch: 'full',
    component: MsalRedirectComponent
  },
  {
    path: RouterTokens.HOME,
    pathMatch: 'full',
    component: HomeComponent,
    canActivate: [MsalGuard]
  },
  {
    path: `${RouterTokens.SOURCES}/:sourceId/page/:pageNumber`,
    component: PageComponent,
    canActivate: [MsalGuard]
  },
];
