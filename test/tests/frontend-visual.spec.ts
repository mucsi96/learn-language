import { test, expect } from '../fixtures';
import { cleanupDbRecords, createCard } from '../utils';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
];

viewports.forEach(viewport => {
  test.describe(viewport.name, () => {
    test.use({ viewport, reducedMotion: 'reduce' });

    test('study overview with due cards and profile menu', async ({ page }) => {
      await createCard({ cardId: 'visual-word', sourceId: 'goethe-a1', sourcePageNumber: 9,
        data: { word: 'Haus', type: 'NOUN', gender: 'NEUTER', translation: { en: 'house', hu: 'ház' } } });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Welcome to Learn Language' })).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-overview.png`, { animations: 'disabled' });
      await page.getByRole('button', { name: 'Profile menu' }).click();
      await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-profile-menu.png`, { animations: 'disabled' });
    });

    test('sources populated and filtered empty states', async ({ page }) => {
      await page.goto('/sources');
      await expect(page.getByRole('row', { name: 'Goethe A1' })).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-sources.png`, { animations: 'disabled' });
      await page.getByRole('switch', { name: 'Needs attention only' }).press('Space');
      await expect(page.getByText('No sources need attention.')).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-sources-filtered-empty.png`, { animations: 'disabled' });
    });

    test('source creation dialog', async ({ page }) => {
      await page.goto('/sources');
      await page.getByRole('button', { name: 'Add Source' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-source-dialog.png`, { animations: 'disabled' });
    });

    test('empty overview', async ({ page }) => {
      await cleanupDbRecords({ withSources: true });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Welcome to Learn Language' })).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-overview-empty.png`, { animations: 'disabled' });
    });

    test('settings navigation and known words empty state', async ({ page }) => {
      await page.goto('/settings/known-words');
      await expect(page.getByText('No known words yet', { exact: true })).toBeVisible();
      await expect(page).toHaveScreenshot(`${viewport.name}-settings-empty.png`, { animations: 'disabled' });
    });

    test('overview error can be retried', async ({ page }) => {
      await page.route('**/api/sources', route => route.fulfill({ status: 503, json: { detail: 'Sources temporarily unavailable' } }));
      await page.goto('/');
      await expect(page.getByRole('alert')).toContainText('Sources temporarily unavailable');
      await expect(page).toHaveScreenshot(`${viewport.name}-overview-error.png`, { animations: 'disabled' });
      await page.unroute('**/api/sources');
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Welcome to Learn Language' })).toBeVisible();
    });

    test('overview skeleton while the API is held', async ({ page }) => {
      const requested = Promise.withResolvers<void>();
      const released = Promise.withResolvers<void>();
      await page.route('**/api/sources', async route => {
        requested.resolve();
        await released.promise;
        await route.fallback();
      });
      await page.goto('/');
      await requested.promise;
      await expect(page.getByRole('button', { name: 'Profile menu' })).toHaveText('TU');
      try {
        await expect(page).toHaveScreenshot(`${viewport.name}-overview-skeleton.png`, { animations: 'disabled' });
      } finally {
        released.resolve();
      }
      await expect(page.getByRole('heading', { name: 'Welcome to Learn Language' })).toBeVisible();
    });
  });
});
