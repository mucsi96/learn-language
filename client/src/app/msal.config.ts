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
import { environment } from '../environments/environment';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

const apiScopes = [
  `${environment.apiClientId}/readDecks`,
  `${environment.apiClientId}/createDeck`,
];

export const msalConfig = [
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
      interactionType: InteractionType.Popup,
      authRequest: () => ({
        scopes: ['user.read', ...apiScopes],
      }),
    } satisfies MsalGuardConfiguration,
  },
  {
    provide: MSAL_INTERCEPTOR_CONFIG,
    useValue: {
      interactionType: InteractionType.Popup,
      protectedResourceMap: new Map([
        ['https://graph.microsoft.com/v1.0/me', ['user.read']],
        [
          `${
            new URL(environment.apiContextPath, window.location.origin).href
          }/*`,
          apiScopes,
        ],
      ]),
    } satisfies MsalInterceptorConfiguration,
  },
  {
    provide: HTTP_INTERCEPTORS,
    useClass: MsalInterceptor,
    multi: true,
  },
  MsalService,
  MsalGuard,
  MsalBroadcastService,
];
