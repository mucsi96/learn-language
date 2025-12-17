import { InjectionToken } from '@angular/core';

export interface EnvironmentConfig {
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
  chatModels: string[];
  primaryChatModel: string;
  imageModels: string[];
}

export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('ENVIRONMENT_CONFIG');
