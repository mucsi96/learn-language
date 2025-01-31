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
import { environment } from '../environments/environment.development';
import { errorInterceptor } from './utils/error.interceptor';

const globalRippleConfig: RippleGlobalOptions = {
  disabled: true,
};

const apiScopes = [
  `${environment.apiClientId}/readDecks`,
  `${environment.apiClientId}/createDeck`,
];

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
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_INSTANCE,
      useValue: new PublicClientApplication({
        auth: {
          clientId: environment.clientId,
          authority: `https://login.microsoftonline.com/${environment.tenantId}`,
          redirectUri: '/auth',
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
          scopes: ['user.read', ...apiScopes],
        }),
      } satisfies MsalGuardConfiguration,
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        protectedResourceMap: new Map([
          ['https://graph.microsoft.com/v1.0/me', ['user.read']],
          [`${environment.apiBaseUrl}/*`, apiScopes],
        ]),
      } satisfies MsalInterceptorConfiguration,
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ],
};
