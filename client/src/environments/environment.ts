export interface AppConfig {
  apiContextPath: string;
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
}

declare global {
  interface Window {
    __appConfig: AppConfig;
  }
}

export const environment = {
  production: true,
  get apiContextPath() { return window.__appConfig.apiContextPath; },
  get tenantId() { return window.__appConfig.tenantId; },
  get clientId() { return window.__appConfig.clientId; },
  get apiClientId() { return window.__appConfig.apiClientId; },
  get mockAuth() { return window.__appConfig.mockAuth; },
};
