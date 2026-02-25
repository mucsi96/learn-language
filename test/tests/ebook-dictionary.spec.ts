import * as fs from 'fs';
import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import {
  getHighlights,
  getSource,
  setupDefaultChatModelSettings,
} from '../utils';

const API_URL = 'http://localhost:8180/api/dictionary';

async function createTokenViaUI(page: Page, name: string): Promise<string> {
  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByLabel('Token name').fill(name);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();

  const download = await downloadPromise;
  const filePath = await download.path();
  return fs.readFileSync(filePath!, 'utf-8');
}

async function lookupWord(
  token: string,
  bookTitle: string,
  highlightedWord: string,
  sentence: string
): Promise<Response> {
  return await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle,
      author: 'Test Author',
      targetLanguage: 'hu',
      sentence,
      highlightedWord,
    }),
  });
}

test('dictionary lookup creates ebook dictionary source automatically', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  const response = await lookupWord(
    token,
    'Mein erstes Buch',
    'fahren',
    'Wir fahren um zwölf Uhr ab.'
  );

  expect(response.status).toBe(200);

  const source = await getSource('mein-erstes-buch');
  expect(source).not.toBeNull();
  expect(source!.name).toBe('Mein erstes Buch');
  expect(source!.sourceType).toBe('EBOOK_DICTIONARY');
  expect(source!.cardType).toBe('VOCABULARY');
});

test('dictionary lookup persists highlight in database', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(
    token,
    'Mein erstes Buch',
    'fahren',
    'Wir fahren um zwölf Uhr ab.'
  );

  const highlights = await getHighlights('mein-erstes-buch');
  expect(highlights).toHaveLength(1);
  expect(highlights[0].highlightedWord).toBe('fahren');
  expect(highlights[0].sentence).toBe('Wir fahren um zwölf Uhr ab.');
});

test('dictionary lookup does not duplicate highlights', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(
    token,
    'Mein erstes Buch',
    'fahren',
    'Wir fahren um zwölf Uhr ab.'
  );
  await lookupWord(
    token,
    'Mein erstes Buch',
    'fahren',
    'Wir fahren um zwölf Uhr ab.'
  );

  const highlights = await getHighlights('mein-erstes-buch');
  expect(highlights).toHaveLength(1);
});

test('dictionary lookup does not duplicate source', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(
    token,
    'Mein erstes Buch',
    'fahren',
    'Wir fahren um zwölf Uhr ab.'
  );
  await lookupWord(
    token,
    'Mein erstes Buch',
    'Haus',
    'Das Haus ist groß.'
  );

  const source = await getSource('mein-erstes-buch');
  expect(source).not.toBeNull();

  const highlights = await getHighlights('mein-erstes-buch');
  expect(highlights).toHaveLength(2);
});

test('admin page shows Draft Cards button for ebook dictionary source', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'test', 'This is a test.');

  await page.goto('http://localhost:8180/sources');

  await page.getByRole('article', { name: 'Test Ebook' }).click();
  await expect(page.getByRole('button', { name: 'Draft Cards' })).toBeVisible();
});

test('admin page navigates to cards page with draft filter for ebook dictionary source', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'test', 'This is a test.');

  await page.goto('http://localhost:8180/sources');

  await page.getByRole('article', { name: 'Test Ebook' }).click();
  await page.getByRole('button', { name: 'Draft Cards' }).click();

  await expect(page).toHaveURL(/\/sources\/test-ebook\/cards\?draft=true/);
});

test('dictionary lookup persists candidate card ID in highlight', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(
    token,
    'Mein erstes Buch',
    'fahren',
    'Wir fahren um zwölf Uhr ab.'
  );

  const highlights = await getHighlights('mein-erstes-buch');
  expect(highlights).toHaveLength(1);
  expect(highlights[0].candidateCardId).toBe('abfahren-elindulni');
});

