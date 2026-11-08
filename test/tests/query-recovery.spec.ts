import { test, expect } from '../fixtures';

[
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
].forEach(({ name, width, height }) => {
  test(`shows the completed overview on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route('**/api/sources', (route) => route.fulfill({ json: [] }));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to Learn Language' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No sources yet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add a source', exact: true })).toBeVisible();
  });
});

test('recovers from a failed source dialog query after retry', async ({ page }) => {
  await page.goto('/sources');
  await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
  await page.route('**/api/learning-partners', (route) =>
    route.fulfill({ status: 400, body: 'Unavailable' })
  );
  await page.getByRole('button', { name: 'Add Source' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toBeVisible();
  await page.unroute('**/api/learning-partners');
  await dialog.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});
