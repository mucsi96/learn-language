import { test, expect } from '../fixtures';
import { Locator, Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createCard, createSource, createCardsWithStates, getReviewLogsByCardId, getStudySessionCardsBySource, withDbConnection } from '../utils';

const expectProgress = async (progress: Locator, percent: number) => {
  await expect(progress).toBeVisible();
  await expect.poll(async () => Number(await progress.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(percent);
  await expect.poll(async () => Number(await progress.getAttribute('aria-valuenow'))).toBeLessThan(percent + 1);
};

const resetPomodoro = async (page: Page) => {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Reset Pomodoro' }).click();
};

const storedTimer = () => withDbConnection(async db => {
  const result = await db.query(`SELECT ends_at, remaining_ms, version FROM learn_language.pomodoro_timers
    WHERE user_id = '00000000-0000-0000-0000-000000000001'`);
  return result.rows[0];
});

['running', 'paused'].forEach(state => {
  test(`${state} Pomodoro survives closing the tab and restarting the backend`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.install();
    await page.goto('/sources/goethe-a1/study');
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    await expectProgress(page.getByRole('progressbar', { name: 'Study Pomodoro' }), 0);
    await page.clock.fastForward(60_000);
    if (state === 'paused') {
      await page.getByRole('button', { name: 'Profile menu' }).click();
      await page.getByRole('menuitem', { name: 'Pause Pomodoro' }).click();
      await expect.poll(async () => (await storedTimer()).remaining_ms).not.toBeNull();
    }
    const saved = await storedTimer();
    const now = await page.evaluate(() => Date.now());
    const context = page.context();
    await page.close();
    await promisify(execFile)('podman', ['restart', 'learn-language-test-server']);
    await expect.poll(async () => {
      try { return (await context.request.get('/api/environment')).status(); }
      catch { return 0; }
    }, { timeout: 90_000 }).toBe(200);

    const reopened = await context.newPage();
    await reopened.clock.setSystemTime(now + 60_000);
    await reopened.goto('/sources/goethe-a1/study');
    await expectProgress(reopened.getByRole('progressbar', { name: 'Study Pomodoro' }), state === 'paused' ? 4 : 8);
    expect(await reopened.evaluate(() => [
      sessionStorage.getItem('pomodoroEndsAt'), sessionStorage.getItem('pomodoroRemainingMs'),
    ])).toEqual([null, null]);
    await reopened.getByRole('button', { name: 'Continue study session' }).click();
    await expectProgress(reopened.getByRole('progressbar', { name: 'Study Pomodoro' }), state === 'paused' ? 4 : 8);
    expect(await storedTimer()).toEqual(saved);
    await reopened.close();
  });
});

test('backend state wins over browser storage and delayed restoration when continuing', async ({ page, request, apiHeaders }) => {
  const saved = { endsAt: null, remainingMs: 900_000, version: 0 };
  expect((await request.put('/api/pomodoro', { headers: apiHeaders, data: saved })).status()).toBe(200);
  await page.addInitScript(() => {
    sessionStorage.setItem('pomodoroEndsAt', String(Date.now() + 1_500_000));
    sessionStorage.setItem('pomodoroRemainingMs', '1');
  });
  await page.route('**/api/pomodoro', async route => {
    if (route.request().method() === 'GET') {
      await page.getByRole('button', { name: 'Start study session', exact: true }).waitFor();
    }
    await route.fallback();
  });
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expectProgress(page.getByRole('progressbar', { name: 'Study Pomodoro' }), 40);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Resume Pomodoro' })).toBeVisible();
  expect((await storedTimer()).version).toBe('1');
});

test('failed persistence keeps the running timer and allows retry', async ({ page }) => {
  await page.clock.install();
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  const timer = page.getByRole('progressbar', { name: 'Study Pomodoro' });
  await expectProgress(timer, 0);
  const saved = await storedTimer();
  await page.route('**/api/pomodoro', route => route.request().method() === 'PUT'
    ? route.fulfill({ status: 503 }) : route.fallback());
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Pause Pomodoro' }).click();
  await expect(page.getByText('Could not save Pomodoro. Please retry.', { exact: true })).toBeVisible();
  expect(await storedTimer()).toEqual(saved);
  await page.clock.fastForward(60_000);
  await expectProgress(timer, 4);
  await page.unroute('**/api/pomodoro');
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Pause Pomodoro' }).click();
  await expect.poll(async () => (await storedTimer()).remaining_ms).not.toBeNull();
  await page.reload();
  await expectProgress(timer, 4);
});

test('failed restoration offers a retry without replacing the saved timer', async ({ page, request, apiHeaders }) => {
  expect((await request.put('/api/pomodoro', {
    headers: apiHeaders, data: { endsAt: null, remainingMs: 900_000, version: 0 },
  })).status()).toBe(200);
  await page.route('**/api/pomodoro', route => route.fulfill({ status: 503 }));
  await page.goto('/sources/goethe-a1/study');
  await expect(page.getByRole('alert')).toContainText('Could not load Pomodoro.');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expect(page.getByText('Could not save Pomodoro. Please retry.', { exact: true })).toBeVisible();
  expect((await storedTimer()).version).toBe('1');
  await page.unroute('**/api/pomodoro');
  await page.getByRole('button', { name: 'Retry Pomodoro' }).click();
  await expectProgress(page.getByRole('progressbar', { name: 'Study Pomodoro' }), 40);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('restoring an expired deadline does not restart it until study is started', async ({ page, request, apiHeaders }) => {
  expect((await request.put('/api/pomodoro', {
    headers: apiHeaders, data: { endsAt: Date.now() - 60_000, remainingMs: null, version: 0 },
  })).status()).toBe(200);
  await page.goto('/sources/goethe-a1/study');
  const timer = page.getByRole('progressbar', { name: 'Study Pomodoro' });
  await expectProgress(timer, 100);
  await expect(page.getByRole('status')).toHaveText('Time for a break!');
  expect((await storedTimer()).version).toBe('1');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expectProgress(timer, 0);
  expect((await storedTimer()).version).toBe('2');
});

test('Pomodoro API isolates users, validates state and rejects stale writes', async ({ page, request, apiHeaders }) => {
  await page.goto('/');
  await withDbConnection(db => db.query(`INSERT INTO learn_language.pomodoro_timers
    (user_id, ends_at, remaining_ms, version) VALUES ('another-user', NULL, 600000, 1)`));
  const initial = await request.get('/api/pomodoro?userId=another-user', { headers: apiHeaders });
  expect(initial.headers()['cache-control']).toContain('no-store');
  expect(await initial.json()).toEqual({ endsAt: null, remainingMs: null, version: 0 });
  expect((await request.get('/api/pomodoro')).status()).toBe(401);
  const running = { endsAt: Date.now() + 1_500_000, remainingMs: null, version: 0 };
  expect((await request.put('/api/pomodoro', { headers: { Authorization: apiHeaders.Authorization }, data: running })).status()).toBe(403);
  expect((await request.put('/api/pomodoro', { headers: { ...apiHeaders, Origin: 'https://attacker.example' }, data: running })).status()).toBe(403);
  await Promise.all([
    { endsAt: null, remainingMs: null, version: 0 },
    { endsAt: 1, remainingMs: 1000, version: 0 },
    { endsAt: -1, remainingMs: null, version: 0 },
    { endsAt: null, remainingMs: 0, version: 0 },
    { endsAt: null, remainingMs: 1_500_001, version: 0 },
    { ...running, version: -1 },
    { ...running, version: null },
  ].map(async data => {
    expect((await request.put('/api/pomodoro', { headers: apiHeaders, data })).status()).toBe(400);
  }));
  const writes = await Promise.all([running, { ...running, endsAt: running.endsAt + 1000 }].map(data =>
    request.put('/api/pomodoro', { headers: apiHeaders, data })));
  expect(writes.filter(response => response.status() === 200)).toHaveLength(1);
  expect(writes.filter(response => response.status() === 409)).toHaveLength(1);
  const saved = await (await request.get('/api/pomodoro', { headers: apiHeaders })).json();
  expect((await request.put('/api/pomodoro', {
    headers: apiHeaders, data: { endsAt: null, remainingMs: 600_000, version: saved.version },
  })).status()).toBe(200);
  expect((await request.put('/api/pomodoro', { headers: apiHeaders, data: saved })).status()).toBe(409);
  expect(await (await request.get('/api/pomodoro', { headers: apiHeaders })).json()).toEqual({
    endsAt: null, remainingMs: 600_000, version: 2,
  });
  const other = await withDbConnection(db => db.query("SELECT remaining_ms, version FROM learn_language.pomodoro_timers WHERE user_id = 'another-user'"));
  expect(other.rows).toEqual([{ remaining_ms: '600000', version: '1' }]);
});

test('starting and continuing study automatically starts an inactive Pomodoro', async ({ page }) => {
  await page.clock.install();
  await page.goto('/sources/goethe-a1/study');
  const timer = page.getByRole('progressbar', { name: 'Study Pomodoro' });
  await expect(page.getByRole('button', { name: 'Start Pomodoro', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: /Pomodoro/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expectProgress(timer, 0);
  await page.clock.fastForward(25 * 60_000);
  await expectProgress(timer, 100);
  await resetPomodoro(page);
  await expectProgress(timer, 0);
  await expect(page.getByRole('status')).not.toBeVisible();

  await withDbConnection(db => db.query('DELETE FROM learn_language.pomodoro_timers'));
  await page.reload();
  await expect(timer).not.toBeVisible();
  await page.getByRole('button', { name: 'Continue study session' }).click();
  await expectProgress(timer, 0);
});

test('paused Pomodoro survives time, navigation, reload and session continuation', async ({ page }) => {
  await createSource({ id: 'other', name: 'Other', languageLevel: 'A1', cardTypes: ['VOCABULARY'] });
  await page.clock.install();
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  const timer = page.getByRole('progressbar', { name: 'Study Pomodoro' });
  await expectProgress(timer, 0);
  await page.clock.fastForward(60_000);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Pause Pomodoro' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await storedTimer()).remaining_ms).not.toBeNull();
  await expectProgress(timer, 4);
  await page.clock.fastForward(30 * 60_000);
  await expectProgress(timer, 4);
  await expect(page.getByText('Time for a break!', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Learn language', exact: true }).click();
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: /Pomodoro/ })).toHaveCount(0);
  await page.goto('/sources/other/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continue study session' }).click();
  await page.clock.fastForward(60_000);
  await expectProgress(timer, 4);
  const queue = await getStudySessionCardsBySource('other');
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Pause Pomodoro' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Resume Pomodoro' }).focus();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await storedTimer()).remaining_ms).toBeNull();
  await expect(page.getByRole('menuitem', { name: 'Resume Pomodoro' })).not.toBeVisible();
  await page.clock.fastForward(60_000);
  await expectProgress(timer, 8);
  expect(await getStudySessionCardsBySource('other')).toEqual(queue);
  await page.clock.fastForward(23 * 60_000);
  await expectProgress(timer, 100);
  await expect(page.getByRole('status')).toHaveText('Time for a break!');
});

test('resetting a paused Pomodoro starts a fresh running countdown', async ({ page }) => {
  await page.clock.install();
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  const timer = page.getByRole('progressbar', { name: 'Study Pomodoro' });
  await expectProgress(timer, 0);
  await page.clock.fastForward(60_000);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Pause Pomodoro' }).click();
  await expect.poll(async () => (await storedTimer()).remaining_ms).not.toBeNull();
  await resetPomodoro(page);
  await expectProgress(timer, 0);
  await page.reload();
  await page.clock.fastForward(60_000);
  await expectProgress(timer, 4);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Pause Pomodoro' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Resume Pomodoro' })).toHaveCount(0);
});

test('failed timer restart preserves the countdown and study queue', async ({ page }) => {
  await createCard({
    cardId: 'restart-failure', sourceId: 'goethe-a1', sourcePageNumber: 1,
    data: { word: 'lernen', type: 'VERB', translation: { en: 'learn', hu: 'tanulni' } },
  });
  await page.clock.install();
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expectProgress(page.getByRole('progressbar', { name: 'Study Pomodoro' }), 0);
  await page.clock.fastForward(60_000);
  const queue = await getStudySessionCardsBySource('goethe-a1');
  await page.route('**/study-session/restart', route => route.fulfill({ status: 500, body: 'Restart failed' }));
  const failed = page.waitForResponse('**/study-session/restart');
  await page.getByRole('button', { name: 'Profile menu' }).click();
  const restart = page.getByRole('menuitem', { name: 'Reset Pomodoro' });
  await restart.click();
  expect((await failed).status()).toBe(500);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(restart).toBeEnabled();
  await page.keyboard.press('Escape');
  await expectProgress(page.getByRole('progressbar', { name: 'Study Pomodoro' }), 4);
  expect(await getStudySessionCardsBySource('goethe-a1')).toEqual(queue);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Start new study session' })).toHaveCount(0);
});

test('a failed study session start does not start the Pomodoro', async ({ page }) => {
  await page.goto('/sources/goethe-a1/study');
  await page.route('**/api/source/goethe-a1/study-session', route =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, body: 'Session creation failed' })
      : route.fallback());
  const failed = page.waitForResponse(response =>
    response.url().endsWith('/study-session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  expect((await failed).status()).toBe(500);
  await expect(page.getByRole('button', { name: 'Start study session', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start Pomodoro', exact: true })).toHaveCount(0);
  await expect(page.getByRole('progressbar', { name: 'Study Pomodoro' })).not.toBeVisible();
});

test('Pomodoro runs independently of sources, sessions and navigation', async ({ page }) => {
  await createSource({ id: 'other', name: 'Other', languageLevel: 'A1', cardTypes: ['VOCABULARY'] });
  await createCard({
    cardId: 'pomodoro-card', sourceId: 'goethe-a1', sourcePageNumber: 1,
    data: { word: 'lernen', type: 'VERB', translation: { en: 'learn', hu: 'tanulni' } },
  });
  await page.clock.install();
  await page.goto('/');
  const timer = page.getByRole('progressbar', { name: 'Study Pomodoro' });
  const restart = page.getByRole('menuitem', { name: 'Reset Pomodoro' });
  await expect(timer).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Pomodoro', exact: true })).toHaveCount(0);
  await page.goto('/sources/goethe-a1/study?view=cards#study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expectProgress(timer, 0);
  await page.clock.fastForward(60_000);
  await expectProgress(timer, 4);
  await page.goto('/sources/goethe-a1/study');
  const started = page.waitForResponse(response =>
    response.url().endsWith('/study-session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue study session' }).click();
  const original = await (await started).json();
  await expectProgress(timer, 4);
  await expect(page.getByRole('main').getByRole('button', { name: 'Start new study session' })).toHaveCount(0);

  await page.reload();
  const continued = page.waitForResponse(response =>
    response.url().endsWith('/study-session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue study session' }).click();
  expect(await (await continued).json()).toEqual(original);
  await expectProgress(timer, 4);

  await page.goto('/sources/other/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await expectProgress(timer, 4);
  await resetPomodoro(page);
  await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
  await expectProgress(timer, 0);

  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Continue study session' }).click();
  await expect(page.getByRole('article', { name: 'Flashcard' })).toBeVisible();
  await page.clock.fastForward(25 * 60_000);
  await expectProgress(timer, 100);
  await expect(timer).toHaveCSS('animation-name', /pomodoro-blink$/);
  await expect(page.getByRole('status')).toHaveText('Time for a break!');
  await page.clock.fastForward(60_000);
  await expectProgress(timer, 100);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(timer).toHaveCSS('animation-name', 'none');

  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: /Pause Pomodoro|Resume Pomodoro/ })).toHaveCount(0);
  await restart.focus();
  await page.keyboard.press('Enter');
  await expectProgress(timer, 0);
  await expect(timer).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('status')).not.toBeVisible();
  expect(await getStudySessionCardsBySource('goethe-a1')).toHaveLength(1);
  await expect(page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'tanulni' })).toBeVisible();
  await page.getByRole('link', { name: 'Learn language', exact: true }).click();
  await expect(timer).toHaveCount(0);
  await expect(restart).toHaveCount(0);
  await page.clock.fastForward(60_000);
  const queue = await getStudySessionCardsBySource('goethe-a1');
  await page.goto('/sources/goethe-a1/study');
  await expectProgress(timer, 4);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await restart.focus();
  await page.keyboard.press('Space');
  await expectProgress(timer, 0);
  expect(await getStudySessionCardsBySource('goethe-a1')).toEqual(queue);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Sources', exact: true }).click();
  await expect(page).toHaveURL('/sources');
  await expect(timer).toHaveCount(0);
  await expect(restart).toHaveCount(0);
  await page.clock.fastForward(25 * 60_000);
  await expect(page.getByText('Time for a break!', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL('/settings/voices');
  await expect(timer).toHaveCount(0);
  await expect(restart).toHaveCount(0);
  await expect(page.getByText('Time for a break!', { exact: true })).toHaveCount(0);
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL('/sources/goethe-a1/study');
  await expectProgress(timer, 100);
  await expect(page.getByRole('status')).toHaveText('Time for a break!');
});

[
  { width: 1024, height: 768, top: 24 },
  { width: 768, height: 1024, top: 24 },
  { width: 390, height: 844, top: 47 },
].forEach(({ width, height, top }) => {
  test(`header controls stay inside the safe area at ${width}x${height}`, async ({ page }) => {
    await createCardsWithStates('goethe-a1', [
      { state: 'NEW', count: 30, due_date: new Date(Date.now() - 86400000) },
    ]);
    await page.setViewportSize({ width, height });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, left: 0, right: 0, bottom: 0 } });
    await page.goto('/sources/goethe-a1/study');
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    const navigation = page.getByRole('navigation');
    const progress = page.getByRole('progressbar', { name: 'Study Pomodoro' });
    await expect(progress).toBeVisible();
    const progressBounds = await progress.boundingBox();
    expect(progressBounds!.x).toBe(0);
    expect(progressBounds!.width).toBe(width);
    expect(progressBounds!.y + progressBounds!.height).toBe(height);
    await expect(page.getByRole('timer')).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content'))).toBe('default');
    await Promise.all([
      navigation.getByRole('link', { name: 'Learn language', exact: true }),
      navigation.getByRole('button', { name: 'Profile menu' }),
    ].map(async control => {
      await expect(control).toBeVisible();
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(top);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const dots = page.getByRole('group', { name: 'Due cards', exact: true });
    await expect(dots.getByRole('img', { name: 'State: New', exact: true })).toHaveCount(30);
    await expect(dots).toBeInViewport({ ratio: 1 });
    await expect(navigation.getByRole('group', { name: 'Due cards', exact: true })).toHaveCount(0);
    await navigation.getByRole('button', { name: 'Profile menu' }).click();
    await expect(page.getByRole('menuitem', { name: 'Reset Pomodoro' })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeVisible();
  });
});

test('new same-day session selects remaining due cards and preserves completed reviews', async ({ page }) => {
  await createSource({ id: 'limited', name: 'Limited', languageLevel: 'A1', cardTypes: ['VOCABULARY'], cardLimit: 1 });
  await Promise.all(['first', 'second'].map((id, index) => createCard({
    cardId: id, sourceId: 'limited', sourcePageNumber: 1,
    data: { word: id, type: 'NOUN', translation: { en: id, hu: id } },
    state: 'REVIEW', stability: 10, difficulty: 5, reps: 3,
    lastReview: new Date(), elapsedDays: 1, scheduledDays: 10,
    due: new Date(Date.now() - (2 - index) * 86_400_000),
  })));
  await page.goto('/sources/limited/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'first' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
  const reviews = await getReviewLogsByCardId('first');
  expect(reviews).toHaveLength(1);
  await resetPomodoro(page);
  await expect(page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'second' })).toBeVisible();
  expect(await getReviewLogsByCardId('first')).toEqual(reviews);
  expect(await getStudySessionCardsBySource('limited')).toHaveLength(1);

  await page.reload();
  await page.getByRole('button', { name: 'Continue study session' }).click();
  await resetPomodoro(page);
  await expect(page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'second' })).toBeVisible();
});

['button', 'keyboard'].forEach(input => {
  test(`restart waits for an in-flight ${input} grade`, async ({ page }) => {
    await createSource({ id: 'limited', name: 'Limited', languageLevel: 'A1', cardTypes: ['VOCABULARY'], cardLimit: 1 });
    await Promise.all(['first', 'second'].map((id, index) => createCard({
      cardId: id, sourceId: 'limited', sourcePageNumber: 1,
      data: { word: id, type: 'NOUN', translation: { en: id, hu: id } },
      state: 'REVIEW', stability: 10, difficulty: 5, reps: 3,
      lastReview: new Date(), elapsedDays: 1, scheduledDays: 10,
      due: new Date(Date.now() - (2 - index) * 86_400_000),
    })));
    await page.goto('/sources/limited/study');
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    const restart = page.getByRole('menuitem', { name: 'Reset Pomodoro' });
    await page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'first' }).click();
    await page.route('**/api/card/first', async route => {
      await page.getByRole('button', { name: 'Profile menu' }).click();
      await expect(restart).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
      await route.fallback();
    });
    if (input === 'button') {
      await page.getByRole('button', { name: 'Correct', exact: true }).click();
    } else {
      await page.keyboard.press('k');
    }
    await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
    expect(await getReviewLogsByCardId('first')).toHaveLength(1);
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await expect(restart).toBeEnabled();
    await restart.click();
    await expect(page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'second' })).toBeVisible();
  });
});

test('restart stops old-card audio even when the new queue is empty', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperties(HTMLMediaElement.prototype, {
      load: { value() {} },
      play: { value() { Reflect.set(window, 'playingStudyAudio', true); return Promise.resolve(); } },
      pause: { value() { Reflect.set(window, 'playingStudyAudio', false); } },
    });
  });
  await page.route('**/api/audio/pomodoro-audio', route => route.fulfill({ contentType: 'audio/mpeg', body: 'audio' }));
  await createCard({
    cardId: 'audio-card', sourceId: 'goethe-a1', sourcePageNumber: 1,
    data: {
      word: 'lernen', type: 'VERB', translation: { en: 'learn', hu: 'tanulni' },
      audio: [{ id: 'pomodoro-audio', text: 'lernen', selected: true, language: 'de' }],
    },
  });
  await page.goto('/sources/goethe-a1/study');
  const audioResponse = page.waitForResponse('**/api/audio/pomodoro-audio');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await audioResponse;
  await page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'tanulni' }).click();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'playingStudyAudio'))).toBe(true);
  await withDbConnection(client => client.query("UPDATE learn_language.cards SET due = NOW() + INTERVAL '7 days' WHERE id = 'audio-card'"));
  await page.route('**/study-session/restart', async route => {
    expect(await page.evaluate(() => Reflect.get(window, 'playingStudyAudio'))).toBe(false);
    await route.fallback();
  });
  await resetPomodoro(page);
  await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'playingStudyAudio'))).toBe(false);
});
