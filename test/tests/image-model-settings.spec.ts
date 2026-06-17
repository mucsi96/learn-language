import { test, expect } from '../fixtures';
import {
  createImageModelSetting,
  createImageSetting,
  getImageModelSettings,
  getImageSettings,
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

  const gptInput = page.getByRole('spinbutton', { name: 'Direct image count for GPT Image 1.5' });
  const geminiInput = page.getByRole('spinbutton', { name: 'Direct image count for Gemini 3 Pro' });
  const gptImage2Input = page.getByRole('spinbutton', { name: 'Direct image count for GPT Image 2' });
  const gptDescribedInput = page.getByRole('spinbutton', { name: 'Described image count for GPT Image 1.5' });
  const geminiDescribedInput = page.getByRole('spinbutton', { name: 'Described image count for Gemini 3 Pro' });
  const gptImage2DescribedInput = page.getByRole('spinbutton', { name: 'Described image count for GPT Image 2' });

  await expect(gptInput).toHaveValue('0');
  await expect(geminiInput).toHaveValue('0');
  await expect(gptImage2Input).toHaveValue('0');
  await expect(gptDescribedInput).toHaveValue('0');
  await expect(geminiDescribedInput).toHaveValue('0');
  await expect(gptImage2DescribedInput).toHaveValue('0');
});

test('displays image counts from database settings', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gpt-image-1.5', imageCount: 2, describedImageCount: 1 });
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 5 });
  await createImageModelSetting({ modelName: 'gpt-image-2', imageCount: 3 });

  await page.goto('/settings/image-models');

  const gptInput = page.getByRole('spinbutton', { name: 'Direct image count for GPT Image 1.5' });
  const geminiInput = page.getByRole('spinbutton', { name: 'Direct image count for Gemini 3 Pro' });
  const gptImage2Input = page.getByRole('spinbutton', { name: 'Direct image count for GPT Image 2' });
  const gptDescribedInput = page.getByRole('spinbutton', { name: 'Described image count for GPT Image 1.5' });

  await expect(gptInput).toHaveValue('2');
  await expect(geminiInput).toHaveValue('5');
  await expect(gptImage2Input).toHaveValue('3');
  await expect(gptDescribedInput).toHaveValue('1');
});

test('can update direct image count for a model', async ({ page }) => {
  await page.goto('/settings/image-models');

  const gptInput = page.getByRole('spinbutton', { name: 'Direct image count for GPT Image 1.5' });
  await gptInput.fill('4');
  await gptInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getImageModelSettings();
    const gptSetting = settings.find((s) => s.modelName === 'gpt-image-1.5');
    expect(gptSetting).toBeDefined();
    expect(gptSetting!.imageCount).toBe(4);
  }).toPass();
});

test('can update described image count for a model', async ({ page }) => {
  await page.goto('/settings/image-models');

  const describedInput = page.getByRole('spinbutton', { name: 'Described image count for GPT Image 2' });
  await describedInput.fill('2');
  await describedInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getImageModelSettings();
    const setting = settings.find((s) => s.modelName === 'gpt-image-2');
    expect(setting).toBeDefined();
    expect(setting!.describedImageCount).toBe(2);
  }).toPass();
});

test('settings page shows image models link in navigation', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Image Models' })).toBeVisible();
});

test('image generation language toggle defaults to German', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 1 });
  await page.goto('/settings/image-models');

  const toggle = page.getByRole('switch', {
    name: 'Use English translation for image generation',
  });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
});

test('image generation language toggle reflects stored setting', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 1 });
  await createImageSetting({ useEnglishForImageGeneration: true });

  await page.goto('/settings/image-models');

  const toggle = page.getByRole('switch', {
    name: 'Use English translation for image generation',
  });
  await expect(toggle).toBeChecked();
});

test('toggling image generation language persists the setting', async ({ page }) => {
  await createImageModelSetting({ modelName: 'gemini-3-pro-image-preview', imageCount: 1 });
  await page.goto('/settings/image-models');

  const toggle = page.getByRole('switch', {
    name: 'Use English translation for image generation',
  });
  await toggle.click();

  await expect(async () => {
    const settings = await getImageSettings();
    expect(settings).toHaveLength(1);
    expect(settings[0].useEnglishForImageGeneration).toBe(true);
  }).toPass();

  await toggle.click();

  await expect(async () => {
    const settings = await getImageSettings();
    expect(settings).toHaveLength(1);
    expect(settings[0].useEnglishForImageGeneration).toBe(false);
  }).toPass();
});
