import { Routes } from '@angular/router';
import { authGuard } from './utils/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    title: '',
  },
  {
    path: 'in-review-cards',
    loadComponent: () =>
      import('./in-review-cards/in-review-cards.component').then((m) => m.InReviewCardsComponent),
    canActivate: [authGuard],
    title: 'Cards In Review',
  },
  {
    path: 'model-usage',
    loadComponent: () =>
      import('./model-usage-logs/model-usage-logs.component').then((m) => m.ModelUsageLogsComponent),
    canActivate: [authGuard],
    title: 'Model Usage',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then((m) => m.SettingsComponent),
    canActivate: [authGuard],
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
        path: 'grammar-topics',
        loadComponent: () =>
          import('./grammar-topics/grammar-topics.component').then((m) => m.GrammarTopicsComponent),
        title: 'Grammar Topics',
      },
      {
        path: 'api-tokens',
        loadComponent: () =>
          import('./api-tokens/api-tokens.component').then((m) => m.ApiTokensComponent),
        title: 'API Tokens',
      },
      {
        path: 'daily-sessions',
        loadComponent: () =>
          import('./daily-sessions/daily-sessions.component').then((m) => m.DailySessionsComponent),
        title: 'Daily Sessions',
      },
    ],
  },
  {
    path: 'sources/:sourceId/study',
    canActivate: [authGuard],
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
    canActivate: [authGuard],
    title: 'Sources',
  },
  {
    path: 'sources/:sourceId/page/:pageNumber',
    canActivate: [authGuard],
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
    path: 'sources/:sourceId/prompt',
    canActivate: [authGuard],
    title: (route) => `Prompt / ${route.params['sourceId']}`,
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
          import('./parser/prompt-page/prompt-page.component').then(
            (m) => m.PromptPageComponent
          ),
      },
    ],
  },
  {
    path: 'sources/:sourceId/cards',
    canActivate: [authGuard],
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
    canActivate: [authGuard],
    title: 'Edit Card',
  },
];
