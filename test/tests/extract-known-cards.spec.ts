import { test, expect } from '../fixtures';
import {
  createApiToken,
  createCard,
  createKnownWords,
  createSourceGroup,
  setSourceGroup,
} from '../utils';

const EXPORT_URL = 'http://localhost:8170/api/known-cards';
const DICTIONARY_URL = 'http://localhost:8170/api/dictionary';
const EXPORT_TOKEN = 'test-known-cards-export-token';
const DICTIONARY_TOKEN = 'test-dictionary-token';

function nounCard(cardId: string, sourceId: string, word: string) {
  return {
    cardId,
    sourceId,
    data: { word, type: 'NOUN', translation: {}, forms: [], examples: [] },
  };
}

async function seedExportToken(): Promise<void> {
  await createApiToken({
    name: 'Export',
    scope: 'KNOWN_CARDS_EXPORT',
    token: EXPORT_TOKEN,
  });
}

async function exportWords(query = ''): Promise<string[]> {
  const response = await fetch(`${EXPORT_URL}${query}`, {
    headers: { Authorization: `Bearer ${EXPORT_TOKEN}` },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('application/json');
  const body = await response.json();
  return body.words;
}

test('generating a known cards export token downloads a scoped token file', async ({
  page,
}) => {
  await page.goto('/settings/api-tokens');
  await page.getByLabel('Token name').fill('My export');
  await page.getByLabel('Purpose').click();
  await page.getByRole('option', { name: 'Known cards export', exact: true }).click();
  await expect(page.getByLabel('Purpose')).toContainText('Known cards export');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('known-cards-export.token');
});

test('export endpoint returns 401 without a token', async () => {
  const response = await fetch(EXPORT_URL);
  expect(response.status).toBe(401);
});

test('export endpoint returns 403 for a dictionary-scoped token', async () => {
  await createApiToken({
    name: 'Dict',
    scope: 'DICTIONARY',
    token: DICTIONARY_TOKEN,
  });

  const response = await fetch(EXPORT_URL, {
    headers: { Authorization: `Bearer ${DICTIONARY_TOKEN}` },
  });

  expect(response.status).toBe(403);
});

test('dictionary endpoint returns 403 for a known-cards export token', async () => {
  await seedExportToken();

  const response = await fetch(DICTIONARY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${EXPORT_TOKEN}`,
    },
    body: JSON.stringify({
      bookTitle: 'Test',
      author: 'Author',
      targetLanguage: 'hu',
      sentence: 'Wir fahren ab.',
      highlightedWord: 'fahren',
    }),
  });

  expect(response.status).toBe(403);
});

test('export returns normal-form words for the selected group plus known words', async () => {
  const groupId = await createSourceGroup({ name: 'Export Group' });
  await setSourceGroup('goethe-a1', groupId);
  await setSourceGroup('goethe-a2', groupId);
  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createCard(nounCard('goethe-a2_baum', 'goethe-a2', 'Baum'));
  await createCard(nounCard('goethe-b1_zebra', 'goethe-b1', 'Zebra'));
  await createKnownWords([
    { word: 'apfel', hungarianTranslation: 'alma' },
    { word: 'wasser', hungarianTranslation: 'víz' },
  ]);
  await seedExportToken();

  expect(await exportWords(`?groupId=${groupId}`)).toEqual([
    'apfel',
    'baum',
    'haus',
    'wasser',
  ]);
});

test('export can filter across multiple groups', async () => {
  const groupA = await createSourceGroup({ name: 'Group A' });
  const groupB = await createSourceGroup({ name: 'Group B' });
  await setSourceGroup('goethe-a1', groupA);
  await setSourceGroup('goethe-a2', groupB);
  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createCard(nounCard('goethe-a2_baum', 'goethe-a2', 'Baum'));
  await createCard(nounCard('goethe-b1_zebra', 'goethe-b1', 'Zebra'));
  await seedExportToken();

  expect(await exportWords(`?groupId=${groupA}&groupId=${groupB}`)).toEqual([
    'baum',
    'haus',
  ]);
});

test('export without a group returns words from all sources plus known words', async () => {
  const groupId = await createSourceGroup({ name: 'Export Group' });
  await setSourceGroup('goethe-a1', groupId);
  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createCard(nounCard('goethe-b1_zebra', 'goethe-b1', 'Zebra'));
  await createKnownWords([{ word: 'apfel', hungarianTranslation: 'alma' }]);
  await seedExportToken();

  expect(await exportWords()).toEqual(['apfel', 'haus', 'zebra']);
});

test('export returns only known words for an unknown group', async () => {
  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createKnownWords([{ word: 'apfel', hungarianTranslation: 'alma' }]);
  await seedExportToken();

  expect(await exportWords('?groupId=999999')).toEqual(['apfel']);
});

test('export deduplicates card words already in the known words table', async () => {
  const groupId = await createSourceGroup({ name: 'Export Group' });
  await setSourceGroup('goethe-a1', groupId);
  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createKnownWords([{ word: 'haus', hungarianTranslation: 'ház' }]);
  await seedExportToken();

  expect(await exportWords(`?groupId=${groupId}`)).toEqual(['haus']);
});
