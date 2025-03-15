export const environment = {
  mockAuth: false,
  production: false,
  apiContextPath: '/api',
  clientId: import.meta.env.NG_APP_CLIENT_ID,
  tenantId: import.meta.env.NG_APP_TENANT_ID,
  apiClientId: import.meta.env.NG_APP_API_CLIENT_ID,
};

console.log('Environment:', environment);
