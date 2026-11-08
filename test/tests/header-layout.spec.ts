import { test, expect } from '../fixtures';
import { createCard, createSource } from '../utils';

[
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
].forEach((viewport) => {
  test(`study controls stay in the header at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await createCard({
      cardId: 'header-card', sourceId: 'goethe-a1', sourcePageNumber: 1,
      data: { word: 'lernen', translation: { hu: 'tanulni' } },
    });
    await createSource({ id: 'other', name: 'Other', languageLevel: 'A1', cardTypes: ['VOCABULARY'] });
    await page.goto('/sources/goethe-a1/study');
    const header = page.getByRole('banner');
    const source = header.getByRole('button', { name: 'Goethe A1', exact: true });
    const dots = header.getByRole('group', { name: 'Due cards' });
    const timer = header.getByRole('button', { name: 'Start Pomodoro', exact: true });
    await expect(source).toBeVisible();
    await expect(dots.getByRole('img', { name: 'State: New', exact: true })).toHaveCount(1);
    await expect(timer).toBeVisible();
    await expect(header.getByRole('button', { name: 'Profile menu' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('group', { name: 'Due cards' })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    if (viewport.width === 1440) {
      const boxes = await Promise.all([
        header.getByRole('link', { name: 'Learn language' }), dots, source, timer,
        header.getByRole('button', { name: 'Profile menu' }),
      ].map((element) => element.boundingBox()));
      expect(boxes.every((box) => box !== null)).toBe(true);
      expect(boxes.slice(1).every((box, index) => box!.x >= boxes[index]!.x + boxes[index]!.width)).toBe(true);
      expect(boxes.every((box) => Math.abs(box!.y + box!.height / 2 - 32) < 2)).toBe(true);
    }
    await source.click();
    await page.getByRole('menuitem', { name: 'Other', exact: true }).click();
    await expect(header.getByRole('button', { name: 'Other', exact: true })).toBeVisible();
    await expect(dots.getByRole('img', { name: 'State: New', exact: true })).toHaveCount(0);
    await header.getByRole('link', { name: 'Learn language' }).click();
    await expect(timer).toHaveCount(0);
    await expect(dots).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Other', exact: true })).toHaveCount(0);
  });
});

test('source navigation remains in the header across pages, JSON imports, and card lists', async ({ page }) => {
  await createSource({ id: 'json-practice', name: 'JSON practice', sourceType: 'JSON', languageLevel: 'A1', cardTypes: ['SIMPLE'] });
  const header = page.getByRole('banner');
  await page.goto('/sources/goethe-a1/page/9');
  await header.getByRole('button', { name: 'Goethe A1', exact: true }).click();
  await page.getByRole('menuitem', { name: 'JSON practice', exact: true }).click();
  await expect(page).toHaveURL('/sources/json-practice/json');
  await header.getByRole('button', { name: 'JSON practice', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Goethe A2', exact: true }).click();
  await expect(page).toHaveURL('/sources/goethe-a2/page/8');
  await page.goto('/sources/json-practice/cards');
  await header.getByRole('button', { name: 'JSON practice', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Goethe A1', exact: true }).click();
  await expect(page).toHaveURL('/sources/goethe-a1/cards');
  await expect(header.getByRole('button', { name: 'Goethe A1', exact: true })).toBeVisible();
});
