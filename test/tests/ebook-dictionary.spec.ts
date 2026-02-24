import * as fs from 'fs';
import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import {
  createSource,
  createHighlight,
  getHighlights,
  getGridData,
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

test('highlights page shows highlights for ebook dictionary source', async ({
  page,
}) => {
  await createSource({
    id: 'test-ebook',
    name: 'Test Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });
  await createHighlight({
    sourceId: 'test-ebook',
    highlightedWord: 'fahren',
    sentence: 'Wir fahren um zwölf Uhr ab.',
  });
  await createHighlight({
    sourceId: 'test-ebook',
    highlightedWord: 'Haus',
    sentence: 'Das Haus ist groß.',
  });

  await page.goto('http://localhost:8180/sources/test-ebook/highlights');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{ Word: string; Sentence: string }>(grid);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Word: 'fahren', Sentence: 'Wir fahren um zwölf Uhr ab.' }),
        expect.objectContaining({ Word: 'Haus', Sentence: 'Das Haus ist groß.' }),
      ])
    );
  }).toPass();
});

test('admin page shows Highlights button for ebook dictionary source', async ({
  page,
}) => {
  await createSource({
    id: 'test-ebook',
    name: 'Test Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });

  await page.goto('http://localhost:8180/sources');

  await page.getByRole('article', { name: 'Test Ebook' }).click();
  await expect(page.getByRole('button', { name: 'Highlights' })).toBeVisible();
});

test('admin page navigates to highlights page for ebook dictionary source', async ({
  page,
}) => {
  await createSource({
    id: 'test-ebook',
    name: 'Test Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });

  await page.goto('http://localhost:8180/sources');

  await page.getByRole('article', { name: 'Test Ebook' }).click();
  await page.getByRole('button', { name: 'Highlights' }).click();

  await expect(page).toHaveURL(/\/sources\/test-ebook\/highlights/);
});

test('highlights page select all checkbox selects all highlights', async ({
  page,
}) => {
  await createSource({
    id: 'test-ebook',
    name: 'Test Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });
  await createHighlight({
    sourceId: 'test-ebook',
    highlightedWord: 'fahren',
    sentence: 'Wir fahren um zwölf Uhr ab.',
  });
  await createHighlight({
    sourceId: 'test-ebook',
    highlightedWord: 'Haus',
    sentence: 'Das Haus ist groß.',
  });

  await page.goto('http://localhost:8180/sources/test-ebook/highlights');

  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible();
  await expect(page.getByText('fahren', { exact: true })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();

  await expect(
    page.getByRole('button').filter({ hasText: 'Create 2 Cards' })
  ).toBeVisible();
});

test('highlights page shows empty grid when no highlights', async ({
  page,
}) => {
  await createSource({
    id: 'test-ebook',
    name: 'Test Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });

  await page.goto('http://localhost:8180/sources/test-ebook/highlights');

  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible();
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(0);
  }).toPass();
});

test('highlights page source selector navigates to other source highlights', async ({
  page,
}) => {
  await createSource({
    id: 'test-ebook-1',
    name: 'First Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });
  await createSource({
    id: 'test-ebook-2',
    name: 'Second Ebook',
    startPage: 1,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'EBOOK_DICTIONARY',
  });

  await page.goto('http://localhost:8180/sources/test-ebook-1/highlights');

  await expect(page.getByRole('button', { name: 'First Ebook' })).toBeVisible();
  await page.getByRole('button', { name: 'First Ebook' }).click();
  await page.getByRole('menuitem', { name: 'Second Ebook' }).click();

  await expect(page).toHaveURL(/\/sources\/test-ebook-2\/highlights/);
});
