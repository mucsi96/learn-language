import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  MAT_RIPPLE_GLOBAL_OPTIONS,
  RippleGlobalOptions,
} from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalGuardConfiguration,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService,
} from '@azure/msal-angular';
import {
  BrowserCacheLocation,
  InteractionType,
  LogLevel,
  PublicClientApplication,
} from '@azure/msal-browser';
import { routes } from './app.routes';

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig },
    provideAnimationsAsync(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_INSTANCE,
      useValue: new PublicClientApplication({
        auth: {
          clientId: '9e8c4eca-7589-4f2b-a89c-76f67eb107b8',
          authority:
            'https://login.microsoftonline.com/c31b7767-aa6c-49a0-8292-b16aa2336434',
          redirectUri: '/',
          postLogoutRedirectUri: '/',
        },
        cache: {
          cacheLocation: BrowserCacheLocation.LocalStorage,
        },
        system: {
          allowNativeBroker: false, // Disables WAM Broker
          loggerOptions: {
            loggerCallback: (_logLevel: LogLevel, message: string) =>
              console.log(message),
            logLevel: LogLevel.Info,
            piiLoggingEnabled: false,
          },
        },
      }),
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        authRequest: () => ({
          scopes: ['openid', 'profile'],
        }),
      } satisfies MsalGuardConfiguration,
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        protectedResourceMap: new Map([
          [
            'https://ibari.blob.core.windows.net/*',
            ['https://ibari.blob.core.windows.net/.default'],
          ],
        ]),
      } satisfies MsalInterceptorConfiguration,
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ],
};
