import * as fs from 'fs';
import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import {
  createCard,
  getHighlights,
  getGridData,
  getSource,
  setupDefaultChatModelSettings,
  withDbConnection,
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
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'fahren', 'Wir fahren um zwölf Uhr ab.');
  await lookupWord(token, 'Test Ebook', 'Haus', 'Das Haus ist groß.');

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
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'test', 'This is a test.');

  await page.goto('http://localhost:8180/sources');

  await page.getByRole('article', { name: 'Test Ebook' }).click();
  await expect(page.getByRole('button', { name: 'Highlights' })).toBeVisible();
});

test('admin page navigates to highlights page for ebook dictionary source', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'test', 'This is a test.');

  await page.goto('http://localhost:8180/sources');

  await page.getByRole('article', { name: 'Test Ebook' }).click();
  await page.getByRole('button', { name: 'Highlights' }).click();

  await expect(page).toHaveURL(/\/sources\/test-ebook\/highlights/);
});

test('highlights page select all checkbox selects all highlights', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'fahren', 'Wir fahren um zwölf Uhr ab.');
  await lookupWord(token, 'Test Ebook', 'Haus', 'Das Haus ist groß.');

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
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'test', 'This is a test.');

  const source = await getSource('test-ebook');
  expect(source).not.toBeNull();

  await withDbConnection(async (client) => {
    await client.query('DELETE FROM learn_language.highlights WHERE source_id = $1', [
      'test-ebook',
    ]);
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
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'First Ebook', 'test', 'This is a test.');
  await lookupWord(token, 'Second Ebook', 'test', 'This is a test.');

  await page.goto('http://localhost:8180/sources/first-ebook/highlights');

  await expect(page.getByRole('button', { name: 'First Ebook' })).toBeVisible();
  await page.getByRole('button', { name: 'First Ebook' }).click();
  await page.getByRole('menuitem', { name: 'Second Ebook' }).click();

  await expect(page).toHaveURL(/\/sources\/second-ebook\/highlights/);
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

test('highlights grid shows Card ID and NEW status for highlight without matching card', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'fahren', 'Wir fahren um zwölf Uhr ab.');

  await page.goto('http://localhost:8180/sources/test-ebook/highlights');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{
      'Card ID': string;
      Status: string;
      Word: string;
      Sentence: string;
    }>(grid);
    expect(rows).toEqual([
      expect.objectContaining({
        'Card ID': 'abfahren-elindulni',
        Status: 'NEW',
        Word: 'fahren',
        Sentence: 'Wir fahren um zwölf Uhr ab.',
      }),
    ]);
  }).toPass();
});

test('highlights grid shows EXISTS status when card with candidate ID exists', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'fahren', 'Wir fahren um zwölf Uhr ab.');

  const highlights = await getHighlights('test-ebook');
  const candidateCardId = highlights[0].candidateCardId;
  expect(candidateCardId).not.toBeNull();

  await createCard({
    cardId: candidateCardId!,
    sourceId: 'test-ebook',
    data: {
      word: 'abfahren',
      type: 'VERB',
      translation: { hu: 'elindulni, elhagyni' },
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      examples: [],
      audio: [],
    },
  });

  await page.goto('http://localhost:8180/sources/test-ebook/highlights');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{
      'Card ID': string;
      Status: string;
      Word: string;
    }>(grid);
    expect(rows).toEqual([
      expect.objectContaining({
        'Card ID': candidateCardId,
        Status: 'EXISTS',
        Word: 'fahren',
      }),
    ]);
  }).toPass();
});

test('highlights grid shows dash for Card ID when no candidate card ID', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Ebook Token');

  await lookupWord(token, 'Test Ebook', 'Haus', 'Das Haus ist groß.');

  const highlights = await getHighlights('test-ebook');
  expect(highlights).toHaveLength(1);

  if (highlights[0].candidateCardId !== null) {
    await withDbConnection(async (client) => {
      await client.query(
        'UPDATE learn_language.highlights SET candidate_card_id = NULL WHERE id = $1',
        [highlights[0].id]
      );
    });
  }

  await page.goto('http://localhost:8180/sources/test-ebook/highlights');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{
      'Card ID': string;
      Status: string;
      Word: string;
    }>(grid);
    expect(rows).toEqual([
      expect.objectContaining({
        'Card ID': '-',
        Status: '',
        Word: 'Haus',
      }),
    ]);
  }).toPass();
});
