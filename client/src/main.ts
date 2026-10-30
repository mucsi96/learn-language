import { bootstrapApplication } from '@angular/platform-browser';
import { getAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { EnvironmentConfig } from './app/environment/environment.config';
import { initFaro } from './app/utils/faro';

loadEnvironmentConfig().then(environment => {
  initFaro(environment.clientLogUrl, environment.clientAppName);
  const url = new URL(window.location.href);
  console.info(
    '[boot] Faro initialized, starting Angular bootstrap',
    JSON.stringify({
      returnedFromAuthority:
        url.searchParams.has('code') || url.searchParams.has('error'),
      displayMode:
        window.matchMedia?.('(display-mode: standalone)').matches
          ? 'standalone'
          : 'browser',
      visibilityState: document.visibilityState,
    })
  );
  return bootstrapApplication(AppComponent, getAppConfig(environment));
}).catch(error => {
  console.error('[boot] Application startup failed', error);
  const heading = document.createElement('h1');
  heading.textContent = 'Learn language could not start';
  const message = document.createElement('p');
  message.textContent = 'Please try again. If the problem continues, contact support.';
  const retry = document.createElement('button');
  retry.textContent = 'Try again';
  retry.addEventListener('click', () => window.location.reload());
  const alert = document.createElement('main');
  alert.setAttribute('role', 'alert');
  alert.append(heading, message, retry);
  document.body.replaceChildren(alert);
});

async function loadEnvironmentConfig(): Promise<EnvironmentConfig> {
  const response = await fetch('/api/environment', { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  return await response.json();
}
