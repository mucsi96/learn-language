import { test, expect } from '../fixtures';
import { createCard } from '../utils';

[
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
].forEach(({ width, height }) => {
  test(`vocabulary study fits the safe viewport at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 24, bottom: 20, left: 0, right: 0 },
    });
    await createCard({
      cardId: 'layout-card', sourceId: 'goethe-a1', sourcePageNumber: 1,
      data: {
        word: 'die Entscheidung', type: 'NOUN', gender: 'FEMININE',
        translation: { en: 'decision', hu: 'döntés' }, forms: ['die Entscheidungen'],
        examples: [{
          de: 'Wir müssen heute eine wichtige Entscheidung treffen.',
          hu: 'Ma egy fontos döntést kell hoznunk.', isSelected: true,
          images: [{ id: 'layout-image', isFavorite: true }],
        }],
      },
    });
    await page.route('**/api/image/layout-image', route => route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="teal"/></svg>',
    }));
    await page.goto('/sources/goethe-a1/study');
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    const card = page.getByRole('article', { name: 'Flashcard' });
    await expect(card.getByRole('heading', { name: 'döntés' })).toBeVisible();
    const assertFits = async () => {
      expect(await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }))).toEqual({ width, height });
      expect(await page.getByRole('main').evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
      expect(await card.evaluate(element => [element, ...element.querySelectorAll('*')]
        .every(child => child.scrollHeight <= child.clientHeight + 1 || getComputedStyle(child).overflowY === 'hidden'))).toBe(true);
      await expect(card.getByRole('img')).toBeVisible();
    };
    await assertFits();
    await card.getByRole('heading', { name: 'döntés' }).click();
    await expect(card.getByRole('heading', { name: 'die Entscheidung' })).toBeVisible();
    await expect(card.getByText('die Entscheidungen', { exact: true })).toBeVisible();
    await assertFits();
    const correct = page.getByRole('button', { name: 'Correct', exact: true });
    await expect(correct).toBeInViewport({ ratio: 1 });
    const bounds = await correct.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height - 20);
    await page.screenshot({ path: testInfo.outputPath('top.png') });
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const profile = page.getByRole('button', { name: 'Profile menu' });
    expect((await profile.boundingBox())!.y).toBeGreaterThanOrEqual(24);
    await page.screenshot({ path: testInfo.outputPath('scrolled.png') });
    await profile.click();
    await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeVisible();
  });
});

test('long mobile vocabulary cards retain their image while scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: 24, bottom: 20, left: 0, right: 0 },
  });
  const example = 'Wir müssen heute eine wichtige Entscheidung treffen. '.repeat(12);
  await createCard({
    cardId: 'long-layout-card', sourceId: 'goethe-a1', sourcePageNumber: 1,
    data: {
      word: 'die Entscheidung', type: 'NOUN', gender: 'FEMININE',
      translation: { en: 'decision', hu: 'döntés' }, forms: ['die Entscheidungen'],
      examples: [{
        de: example, hu: 'Ma egy fontos döntést kell hoznunk.', isSelected: true,
        images: [{ id: 'long-layout-image', isFavorite: true }],
      }],
    },
  });
  await page.route('**/api/image/long-layout-image', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="teal"/><text x="400" y="300" text-anchor="middle" font-size="48" fill="white">Vocabulary image</text></svg>',
  }));
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  const card = page.getByRole('article', { name: 'Flashcard' });
  await card.getByRole('heading', { name: 'döntés' }).click();
  const image = card.getByRole('img');
  await expect(image).toBeInViewport({ ratio: 1 });
  expect((await image.boundingBox())!.height).toBeGreaterThan(100);
  const profile = page.getByRole('button', { name: 'Profile menu' });
  const headerBounds = await profile.boundingBox();
  await page.screenshot({ path: testInfo.outputPath('top.png') });
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 2000);
  await expect.poll(async () => (await image.boundingBox())!.y).toBeLessThan(0);
  expect(await profile.boundingBox()).toEqual(headerBounds);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('scrolled.png') });
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeInViewport({ ratio: 1 });
  expect((await image.boundingBox())!.height).toBeGreaterThan(100);
});
