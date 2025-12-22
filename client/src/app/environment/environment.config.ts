import { InjectionToken } from '@angular/core';

export interface ChatModelInfo {
  modelName: string;
  primary: boolean;
}

export interface EnvironmentConfig {
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
  chatModels: ChatModelInfo[];
  imageModels: string[];
}

export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('ENVIRONMENT_CONFIG');
