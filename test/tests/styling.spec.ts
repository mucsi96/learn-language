import { test, expect } from '../fixtures';
import { createCard, createSource, createSourceGroup, setSourceGroup, withDbConnection } from '../utils';

test('profile links use menu styling and retain keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile menu' }).click();
  const menu = page.getByRole('menu', { name: 'Profile menu' });
  const sources = menu.getByRole('menuitem', { name: 'Sources', exact: true });
  await expect(sources).toHaveCSS('text-decoration-line', 'none');
  await expect(sources).toHaveCSS('color', await menu.evaluate(element => getComputedStyle(element).color));
  await expect(menu).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('ArrowDown');
  await expect(sources).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/sources');
  await expect(page.getByRole('button', { name: 'Add Source', exact: true })).toBeVisible();
});

test('PDF text scales with its page instead of overlapping on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/sources/goethe-a1/page/9');
  const content = page.getByRole('region', { name: 'Page content', exact: true });
  const word = content.getByText('die Abfahrt', { exact: true });
  await expect(word).toBeVisible();
  const desktopWidth = (await content.boundingBox())!.width;
  const desktopFont = await word.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidth = (await content.boundingBox())!.width;
  const mobileFont = await word.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  expect(mobileFont / desktopFont).toBeCloseTo(mobileWidth / desktopWidth, 2);
  expect(mobileFont).toBeLessThanOrEqual((await word.boundingBox())!.height + 0.1);
  await page.screenshot({ path: testInfo.outputPath('mobile-pdf.png'), fullPage: true });
});

[
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
].forEach(viewport => {
  test(`card filters remain readable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/sources/goethe-a1/cards');
    const filters = page.getByRole('region', { name: 'Card filters' });
    const state = filters.getByRole('button', { name: 'Filter by state' });
    await state.click();
    await page.getByRole('option', { name: 'RELEARNING', exact: true }).click();
    await expect(state).toContainText('RELEARNING');
    await Promise.all(['State', 'Last review', 'Review score'].map(async label => {
      const text = filters.getByText(label, { exact: true });
      await expect(text).toBeVisible();
      expect(await text.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }));
    expect((await state.boundingBox())!.width).toBeGreaterThanOrEqual(160);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });

  test(`home keeps grouped study cards aligned at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const group = await createSourceGroup({ name: 'German' });
    await setSourceGroup('goethe-a1', group);
    await setSourceGroup('goethe-a2', group);
    await createSource({ id: 'stories', name: 'Deutsch lernen durch Hören A1–A2', sourceType: 'AUDIO_COLLECTION', languageLevel: 'A1', cardTypes: ['VOCABULARY'], groupId: group });
    await withDbConnection(db => db.query("UPDATE learn_language.sources SET collection_path = 'stories/deutsch-lernen-durch-hoeren-a1-a2/' WHERE id = 'stories'"));
    await createCard({ cardId: 'layout-word', sourceId: 'goethe-a1', readiness: 'READY', data: { word: 'Haus', translation: { hu: 'ház' } } });
    await page.goto('/');
    const german = page.getByRole('region', { name: 'German sources' });
    const ready = german.getByRole('group', { name: 'Goethe A1', exact: true });
    const disabled = german.getByRole('group', { name: 'Goethe A2', exact: true });
    const stories = german.getByRole('group', { name: 'Deutsch lernen durch Hören A1–A2' });
    await expect(ready.getByRole('link')).toHaveAttribute('aria-disabled', 'false');
    await expect(disabled.getByRole('link')).toHaveAttribute('aria-disabled', 'true');
    await disabled.getByRole('link').click({ force: true });
    await expect(page).toHaveURL('/');
    const readyBounds = (await ready.boundingBox())!;
    const disabledBounds = (await disabled.boundingBox())!;
    const storyBounds = (await stories.boundingBox())!;
    expect(readyBounds.height).toBeCloseTo(disabledBounds.height, 0);
    expect(readyBounds.height).toBeCloseTo(storyBounds.height, 0);
    await expect(ready.getByRole('heading')).toHaveCSS('text-align', 'center');
    const badge = (await ready.getByRole('img', { name: 'New: 1', exact: true }).boundingBox())!;
    expect(badge.width).toBe(badge.height);
    await expect(stories.getByRole('link', { name: 'Listen to Deutsch lernen durch Hören A1–A2' })).toBeVisible();
    if (viewport.width === 1440) {
      expect(readyBounds.y).toBe(disabledBounds.y);
      expect(readyBounds.y).toBe(storyBounds.y);
      expect(readyBounds.x).toBeGreaterThan(100);
      expect(storyBounds.width).toBeLessThan(400);
    } else {
      expect(readyBounds.x).toBe(disabledBounds.x);
      expect(readyBounds.y).not.toBe(disabledBounds.y);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await page.screenshot({ path: testInfo.outputPath('grouped-home.png'), fullPage: true });
    await ready.getByRole('link').click();
    await expect(page.getByRole('button', { name: 'Start study session', exact: true })).toBeVisible();
  });
});
