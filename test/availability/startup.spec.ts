import { test, expect } from '@playwright/test';

test('production bootstrap renders the application shell', async ({ page }) => {
  // Keep the rendered shell available for inspection when the auth guard redirects.
  await page.route('https://login.microsoftonline.com/**', route =>
    route.request().isNavigationRequest() ? route.abort() : route.continue());
  const environment = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/environment');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect((await environment).ok()).toBeTruthy();
  await expect(page.getByRole('link', { name: 'Learn language', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
