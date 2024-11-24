import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';
import { HomeComponent } from './home/home.component';
import { MsalGuard } from '@azure/msal-angular';

export enum RouterTokens {
  HOME = '',
  SOURCES = 'sources',
}

export const routes: Routes = [
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
