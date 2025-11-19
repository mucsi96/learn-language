import { Inject, Injectable } from '@angular/core';

export interface AppConfig {
  apiContextPath: string;
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  constructor(@Inject('APP_CONFIG') private config: AppConfig) {}

  getConfig(): AppConfig {
    return this.config;
  }
}
