import {
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  MAT_RIPPLE_GLOBAL_OPTIONS,
  RippleGlobalOptions,
} from '@angular/material/core';
import { provideAngularMaterialTheme } from '@mucsi96/angular-material-theme';
import { routes } from './app.routes';
import { AppTitleStrategy } from './utils/app-title.strategy';
import { errorInterceptor } from './utils/error.interceptor';
import { rateLimitRetryInterceptor } from './utils/rate-limit-retry.interceptor';
import { timezoneInterceptor } from './utils/timezone.interceptor';
import {
  EnvironmentConfig,
  ENVIRONMENT_CONFIG,
} from './environment/environment.config';

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

export function getAppConfig(environment: EnvironmentConfig): ApplicationConfig {
  return {
    providers: [
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideRouter(routes),
      { provide: TitleStrategy, useClass: AppTitleStrategy },
      provideHttpClient(
        withInterceptors([
          errorInterceptor,
          rateLimitRetryInterceptor,
          timezoneInterceptor,
        ])
      ),
      { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
      provideAngularMaterialTheme(),
      { provide: ENVIRONMENT_CONFIG, useValue: environment },
    ],
  };
}
