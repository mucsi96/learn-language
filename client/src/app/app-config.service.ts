import { AppConfig } from '../environments/environment';

export async function loadAppConfig(): Promise<void> {
  try {
    const response = await fetch('/app-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load app-config.json: ${response.status}`);
    }
    const config: AppConfig = await response.json();
    window.__appConfig = config;
  } catch (error) {
    console.error('Failed to load application configuration:', error);
    // Provide fallback configuration
    window.__appConfig = {
      apiContextPath: '/api',
      tenantId: '',
      clientId: '',
      apiClientId: '',
      mockAuth: true,
    };
  }
}
