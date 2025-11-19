import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  MAT_RIPPLE_GLOBAL_OPTIONS,
  RippleGlobalOptions,
} from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { errorInterceptor } from './utils/error.interceptor';
import { provideMsalConfig } from './msal.config';
import { EnvironmentConfig, ENVIRONMENT_CONFIG } from './app.tokens';

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

export function getAppConfig(config: EnvironmentConfig): ApplicationConfig {
  const providers = [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([errorInterceptor])
    ),
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
    provideAnimationsAsync(),
    { provide: ENVIRONMENT_CONFIG, useValue: config },
  ];

  // Conditionally add MSAL providers before DI initialization
  if (!config.mockAuth) {
    providers.push(...provideMsalConfig());
  }

  return { providers };
}
