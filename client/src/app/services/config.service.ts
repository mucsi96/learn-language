import { Injectable } from '@angular/core';

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
  private config: AppConfig | null = null;

  async loadConfig(): Promise<void> {
    const response = await fetch('/api/config');

    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }

    this.config = await response.json();
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    return this.config;
  }
}
