import { type Page } from '@playwright/test';
import * as fs from 'fs';
import { test, expect } from '../fixtures';
import {
  createCard,
  createKnownWords,
  createSourceGroup,
  setSourceGroup,
} from '../utils';

const EXPORT_URL = 'http://localhost:8170/api/known-cards';

async function createTokenViaUI(
  page: Page,
  name: string,
  purpose: 'Dictionary (e-book reader)' | 'Known cards export'
): Promise<string> {
  await page.goto('/settings/api-tokens');
  await page.getByLabel('Token name').fill(name);
  await page.getByLabel('Purpose').click();
  await page.getByRole('option', { name: purpose, exact: true }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();
  const download = await downloadPromise;
  return fs.readFileSync((await download.path())!, 'utf-8');
}

function nounCard(cardId: string, sourceId: string, word: string) {
  return {
    cardId,
    sourceId,
    data: { word, type: 'NOUN', translation: {}, forms: [], examples: [] },
  };
}

test('known cards export downloads the token file for the export purpose', async ({
  page,
}) => {
  await page.goto('/settings/api-tokens');
  await page.getByLabel('Token name').fill('My export');
  await page.getByLabel('Purpose').click();
  await page.getByRole('option', { name: 'Known cards export', exact: true }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('known-cards-export.token');
});

test('export endpoint returns 401 without a token', async () => {
  const response = await fetch(EXPORT_URL);
  expect(response.status).toBe(401);
});

test('export endpoint returns 403 for a dictionary-scoped token', async ({
  page,
}) => {
  const token = await createTokenViaUI(page, 'Dict token', 'Dictionary (e-book reader)');

  const response = await fetch(EXPORT_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.status).toBe(403);
});

test('export returns normal-form words for the selected group plus known words', async ({
  page,
}) => {
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

  const token = await createTokenViaUI(page, 'Export token', 'Known cards export');

  const response = await fetch(`${EXPORT_URL}?groupId=${groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('application/json');

  const body = await response.json();
  expect(body.words).toEqual(['apfel', 'baum', 'haus', 'wasser']);
});

test('export without a group returns words from all sources plus known words', async ({
  page,
}) => {
  const groupId = await createSourceGroup({ name: 'Export Group' });
  await setSourceGroup('goethe-a1', groupId);

  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createCard(nounCard('goethe-b1_zebra', 'goethe-b1', 'Zebra'));
  await createKnownWords([{ word: 'apfel', hungarianTranslation: 'alma' }]);

  const token = await createTokenViaUI(page, 'Export token', 'Known cards export');

  const response = await fetch(EXPORT_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await response.json();
  expect(body.words).toEqual(['apfel', 'haus', 'zebra']);
});

test('export deduplicates card words already in the known words table', async ({
  page,
}) => {
  const groupId = await createSourceGroup({ name: 'Export Group' });
  await setSourceGroup('goethe-a1', groupId);

  await createCard(nounCard('goethe-a1_haus', 'goethe-a1', 'Haus'));
  await createKnownWords([{ word: 'haus', hungarianTranslation: 'ház' }]);

  const token = await createTokenViaUI(page, 'Export token', 'Known cards export');

  const response = await fetch(`${EXPORT_URL}?groupId=${groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await response.json();
  expect(body.words).toEqual(['haus']);
});
