import { bootstrapApplication } from '@angular/platform-browser';
import { getAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { EnvironmentConfig } from './app/environment/environment.config';
import { initFaro } from './app/utils/faro';

initFaro(new URL('/_telemetry/collect', window.location.origin).href, 'learn-language-client');

Object.keys(localStorage).filter(key => key.startsWith('oidc.')).forEach(key => localStorage.removeItem(key));
Object.keys(sessionStorage).filter(key => key.startsWith('oidc.')).forEach(key => sessionStorage.removeItem(key));

loadEnvironmentConfig().then(environment => {
  console.info(
    '[boot] Faro initialized, starting Angular bootstrap',
    JSON.stringify({
      displayMode:
        window.matchMedia?.('(display-mode: standalone)').matches
          ? 'standalone'
          : 'browser',
      visibilityState: document.visibilityState,
    })
  );
  bootstrapApplication(AppComponent, getAppConfig(environment))
    .catch((err) => console.error('[boot] Angular bootstrap failed', err));
}).catch(error => console.error('[boot] Configuration failed', error));

async function loadEnvironmentConfig(): Promise<EnvironmentConfig> {
  const response = await fetch('/api/environment');
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  return await response.json();
}
