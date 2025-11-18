import { inject } from '@angular/core';
import { ConfigService } from '../app/services/config.service';

function getEnvironment() {
  // This will be called after APP_INITIALIZER completes
  try {
    const configService = inject(ConfigService);
    const config = configService.getConfig();
    return {
      production: true,
      ...config,
    };
  } catch (error) {
    // Fallback configuration for development
    console.warn('Using fallback environment configuration');
    return {
      production: true,
      apiContextPath: '/api',
      tenantId: '',
      clientId: '',
      apiClientId: '',
      mockAuth: true,
    };
  }
}

// Export a getter function that will be called when environment is accessed
export const environment = new Proxy({} as any, {
  get(target, prop) {
    if (!target._initialized) {
      target._initialized = true;
      Object.assign(target, getEnvironment());
    }
    return target[prop];
  }
});
