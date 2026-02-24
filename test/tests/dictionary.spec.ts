import { type Page } from '@playwright/test';
import * as fs from 'fs';
import { test, expect } from '../fixtures';
import { setupDefaultChatModelSettings } from '../utils';

const API_URL = 'http://localhost:8180/api/dictionary';

// Reassembles an SSE stream into a single string: data lines within
// each event are joined with \n (per SSE spec), events are concatenated
// without separator because the AI response is a continuous text stream.
async function readSseStream(response: Response): Promise<string> {
  const raw = await response.text();
  const events = raw.split('\n\n').filter((e) => e.trim());
  return events
    .map((event) =>
      event
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5))
        .join('\n')
    )
    .join('');
}

async function createTokenViaUI(page: Page, name: string): Promise<string> {
  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByLabel('Token name').fill(name);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ai-dictionary.token');
  const filePath = await download.path();
  return fs.readFileSync(filePath!, 'utf-8');
}

async function lookupWord(
  token: string,
  targetLanguage: string
): Promise<Response> {
  return await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Goethe A1',
      author: 'Goethe Institut',
      targetLanguage,
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });
}

test('dictionary endpoint streams a word translation to Hungarian', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Test Token');

  const response = await lookupWord(token, 'hu');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  const text = await readSseStream(response);
  expect(text).toContain('<<B>>VERB<</B>>');
  expect(text).toContain('<<B>>Forms: <</B>>fährt ab, fuhr ab, ist abgefahren');
  expect(text).toContain(
    '<<B>>Translation (hu): <</B>>elindulni, elhagyni'
  );
  expect(text).toContain('<<B>>Example (de): <</B>>Wir fahren ab.');
  expect(text).toContain('<<B>>Example (hu): <</B>>Elindulunk.');
});

test('dictionary endpoint streams a word translation to English', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Test Token');

  const response = await lookupWord(token, 'en');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  const text = await readSseStream(response);
  expect(text).toContain('<<B>>VERB<</B>>');
  expect(text).toContain('<<B>>Forms: <</B>>fährt ab, fuhr ab, ist abgefahren');
  expect(text).toContain(
    '<<B>>Translation (en): <</B>>to depart, to leave'
  );
  expect(text).toContain('<<B>>Example (de): <</B>>Wir fahren ab.');
  expect(text).toContain('<<B>>Example (en): <</B>>We depart.');
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

test('dictionary endpoint returns 401 after token is deleted', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Token To Delete');

  const response = await lookupWord(token, 'hu');
  expect(response.status).toBe(200);

  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByRole('button', { name: 'Delete Token To Delete' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(
    page.getByRole('list', { name: 'API tokens' })
  ).not.toBeVisible();

  await expect(async () => {
    const responseAfterDelete = await lookupWord(token, 'hu');
    expect(responseAfterDelete.status).toBe(401);
  }).toPass();
});
