import { bootstrapApplication } from '@angular/platform-browser';
import { getAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { AppConfig } from './app/app.tokens';

// Load configuration before bootstrapping
async function loadConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading application configuration:', error);
    // Fallback to default config for development
    return {
      apiContextPath: '/api',
      tenantId: '',
      clientId: '',
      apiClientId: '',
      mockAuth: true,
    };
  }
}

// Bootstrap the application after config is loaded
loadConfig().then(config => {
  bootstrapApplication(AppComponent, getAppConfig(config))
    .catch((err) => console.error(err));
});
