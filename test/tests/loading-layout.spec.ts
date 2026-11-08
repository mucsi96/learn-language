import { test, expect } from '../fixtures';

[
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
].forEach(({ name, width, height }) => {
  test(`centers the overview loader in the available page on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const response = Promise.withResolvers<void>();
    await page.route('**/api/sources', async (route) => {
      await response.promise;
      await route.fulfill({ json: [] });
    });
    await page.goto('/');
    const loader = page.getByRole('progressbar', { name: 'Loading study overview' });
    try {
      await expect(loader).toBeVisible();
      const main = await page.getByRole('main').evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + parseFloat(style.paddingTop)
            + (bounds.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / 2,
        };
      });
      const bounds = await loader.boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.x + bounds!.width / 2 - main.x)).toBeLessThan(2);
      expect(Math.abs(bounds!.y + bounds!.height / 2 - main.y)).toBeLessThan(2);
      expect(bounds!.y).toBeGreaterThan(height / 3);
    } finally {
      response.resolve();
    }
    await expect(page.getByRole('heading', { name: 'Welcome to Learn Language' })).toBeVisible();
    await expect(loader).toHaveCount(0);
  });
});

test('centers a dialog loader within its section and recovers from a failed query', async ({ page }) => {
  await page.goto('/sources');
  await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
  const response = Promise.withResolvers<void>();
  await page.route('**/api/learning-partners', async (route) => {
    await response.promise;
    await route.fulfill({ status: 400, body: 'Unavailable' });
  });
  await page.getByRole('button', { name: 'Add Source' }).click();
  const dialog = page.getByRole('dialog');
  const loader = dialog.getByRole('progressbar', { name: 'Loading learning partners' });
  try {
    await expect(loader).toBeVisible();
    const placement = await loader.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const area = element.parentElement!.getBoundingClientRect();
      return {
        x: Math.abs(bounds.x + bounds.width / 2 - area.x - area.width / 2),
        y: Math.abs(bounds.y + bounds.height / 2 - area.y - area.height / 2),
        height: area.height,
      };
    });
    expect(placement.x).toBeLessThan(2);
    expect(placement.y).toBeLessThan(2);
    expect(placement.height).toBeGreaterThanOrEqual(128);
  } finally {
    response.resolve();
  }
  await expect(dialog.getByRole('alert')).toBeVisible();
  await page.unroute('**/api/learning-partners');
  await dialog.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await expect(loader).toHaveCount(0);
});
