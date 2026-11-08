import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Alert, Button, NotificationsProvider } from '@mucsi96/react-ui';
import { ErrorBoundary } from 'react-error-boundary';
import { initializeFaro } from '@grafana/faro-web-sdk';
import '@mucsi96/react-ui/styles.css';
import '@mucsi96/react-ui/typography.css';
import './styles.css';
import { App } from './App';

initializeFaro({
  url: new URL('/_telemetry/collect', window.location.origin).href,
  app: { name: 'learn-language-client', version: '1.0.0' },
  consoleInstrumentation: { disabledLevels: [] },
});
[localStorage, sessionStorage].forEach((storage) =>
  Object.keys(storage)
    .filter((key) => key.startsWith('oidc.'))
    .forEach((key) => storage.removeItem(key))
);
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
});
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary
      onError={(error) => console.error(error)}
      fallback={
        <Alert tone="error" title="Unable to open this page">
          <p>Please reload to try again.</p>
          <Button onPress={() => window.location.reload()}>Reload</Button>
        </Alert>
      }
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
