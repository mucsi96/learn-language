import { test, expect } from '../fixtures';
import { join } from 'node:path';

const sourceTypes = [
  { code: 'pdf', label: 'PDF Document' },
  { code: 'images', label: 'Image Collection' },
  { code: 'ebookDictionary', label: 'Ebook Dictionary' },
  { code: 'json', label: 'JSON' },
  { code: 'wordTriage', label: 'Word Triage' },
  { code: 'audioCollection', label: 'Audio Collection' },
] as const;

[{ width: 1280, height: 1000 }, { width: 390, height: 844 }].forEach(viewport => {
  sourceTypes.forEach(sourceType => {
    test(`${sourceType.label} introduction is available in create and edit at ${viewport.width}px`, async ({ page, request, apiHeaders }) => {
      await page.setViewportSize(viewport);
      await page.goto('/sources');
      await page.getByRole('button', { name: 'Add Source' }).click();
      await page.getByRole('combobox', { name: 'Source Type', exact: true }).click();
      await page.getByRole('option', { name: sourceType.label, exact: true }).click();
      const settings = page.getByRole('region', { name: 'Study Settings', exact: true });
      const introduction = settings.getByRole('combobox', { name: 'New card introduction' });
      await introduction.scrollIntoViewIfNeeded();
      await expect(introduction).toBeInViewport({ ratio: 1 });
      await expect(introduction).toHaveText('Start studying immediately');
      await introduction.click();
      await expect(page.getByRole('option', { name: 'Preview new cards in a table' })).toBeInViewport({ ratio: 1 });
      if (process.env.SCREENSHOT_DIR && sourceType.code === 'pdf' && viewport.width === 1280) {
        await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'create-source-introduction.png'), animations: 'disabled' });
      }
      await page.getByRole('option', { name: 'Preview new cards in a table' }).click();
      await expect(introduction).toHaveText('Preview new cards in a table');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();

      const created = await request.post('/api/source', {
        headers: apiHeaders,
        data: {
          id: 'introduction-settings', name: 'Introduction settings', sourceType: sourceType.code,
          cardTypes: ['vocabulary'], languageLevel: 'A1', formatType: 'flowingText',
          newCardIntroduction: 'TABLE',
          ...(sourceType.code === 'audioCollection' ? { collectionPath: 'introduction-settings/' } : {}),
        },
      });
      expect(created.ok()).toBe(true);
      await page.reload();
      await page.getByRole('button', { name: 'Actions for Introduction settings' }).click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      await introduction.scrollIntoViewIfNeeded();
      await expect(introduction).toBeInViewport({ ratio: 1 });
      await expect(introduction).toHaveText('Preview new cards in a table');
      if (process.env.SCREENSHOT_DIR && sourceType.code === 'pdf') {
        await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `edit-source-introduction-${viewport.width}.png`), animations: 'disabled' });
      }
      await introduction.click();
      await page.getByRole('option', { name: 'Start studying immediately' }).click();
      const saved = page.waitForResponse(response => response.url().endsWith('/api/source/introduction-settings') && response.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Update', exact: true }).click();
      expect((await saved).ok()).toBe(true);
      await page.reload();
      await page.getByRole('button', { name: 'Actions for Introduction settings' }).click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      await expect(introduction).toHaveText('Start studying immediately');
    });
  });
});

test('new source saves the introduction selected in its creation dialog', async ({ page }) => {
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source' }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Preview on creation');
  await page.getByRole('combobox', { name: 'Source Type', exact: true }).click();
  await page.getByRole('option', { name: 'JSON', exact: true }).click();
  await page.getByRole('combobox', { name: 'Card Types', exact: true }).click();
  await page.getByRole('option', { name: 'Vocabulary', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Language Level', exact: true }).click();
  await page.getByRole('option', { name: /A1/ }).click();
  await page.getByRole('combobox', { name: 'New card introduction' }).click();
  await page.getByRole('option', { name: 'Preview new cards in a table' }).click();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/source') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Actions for Preview on creation' }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'New card introduction' })).toHaveText('Preview new cards in a table');
});
