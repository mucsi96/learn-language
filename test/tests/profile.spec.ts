import { test, expect } from '../fixtures';

test('title', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await expect(page.getByRole('link', { name: 'Learn language' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Learn language' })).toHaveAttribute('href', '/');
});

test('shows user initials in header', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await expect(page.getByRole('button', { name: 'TU' })).toBeVisible();
});

test('shows user name in popup', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await page.getByRole('button', { name: 'TU' }).click();
  await expect(page.getByText('Test User')).toBeVisible();
});

test('navigates to sources from popup', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await page.getByRole('button', { name: 'TU' }).click();
  await expect(page.getByRole('menuitem', { name: 'Create cards' })).toHaveAttribute('href', '/sources');
  await page.getByRole('menuitem', { name: 'Create cards' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sources' })).toBeVisible();
});
