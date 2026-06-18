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

test('displays all image models with default image counts', async ({ page }) => {
  await page.goto('/settings/image-models');

  await expect(page.getByRole('heading', { name: 'Image Models' })).toBeVisible();

  await expect(page.getByText('GPT Image 1.5')).toBeVisible();
  await expect(page.getByText('Gemini 3 Pro')).toBeVisible();
  await expect(page.getByText('GPT Image 2')).toBeVisible();
  await expect(page.getByText('Imagen 4 Ultra')).toHaveCount(0);

  const gptInput = page.getByRole('spinbutton', { name: 'Image count for GPT Image 1.5' });
  const geminiInput = page.getByRole('spinbutton', { name: 'Image count for Gemini 3 Pro' });
  const gptImage2Input = page.getByRole('spinbutton', { name: 'Image count for GPT Image 2' });

  await expect(gptInput).toHaveValue('0');
  await expect(geminiInput).toHaveValue('0');
  await expect(gptImage2Input).toHaveValue('0');
});

test('displays image counts from database settings', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gpt-image-1.5', imageCount: 2 });
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 5 });
  await createImageModelSetting({ modelName: 'gpt-image-2', imageCount: 3 });

  await page.goto('/settings/image-models');

  const gptInput = page.getByRole('spinbutton', { name: 'Image count for GPT Image 1.5' });
  const geminiInput = page.getByRole('spinbutton', { name: 'Image count for Gemini 3 Pro' });
  const gptImage2Input = page.getByRole('spinbutton', { name: 'Image count for GPT Image 2' });

  await expect(gptInput).toHaveValue('2');
  await expect(geminiInput).toHaveValue('5');
  await expect(gptImage2Input).toHaveValue('3');
});

test('can update image count for a model', async ({ page }) => {
  await page.goto('/settings/image-models');

  const gptInput = page.getByRole('spinbutton', { name: 'Image count for GPT Image 1.5' });
  await gptInput.fill('4');
  await gptInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getImageModelSettings();
    const gptSetting = settings.find((s) => s.modelName === 'gpt-image-1.5');
    expect(gptSetting).toBeDefined();
    expect(gptSetting!.imageCount).toBe(4);
  }).toPass();
});

test('settings page shows image models link in navigation', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Image Models' })).toBeVisible();
});
