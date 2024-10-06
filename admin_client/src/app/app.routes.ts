import { Routes } from '@angular/router';
import { ImportsComponent } from './imports/imports.component';

export enum RouterTokens {
  HOME = '',
  IMPORTS = 'imports',
}

export const routes: Routes = [
  {
    path: RouterTokens.HOME,
    redirectTo: RouterTokens.IMPORTS,
    pathMatch: 'full',
  },
  {
    path: RouterTokens.IMPORTS,
    component: ImportsComponent,
  },
];
