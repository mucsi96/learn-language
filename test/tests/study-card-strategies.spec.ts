import { test, expect } from '../fixtures';
import { createCard, createSource } from '../utils';
import { resolve } from 'node:path';

const examples = [{
  de: 'Die Tabelle deckte das Thema nicht ab.',
  hu: 'A táblázat nem fedte le a témát.',
  isSelected: true,
  images: [{ id: 'strategy-image', isFavorite: true }],
}];

const strategies = [
  {
    type: 'VOCABULARY', front: 'lefed, befed', back: 'abdecken',
    data: {
      word: 'abdecken', type: 'VERB', forms: ['deckt ab', 'deckte ab', 'hat abgedeckt'],
      translation: { en: 'to cover', hu: 'lefed, befed' }, examples,
    },
  },
  {
    type: 'SPEECH', front: examples[0].hu, back: examples[0].de,
    data: { examples },
  },
  {
    type: 'GRAMMAR', front: 'Legszívesebben Olaszországba utazna.', back: 'würde',
    data: {
      examples: [{ de: 'Er [würde] am liebsten nach Italien reisen.', hu: 'Legszívesebben Olaszországba utazna.', isSelected: true }],
    },
  },
  {
    type: 'SIMPLE', front: 'Run a temporary interactive busybox pod', back: 'kubectl run reference',
    data: {
      frontText: 'Run a **temporary** interactive busybox pod (deleted automatically when it exits) that runs `wget -O- 192.0.2.10:80`',
      backText: "```bash\nkubectl run busybox --image=busybox --rm -it --restart=Never -- wget -O- 192.0.2.10:80\n```\n\n`--rm` deletes the pod right after it exits; `-it` shows the output interactively; `--restart=Never` sets `restartPolicy: Never` so the pod actually terminates when the command finishes (needed for `--rm` to kick in). Ideal for one-off connectivity checks and throwaway commands, e.g. `-- /bin/sh -c 'echo hello world'`.\n\n[kubectl run reference](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run)",
      category: 'Core Concepts - 13%',
    },
  },
];

[
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
].forEach(({ width, height }) => {
  strategies.forEach(({ type, front, back, data }) => {
    test(`${type} keeps its card and grading controls inside ${width}x${height}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', {
        insets: { top: 24, bottom: 20, left: 0, right: 0 },
      });
      await createSource({ id: 'layout', name: 'Study layout', languageLevel: 'A1', cardTypes: [type] });
      await createCard({ cardId: 'strategy-card', sourceId: 'layout', cardType: type, data });
      await page.route('**/api/image/strategy-image', route => route.fulfill({
        path: process.env.STUDY_SCREENSHOT_IMAGE ?? resolve(__dirname, '../images/yellow600.jpg'),
      }));
      await page.goto('/sources/layout/study');
      await page.getByRole('button', { name: 'Start study session', exact: true }).click();
      const card = page.getByRole('article', { name: 'Flashcard' });
      const prompt = card.getByText(front, { exact: type !== 'SIMPLE' });
      await expect(prompt).toBeVisible();
      await expect(card).toBeInViewport({ ratio: 1 });
      if (type === 'VOCABULARY' || type === 'SPEECH') {
        await expect(card.getByRole('img')).toBeInViewport({ ratio: 1 });
      }
      const profile = page.getByRole('button', { name: 'Profile menu' });
      const headerBounds = await profile.boundingBox();
      await prompt.click();
      await expect(card.getByText(back, { exact: true })).toBeVisible();
      const correct = page.getByRole('button', { name: 'Correct', exact: true });
      await expect(correct).toBeInViewport({ ratio: 1 });
      const gradeBounds = await correct.boundingBox();
      expect(gradeBounds!.y + gradeBounds!.height).toBeLessThanOrEqual(height - 20);
      const incorrectBounds = await page.getByRole('button', { name: 'Incorrect', exact: true }).boundingBox();
      const cardBounds = await card.evaluate(element => element.parentElement!.getBoundingClientRect().toJSON());
      const actions = page.getByRole('button', { name: 'Card actions', exact: true });
      await expect(actions).toBeInViewport({ ratio: 1 });
      const actionBounds = await actions.boundingBox();
      expect(actionBounds!.x + actionBounds!.width).toBeCloseTo(cardBounds!.x + cardBounds!.width, 0);
      expect(actionBounds!.x).toBeGreaterThan(gradeBounds!.x + gradeBounds!.width);
      if (width >= 768) {
        expect(incorrectBounds!.x).toBeGreaterThan(cardBounds!.x + cardBounds!.width / 3);
        expect(gradeBounds!.x + gradeBounds!.width - incorrectBounds!.x).toBeCloseTo(420, 0);
      } else {
        expect(incorrectBounds!.x).toBe(cardBounds!.x);
      }
      expect(incorrectBounds!.y).toBe(gradeBounds!.y);
      expect(incorrectBounds!.height).toBe(gradeBounds!.height);
      expect(Math.abs(incorrectBounds!.width - gradeBounds!.width)).toBeLessThan(1);
      expect(gradeBounds!.height).toBeGreaterThanOrEqual(width >= 768 ? 48 : 44);
      expect(gradeBounds!.y - cardBounds!.y - cardBounds!.height).toBeCloseTo(16, 0);
      expect(cardBounds!.x).toBe(16);
      expect(width - cardBounds!.x - cardBounds!.width).toBe(16);
      if (width >= 768 && (type === 'VOCABULARY' || type === 'SPEECH')) {
        const image = card.getByRole('img');
        const imageBounds = await image.boundingBox();
        expect(imageBounds!.x).toBe(cardBounds!.x);
        expect(imageBounds!.y).toBe(cardBounds!.y);
        expect(imageBounds!.height).toBe(cardBounds!.height);
        expect(imageBounds!.width).toBeCloseTo(cardBounds!.width * 0.55, 0);
        await expect(image).toHaveCSS('object-fit', 'cover');
        expect(await card.evaluate(element => [...element.querySelectorAll('*'), element.parentElement!]
          .every(child => child.scrollHeight <= child.clientHeight))).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath('top.png') });
      await page.mouse.move(width / 2, height / 2);
      await page.mouse.wheel(0, 2000);
      await card.getByText(back, { exact: true }).scrollIntoViewIfNeeded();
      await expect(card.getByText(back, { exact: true })).toBeInViewport();
      expect(await profile.boundingBox()).toEqual(headerBounds);
      expect(await correct.boundingBox()).toEqual(gradeBounds);
      expect(await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        scroll: window.scrollY,
      }))).toEqual({ width, height, scroll: 0 });
      expect(await page.getByRole('main').evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('scrolled.png') });
      await correct.click();
      await expect(page.getByRole('button', { name: 'Correct', exact: true })).not.toBeVisible();
    });
  });
});

strategies.forEach(({ type, front, data }) => {
  test(`${type} long content scrolls within the card on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const longText = `${'Das ist ein ausführliches Beispiel. '.repeat(40)} Ende.`;
    const longData = type === 'SIMPLE'
      ? { ...data, backText: longText }
      : { ...data, examples: [{ ...examples[0], hu: type === 'VOCABULARY' ? examples[0].hu : front, de: longText }] };
    await createSource({ id: 'layout', name: 'Study layout', languageLevel: 'A1', cardTypes: [type] });
    await createCard({ cardId: 'long-card', sourceId: 'layout', cardType: type, data: longData });
    await page.route('**/api/image/strategy-image', route => route.fulfill({ path: resolve(__dirname, '../images/yellow600.jpg') }));
    await page.goto('/sources/layout/study');
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    const card = page.getByRole('article', { name: 'Flashcard' });
    await card.getByText(front, { exact: type !== 'SIMPLE' }).click();
    const profile = page.getByRole('button', { name: 'Profile menu' });
    const headerBounds = await profile.boundingBox();
    const correct = page.getByRole('button', { name: 'Correct', exact: true });
    await expect(correct).toBeInViewport({ ratio: 1 });
    const gradeBounds = await correct.boundingBox();
    if (type === 'VOCABULARY' || type === 'SPEECH') {
      expect((await card.getByRole('img').boundingBox())!.height).toBeGreaterThan(100);
    }
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 10000);
    await expect.poll(() => card.evaluate(element => element.parentElement!.scrollTop)).toBeGreaterThan(0);
    expect(await profile.boundingBox()).toEqual(headerBounds);
    expect(await correct.boundingBox()).toEqual(gradeBounds);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await correct.click();
    await expect(correct).not.toBeVisible();
  });
});
