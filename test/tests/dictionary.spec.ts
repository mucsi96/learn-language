import { type Page } from '@playwright/test';
import * as fs from 'fs';
import { test, expect } from '../fixtures';
import { createChatModelSetting, setupDefaultChatModelSettings, withDbConnection } from '../utils';

const API_URL = 'http://localhost:8170/api/dictionary';

const PTF_BOLD_START = '\uFFF2';
const PTF_BOLD_END = '\uFFF3';

const bold = (s: string) => PTF_BOLD_START + s + PTF_BOLD_END;

async function createTokenViaUI(page: Page, name: string): Promise<string> {
  await page.goto('/settings/api-tokens');
  await page.getByLabel('Token name').fill(name);
  await page.getByRole('combobox', { name: 'Purpose' }).click();
  await page.getByRole('option', { name: 'Dictionary (e-book reader)' }).click();

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

test('dictionary endpoint translates a word to Hungarian', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Test Token');

  const response = await lookupWord(token, 'hu');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/plain');
  const text = await response.text();
  expect(text).toContain(bold('elindulni, elhagyni'));
  expect(text).toContain('Wir fahren ab.');
  expect(text).toContain('Elindulunk.');
  expect(text).toContain('fährt ab, fuhr ab, ist abgefahren');
});

test('dictionary endpoint translates a word to English', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const token = await createTokenViaUI(page, 'Test Token');

  const response = await lookupWord(token, 'en');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/plain');
  const text = await response.text();
  expect(text).toContain(bold('to depart, to leave'));
  expect(text).toContain('Wir fahren ab.');
  expect(text).toContain('We depart.');
  expect(text).toContain('fährt ab, fuhr ab, ist abgefahren');
});

test('ebook lookup creates an A2 source and uses the user-adjusted source level on later lookups', async ({ page }) => {
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'TRANSLATION', isEnabled: true, isPrimary: true });
  const token = await createTokenViaUI(page, 'Configurable level');
  const lookup = (highlightedWord: string, sentence: string) => fetch(API_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bookTitle: 'Level Book', targetLanguage: 'hu', highlightedWord, sentence }),
  });
  const first = await lookup('Haus', 'Wir sehen ein Haus.');
  expect(first.status).toBe(200);
  expect(await first.text()).toContain('Das Haus ist klein.');
  expect(await withDbConnection(async db =>
    (await db.query("SELECT id, source_type, language_level FROM learn_language.sources WHERE id = 'level-book'")).rows))
    .toEqual([{ id: 'level-book', source_type: 'EBOOK_DICTIONARY', language_level: 'A2' }]);

  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Level Book', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Language Level', exact: true })).toHaveText('A2 - Elementary');
  await page.getByRole('combobox', { name: 'Language Level', exact: true }).click();
  await page.getByRole('option', { name: 'B1 - Intermediate', exact: true }).click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  const second = await lookup('Bank', 'Nach dem langen Spaziergang setzt sie sich auf eine Bank im Park.');
  expect(second.status).toBe(200);
  expect(await second.text()).toContain('Nach dem Spaziergang ruhe ich mich auf einer Bank aus.');
  const stats = await (await fetch('http://localhost:3070/content-fixtures/stats')).json();
  expect(stats.dictionaryPrompts).toHaveLength(2);
  expect(stats.dictionaryPrompts[0]).toContain('CEFR A2 level');
  expect(stats.dictionaryPrompts[1]).toContain('CEFR B1 level');
  await expect.poll(async () => withDbConnection(async db =>
    (await db.query("SELECT id FROM learn_language.cards WHERE source_id = 'level-book' ORDER BY id")).rows))
    .toEqual([{ id: 'bank-pad' }, { id: 'haus-haz' }]);
  expect(await withDbConnection(async db =>
    (await db.query("SELECT language_level FROM learn_language.sources WHERE id = 'level-book'")).rows[0].language_level)).toBe('B1');
});

test('ebook lookup does not silently replace a missing configured source level with a default', async ({ page }) => {
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'TRANSLATION', isEnabled: true, isPrimary: true });
  const token = await createTokenViaUI(page, 'Missing level');
  await withDbConnection(db => db.query("UPDATE learn_language.sources SET language_level = NULL WHERE id = 'goethe-a1'"));
  const response = await lookupWord(token, 'hu');
  expect(response.status).toBe(400);
  const stats = await (await fetch('http://localhost:3070/content-fixtures/stats')).json();
  expect(stats.dictionaryPrompts).toEqual([]);
  expect(await withDbConnection(async db =>
    (await db.query("SELECT language_level FROM learn_language.sources WHERE id = 'goethe-a1'")).rows[0].language_level)).toBeNull();
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

  await page.goto('/settings/api-tokens');
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

test('token generation requires an explicitly selected purpose', async ({
  page,
}) => {
  await page.goto('/settings/api-tokens');
  await page.getByLabel('Token name').fill('Needs Purpose');

  const generateButton = page.getByRole('button', { name: 'Generate token' });
  await expect(generateButton).toBeDisabled();

  await page.getByRole('combobox', { name: 'Purpose' }).click();
  await page.getByRole('option', { name: 'Dictionary (e-book reader)' }).click();

  await expect(generateButton).toBeEnabled();
});
