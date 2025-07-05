import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { environment } from '../environments/environment';
import { queryParamToObject } from './utils/queryCompression';
import { Word } from './parser/types';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: '',
  },
  {
    path: 'sources/:sourceId/study',
    loadComponent: () =>
      import('./study/flashcard/flashcard.component').then((m) => m.FlashcardComponent),
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: 'Study',
  },
  {
    path: 'sources',
    loadComponent: () =>
      import('./admin/admin.component').then((m) => m.AdminComponent),
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: 'Sources',
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    loadComponent: () =>
      import('./parser/page/page.component').then((m) => m.PageComponent),
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: (route) => {
      const sourceId = route.params['sourceId'];
      const pageNumber = route.params['pageNumber'];
      return `${pageNumber} / ${sourceId}`;
    },
  },
  {
    path: 'sources/:sourceId/page/:pageNumber/cards',
    loadComponent: () =>
      import('./parser/card/card.component').then((m) => m.CardComponent),
    canActivate: environment.mockAuth ? [] : [MsalGuard],
    title: async (route) => {
      const cardData = route.queryParams['cardData'];
      const word = await queryParamToObject<Word>(cardData);
      return word.word;
    },
  },
];
