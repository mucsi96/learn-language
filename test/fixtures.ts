import { test as base, TestInfo } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cleanupDbRecords, cleanupStorage, populateStorage, setupTestRateLimits } from './utils';

export const test = base.extend<{ triggerCleanup: () => Promise<void>; apiHeaders: Record<string, string> }>({
  apiHeaders: async ({ request, baseURL }, use) => {
    const issuer = 'http://localhost:8079/default';
    const redirect = 'http://localhost/test';
    const authorization = await request.get(`${issuer}/authorize`, {
      params: { client_id: 'test-client', redirect_uri: redirect, response_type: 'code' },
      maxRedirects: 0,
    });
    const code = new URL(authorization.headers()['location']).searchParams.get('code')!;
    const tokens = await request.post(`${issuer}/token`, {
      form: { grant_type: 'authorization_code', client_id: 'test-client', redirect_uri: redirect, code },
    });
    if (!tokens.ok()) throw new Error(`Mock token request failed: ${tokens.status()}`);
    await use({ Authorization: `Bearer ${(await tokens.json()).access_token}`, Origin: new URL(baseURL!).origin });
  },
  triggerCleanup: async ({ baseURL }, use) => {
    await use(async () => {
      const response = await fetch(`${baseURL}/api/test/cleanup-storage`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Cleanup trigger failed: ${response.status}`);
      }
    });
  },
  page: async ({ page, apiHeaders }, use, testInfo: TestInfo) => {
    await cleanupDbRecords();
    cleanupStorage();
    populateStorage();
    await setupTestRateLimits(100, 100);

    // Stand in for gateway identity; the backend still validates real mock JWTs.
    await page.context().route('**/api/**', route => route.continue({
      headers: { ...route.request().headers(), authorization: apiHeaders.Authorization },
    }));
    await page.context().route('**/oauth2/userinfo', route => route.fulfill({
      json: { email: 'test-user@example.com', additionalClaims: { name: 'Test User' } },
    }));
    await page.context().route('**/_telemetry/collect', route => route.fulfill({ status: 202, body: 'ok' }));

    // Wait for db and storage to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reset mock AI servers
    try {
      await Promise.all([
        fetch(`${process.env.OPENAI_MOCK_URL ?? 'http://localhost:3070'}/reset`, {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        }),
        fetch('http://localhost:3071/reset', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        }),
        fetch('http://localhost:3073/reset', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        }),
        fetch('http://localhost:3072/reset', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        }),
        fetch('http://localhost:3074/reset', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        }),
      ]);
    } catch (error) {
      console.warn('Warning: Could not reset mock AI servers:', error);
    }

    // Capture browser console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      const timestamp = new Date().toISOString();
      consoleLogs.push(
        `[${timestamp}] [${type.toUpperCase()}] ${text} (${location.url}:${location.lineNumber})`
      );
    });

    page.on('pageerror', (error) => {
      const timestamp = new Date().toISOString();
      consoleLogs.push(`[${timestamp}] [PAGE_ERROR] ${error.message}\n${error.stack}`);
    });

    // Now expose the page to tests
    await use(page);

    // Save console logs on test failure
    if (testInfo.status !== testInfo.expectedStatus && consoleLogs.length > 0) {
      const outputDir = testInfo.outputDir;
      mkdirSync(outputDir, { recursive: true });
      const logPath = join(outputDir, 'console-logs.txt');
      writeFileSync(logPath, consoleLogs.join('\n'));
      testInfo.attachments.push({
        name: 'console-logs',
        path: logPath,
        contentType: 'text/plain',
      });
    }
  },
});

export { expect } from '@playwright/test';
