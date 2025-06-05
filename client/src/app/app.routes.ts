import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';
import { HomeComponent } from './home/home.component';
import { MsalGuard } from '@azure/msal-angular';
import { CardComponent } from './parser/card/card.component';
import { AdminComponent } from './admin/admin.component';
import { environment } from '../environments/environment';
import { queryParamToObject } from './utils/queryCompression';
import { Word } from './parser/types';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: '',
  },
  {
    path: 'sources',
    component: AdminComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: 'Sources',
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    component: PageComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: (route) => {
      const sourceId = route.params['sourceId'];
      const pageNumber = route.params['pageNumber'];
      return `${pageNumber} / ${sourceId}`;
    },
  },
  {
    path: 'sources/:sourceId/page/:pageNumber/cards',
    component: CardComponent,
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: async (route) => {
      const cardData = route.queryParams['cardData'];
      const word = await queryParamToObject<Word>(cardData);
      return word.word;
    },
  },
];
