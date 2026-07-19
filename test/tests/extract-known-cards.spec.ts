import * as fs from 'fs';
import { test, expect } from '../fixtures';
import { createCard, createKnownWords } from '../utils';

async function readDownloadedWords(downloadPath: string): Promise<string[]> {
  const content = fs.readFileSync(downloadPath, 'utf-8');
  return content.length === 0 ? [] : content.split('\n');
}

test('shows extract known cards button on known words page', async ({ page }) => {
  await page.goto('/settings/known-words');
  await expect(
    page.getByRole('button', { name: 'Extract known cards' })
  ).toBeVisible();
});

test('opens source picker dialog when extracting', async ({ page }) => {
  await page.goto('/settings/known-words');
  await page.getByRole('button', { name: 'Extract known cards' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Extract Known Cards' })
  ).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Sources' })).toBeVisible();
});

test('export is disabled until a source is selected', async ({ page }) => {
  await page.goto('/settings/known-words');
  await page.getByRole('button', { name: 'Extract known cards' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Export' })).toBeDisabled();

  await dialog.getByRole('combobox', { name: 'Sources' }).click();
  await page.getByRole('option', { name: 'Goethe A1' }).click();
  await page.keyboard.press('Escape');

  await expect(dialog.getByRole('button', { name: 'Export' })).toBeEnabled();
});

test('downloads normal form words from selected sources and known words', async ({ page }) => {
  await createCard({
    cardId: 'goethe-a1_haus',
    sourceId: 'goethe-a1',
    data: { word: 'Haus', type: 'NOUN', translation: {}, forms: [], examples: [] },
  });
  await createCard({
    cardId: 'goethe-a1_baum',
    sourceId: 'goethe-a1',
    data: { word: 'Baum', type: 'NOUN', translation: {}, forms: [], examples: [] },
  });
  await createCard({
    cardId: 'goethe-a2_zebra',
    sourceId: 'goethe-a2',
    data: { word: 'Zebra', type: 'NOUN', translation: {}, forms: [], examples: [] },
  });
  await createKnownWords([
    { word: 'apfel', hungarianTranslation: 'alma' },
    { word: 'wasser', hungarianTranslation: 'víz' },
  ]);

  await page.goto('/settings/known-words');
  await page.getByRole('button', { name: 'Extract known cards' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Sources' }).click();
  await page.getByRole('option', { name: 'Goethe A1' }).click();
  await page.keyboard.press('Escape');

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('known-cards.txt');

  const words = await readDownloadedWords(await download.path());
  expect(words).toEqual(['apfel', 'baum', 'haus', 'wasser']);
});

test('deduplicates card words that are already known', async ({ page }) => {
  await createCard({
    cardId: 'goethe-a1_haus',
    sourceId: 'goethe-a1',
    data: { word: 'Haus', type: 'NOUN', translation: {}, forms: [], examples: [] },
  });
  await createKnownWords([{ word: 'haus', hungarianTranslation: 'ház' }]);

  await page.goto('/settings/known-words');
  await page.getByRole('button', { name: 'Extract known cards' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Sources' }).click();
  await page.getByRole('option', { name: 'Goethe A1' }).click();
  await page.keyboard.press('Escape');

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;

  const words = await readDownloadedWords(await download.path());
  expect(words).toEqual(['haus']);
});
