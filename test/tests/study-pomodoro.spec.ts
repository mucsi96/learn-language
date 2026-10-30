import { test, expect } from '../fixtures';
import { createCard, createSource, getReviewLogsByCardId, getStudySessionCardsBySource, withDbConnection } from '../utils';

test('Pomodoro survives continuing, blinks at zero, and resets for a new session', async ({ page }) => {
  await createCard({
    cardId: 'pomodoro-card', sourceId: 'goethe-a1', sourcePageNumber: 1,
    data: { word: 'lernen', type: 'VERB', translation: { en: 'learn', hu: 'tanulni' } },
  });
  await page.goto('/sources/goethe-a1/study');
  const timer = page.getByRole('timer', { name: 'Study Pomodoro' });
  const restart = page.getByRole('navigation').getByRole('button', { name: 'Start new study session' });
  await expect(timer).not.toBeVisible();
  const started = page.waitForResponse(response =>
    response.url().endsWith('/study-session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  const original = await (await started).json();
  await expect(timer).toHaveText(/^\s*(25:00|24:5\d)\s*$/);
  await expect(restart).toContainText(/^\s*(25:00|24:5\d)\s*$/);
  await expect(page.getByRole('main').getByRole('button', { name: 'Start new study session' })).toHaveCount(0);

  await page.clock.install({ time: original.pomodoroEndsAt - 25 * 60_000 });
  await page.clock.fastForward(60_000);
  await expect(timer).toHaveText('24:00');
  await page.reload();
  const continued = page.waitForResponse(response =>
    response.url().endsWith('/study-session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue study session' }).click();
  expect(await (await continued).json()).toEqual(original);
  await expect(timer).toHaveText(/^\s*(23:5\d|24:00)\s*$/);

  await page.clock.fastForward(25 * 60_000);
  await expect(timer).toHaveText('00:00');
  await expect(timer).toHaveCSS('animation-name', /pomodoro-blink$/);
  await expect(page.getByRole('status')).toHaveText('Time for a break!');
  await page.clock.fastForward(60_000);
  await expect(timer).toHaveText('00:00');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(timer).toHaveCSS('animation-name', 'none');

  await page.clock.setSystemTime(Date.now());
  const restarted = page.waitForResponse(response => response.url().endsWith('/study-session/restart'));
  await restart.focus();
  await page.keyboard.press('Enter');
  const fresh = await (await restarted).json();
  expect(fresh.sessionId).not.toBe(original.sessionId);
  expect(fresh.pomodoroEndsAt).toBeGreaterThan(original.pomodoroEndsAt);
  await expect(timer).toHaveText(/^\s*(25:00|24:5\d)\s*$/);
  await expect(timer).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('status')).not.toBeVisible();
  await expect(page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'tanulni' })).toBeVisible();
  await page.getByRole('link', { name: 'Learn language', exact: true }).click();
  await expect(timer).not.toBeVisible();
  await expect(restart).not.toBeVisible();
});

[
  { width: 1024, height: 768, top: 24 },
  { width: 768, height: 1024, top: 24 },
  { width: 390, height: 844, top: 47 },
].forEach(({ width, height, top }) => {
  test(`header controls stay inside the safe area at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, left: 0, right: 0, bottom: 0 } });
    await page.goto('/sources/goethe-a1/study');
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    const navigation = page.getByRole('navigation');
    const restart = navigation.getByRole('button', { name: 'Start new study session' });
    await expect(restart).toBeEnabled();
    const headerBounds = await navigation.evaluate(element => element.parentElement!.getBoundingClientRect().toJSON());
    expect(headerBounds.y).toBe(top);
    if (width >= 768) {
      expect(headerBounds.height).toBe(65);
    }
    expect(await page.evaluate(() => document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content'))).toBe('default');
    await Promise.all([
      navigation.getByRole('link', { name: 'Learn language', exact: true }),
      restart,
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
    await navigation.getByRole('button', { name: 'Profile menu' }).click();
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
  await page.getByRole('button', { name: 'Start new study session' }).click();
  await expect(page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'second' })).toBeVisible();
  expect(await getReviewLogsByCardId('first')).toEqual(reviews);
  expect(await getStudySessionCardsBySource('limited')).toHaveLength(1);

  await page.reload();
  await page.getByRole('button', { name: 'Continue study session' }).click();
  await page.getByRole('button', { name: 'Start new study session' }).click();
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
    const restart = page.getByRole('button', { name: 'Start new study session' });
    await page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'first' }).click();
    await page.route('**/api/card/first', async route => {
      await expect(restart).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeDisabled();
      await route.continue();
    });
    if (input === 'button') {
      await page.getByRole('button', { name: 'Correct', exact: true }).click();
    } else {
      await page.keyboard.press('k');
    }
    await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
    expect(await getReviewLogsByCardId('first')).toHaveLength(1);
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
    await route.continue();
  });
  await page.getByRole('button', { name: 'Start new study session' }).click();
  await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'playingStudyAudio'))).toBe(false);
});
