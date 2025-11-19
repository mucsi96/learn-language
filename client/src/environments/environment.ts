import { inject } from '@angular/core';
import { ConfigService } from '../app/services/config.service';

// Simple getter that retrieves config from ConfigService
// This will work after APP_INITIALIZER completes
export const environment = {
  get production() {
    return true;
  },
  get apiContextPath() {
    return inject(ConfigService).getConfig().apiContextPath;
  },
  get tenantId() {
    return inject(ConfigService).getConfig().tenantId;
  },
  get clientId() {
    return inject(ConfigService).getConfig().clientId;
  },
  get apiClientId() {
    return inject(ConfigService).getConfig().apiClientId;
  },
  get mockAuth() {
    return inject(ConfigService).getConfig().mockAuth;
  },
};
