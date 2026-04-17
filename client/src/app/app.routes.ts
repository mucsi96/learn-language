import { Routes } from '@angular/router';
import { autoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [autoLoginPartialRoutesGuard],
    title: '',
  },
  {
    path: 'in-review-cards',
    loadComponent: () =>
      import('./in-review-cards/in-review-cards.component').then((m) => m.InReviewCardsComponent),
    canActivate: [autoLoginPartialRoutesGuard],
    title: 'Cards In Review',
  },
  {
    path: 'model-usage',
    loadComponent: () =>
      import('./model-usage-logs/model-usage-logs.component').then((m) => m.ModelUsageLogsComponent),
    canActivate: [autoLoginPartialRoutesGuard],
    title: 'Model Usage',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then((m) => m.SettingsComponent),
    canActivate: [autoLoginPartialRoutesGuard],
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
      {
        path: 'image-models',
        loadComponent: () =>
          import('./image-model-settings/image-model-settings.component').then((m) => m.ImageModelSettingsComponent),
        title: 'Image Model Settings',
      },
      {
        path: 'known-words',
        loadComponent: () =>
          import('./known-words/known-words.component').then((m) => m.KnownWordsComponent),
        title: 'Known Words',
      },
      {
        path: 'learning-partners',
        loadComponent: () =>
          import('./learning-partners/learning-partners.component').then((m) => m.LearningPartnersComponent),
        title: 'Learning Partners',
      },
      {
        path: 'api-tokens',
        loadComponent: () =>
          import('./api-tokens/api-tokens.component').then((m) => m.ApiTokensComponent),
        title: 'API Tokens',
      },
    ],
  },
  {
    path: 'sources/:sourceId/study',
    canActivate: [autoLoginPartialRoutesGuard],
    title: 'Study',
    children: [
      {
        path: '',
        outlet: 'source-selector',
        loadComponent: () =>
          import('./shared/source-selector/source-selector.component').then(
            (m) => m.SourceSelectorComponent
          ),
          data: { mode: 'study' },
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
    canActivate: [autoLoginPartialRoutesGuard],
    title: 'Sources',
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    canActivate: [autoLoginPartialRoutesGuard],
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
        data: { mode: 'admin' },
      },
      {
        path: '',
        loadComponent: () =>
          import('./parser/page/page.component').then((m) => m.PageComponent),
      },
    ],
  },
  {
    path: 'sources/:sourceId/cards',
    canActivate: [autoLoginPartialRoutesGuard],
    title: 'Cards',
    children: [
      {
        path: '',
        outlet: 'source-selector',
        loadComponent: () =>
          import('./shared/source-selector/source-selector.component').then(
            (m) => m.SourceSelectorComponent
          ),
        data: { mode: 'cards' },
      },
      {
        path: '',
        loadComponent: () =>
          import('./cards-table/cards-table.component').then(
            (m) => m.CardsTableComponent
          ),
      },
    ],
  },
  {
    path: 'sources/:sourceId/page/:pageNumber/cards/:cardId',
    loadComponent: () =>
      import('./parser/edit-card/edit-card.component').then((m) => m.EditCardComponent),
    canActivate: [autoLoginPartialRoutesGuard],
    title: 'Edit Card',
  },
];
