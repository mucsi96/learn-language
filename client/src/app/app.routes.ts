import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';
import { HomeComponent } from './home/home.component';
import { MsalGuard } from '@azure/msal-angular';
import { CardComponent } from './parser/card/card.component';
import { AdminComponent } from './admin/admin.component';
import { environment } from '../environments/environment';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
  },
  {
    path: 'sources',
    component: AdminComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    component: PageComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
  },
  {
    path: 'sources/:sourceId/page/:pageNumber/cards',
    component: CardComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
  },
];
