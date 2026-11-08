import { test, expect } from '../fixtures';
import { createCard, createModelUsageLog, createSource, createVoiceConfiguration, uploadMockImage, yellowImage } from '../utils';

test('mobile voice tables keep voice and model names readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createVoiceConfiguration({ voiceId: 'JBFqnCBsd6RMkjVDRZzb', model: 'eleven_v4', language: 'de', displayName: 'George', isEnabled: true });
  await page.goto('/settings/voices');
  const table = page.getByRole('table', { name: 'German voices' });
  const voice = table.getByRole('cell', { name: 'George', exact: true });
  await expect(voice).toBeVisible();
  expect(await voice.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  })).toBe(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('JSON import keeps its actions visible on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await createSource({ id: 'json-layout', name: 'JSON layout', sourceType: 'JSON', languageLevel: 'A1', cardTypes: ['SIMPLE'] });
  await page.goto('/sources/json-layout/json');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import cards from JSON' });
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeInViewport({ ratio: 1 });
  await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('textbox', { name: 'Cards JSON' }).fill('[{"id":"layout","frontText":"Question","backText":"Answer"}]');
  await expect(dialog.getByRole('button', { name: 'Import 1 cards' })).toBeEnabled();
});

test('review counter stays compact while editing a mobile card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createCard({ cardId: 'review-layout', sourceId: 'goethe-a1', readiness: 'IN_REVIEW', data: {
    word: 'lernen', type: 'VERB', translation: { hu: 'tanulni' }, forms: ['lernt'],
  } });
  await page.goto('/in-review-cards');
  const counter = page.getByLabel('Remaining cards: 1');
  await expect(counter).toBeVisible();
  expect((await counter.boundingBox())!.width).toBeLessThan(80);
  const form = page.getByLabel('Form', { exact: true });
  await form.fill('lernte');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('image sources expose a visible upload target on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sources/speech-a1/page/1');
  const target = page.getByRole('region', { name: 'Image upload dropzone' });
  await expect(target).toBeVisible();
  expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(300);
  await expect(target).toHaveCSS('border-top-style', 'dashed');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

[320, 390, 768].forEach(width => {
  test(`model usage keeps filters and summaries within ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await createModelUsageLog({
      modelName: 'gemini-3.1-pro-preview', modelType: 'CHAT', operationType: 'TRANSLATION',
      operationId: 'responsive-usage', inputTokens: 150, outputTokens: 50,
      costUsd: 0.0025, processingTimeMs: 1200, responseContent: '{"translation":"das Haus"}',
    });
    await page.goto('/model-usage');
    await expect(page.getByRole('gridcell', { name: 'gemini-3.1-pro-preview', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole('tab', { name: 'Model Summary' }).click();
    const table = page.getByRole('table', { name: 'translation summary' });
    await expect(table.getByRole('cell', { name: 'gemini-3.1-pro-preview' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
});

[390, 1440].forEach(width => {
  test(`card editor keeps translations and image previews usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await createCard({
      cardId: 'visual-editor', sourceId: 'goethe-a1', sourcePageNumber: 9,
      data: { word: 'lernen', type: 'VERB', translation: { hu: 'tanulni', en: 'learn', ch: 'lärne' },
        forms: ['lernt', 'lernte', 'gelernt'], examples: [{ de: 'Ich lerne Deutsch.', hu: 'Németet tanulok.',
          isSelected: true, images: [{ id: uploadMockImage(yellowImage), isFavorite: true }] }] },
    });
    await page.goto('/sources/goethe-a1/page/9/cards/visual-editor');
    const german = page.getByRole('textbox', { name: 'German translation', exact: true });
    await expect(german).toHaveValue('lernen');
    await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeInViewport({ ratio: 1 });
    const image = page.getByRole('img', { name: 'Ich lerne Deutsch.', exact: true });
    await expect(image).toBeVisible();
    expect((await image.boundingBox())!.width).toBeGreaterThan(180);
    expect((await image.boundingBox())!.height).toBeGreaterThan(180);
    if (width === 1440) {
      const hungarian = page.getByRole('textbox', { name: 'Hungarian translation', exact: true });
      expect((await german.boundingBox())!.y).toBe((await hungarian.boundingBox())!.y);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole('button', { name: 'View image 1' }).click();
    await expect(page.getByRole('dialog', { name: 'Example image' })).toBeVisible();
  });
});

[390, 1440].forEach(width => {
  test(`data model names remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/settings/data-models');
    const table = page.getByRole('table', { name: 'Chat model settings matrix' });
    const name = table.getByRole('rowheader', { name: 'gemini-3.1-pro-preview', exact: true });
    await expect(name).toBeVisible();
    expect(await name.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    })).toBe(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
});
