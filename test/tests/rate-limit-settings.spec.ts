import { test, expect } from '../fixtures';
import { createRateLimitSetting, getRateLimitSettings } from '../utils';

test('displays image rate limit from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-per-minute', value: 10 });

  await page.goto('http://localhost:8180/settings/image-models');

  const rateLimitInput = page.getByRole('spinbutton', { name: 'Image rate limit per minute' });
  await expect(rateLimitInput).toBeVisible();
  await expect(rateLimitInput).toHaveValue('10');
});

test('can update image rate limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-per-minute', value: 6 });

  await page.goto('http://localhost:8180/settings/image-models');

  const rateLimitInput = page.getByRole('spinbutton', { name: 'Image rate limit per minute' });
  await rateLimitInput.fill('15');
  await rateLimitInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const imageSetting = settings.find((s) => s.key === 'image-per-minute');
    expect(imageSetting).toBeDefined();
    expect(imageSetting!.value).toBe(15);
  }).toPass();
});

test('displays audio rate limit from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-per-minute', value: 20 });

  await page.goto('http://localhost:8180/settings/voices');

  const rateLimitInput = page.getByRole('spinbutton', { name: 'Audio rate limit per minute' });
  await expect(rateLimitInput).toBeVisible();
  await expect(rateLimitInput).toHaveValue('20');
});

test('can update audio rate limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-per-minute', value: 12 });

  await page.goto('http://localhost:8180/settings/voices');

  const rateLimitInput = page.getByRole('spinbutton', { name: 'Audio rate limit per minute' });
  await rateLimitInput.fill('25');
  await rateLimitInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const audioSetting = settings.find((s) => s.key === 'audio-per-minute');
    expect(audioSetting).toBeDefined();
    expect(audioSetting!.value).toBe(25);
  }).toPass();
});

