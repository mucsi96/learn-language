import { bootstrapApplication } from '@angular/platform-browser';
import { getAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { EnvironmentConfig } from './app/environment/environment.config';

// Load configuration before bootstrapping
async function loadConfig(): Promise<EnvironmentConfig> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  return await response.json();
}

// Bootstrap the application after config is loaded
loadConfig().then(config => {
  bootstrapApplication(AppComponent, getAppConfig(config))
    .catch((err) => console.error(err));
});
