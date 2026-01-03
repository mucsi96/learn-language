import { Routes, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { MsalGuard } from '@azure/msal-angular';
import { queryParamToObject } from './utils/queryCompression';
import { Word } from './parser/types';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';

// Guard factory that checks if auth is needed
const conditionalAuthGuard: CanActivateFn = (route, state) => {
  const { mockAuth } = inject(ENVIRONMENT_CONFIG);

  if (mockAuth) {
    return true;
  }

  const msalGuard = inject(MsalGuard);
  return msalGuard.canActivate(route, state);
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [conditionalAuthGuard],
    title: '',
  },
  {
    path: 'in-review-cards',
    loadComponent: () =>
      import('./in-review-cards/in-review-cards.component').then((m) => m.InReviewCardsComponent),
    canActivate: [conditionalAuthGuard],
    title: 'Cards In Review',
  },
  {
    path: 'model-usage',
    loadComponent: () =>
      import('./model-usage-logs/model-usage-logs.component').then((m) => m.ModelUsageLogsComponent),
    canActivate: [conditionalAuthGuard],
    title: 'Model Usage',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then((m) => m.SettingsComponent),
    canActivate: [conditionalAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'voices',
        pathMatch: 'full',
      },
      {
        path: 'voices',
        loadComponent: () =>
          import('./voice-config/voice-config.component').then((m) => m.VoiceConfigComponent),
        title: 'Voice Settings',
      },
      {
        path: 'data-models',
        loadComponent: () =>
          import('./chat-model-settings/chat-model-settings.component').then((m) => m.ChatModelSettingsComponent),
        title: 'Data Model Settings',
      },
    ],
  },
  {
    path: 'sources/:sourceId/study',
    canActivate: [conditionalAuthGuard],
    title: 'Study',
    children: [
      {
        path: '',
        outlet: 'source-selector',
        loadComponent: () =>
          import('./shared/source-selector/source-selector.component').then(
            (m) => m.SourceSelectorComponent
          ),
      },
      {
        path: '',
        loadComponent: () =>
          import('./study/learn-card/learn-card.component').then(
            (m) => m.LearnCardComponent
          ),
      },
    ],
  },
  {
    path: 'sources',
    loadComponent: () =>
      import('./admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [conditionalAuthGuard],
    title: 'Sources',
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    canActivate: [conditionalAuthGuard],
    title: (route) => {
      const sourceId = route.params['sourceId'];
      const pageNumber = route.params['pageNumber'];
      return `${pageNumber} / ${sourceId}`;
    },
    children: [
      {
        path: '',
        outlet: 'source-selector',
        loadComponent: () =>
          import('./shared/source-selector/source-selector.component').then(
            (m) => m.SourceSelectorComponent
          ),
      },
      {
        path: '',
        loadComponent: () =>
          import('./parser/page/page.component').then((m) => m.PageComponent),
      },
    ],
  },
  {
    path: 'sources/:sourceId/page/:pageNumber/cards',
    loadComponent: () =>
      import('./parser/edit-card/edit-card.component').then((m) => m.EditCardComponent),
    canActivate: [conditionalAuthGuard],
    title: async (route) => {
      const cardData = route.queryParams['cardData'];
      const word = await queryParamToObject<Word>(cardData);
      return word.word;
    },
  },
];
