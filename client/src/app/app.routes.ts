import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';
import { HomeComponent } from './home/home.component';
import { MsalGuard } from '@azure/msal-angular';
import { CardComponent } from './parser/card/card.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    canActivate: [MsalGuard],
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    component: PageComponent,
    canActivate: [MsalGuard],
  },
  {
    path: 'sources/:sourceId/page/:pageNumber/cards/:cardData',
    component: CardComponent,
    canActivate: [MsalGuard],
  },
];
