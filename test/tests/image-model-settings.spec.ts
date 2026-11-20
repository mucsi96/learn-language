import { test, expect } from '../fixtures';
import { createImageModelSetting, getImageModelSettings } from '../utils';

test('navigates to image model settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('link', { name: 'Image Models' }).click();
  await expect(page.getByRole('heading', { name: 'Image Models' })).toBeVisible();
});

test('displays only the latest two OpenAI image models without quality labels', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gpt-image-2.5-flare-max', imageCount: 2 });
  await createImageModelSetting({ modelName: 'gpt-image-2.6-sunburst-high', imageCount: 3 });
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 5 });
  await page.goto('/settings/image-models');
  await expect(page.getByRole('spinbutton', { name: /^Image count for / })).toHaveCount(2);
  await Promise.all(['Sunburst', 'Flare'].map(async (model) => {
    await expect(page.getByRole('spinbutton', {
      name: `Image count for GPT Image 2.6 ${model}`, exact: true,
    })).toHaveValue('0');
  }));
});

['Sunburst', 'Flare'].forEach((model) => {
  test(`preserves and updates GPT Image 2.6 ${model} image count`, async ({ page }) => {
    const modelName = `gpt-image-2.6-${model.toLowerCase()}-medium`;
    await createImageModelSetting({ modelName, imageCount: 3 });
    await page.goto('/settings/image-models');
    const input = page.getByRole('spinbutton', {
      name: `Image count for GPT Image 2.6 ${model}`, exact: true,
    });
    await expect(input).toHaveValue('3');
    await input.fill('2');
    await input.dispatchEvent('change');
    await expect(async () => {
      const settings = await getImageModelSettings();
      expect(settings.find((setting) => setting.modelName === modelName)?.imageCount).toBe(2);
    }).toPass();
    await page.reload();
    await expect(input).toHaveValue('2');
  });
});
