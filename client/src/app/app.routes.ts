import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';

export enum RouterTokens {
  HOME = '',
  SOURCES = 'sources',
}

export const routes: Routes = [
  {
    path: RouterTokens.HOME,
    redirectTo: RouterTokens.SOURCES,
    pathMatch: 'full',
  },
  {
    path: RouterTokens.SOURCES,
    component: PageComponent,
  },
];
