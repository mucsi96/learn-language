import { Routes } from '@angular/router';
import { PageComponent } from './parser/page/page.component';
import { HomeComponent } from './home/home.component';

export enum RouterTokens {
  HOME = '',
  SOURCES = 'sources',
}

export const routes: Routes = [
  {
    path: RouterTokens.HOME,
    pathMatch: 'full',
    component: HomeComponent
  },
  {
    path: `${RouterTokens.SOURCES}/:sourceName/page/:pageNumber`,
    component: PageComponent,
  },
];
