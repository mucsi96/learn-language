import { test, expect } from '../fixtures';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const screens = [
  ['home', '/', 'Welcome to Learn Language'],
  ['sources', '/sources', 'Sources'],
  ['review', '/in-review-cards', 'Cards'],
  ['voices', '/settings/voices', 'Voice'],
  ['data-models', '/settings/data-models', 'Models'],
  ['image-models', '/settings/image-models', 'Models'],
  ['groups', '/settings/source-groups', 'Source Groups'],
  ['partners', '/settings/learning-partners', 'Learning Partners'],
  ['grammar', '/settings/grammar-topics', 'Grammar Topics'],
  ['known', '/settings/known-words', 'Known Words'],
  ['tokens', '/settings/api-tokens', 'API Tokens'],
  ['sessions', '/settings/daily-sessions', 'Daily Sessions'],
  ['usage', '/model-usage', 'Model Usage'],
  ['cards', '/sources/goethe-a1/cards', 'Cards'],
  ['page', '/sources/goethe-a1/page/9', 'Seite 9'],
];

[{ width: 1440, height: 1000 }, { width: 390, height: 844 }].forEach(viewport => {
  test(`capture application states at ${viewport.width}px`, async ({ page, baseURL }, testInfo) => {
    test.setTimeout(120000);
    const oldRoot = process.env.VISUAL_BASELINE_ROOT;
    if (oldRoot) {
      await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== new URL(baseURL!).origin || ['/api/', '/oauth2/', '/_telemetry/'].some(prefix => url.pathname.startsWith(prefix))) {
          return route.fallback();
        }
        const file = resolve(oldRoot, `.${url.pathname}`);
        if (request.isNavigationRequest()) return route.fulfill({ path: resolve(oldRoot, 'index.html'), contentType: 'text/html' });
        if (existsSync(file)) return route.fulfill({ path: file });
        return route.fallback();
      });
    }
    await page.setViewportSize(viewport);
    await screens.reduce(async (previous, [name, url, title]) => {
      await previous;
      await page.goto(url);
      await expect(page.getByRole('main')).toBeVisible();
      if (name === 'cards') await expect(page.getByRole('grid')).toBeVisible();
      else if (name === 'page') await expect(page.getByText(title, { exact: true })).toBeVisible();
      else await expect(page.getByRole('heading', { name: new RegExp(title, 'i') }).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
      if (name === 'home') {
        await page.getByRole('button', { name: 'Profile menu' }).click();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('profile.png'), animations: 'disabled' });
      }
      if (name === 'sources') {
        await page.getByRole('button', { name: 'Add Source', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('source-dialog.png'), animations: 'disabled' });
      }
    }, Promise.resolve());
  });
});
