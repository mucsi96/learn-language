import { Injectable } from '@angular/core';

export interface AppConfig {
  apiContextPath: string;
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;

  async loadConfig(): Promise<void> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      this.config = await response.json();
    } catch (error) {
      console.error('Error loading application configuration:', error);
      // Fallback to default config for development
      this.config = {
        apiContextPath: '/api',
        tenantId: '',
        clientId: '',
        apiClientId: '',
        mockAuth: true,
      };
    }
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }
}
