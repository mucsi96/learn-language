import { test, expect } from '../fixtures';
import { createCardsWithStates } from '../utils';

[
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
].forEach(({ width, height }) => {
  test(`dashboard and source navigation fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const first = page.getByRole('group', { name: 'Goethe A1', exact: true });
    const second = page.getByRole('group', { name: 'Goethe A2', exact: true });
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    const firstBounds = (await first.boundingBox())!;
    const secondBounds = (await second.boundingBox())!;
    if (width >= 768) {
      expect(secondBounds.y).toBe(firstBounds.y);
      expect(secondBounds.x).toBeGreaterThan(firstBounds.x + firstBounds.width);
    } else {
      expect(secondBounds.x).toBe(firstBounds.x);
      expect(secondBounds.y).toBeGreaterThan(firstBounds.y + firstBounds.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });

    await page.goto('/sources');
    const actions = page.getByRole('button', { name: 'Actions for Goethe A1', exact: true });
    await actions.scrollIntoViewIfNeeded();
    await expect(actions).toBeInViewport({ ratio: 1 });
    const bounds = (await actions.boundingBox())!;
    expect(bounds.width).toBe(bounds.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await actions.focus();
    await actions.press('Enter');
    const menu = page.getByRole('menu', { name: 'Actions for Goethe A1' });
    await expect(menu).toBeInViewport({ ratio: 1 });
    await expect(menu.getByRole('menuitem', { name: 'Delete', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('source-actions.png') });
    await page.keyboard.press('Escape');
    await expect(actions).toBeFocused();
    await actions.press('Enter');
    await menu.getByRole('menuitem', { name: 'Pages', exact: true }).click();

    const controls = page.getByRole('region', { name: 'Document controls' });
    const pageNumber = controls.getByRole('spinbutton', { name: 'Page', exact: true });
    await expect(pageNumber).toHaveValue('9');
    await expect(controls).toBeInViewport({ ratio: 1 });
    await expect(controls.getByRole('link', { name: 'Cards', exact: true })).toBeVisible();
    await expect(controls.getByRole('button', { name: 'Add PDF document' })).toBeVisible();
    const previous = (await controls.getByRole('link', { name: 'Previous page' }).boundingBox())!;
    const input = (await pageNumber.boundingBox())!;
    expect(Math.abs(previous.y + previous.height / 2 - input.y - input.height / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const canvas = page.getByRole('region', { name: 'Page content', exact: true });
    await expect(canvas).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(canvas).toHaveCSS('box-shadow', 'none');
    expect(await canvas.getByText('die Abfahrt', { exact: true }).evaluate(element => {
      const canvas = element.closest('[data-source-type="pdf"]')!;
      return getComputedStyle(element).color === getComputedStyle(canvas).color
        && getComputedStyle(element).outlineStyle === 'solid';
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('document.png') });
    await pageNumber.fill('10');
    await pageNumber.press('Enter');
    await expect(pageNumber).toHaveValue('10');
    await expect(page).toHaveURL(/\/page\/10$/);
    await controls.getByRole('link', { name: 'Previous page' }).click();
    await expect(pageNumber).toHaveValue('9');
  });

  test(`all study dots fit without scrolling at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await createCardsWithStates('goethe-a1', [
      { state: 'NEW', count: 20, due_date: new Date(Date.now() - 86400000) },
      { state: 'LEARNING', count: 10, due_date: new Date(Date.now() - 86400000) },
      { state: 'REVIEW', count: 10, due_date: new Date(Date.now() - 86400000) },
      { state: 'RELEARNING', count: 10, due_date: new Date(Date.now() - 86400000) },
    ]);
    await page.goto('/sources/goethe-a1/study');
    const counts = page.getByRole('group', { name: 'Due cards', exact: true });
    await expect(counts.getByRole('img')).toHaveCount(50);
    await expect(counts).toHaveText('');
    await expect(counts.getByRole('img').first()).toBeInViewport({ ratio: 1 });
    await expect(counts.getByRole('img').last()).toBeInViewport({ ratio: 1 });
    expect(await counts.getByRole('img').evaluateAll(elements => elements.every(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width === 7 && bounds.height === 7;
    }))).toBe(true);
    await Promise.all([
      ['New', '--bt-link-hint'], ['Learning', '--bt-success-soft'],
      ['Review', '--bt-warn-soft'], ['Relearning', '--bt-error-soft'],
    ].map(async ([state, token]) => {
      const dot = counts.getByRole('img', { name: `State: ${state}`, exact: true }).first();
      expect(await dot.evaluate((element, name) => {
        const reference = document.createElement('span');
        reference.style.backgroundColor = `var(${name})`;
        element.append(reference);
        const matches = getComputedStyle(element).backgroundColor === getComputedStyle(reference).backgroundColor;
        reference.remove();
        return matches;
      }, token)).toBe(true);
    }));
    expect(await counts.evaluate(element => element.scrollHeight === element.clientHeight
      && element.scrollWidth === element.clientWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Profile menu' })).toBeInViewport({ ratio: 1 });
    const sourceButton = (await page.getByRole('button', { name: 'Goethe A1', exact: true }).boundingBox())!;
    const profile = (await page.getByRole('button', { name: 'Profile menu' }).boundingBox())!;
    expect(Math.abs(sourceButton.y - profile.y)).toBeLessThan(2);
    const dots = (await counts.boundingBox())!;
    const brand = (await page.getByRole('link', { name: 'Learn Language', exact: true }).boundingBox())!;
    if (width > 600) {
      expect(dots.x).toBeGreaterThanOrEqual(brand.x + brand.width);
      expect(dots.width).toBeGreaterThan(200);
      expect(sourceButton.x - dots.x - dots.width).toBeLessThanOrEqual(16);
      const lastDot = (await counts.getByRole('img').last().boundingBox())!;
      expect(Math.abs(lastDot.x + lastDot.width - dots.x - dots.width)).toBeLessThan(1);
    } else {
      expect(dots.y).toBeGreaterThanOrEqual(profile.y + profile.height);
      expect(dots.x).toBe(16);
      expect(dots.width).toBe(width - 32);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath('study-header.png') });
  });
});
