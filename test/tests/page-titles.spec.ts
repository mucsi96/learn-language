import { test, expect } from '../fixtures';
import { navigateToCardCreation } from '../utils';

test('home page title', async ({ page }) => {
  await page.goto('http://localhost:8180/');
  await expect(page).toHaveTitle('');
});

test('sources page title', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await expect(page).toHaveTitle('Sources');
});

test('source page title', async ({ page }) => {
  await page.goto('http://localhost:8180/sources/goethe-a1/page/9');
  await expect(page).toHaveTitle('9 / goethe-a1');
});

test('card page title', async ({ page }) => {
  await navigateToCardCreation(page);
  await expect(page).toHaveTitle('abfahren');
});
