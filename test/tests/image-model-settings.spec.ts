import { test, expect } from '../fixtures';
import { createImageModelSetting, getImageModelSettings } from '../utils';

test('navigates to image model settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('link', { name: 'Image Models' }).click();
  await expect(page.getByRole('heading', { name: 'Image Models' })).toBeVisible();
});

const models = ['2.6', '2.5'].flatMap((version) =>
  ['Sunburst', 'Flare'].map((name) => ({ version, name })));

test('displays only four OpenAI image models without quality labels', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gpt-image-2.5-flare-max', imageCount: 2 });
  await createImageModelSetting({ modelName: 'gpt-image-2.6-sunburst-high', imageCount: 3 });
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 5 });
  await page.goto('/settings/image-models');
  await expect(page.getByRole('spinbutton', { name: /^Image count for / })).toHaveCount(4);
  await Promise.all(models.map(async ({ version, name }) => {
    await expect(page.getByRole('spinbutton', {
      name: `Image count for GPT Image ${version} ${name}`, exact: true,
    })).toHaveValue('0');
  }));
});

models.forEach(({ version, name }) => {
  test(`preserves and updates GPT Image ${version} ${name} image count`, async ({ page }) => {
    const modelName = `gpt-image-${version}-${name.toLowerCase()}-medium`;
    await createImageModelSetting({ modelName, imageCount: 3 });
    await page.goto('/settings/image-models');
    const input = page.getByRole('spinbutton', {
      name: `Image count for GPT Image ${version} ${name}`, exact: true,
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
