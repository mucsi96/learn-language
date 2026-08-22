import { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import {
  createCard,
  createKnownWord,
  createSource,
  getCardFromDb,
  getKnownWords,
  getSource,
  getWordImportCandidates,
  setupDefaultChatModelSettings,
} from '../utils';

const SOURCE_ID = 'word-triage-a1';
const SOURCE_NAME = 'Word Triage A1';

const WORD_LIST = {
  schema_version: 1,
  generated_at: '2026-08-21T14:49:52Z',
  total_words: 3,
  words: [
    {
      lemma: 'sehen',
      pos: 'VERB',
      word_type: 'verb',
      count: 39,
      sentences: ['Ich kann dich sehen.', 'Wir sehen den Film.'],
    },
    {
      lemma: 'denken',
      pos: 'VERB',
      word_type: 'verb',
      count: 29,
      sentences: ['Wir denken an dich.'],
    },
    {
      lemma: 'Geschichte',
      pos: 'NOUN',
      word_type: 'noun',
      count: 25,
      sentences: ['Die Geschichte ist lang.'],
    },
  ],
};

async function dropWordList(page: Page, wordList: unknown = WORD_LIST) {
  await page.getByLabel('Word list JSON file').setInputFiles({
    name: 'words.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(wordList)),
  });
}

async function createWordListSource() {
  if (await getSource(SOURCE_ID)) {
    return;
  }

  await createSource({
    id: SOURCE_ID,
    name: SOURCE_NAME,
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['VOCABULARY'],
    sourceType: 'WORD_TRIAGE',
  });
}

async function openWordImport(page: Page) {
  await createWordListSource();
  await page.goto('/sources');
  await page.getByRole('button', { name: `Actions for ${SOURCE_NAME}` }).click();
  await page.getByRole('menuitem', { name: 'Import Words' }).click();
  await expect(page).toHaveURL(new RegExp(`/sources/${SOURCE_ID}/word-import`));
}

test('triages an imported word list into known words and draft cards', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();

  await openWordImport(page);
  await dropWordList(page);

  await expect(
    page.getByText(
      '3 words in file · 3 to triage · 0 already known · 0 already have cards · 0 duplicates'
    )
  ).toBeVisible();

  await expect(page.getByRole('heading', { name: 'sehen' })).toBeVisible();
  await expect(page.getByText('Ich kann dich sehen.')).toBeVisible();
  await expect(page.getByLabel('Remaining: 3')).toBeVisible();

  await page.getByRole('button', { name: 'I know this word' }).click();

  await expect(page.getByRole('heading', { name: 'denken' })).toBeVisible();
  await expect(page.getByLabel('Known: 1')).toBeVisible();

  await page.getByRole('button', { name: 'Add as new card' }).click();

  await expect(page.getByRole('heading', { name: 'Geschichte' })).toBeVisible();
  await expect(page.getByLabel('New cards: 1')).toBeVisible();

  await page.getByRole('button', { name: 'I know this word' }).click();

  await expect(
    page.getByRole('heading', { name: 'Triage complete' })
  ).toBeVisible();
  await expect(
    page.getByText('Marked as known: 2 · Draft cards created: 1')
  ).toBeVisible();
  await expect(page.getByText('All decisions saved')).toBeVisible();

  expect(await getKnownWords()).toEqual([
    { word: 'geschichte', hungarianTranslation: null },
    { word: 'sehen', hungarianTranslation: null },
  ]);

  const draftCard = await getCardFromDb('denken-gondolkodni');
  expect(draftCard.readiness).toBe('DRAFT');

  const candidates = await getWordImportCandidates(SOURCE_ID);
  expect(candidates.map(({ lemma, status }) => ({ lemma, status }))).toEqual([
    { lemma: 'sehen', status: 'KNOWN' },
    { lemma: 'denken', status: 'CARD_CREATED' },
    { lemma: 'Geschichte', status: 'KNOWN' },
  ]);
});

test('skips words that are already known or already have a card', async ({
  page,
}) => {
  await createWordListSource();
  await createKnownWord('sehen');
  await createCard({
    cardId: 'denken-gondolkodni',
    sourceId: SOURCE_ID,
    sourcePageNumber: 1,
    data: {
      word: 'denken',
      type: 'VERB',
      translation: { hu: 'gondolkodni' },
    },
  });

  await openWordImport(page);
  await dropWordList(page);

  await expect(
    page.getByText(
      '3 words in file · 1 to triage · 1 already known · 1 already have cards · 0 duplicates'
    )
  ).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Geschichte' })).toBeVisible();
  await expect(page.getByLabel('Remaining: 1')).toBeVisible();

  expect(
    (await getWordImportCandidates(SOURCE_ID)).map(({ lemma }) => lemma)
  ).toEqual(['Geschichte']);
});

test('undo reverts the last decision', async ({ page }) => {
  await openWordImport(page);
  await dropWordList(page);

  await page.getByRole('button', { name: 'I know this word' }).click();

  await expect(page.getByRole('heading', { name: 'denken' })).toBeVisible();
  await expect(page.getByText('All decisions saved')).toBeVisible();
  expect(await getKnownWords()).toEqual([
    { word: 'sehen', hungarianTranslation: null },
  ]);

  await page.getByRole('button', { name: 'Undo last decision' }).click();

  await expect(page.getByRole('heading', { name: 'sehen' })).toBeVisible();
  await expect(page.getByLabel('Known: 0')).toBeVisible();
  await expect(page.getByLabel('Remaining: 3')).toBeVisible();

  await expect
    .poll(async () =>
      (await getWordImportCandidates(SOURCE_ID))
        .map(({ status }) => status)
        .join(',')
    )
    .toBe('PENDING,PENDING,PENDING');
  expect(await getKnownWords()).toEqual([]);
});

test('keyboard shortcuts decide candidates', async ({ page }) => {
  await setupDefaultChatModelSettings();

  await openWordImport(page);
  await dropWordList(page);

  await expect(page.getByRole('heading', { name: 'sehen' })).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'denken' })).toBeVisible();
  await expect(page.getByLabel('Known: 1')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Geschichte' })).toBeVisible();
  await expect(page.getByLabel('New cards: 1')).toBeVisible();

  await expect(page.getByText('All decisions saved')).toBeVisible();
  expect(
    (await getWordImportCandidates(SOURCE_ID)).map(
      ({ lemma, status }) => `${lemma}:${status}`
    )
  ).toEqual(['sehen:KNOWN', 'denken:CARD_CREATED', 'Geschichte:PENDING']);
});

test('undo removes the draft card created for a word', async ({ page }) => {
  await setupDefaultChatModelSettings();

  await openWordImport(page);
  await dropWordList(page);

  await expect(page.getByRole('heading', { name: 'sehen' })).toBeVisible();
  await page.getByRole('button', { name: 'I know this word' }).click();

  await expect(page.getByRole('heading', { name: 'denken' })).toBeVisible();
  await page.getByRole('button', { name: 'Add as new card' }).click();

  await expect(page.getByRole('heading', { name: 'Geschichte' })).toBeVisible();
  await expect
    .poll(async () => (await getCardFromDb('denken-gondolkodni'))?.readiness)
    .toBe('DRAFT');

  await page.getByRole('button', { name: 'Undo last decision' }).click();

  await expect(page.getByRole('heading', { name: 'denken' })).toBeVisible();
  await expect
    .poll(async () => await getCardFromDb('denken-gondolkodni'))
    .toBeUndefined();
});

test('a decision that fails to save keeps the word in the queue', async ({
  page,
}) => {
  await openWordImport(page);
  await dropWordList(page);

  await expect(page.getByRole('heading', { name: 'sehen' })).toBeVisible();

  await page.route('**/word-import/candidates/*/known', (route) => route.abort());
  await page.getByRole('button', { name: 'I know this word' }).click();
  await expect(page.getByText('Unsaved decisions: 1')).toBeVisible();
  await page.unroute('**/word-import/candidates/*/known');

  await page.getByRole('button', { name: 'I know this word' }).click();
  await page.getByRole('button', { name: 'I know this word' }).click();

  await expect(
    page.getByRole('heading', { name: 'Triage complete' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Import another list' }).click();

  await expect(page.getByRole('heading', { name: 'sehen' })).toBeVisible();
  expect(
    (await getWordImportCandidates(SOURCE_ID)).map(
      ({ lemma, status }) => `${lemma}:${status}`
    )
  ).toContain('sehen:PENDING');
});

test('pending triage queue is announced on the sources page and can be resumed', async ({
  page,
}) => {
  await openWordImport(page);
  await dropWordList(page);

  await page.getByRole('button', { name: 'I know this word' }).click();
  await expect(page.getByText('All decisions saved')).toBeVisible();

  await page.goto('/sources');
  await page
    .getByRole('row', { name: SOURCE_NAME })
    .getByRole('link', { name: /to triage/ })
    .click();

  await expect(page).toHaveURL(new RegExp(`/sources/${SOURCE_ID}/word-import`));
  await expect(page.getByRole('heading', { name: 'denken' })).toBeVisible();
  await expect(page.getByLabel('Known: 1')).toBeVisible();
  await expect(page.getByLabel('Remaining: 2')).toBeVisible();
});

test('finishing the triage clears the staged queue', async ({ page }) => {
  await openWordImport(page);
  await dropWordList(page);

  await page.getByRole('button', { name: 'I know this word' }).click();
  await page.getByRole('button', { name: 'I know this word' }).click();
  await page.getByRole('button', { name: 'I know this word' }).click();

  await expect(
    page.getByRole('heading', { name: 'Triage complete' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Import another list' }).click();

  await expect(page.getByRole('heading', { name: 'Drop a word list' })).toBeVisible();
  expect(await getWordImportCandidates(SOURCE_ID)).toEqual([]);
});

test('rejects a file that does not match the word list schema', async ({
  page,
}) => {
  await openWordImport(page);
  await dropWordList(page, { words: [{ lemma: 'sehen' }] });

  await expect(page.getByRole('alert')).toContainText(
    'Word 1: "count" must be a number.'
  );
  expect(await getWordImportCandidates(SOURCE_ID)).toEqual([]);
});

test('creates a word triage source restricted to vocabulary cards', async ({
  page,
}) => {
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source' }).click();

  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Roman B1');
  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'Word Triage' }).click();
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'B1' }).click();

  await expect(
    page.getByText(
      'Cards are added by importing a word list JSON after creating the source.'
    )
  ).toBeVisible();
  await expect(page.getByLabel('Format Type')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('Roman B1')).toBeVisible();

  const source = await getSource('roman-b1');
  expect(source?.sourceType).toBe('WORD_TRIAGE');
  expect(source?.cardTypes).toEqual(['VOCABULARY']);
  expect(source?.formatType).toBeNull();

  await page.getByRole('button', { name: 'Actions for Roman B1' }).click();
  await page.getByRole('menuitem', { name: 'Import Words' }).click();

  await expect(page).toHaveURL(/\/sources\/roman-b1\/word-import/);
  await expect(
    page.getByRole('heading', { name: 'Drop a word list' })
  ).toBeVisible();
});

test('word import is only offered for word triage sources', async ({ page }) => {
  await createWordListSource();

  await page.goto('/sources');

  await page.getByRole('button', { name: 'Actions for Goethe A1' }).click();
  await expect(page.getByRole('menuitem', { name: 'Pages' })).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Import Words' })
  ).not.toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: `Actions for ${SOURCE_NAME}` }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Import Words' })
  ).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Pages' })).not.toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/sources/goethe-a1/word-import');

  await expect(
    page.getByRole('heading', { name: 'Word triage is not available here' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Drop a word list' })
  ).not.toBeVisible();
});

test('word import endpoints reject sources that are not word triage sources', async ({
  page,
  baseURL,
}) => {
  const sourcesRequest = page.waitForRequest((request) =>
    request.url().includes('/api/sources')
  );
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: authorization,
  };

  const queueResponse = await fetch(
    `${baseURL}/api/source/goethe-a1/word-import`,
    { headers }
  );
  expect(queueResponse.status).toBe(400);

  const stageResponse = await fetch(
    `${baseURL}/api/source/goethe-a1/word-import`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        words: [{ lemma: 'sehen', occurrenceCount: 3, examples: [] }],
      }),
    }
  );
  expect(stageResponse.status).toBe(400);
  expect(await getWordImportCandidates('goethe-a1')).toEqual([]);
});

test('word triage sources accept vocabulary cards only', async ({
  page,
  baseURL,
}) => {
  const sourcesRequest = page.waitForRequest((request) =>
    request.url().includes('/api/sources')
  );
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: authorization,
  };

  const createResponse = await fetch(`${baseURL}/api/source`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'speech-word-triage',
      name: 'Speech Word Triage',
      sourceType: 'wordTriage',
      startPage: 1,
      languageLevel: 'A1',
      cardTypes: ['speech'],
    }),
  });
  expect(createResponse.status).toBe(400);
  expect(await getSource('speech-word-triage')).toBeNull();

  await createWordListSource();

  const updateResponse = await fetch(`${baseURL}/api/source/${SOURCE_ID}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ cardTypes: ['vocabulary', 'speech'] }),
  });
  expect(updateResponse.status).toBe(400);
  expect((await getSource(SOURCE_ID))?.cardTypes).toEqual(['VOCABULARY']);
});
