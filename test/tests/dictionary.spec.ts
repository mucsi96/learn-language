import { type Page } from '@playwright/test';
import * as fs from 'fs';
import { test, expect } from '../fixtures';
import { setupDefaultChatModelSettings } from '../utils';

const API_URL = 'http://localhost:8180/api/dictionary';

async function createTokenViaUI(page: Page, name: string): Promise<string> {
  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByLabel('Token name').fill(name);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${name}.token`);
  const filePath = await download.path();
  return fs.readFileSync(filePath!, 'utf-8');
}

test('dictionary endpoint translates a word to Hungarian', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Test Token');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Goethe A1',
      author: 'Goethe Institut',
      targetLanguage: 'hu',
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });

  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data.word).toBe('abfahren');
  expect(data.type).toBe('VERB');
  expect(data.translation.hu).toBe('elindulni, elhagyni');
  expect(data.forms).toEqual(['fährt ab', 'fuhr ab', 'ist abgefahren']);
  expect(data.examples).toHaveLength(1);
  expect(data.examples[0].de).toBe('Wir fahren um zwölf Uhr ab.');
  expect(data.examples[0].hu).toBe('Tizenkét órakor indulunk.');
});

test('dictionary endpoint translates a word to English', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Test Token');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Goethe A1',
      author: 'Goethe Institut',
      targetLanguage: 'en',
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });

  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data.word).toBe('abfahren');
  expect(data.type).toBe('VERB');
  expect(data.translation.en).toBe('to depart, to leave');
  expect(data.forms).toEqual(['fährt ab', 'fuhr ab', 'ist abgefahren']);
  expect(data.examples).toHaveLength(1);
  expect(data.examples[0].de).toBe('Wir fahren um zwölf Uhr ab.');
  expect(data.examples[0].en).toBe("We are departing at twelve o'clock.");
});

test('dictionary endpoint returns 401 without authorization header', async ({
  page,
}) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookTitle: 'Test',
      author: 'Author',
      targetLanguage: 'hu',
      sentence: 'Test sentence.',
      highlightedWord: 'Test',
    }),
  });

  expect(response.status).toBe(401);
});

test('dictionary endpoint returns 401 with invalid token', async ({
  page,
}) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invalid-token-that-does-not-exist',
    },
    body: JSON.stringify({
      bookTitle: 'Test',
      author: 'Author',
      targetLanguage: 'hu',
      sentence: 'Test sentence.',
      highlightedWord: 'Test',
    }),
  });

  expect(response.status).toBe(401);
});

test('dictionary endpoint response matches vocabulary card data structure', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Structure Test Token');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Goethe A1',
      author: 'Goethe Institut',
      targetLanguage: 'hu',
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });

  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data).toHaveProperty('word');
  expect(data).toHaveProperty('type');
  expect(data).toHaveProperty('translation');
  expect(data).toHaveProperty('forms');
  expect(data).toHaveProperty('examples');
  expect(typeof data.word).toBe('string');
  expect(typeof data.type).toBe('string');
  expect(typeof data.translation).toBe('object');
  expect(Array.isArray(data.forms)).toBe(true);
  expect(Array.isArray(data.examples)).toBe(true);
});
