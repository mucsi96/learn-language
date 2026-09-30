import { Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test, expect } from '../fixtures';
import { createCard, createChatModelSetting, createSourceGroup, getModelUsageLogs, setSourceGroup, withDbConnection } from '../utils';
import { mockYouTube } from '../youtube';

const SOURCE = 'deutsch-lernen-durch-horen-a1-a2';
const NAME = 'Deutsch lernen durch Hören A1–A2';
const fixtureUrl = 'http://localhost:3070/content-fixtures';
const stats = async (): Promise<{ requests: string[]; vocabularyInputs: string[]; vocabularyPrompts: string[]; sourceModels: string[]; sourceInputs: string[];
  dictionaryInputs: { highlightedWord: string; sentence: string; bookTitle: string }[]; dictionaryPrompts: string[] }> => (await fetch(`${fixtureUrl}/stats`)).json();

async function addSource(page: Page, configureSourceModel = true, languageLevel = 'A2 - Elementary') {
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'TRANSLATION', isEnabled: true, isPrimary: true });
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'EXTRACTION', isEnabled: true, isPrimary: true });
  if (configureSourceModel) {
    await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'SOURCE_CONTENT_EXTRACTION', isEnabled: true, isPrimary: true });
  }
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source Type', exact: true }).click();
  await page.getByRole('option', { name: 'Source Extension', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source Extension', exact: true }).click();
  await page.getByRole('option', { name: NAME, exact: true }).click();
  await page.getByRole('combobox', { name: 'Language Level', exact: true }).click();
  await page.getByRole('option', { name: languageLevel, exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(NAME);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: `Actions for ${NAME}` })).toBeVisible();
}

async function stories(page: Page) {
  await page.goto('/sources');
  await page.getByRole('button', { name: `Actions for ${NAME}` }).click();
  await page.getByRole('menuitem', { name: 'Stories', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Brezel', exact: true })).toBeVisible();
}

async function prepare(page: Page) {
  await stories(page);
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Listening prerequisites' })).toBeVisible({ timeout: 60000 });
}

async function readyWords(sourceId = SOURCE, words = ['sehen', 'Haus']) {
  await Promise.all(words.map(word => createCard({
    cardId: `${sourceId}-${word}`, sourceId, readiness: 'READY', reps: 1,
    data: { word, type: 'NOUN', translation: { hu: word } },
  })));
}

async function cachedWords(words: { lemma: string; wordType: string; examples?: string[] }[]) {
  await withDbConnection(db => db.query(`UPDATE learn_language.content_items
    SET preparation = jsonb_set(preparation, '{words}', $1::jsonb) WHERE status = 'prepared'`,
    [JSON.stringify(words.map(word => ({ article: '', forms: [], examples: [word.lemma], surfaceForms: [word.lemma], ...word })))]));
}

async function listen(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: `Listen to ${NAME}`, exact: true }).click();
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
}

async function restartServer(page: Page) {
  await promisify(execFile)('podman', ['restart', 'learn-language-test-server']);
  await expect.poll(async () => (await page.request.get('/api/environment')).status(), { timeout: 90000 }).toBe(200);
}

async function upgradeVocabulary(page: Page, transcript: string) {
  await withDbConnection(async db => {
    await db.query(`UPDATE learn_language.content_items SET preparation = jsonb_set(jsonb_set(preparation,
      '{version}', '"2"'), '{transcript}', to_jsonb($1::text)) WHERE status = 'prepared'`, [transcript]);
    await db.query("DELETE FROM learn_language.databasechangelog WHERE id = '60-content-worth-learning-vocabulary'");
  });
  await restartServer(page);
  await page.reload();
}

test('opens listening from its source card without due vocabulary on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addSource(page);
  await page.goto('/');

  const sourceCard = page.getByRole('group', { name: NAME, exact: true });
  await expect(sourceCard.getByRole('heading', { name: NAME, exact: true })).toBeVisible();
  await expect(sourceCard.getByRole('link', { name: NAME, exact: true })).toBeDisabled();
  await sourceCard.getByRole('link', { name: `Listen to ${NAME}`, exact: true }).click();
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();

  const story = page.getByRole('article', { name: 'Brezel', exact: true });
  await expect(story.getByRole('heading', { name: 'Brezel', exact: true })).toBeVisible();
  await expect(story.getByText('A1-A2', { exact: true })).toBeVisible();
  await expect(story.getByText('2:55', { exact: true })).toBeVisible();
  await expect(story.getByText('Transcript and vocabulary must be prepared in source administration before listening.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Back to Stories', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Source content' })).toBeVisible();
});

test('groups listening prerequisites by reason and sorts each group alphabetically in German', async ({ page }) => {
  await addSource(page);
  await page.route(`**/api/source/${SOURCE}/content/alphabetical`, route => route.fulfill({
    json: {
      id: 'alphabetical',
      metadata: { title: 'Alphabetical vocabulary', number: 1, durationSeconds: 175, languageLevel: 'A1-A2', transcriptUrl: null, matchError: null },
      status: 'prepared', error: null, transcript: 'Vocabulary ordering fixture.', unlocked: false, progress: null,
      words: [
        { lemma: 'Zug', status: 'missing' },
        { lemma: 'Öl', status: 'not_ready' },
        { lemma: 'üben', status: 'unreviewed' },
        { lemma: 'Ärger', status: 'not_ready' },
        { lemma: 'Brot', status: 'missing' },
        { lemma: 'Äpfel', status: 'missing' },
        { lemma: 'essen', status: 'unreviewed' },
        { lemma: 'Haus', status: 'satisfied' },
      ].map(({ lemma, status }) => ({
        key: lemma, status, cardIds: [],
        word: { lemma, wordType: 'NOUN', article: '', forms: [], examples: [], surfaceForms: [] },
      })),
    },
  }));
  await page.goto(`/sources/${SOURCE}/content/alphabetical`);
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  await expect(page.getByRole('checkbox').nth(0)).toHaveAccessibleName('Äpfel');
  await expect(page.getByRole('checkbox').nth(1)).toHaveAccessibleName('Brot');
  await expect(page.getByRole('checkbox').nth(2)).toHaveAccessibleName('Zug');
  const prerequisites = page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem');
  await expect(prerequisites).toHaveText([
    'Äpfel', 'Brot', 'Zug', 'Ärger', 'Öl', 'essen', 'üben',
  ]);
  await page.goto(`/sources/${SOURCE}/listen/alphabetical`);
  await expect(page.getByRole('heading', { level: 4 })).toHaveText(['Missing card', 'Card not ready', 'Not yet studied']);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Missing card', exact: true }).getByRole('listitem'))
    .toHaveText(['Äpfel', 'Brot', 'Zug']);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready', exact: true }).getByRole('listitem'))
    .toHaveText(['Ärger', 'Öl']);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Not yet studied', exact: true }).getByRole('listitem'))
    .toHaveText(['essen', 'üben']);
  await expect(prerequisites).toHaveCount(7);
});

test('discovers website stories lazily and caches vocabulary without glossary or unrelated text', async ({ page }) => {
  await addSource(page);
  expect((await stats()).requests).toEqual([]);
  await stories(page);
  await expect(page.getByRole('row', { name: /209 Brezel 2:55 A1-A2/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /294 Zwillinge 2:49 A1-A2/ })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Source content' }).getByRole('link')).toHaveText(['Brezel', 'Zwillinge', 'Neue Geschichte']);
  await expect(page.getByRole('link', { name: 'Unlisted story' })).not.toBeVisible();
  expect((await stats()).requests).toEqual(['index', 'source-index']);
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('checkbox', { name: 'Gespenst' })).not.toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Marmelade' })).not.toBeVisible();
  await page.getByText('Transcript used', { exact: true }).click();
  await expect(page.getByText('Wir sehen ein Haus. Wir sehen ein Haus.', { exact: true })).toBeVisible();
  const first = await stats();
  expect(first.requests).toEqual(['index', 'source-index', 'story-page', 'source-story', 'vocabulary']);
  expect(first.vocabularyInputs).toEqual(['Wir sehen ein Haus. Wir sehen ein Haus.']);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible();
  await stories(page);
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible();
  expect(await stats()).toEqual(first);
});

test('keeps unverified recordings and incorrect publisher transcripts visible but unprepared', async ({ page }) => {
  await addSource(page);
  await stories(page);
  await page.getByRole('link', { name: 'Zwillinge', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('birthday story');
  await expect(page.getByRole('heading', { name: 'Missing vocabulary' })).not.toBeVisible();
  await stories(page);
  await page.getByRole('link', { name: 'Neue Geschichte', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('recording has not been verified');
  expect((await stats()).requests).toEqual(['index', 'source-index']);
});

test('configures source extraction independently in Data Models and preserves prepared caches after model changes', async ({ page }) => {
  test.setTimeout(60000);
  await addSource(page, false);
  await page.goto(`/sources/${SOURCE}/content`);
  await expect(page.getByRole('alert')).toContainText('Content discovery failed');
  expect((await stats()).requests).toEqual([]);

  await page.goto('/settings/data-models');
  await page.getByRole('switch', { name: 'gpt-6-sol for Source Content Extraction', exact: true }).click();
  await page.getByRole('radio', { name: 'Set gpt-6-sol as primary for Source Content Extraction', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Set gpt-6-sol as primary for Source Content Extraction', exact: true })).toBeChecked();
  await prepare(page);
  expect((await stats()).sourceModels).toEqual(['gpt-6-sol', 'gpt-6-sol']);
  const usage = await getModelUsageLogs();
  expect(usage.filter(log => log.operationType === 'SOURCE_CONTENT_EXTRACTION').map(log => log.modelName)).toEqual(['gpt-6-sol', 'gpt-6-sol']);
  expect(usage.filter(log => log.operationType === 'EXTRACTION').map(log => log.modelName)).toEqual(['gpt-5.5']);
  expect((await stats()).sourceInputs.every(input => !input.includes('Ignore the requested story') && !input.includes('Ghost text'))).toBe(true);

  await page.goto('/settings/data-models');
  await page.getByRole('switch', { name: 'gpt-6-astra for Source Content Extraction', exact: true }).click();
  await page.getByRole('radio', { name: 'Set gpt-6-astra as primary for Source Content Extraction', exact: true }).check();
  await stories(page);
  await page.getByRole('button', { name: 'Refresh catalogue', exact: true }).click();
  await expect.poll(async () => (await stats()).sourceModels).toEqual(['gpt-6-sol', 'gpt-6-sol', 'gpt-6-astra']);
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible();
  expect((await stats()).requests.filter(request => request === 'source-story')).toHaveLength(1);
  expect((await stats()).requests.filter(request => request === 'vocabulary')).toHaveLength(1);
});

test('rejects invented catalogue links rather than fetching or storing them', async ({ page }) => {
  await addSource(page);
  await fetch(`${fixtureUrl}/source-failure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failure: 'invented-link' }) });
  await page.goto(`/sources/${SOURCE}/content`);
  await expect(page.getByRole('alert')).toContainText('Content discovery failed');
  await expect(page.getByRole('link', { name: 'Brezel', exact: true })).not.toBeVisible();
  expect(await withDbConnection(async db => (await db.query('SELECT count(*)::int AS count FROM learn_language.content_items')).rows[0].count)).toBe(0);
  await fetch(`${fixtureUrl}/source-failure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failure: '' }) });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Brezel', exact: true })).toBeVisible();
});

test('upgrading initializes the new operation from the existing extraction settings', async ({ page }) => {
  test.setTimeout(150000);
  await createChatModelSetting({ modelName: 'gpt-6-sol', operationType: 'EXTRACTION', isEnabled: true, isPrimary: true });
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'EXTRACTION', isEnabled: true, isPrimary: false });
  await withDbConnection(db => db.query("DELETE FROM learn_language.databasechangelog WHERE id = '58-source-content-extraction-model-settings'"));
  await restartServer(page);
  await page.goto('/settings/data-models');
  await expect(page.getByRole('switch', { name: 'gpt-6-sol for Source Content Extraction', exact: true })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'gpt-5.5 for Source Content Extraction', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Set gpt-6-sol as primary for Source Content Extraction', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Set gpt-5.5 as primary for Source Content Extraction', exact: true })).not.toBeChecked();
});

['invented-text', 'incomplete-story'].forEach(failure => {
  test(`does not prepare vocabulary from ${failure} and can retry extraction`, async ({ page }) => {
    await addSource(page);
    await stories(page);
    await fetch(`${fixtureUrl}/source-failure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failure }) });
    await page.getByRole('link', { name: 'Brezel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry preparation', exact: true })).toBeVisible();
    expect((await stats()).requests.filter(request => request === 'vocabulary')).toEqual([]);
    await fetch(`${fixtureUrl}/source-failure`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failure: '' }) });
    await page.getByRole('button', { name: 'Retry preparation', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible();
  });
});

test('filters group cards and requires every vocabulary prerequisite to be ready and studied', async ({ page }) => {
  await addSource(page);
  const group = await createSourceGroup({ name: 'Shared vocabulary' });
  await setSourceGroup(SOURCE, group);
  await setSourceGroup('goethe-a1', group);
  await readyWords('goethe-a1', ['wir', 'ein']);
  await createCard({ cardId: 'existing-sehen', sourceId: 'goethe-a1', readiness: 'DRAFT',
    data: { word: 'sehen', type: 'VERB', translation: { hu: 'látni' } } });
  await readyWords('goethe-a2', ['Haus']);
  await prepare(page);
  await expect(page.getByRole('checkbox', { name: 'sehen', exact: true })).not.toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready' }).getByText('sehen', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  const draftRequest = page.waitForRequest(request => request.url().endsWith('/drafts'));
  await page.getByRole('button', { name: 'Create drafts (1)' }).click();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready' }).getByText('Haus', { exact: true })).toBeVisible();
  const request = await draftRequest;
  expect((await page.request.post(request.url(), {
    headers: { authorization: request.headers()['authorization'] }, data: request.postDataJSON(),
  })).ok()).toBe(true);
  expect(await withDbConnection(async db =>
    (await db.query('SELECT id, data FROM learn_language.cards WHERE source_id = $1', [SOURCE])).rows))
    .toEqual([expect.objectContaining({ id: 'haus-haz', data: expect.objectContaining({
      translation: { hu: 'a ház' },
      examples: [expect.objectContaining({ de: 'Das Haus ist klein.', hu: 'A ház kicsi.' })],
    }) })]);
  await expect(page.getByRole('heading', { name: 'Missing card', exact: true })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Missing card' })).toHaveCount(0);
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET readiness = 'READY' WHERE source_id IN ($1, 'goethe-a1')", [SOURCE]));
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Not yet studied' }).getByText('Haus', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Card not ready', exact: true })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready' })).toHaveCount(0);
  await expect(page.getByText('Listening locked', { exact: true })).toBeVisible();
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET reps = 1 WHERE source_id IN ($1, 'goethe-a1')", [SOURCE]));
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await setSourceGroup(SOURCE, null);
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByRole('checkbox', { name: 'sehen', exact: true })).toBeVisible();
  expect((await stats()).requests.filter(request => request === 'vocabulary')).toHaveLength(1);
});

[
  { level: 'A1 - Beginner', code: 'A1', example: 'Ich sitze auf der Bank.', translation: 'A padon ülök.' },
  { level: 'B1 - Intermediate', code: 'B1', example: 'Nach dem Spaziergang ruhe ich mich auf einer Bank aus.', translation: 'A séta után megpihenek egy padon.' },
].forEach(({ level, code, example, translation }) => {
  test(`generates ${code} story examples using the original word meaning and ebook dictionary flow`, async ({ page }) => {
    await addSource(page, true, level);
    await prepare(page);
    const context = 'Nachdem sie stundenlang durch den Wald gewandert waren, ließen sie sich erschöpft auf einer alten Bank nieder, die unter einer Eiche stand.';
    await cachedWords([{ lemma: 'Bank', wordType: 'noun', examples: [context] }]);
    await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
    await expect(page.getByText(context, { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Bank', exact: true }).check();
    await page.getByRole('button', { name: 'Create drafts (1)', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready' }).getByText('Bank', { exact: true })).toBeVisible();
    const card = await withDbConnection(async db =>
      (await db.query('SELECT id, data FROM learn_language.cards WHERE source_id = $1', [SOURCE])).rows[0]);
    expect(card.id).toBe('bank-pad');
    expect(card.data.examples).toEqual([expect.objectContaining({ de: example, hu: translation })]);
    const calls = await stats();
    expect(calls.dictionaryInputs).toEqual([expect.objectContaining({ highlightedWord: 'Bank', sentence: context, bookTitle: 'Brezel' })]);
    expect(calls.dictionaryPrompts).toHaveLength(1);
    expect(calls.dictionaryPrompts[0]).toContain(`CEFR ${code} level`);
    expect(calls.dictionaryPrompts[0]).toContain("exact contextual meaning, grammatical role, and usage");
    expect(calls.dictionaryPrompts[0]).toContain('Do not switch to another dictionary meaning');
    expect(calls.dictionaryPrompts[0]).toContain('Do not copy the original sentence');
    expect(await withDbConnection(async db =>
      (await db.query("SELECT preparation->'words'->0->'examples' AS examples FROM learn_language.content_items WHERE status = 'prepared'")).rows[0].examples))
      .toEqual([context]);
    await page.goto(`/sources/${SOURCE}/page/1/cards/${card.id}`);
    await expect(page.getByRole('textbox', { name: 'Example in German', exact: true })).toHaveValue(example);
    await expect(page.getByRole('textbox', { name: 'Example in Hungarian', exact: true })).toHaveValue(translation);
  });
});

test('requires an explicit level for legacy story sources and uses the edited source level', async ({ page }) => {
  await addSource(page);
  await withDbConnection(db => db.query('UPDATE learn_language.sources SET language_level = NULL WHERE id = $1', [SOURCE]));
  await prepare(page);
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  await expect(page.getByRole('alert')).toContainText('Choose a language level');
  await expect(page.getByRole('button', { name: 'Create drafts (1)', exact: true })).toBeDisabled();
  expect((await stats()).dictionaryInputs).toEqual([]);
  await page.getByRole('link', { name: 'source settings', exact: true }).click();
  await page.getByRole('button', { name: `Actions for ${NAME}` }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await page.getByRole('combobox', { name: 'Language Level', exact: true }).click();
  await page.getByRole('option', { name: 'B1 - Intermediate', exact: true }).click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await prepare(page);
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  await page.getByRole('button', { name: 'Create drafts (1)', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready' }).getByText('Haus', { exact: true })).toBeVisible();
  expect((await stats()).dictionaryPrompts[0]).toContain('CEFR B1 level');
});

test('does not save a story draft or copy the original context when example generation fails', async ({ page }) => {
  await addSource(page);
  await prepare(page);
  await fetch(`${fixtureUrl}/fail-examples`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: true }) });
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  const response = page.waitForResponse(response => response.url().endsWith('/drafts'));
  await page.getByRole('button', { name: 'Create drafts (1)', exact: true }).click();
  expect((await response).status()).toBe(500);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await withDbConnection(async db =>
    (await db.query('SELECT id FROM learn_language.cards WHERE source_id = $1', [SOURCE])).rows)).toEqual([]);
  expect((await getModelUsageLogs()).filter(log => log.operationType === 'TRANSLATION')).toHaveLength(1);
});

test('does not overwrite a Goethe card outside the story source group when its word ID already exists', async ({ page }) => {
  await addSource(page);
  await createCard({ cardId: 'haus-haz', sourceId: 'goethe-a1', readiness: 'READY', reps: 4,
    data: { word: 'das Haus', type: 'NOUN', translation: { hu: 'a ház' } } });
  const before = await withDbConnection(async db =>
    (await db.query("SELECT * FROM learn_language.cards WHERE id = 'haus-haz'")).rows[0]);
  await prepare(page);
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  const response = page.waitForResponse(response => response.url().endsWith('/drafts'));
  await page.getByRole('button', { name: 'Create drafts (1)', exact: true }).click();
  expect((await response).status()).toBe(409);
  const translationUsage = (await getModelUsageLogs()).filter(log => log.operationType === 'TRANSLATION');
  expect(translationUsage).toHaveLength(1);
  expect(translationUsage[0].modelName).toBe('gpt-5.5');
  expect(Number(translationUsage[0].costUsd)).toBeGreaterThan(0);
  expect(await withDbConnection(async db =>
    (await db.query("SELECT * FROM learn_language.cards WHERE id = 'haus-haz'")).rows[0])).toEqual(before);
  expect(await withDbConnection(async db =>
    (await db.query('SELECT id FROM learn_language.cards WHERE source_id = $1', [SOURCE])).rows)).toEqual([]);
});

[
  { type: 'expression', label: 'Kifejezés', editedType: 'OTHER', editedLabel: 'Egyéb' },
  { type: 'other', label: 'Egyéb', editedType: 'EXPRESSION', editedLabel: 'Kifejezés' },
].forEach(({ type, label, editedType, editedLabel }) => {
  test(`creates and edits a ${type} vocabulary draft with supported word types`, async ({ page }) => {
    await addSource(page);
    await prepare(page);
    await cachedWords([{ lemma: 'auf jeden Fall', wordType: type }]);
    await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
    await page.getByRole('checkbox', { name: 'auf jeden Fall', exact: true }).check();
    await page.getByRole('button', { name: 'Create drafts (1)', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Vocabulary prerequisites: Card not ready' }).getByText('auf jeden Fall', { exact: true })).toBeVisible();
    const card = await withDbConnection(async db =>
      (await db.query("SELECT id, data FROM learn_language.cards WHERE source_id = $1 AND data->>'word' = 'auf jeden Fall'", [SOURCE])).rows[0]);
    expect(card.data.type).toBe(type.toUpperCase());
    expect(card.id).toBe('auf-jeden-fall-mindenkeppen');
    await page.goto(`/sources/${SOURCE}/page/1/cards/${card.id}`);
    const wordType = page.getByRole('combobox', { name: 'Word type', exact: true });
    await expect(wordType).toHaveText(label);
    await wordType.click();
    await page.getByRole('option', { name: editedLabel, exact: true }).click();
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Card updated successfully', { exact: true })).toBeVisible();
    await page.reload();
    await expect(wordType).toHaveText(editedLabel);
    expect(await withDbConnection(async db =>
      (await db.query("SELECT data->>'type' AS type FROM learn_language.cards WHERE id = $1", [card.id])).rows[0].type)).toBe(editedType);
  });
});

test('matches optional reflexive cards and explicit dictionary aliases without matching unrelated words', async ({ page }) => {
  await addSource(page);
  const group = await createSourceGroup({ name: 'Shared vocabulary' });
  await setSourceGroup(SOURCE, group);
  await setSourceGroup('goethe-a1', group);
  await readyWords('goethe-a1', ['(sich) treffen', 'setzen', 'zu sein']);
  await createCard({ cardId: 'all-known', sourceId: 'goethe-a1', readiness: 'KNOWN', reps: 0,
    data: { word: 'all-', type: 'ADJECTIVE', translation: { hu: 'mind' } } });
  await prepare(page);
  await cachedWords([
    { lemma: 'sich treffen', wordType: 'verb' },
    { lemma: 'treffen', wordType: 'verb' },
    { lemma: 'all', wordType: 'adjective' },
    { lemma: 'alles', wordType: 'pronoun' },
    { lemma: 'allein', wordType: 'adverb' },
    { lemma: 'sich setzen', wordType: 'verb' },
    { lemma: 'zu', wordType: 'preposition' },
  ]);
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem'))
    .toHaveText(['allein', 'sich setzen', 'zu']);
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  await expect(page.getByText('Listening locked', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'allein', exact: true }).check();
  await page.getByRole('checkbox', { name: 'sich setzen', exact: true }).check();
  await page.getByRole('checkbox', { name: 'zu', exact: true }).check();
  await page.getByRole('button', { name: 'Mark as known (3)', exact: true }).click();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET reps = 0 WHERE data->>'word' = '(sich) treffen'"));
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem'))
    .toHaveText(['sich treffen', 'treffen']);
  await expect(page.getByText('Listening locked', { exact: true })).toBeVisible();
});

test('re-extracts cached vocabulary using transcript exclusions without fetching the story again', async ({ page }) => {
  test.setTimeout(150000);
  await addSource(page);
  await readyWords(SOURCE, ['sehen']);
  await createCard({ cardId: 'unreviewed-wir', sourceId: SOURCE, readiness: 'READY', reps: 0,
    data: { word: 'wir', type: 'PRONOUN', translation: { hu: 'mi' } } });
  await prepare(page);
  await cachedWords([
    { lemma: 'ihr', wordType: 'pronoun' },
    { lemma: 'wir', wordType: 'personal_pronoun' },
    { lemma: 'der', wordType: 'definite article' },
    { lemma: 'ein', wordType: 'article' },
    { lemma: 'mein', wordType: 'possessive-determiner' },
    { lemma: 'alles', wordType: 'indefinite pronoun' },
    { lemma: 'Haus', wordType: 'noun' },
  ]);
  await upgradeVocabulary(page, 'Wir sehen ein Haus. Wir sehen ein Haus.');
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem'))
    .toHaveText(['Haus'], { timeout: 60000 });
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  const preparation = await withDbConnection(async db =>
    (await db.query("SELECT preparation FROM learn_language.content_items WHERE status = 'prepared'")).rows[0].preparation);
  expect(preparation.version).toBe('3');
  expect(preparation.words.map((word: { lemma: string }) => word.lemma)).toEqual(['sehen', 'Haus']);
  const extraction = await stats();
  expect(extraction.requests.filter(request => request === 'source-story')).toHaveLength(1);
  expect(extraction.requests.filter(request => request === 'story-page')).toHaveLength(1);
  expect(extraction.requests.filter(request => request === 'vocabulary')).toHaveLength(2);
  const prompt = extraction.vocabularyPrompts[1];
  expect(prompt).toContain('Ignore — do not return:');
  expect(prompt).toContain('Proper names of people, places, brands, and fictional characters.');
  expect(prompt).toContain('Numbers, dates, times, punctuation, and symbols.');
  expect(prompt).toContain('articles, pronouns,');
  expect(prompt).toContain('prepositions, conjunctions, question words, auxiliary and modal verbs');
  expect(prompt).toContain('and particles');
  expect(prompt).toContain('Interjections, fillers, and greetings');
  expect(prompt).toContain('Absolute beginner (A1) words');
  expect(prompt).toContain('Anything garbled, misspelled beyond recognition, or not German.');
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  await page.getByRole('button', { name: 'Mark as known (1)', exact: true }).click();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('accepts an empty AI vocabulary result and allows playback when nothing is worth learning', async ({ page }) => {
  test.setTimeout(150000);
  await mockYouTube(page);
  await addSource(page);
  await prepare(page);
  await upgradeVocabulary(page, 'Hallo! Wie geht es euch?');
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible({ timeout: 60000 });
  expect(await withDbConnection(async db =>
    (await db.query("SELECT preparation->'words' AS words FROM learn_language.content_items WHERE status = 'prepared'")).rows[0].words)).toEqual([]);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await listen(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByTitle('YouTube story player')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/y3CLBWZOetI');
});

test('upgrades cached vocabulary and matches feminine occurrences to masculine cards', async ({ page }) => {
  test.setTimeout(150000);
  await addSource(page);
  await prepare(page);
  await readyWords(SOURCE, ['Freund', 'Arzt', 'Lehrer']);
  await withDbConnection(async db => {
    await db.query(`UPDATE learn_language.content_items SET preparation = jsonb_set(jsonb_set(preparation,
      '{version}', '"1"'), '{transcript}', to_jsonb($1::text)) WHERE status = 'prepared'`,
      ['Meine Freundin ist Ärztin. Mein Freund ist Lehrer.']);
    await db.query("DELETE FROM learn_language.databasechangelog WHERE id = '59-content-masculine-vocabulary'");
  });
  await restartServer(page);
  await page.reload();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  const words = await withDbConnection(async db => (await db.query("SELECT preparation->'words' AS words FROM learn_language.content_items WHERE status = 'prepared'")).rows[0].words);
  expect(words.map((word: { lemma: string }) => word.lemma)).toEqual(['Freund', 'Arzt', 'Lehrer']);
  expect(words[0].surfaceForms).toEqual(['Freundin', 'Freund']);
  expect(words[0].examples).toEqual(['Meine Freundin ist Ärztin.', 'Mein Freund ist Lehrer.']);
  expect((await stats()).requests.filter(request => request === 'source-story')).toHaveLength(1);
});

test('known cards satisfy prerequisites even without study repetitions', async ({ page }) => {
  await addSource(page);
  await readyWords();
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET readiness = 'KNOWN', reps = CASE WHEN data->>'word' = 'Haus' THEN 5 ELSE 0 END WHERE source_id = $1", [SOURCE]));
  await prepare(page);
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem')).toHaveCount(0);
});

test('marks missing vocabulary known without creating cards and hides satisfied prerequisites', async ({ page }) => {
  await addSource(page);
  await readyWords(SOURCE, ['wir', 'sehen', 'ein']);
  await prepare(page);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem')).toHaveText(['Haus']);
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  await page.getByRole('button', { name: 'Mark as known (1)', exact: true }).click();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).not.toBeVisible();
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' }).getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Vocabulary prerequisites' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 4 })).toHaveCount(0);
  expect(await withDbConnection(async db => (await db.query("SELECT id FROM learn_language.cards WHERE source_id = $1 AND data->>'word' = 'Haus'", [SOURCE])).rows)).toEqual([]);
});

test('embeds the verified YouTube recording and resumes pauses, backward seeks and completion', async ({ page }) => {
  await mockYouTube(page);
  await addSource(page);
  await readyWords();
  await prepare(page);
  await listen(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  const video = page.getByTitle('YouTube story player');
  const controls = video.contentFrame();
  await expect(video).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/y3CLBWZOetI');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const slider = controls.getByRole('slider', { name: 'Playback position' });
  await slider.fill('17');
  await expect.poll(async () => withDbConnection(async db =>
    (await db.query('SELECT position FROM learn_language.listening_progress WHERE source_id = $1', [SOURCE])).rows[0]?.position)).toBe(17);
  await page.reload();
  await page.getByRole('button', { name: 'Continue from 0:17' }).click();
  await expect(slider).toHaveValue('17');
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  await controls.getByRole('button', { name: 'Pause', exact: true }).click();
  await slider.fill('4');
  await expect.poll(async () => withDbConnection(async db =>
    (await db.query('SELECT position FROM learn_language.listening_progress WHERE source_id = $1', [SOURCE])).rows[0]?.position)).toBe(4);
  await page.reload();
  await page.getByRole('button', { name: 'Continue from 0:04' }).click();
  await expect(slider).toHaveValue('4');
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  await slider.fill('39');
  await expect.poll(async () => withDbConnection(async db =>
    (await db.query('SELECT completed FROM learn_language.listening_progress WHERE source_id = $1', [SOURCE])).rows[0]?.completed)).toBe(true);
  await page.getByRole('link', { name: 'Back to Stories' }).click();
  await expect(page.getByRole('row', { name: /Brezel.*Completed/ })).toBeVisible();
  expect((await stats()).requests).toEqual(['index', 'source-index', 'story-page', 'source-story', 'vocabulary']);
});

test('does not load YouTube while locked and stops playback if prerequisites change', async ({ page }) => {
  await mockYouTube(page);
  const requests = { youtube: [] as string[] };
  page.on('request', request => {
    if (request.url().includes('youtube')) requests.youtube = [...requests.youtube, request.url()];
  });
  await addSource(page);
  await prepare(page);
  await listen(page);
  await expect(page.getByText('Listening locked', { exact: true })).toBeVisible();
  expect(requests.youtube).toEqual([]);
  await readyWords();
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  const video = page.getByTitle('YouTube story player');
  await video.contentFrame().getByRole('button', { name: 'Play', exact: true }).click();
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET readiness = 'DRAFT' WHERE source_id = $1", [SOURCE]));
  await expect(video).not.toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('alert')).toBeVisible();
});

test('shows embedding failures without pretending playback progressed', async ({ page }) => {
  await mockYouTube(page, 150);
  await addSource(page);
  await readyWords();
  await prepare(page);
  await listen(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cannot be embedded');
  await expect(page.getByRole('button', { name: 'Retry video' })).toBeVisible();
  expect(await withDbConnection(async db =>
    (await db.query('SELECT position FROM learn_language.listening_progress WHERE source_id = $1', [SOURCE])).rows[0]?.position)).toBe(0);
});

test('periodically saves playback and records the latest position when navigating away', async ({ page }) => {
  await mockYouTube(page);
  await addSource(page);
  await readyWords();
  await prepare(page);
  await listen(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  const controls = page.getByTitle('YouTube story player').contentFrame();
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  const position = () => withDbConnection(async db =>
    (await db.query('SELECT position FROM learn_language.listening_progress WHERE source_id = $1', [SOURCE])).rows[0]?.position as number);
  await expect.poll(position, { timeout: 12000 }).toBeGreaterThan(3);
  await expect.poll(async () => Number(await controls.getByRole('slider', { name: 'Playback position' }).inputValue()), { timeout: 10000 }).toBeGreaterThan(7);
  await page.getByRole('link', { name: 'Back to Stories' }).click();
  await expect.poll(position).toBeGreaterThan(6);
  await expect(page.getByRole('row', { name: /Brezel.*Continue from/ })).toBeVisible();
});

test('recovers unsent local progress after a failed save and browser reload', async ({ page }) => {
  await mockYouTube(page);
  await addSource(page);
  await readyWords();
  await prepare(page);
  await listen(page);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  const controls = page.getByTitle('YouTube story player').contentFrame();
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  await controls.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByText('Listening progress saved', { exact: true })).toBeVisible();
  await page.route('**/api/source/*/content/*/progress', route => route.abort());
  await controls.getByRole('slider', { name: 'Playback position' }).fill('22');
  await expect(page.getByRole('alert')).toContainText('Progress could not be saved');
  await page.reload();
  await page.unroute('**/api/source/*/content/*/progress');
  await page.getByRole('button', { name: /^(Listen|Continue from)/ }).click();
  await expect(controls.getByRole('slider', { name: 'Playback position' })).toHaveValue('22');
});

test('retries failed vocabulary extraction without refetching the story or repeating isolation', async ({ page }) => {
  await addSource(page);
  await fetch(`${fixtureUrl}/fail-vocabulary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: true }) });
  await stories(page);
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry preparation' })).toBeVisible({ timeout: 60000 });
  await fetch(`${fixtureUrl}/fail-vocabulary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: false }) });
  await page.getByRole('button', { name: 'Retry preparation' }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  const requests = (await stats()).requests;
  expect(requests.filter(request => request === 'story-page')).toHaveLength(1);
  expect(requests.filter(request => request === 'source-story')).toHaveLength(1);
});

test('concurrent tabs prepare once and cached vocabulary survives a server restart', async ({ page }) => {
  test.setTimeout(150000);
  await addSource(page);
  const other = await page.context().newPage();
  await Promise.all([page.goto(`/sources/${SOURCE}/content`), other.goto(`/sources/${SOURCE}/content`)]);
  await expect(page.getByRole('link', { name: 'Brezel', exact: true })).toBeVisible();
  await expect(other.getByRole('link', { name: 'Brezel', exact: true })).toBeVisible();
  expect((await stats()).requests.filter(request => request === 'source-index')).toHaveLength(1);
  const href = await page.getByRole('link', { name: 'Brezel', exact: true }).getAttribute('href');
  await Promise.all([page.goto(href!), other.goto(href!)]);
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(other.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  const before = await stats();
  expect(before.requests.filter(request => request === 'vocabulary')).toHaveLength(1);
  await other.close();
  await restartServer(page);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible();
  expect(await stats()).toEqual(before);
});

test('rejects locked sessions and stale progress writes on the server', async ({ page }) => {
  const authRequest = page.waitForRequest(request => request.url().endsWith('/api/sources') && !!request.headers()['authorization']);
  await addSource(page);
  const headers = { authorization: (await authRequest).headers()['authorization'] };
  await prepare(page);
  const contentId = page.url().split('/').slice(-1)[0];
  const api = `/api/source/${SOURCE}/content/${contentId}`;
  expect((await page.request.post(`${api}/playback`, { headers })).status()).toBe(423);
  await withDbConnection(db => db.query("UPDATE learn_language.content_items SET status = 'unprepared' WHERE id = $1", [contentId]));
  expect((await page.request.post(`${api}/playback`, { headers })).status()).toBe(423);
  await withDbConnection(db => db.query("UPDATE learn_language.content_items SET status = 'prepared' WHERE id = $1", [contentId]));
  await readyWords();
  const playback = await page.request.post(`${api}/playback`, { headers });
  const session = await playback.json();
  expect(session.kind).toBe('youtube');
  expect(session.youtubeVideoId).toBe('y3CLBWZOetI');
  expect((await page.request.put(`${api}/progress`, { headers, data: { sessionId: session.sessionId, sequence: 2, position: 10, duration: 40, completed: false } })).ok()).toBe(true);
  expect((await page.request.put(`${api}/progress`, { headers, data: { sessionId: session.sessionId, sequence: 1, position: 30, duration: 40, completed: false } })).status()).toBe(409);
});

test('a text-only extension reuses preparation without the website or YouTube', async ({ page }) => {
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'EXTRACTION', isEnabled: true, isPrimary: true });
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source Type', exact: true }).click();
  await page.getByRole('option', { name: 'Source Extension', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source Extension', exact: true }).click();
  await page.getByRole('option', { name: 'Text fixture', exact: true }).click();
  await page.getByRole('combobox', { name: 'Language Level', exact: true }).click();
  await page.getByRole('option', { name: 'A2 - Elementary', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Text fixture' }).click();
  await page.getByRole('menuitem', { name: 'Texts', exact: true }).click();
  await page.getByRole('link', { name: 'Ein gutes Haus', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  expect((await stats()).requests).toEqual(['text', 'isolation', 'vocabulary']);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Listen to Text fixture' })).not.toBeVisible();
});
