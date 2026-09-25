import { Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test, expect } from '../fixtures';
import { createCard, createChatModelSetting, createSourceGroup, setSourceGroup, withDbConnection } from '../utils';
import { mockYouTube } from '../youtube';

const SOURCE = 'deutsch-lernen-durch-horen-a1-a2';
const NAME = 'Deutsch lernen durch Hören A1–A2';
const fixtureUrl = 'http://localhost:3070/content-fixtures';
const stats = async (): Promise<{ requests: string[]; vocabularyInputs: string[] }> => (await fetch(`${fixtureUrl}/stats`)).json();

async function addSource(page: Page) {
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'EXTRACTION', isEnabled: true, isPrimary: true });
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source Type', exact: true }).click();
  await page.getByRole('option', { name: 'Source Extension', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source Extension', exact: true }).click();
  await page.getByRole('option', { name: NAME, exact: true }).click();
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

async function readyWords(sourceId = SOURCE, words = ['wir', 'sehen', 'ein', 'Haus']) {
  await Promise.all(words.map(word => createCard({
    cardId: `${sourceId}-${word}`, sourceId, readiness: 'READY', reps: 1,
    data: { word, type: 'NOUN', translation: { hu: word } },
  })));
}

async function listen(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: `Listen to ${NAME}`, exact: true }).click();
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
}

test('discovers website stories lazily and caches vocabulary without glossary or unrelated text', async ({ page }) => {
  await addSource(page);
  expect((await stats()).requests).toEqual([]);
  await stories(page);
  await expect(page.getByRole('row', { name: /209 Brezel 2:55 A1-A2/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /294 Zwillinge 2:49 A1-A2/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Unlisted story' })).not.toBeVisible();
  expect((await stats()).requests).toEqual(['index']);
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('checkbox', { name: 'Gespenst' })).not.toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Marmelade' })).not.toBeVisible();
  await page.getByText('Transcript used', { exact: true }).click();
  await expect(page.getByText('Wir sehen ein Haus. Wir sehen ein Haus.', { exact: true })).toBeVisible();
  const first = await stats();
  expect(first.requests).toEqual(['index', 'story-page', 'isolation', 'vocabulary']);
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
  expect((await stats()).requests).toEqual(['index']);
});

test('filters group cards and requires every extracted word to be ready and studied', async ({ page }) => {
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
  await expect(page.getByText('sehen — Card not ready', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Haus', exact: true }).check();
  await page.getByRole('button', { name: 'Create drafts (1)' }).click();
  await expect(page.getByText('Haus — Card not ready', { exact: true })).toBeVisible();
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET readiness = 'READY' WHERE source_id IN ($1, 'goethe-a1')", [SOURCE]));
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByText('Haus — Not yet studied', { exact: true })).toBeVisible();
  await expect(page.getByText('Listening locked', { exact: true })).toBeVisible();
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET reps = 1 WHERE source_id IN ($1, 'goethe-a1')", [SOURCE]));
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByText('Ready to listen', { exact: true })).toBeVisible();
  await setSourceGroup(SOURCE, null);
  await page.getByRole('button', { name: 'Refresh prerequisites' }).click();
  await expect(page.getByRole('checkbox', { name: 'sehen', exact: true })).toBeVisible();
  expect((await stats()).requests.filter(request => request === 'vocabulary')).toHaveLength(1);
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
  expect((await stats()).requests).toEqual(['index', 'story-page', 'isolation', 'vocabulary']);
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
  expect(requests.filter(request => request === 'isolation')).toHaveLength(1);
});

test('concurrent tabs prepare once and cached vocabulary survives a server restart', async ({ page }) => {
  test.setTimeout(150000);
  await addSource(page);
  await stories(page);
  const href = await page.getByRole('link', { name: 'Brezel', exact: true }).getAttribute('href');
  const other = await page.context().newPage();
  await Promise.all([page.goto(href!), other.goto(href!)]);
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(other.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  const before = await stats();
  expect(before.requests.filter(request => request === 'vocabulary')).toHaveLength(1);
  await other.close();
  await promisify(execFile)('podman', ['restart', 'learn-language-test-server']);
  await expect.poll(async () => (await page.request.get('/api/environment')).status(), { timeout: 90000 }).toBe(200);
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
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Text fixture' }).click();
  await page.getByRole('menuitem', { name: 'Texts', exact: true }).click();
  await page.getByRole('link', { name: 'Ein gutes Haus', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Haus', exact: true })).toBeVisible({ timeout: 60000 });
  expect((await stats()).requests).toEqual(['text', 'isolation', 'vocabulary']);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Listen to Text fixture' })).not.toBeVisible();
});
