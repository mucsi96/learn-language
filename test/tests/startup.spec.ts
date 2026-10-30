import { test, expect } from '@playwright/test';

[
  { name: 'invalid JSON', body: 'not json' },
  { name: 'null configuration', body: 'null' },
].forEach(({ name, body }) => {
  test(`${name} shows a startup error instead of a blank page`, async ({ page }) => {
    await page.route('**/api/environment', route => route.fulfill({ status: 200, body }));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Learn language could not start');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});

test('failed bootstrap shows a retry action and retry requests configuration again', async ({ page }) => {
  await page.route('**/api/environment', route => route.fulfill({ status: 500, body: '{}' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Learn language could not start');
  const retryRequest = page.waitForRequest('**/api/environment');
  await page.getByRole('button', { name: 'Try again' }).click();
  await retryRequest;
  await expect(page.getByRole('alert')).toContainText('Learn language could not start');
});
