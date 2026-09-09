import { test, expect } from '../fixtures';
import {
  createImageModelSetting,
  getImageModelSettings,
} from '../utils';

test('navigates to image model settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Image Models' })).toBeVisible();
  await page.getByRole('link', { name: 'Image Models' }).click();
  await expect(page.getByRole('heading', { name: 'Image Models' })).toBeVisible();
});

test('displays all image model quality variants with default image counts', async ({ page }) => {
  await page.goto('/settings/image-models');

  await expect(page.getByRole('heading', { name: 'Image Models' })).toBeVisible();

  const variantLabels = [
    'GPT Image 2 (Low)',
    'GPT Image 2 (Medium)',
    'GPT Image 2 (High)',
    'GPT Image 2.5 Sunburst (Low)',
    'GPT Image 2.5 Sunburst (Medium)',
    'GPT Image 2.5 Sunburst (High)',
    'GPT Image 2.5 Sunburst (XHigh)',
    'GPT Image 2.5 Sunburst (Max)',
    'GPT Image 2.5 Sunburst (Auto)',
    'GPT Image 2.5 Flare (Low)',
    'GPT Image 2.5 Flare (Medium)',
    'GPT Image 2.5 Flare (High)',
    'GPT Image 2.5 Flare (XHigh)',
    'GPT Image 2.5 Flare (Max)',
    'GPT Image 2.5 Flare (Auto)',
    'Ideogram 4 (Turbo)',
    'Ideogram 4 (Default)',
    'Ideogram 4 (Quality)',
    'Gemini 3 Pro',
  ];

  await Promise.all(
    variantLabels.map(async (label) => {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      await expect(
        page.getByRole('spinbutton', { name: `Image count for ${label}` })
      ).toHaveValue('0');
    })
  );
});

test('displays image counts from database settings', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gpt-image-2.5-flare-max', imageCount: 2 });
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 5 });
  await createImageModelSetting({ modelName: 'gpt-image-2.5-sunburst-low', imageCount: 3 });

  await page.goto('/settings/image-models');

  const flareMaxInput = page.getByRole('spinbutton', { name: 'Image count for GPT Image 2.5 Flare (Max)' });
  const geminiInput = page.getByRole('spinbutton', { name: 'Image count for Gemini 3 Pro' });
  const sunburstLowInput = page.getByRole('spinbutton', { name: 'Image count for GPT Image 2.5 Sunburst (Low)' });

  await expect(flareMaxInput).toHaveValue('2');
  await expect(geminiInput).toHaveValue('5');
  await expect(sunburstLowInput).toHaveValue('3');
});

test('can update image count for a model variant', async ({ page }) => {
  await page.goto('/settings/image-models');

  const gptInput = page.getByRole('spinbutton', { name: 'Image count for GPT Image 2.5 Sunburst (XHigh)' });
  await gptInput.fill('4');
  await gptInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getImageModelSettings();
    const gptSetting = settings.find((s) => s.modelName === 'gpt-image-2.5-sunburst-xhigh');
    expect(gptSetting).toBeDefined();
    expect(gptSetting!.imageCount).toBe(4);
  }).toPass();
});

test('settings page shows image models link in navigation', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Image Models' })).toBeVisible();
});
