import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiContextPath: string;
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
