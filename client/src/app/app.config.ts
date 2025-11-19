import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
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
import { ConfigService } from './services/config.service';

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([errorInterceptor])
    ),
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
    provideAnimationsAsync(),
    provideAppInitializer(async () => {
      const configService = inject(ConfigService);
      await configService.loadConfig();
      // After config is loaded, conditionally add MSAL providers if needed
      if (!configService.getConfig().mockAuth) {
        appConfig.providers.push(...provideMsalConfig());
      }
    }),
  ],
};
