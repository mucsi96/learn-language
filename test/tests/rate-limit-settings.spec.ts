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

test('displays image max concurrent from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-max-concurrent', value: 3 });

  await page.goto('http://localhost:8180/settings/image-models');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Image max concurrent requests' });
  await expect(maxConcurrentInput).toBeVisible();
  await expect(maxConcurrentInput).toHaveValue('3');
});

test('can update image max concurrent', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-max-concurrent', value: 2 });

  await page.goto('http://localhost:8180/settings/image-models');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Image max concurrent requests' });
  await maxConcurrentInput.fill('5');
  await maxConcurrentInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'image-max-concurrent');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(5);
  }).toPass();
});

test('displays audio max concurrent from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-max-concurrent', value: 4 });

  await page.goto('http://localhost:8180/settings/voices');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Audio max concurrent requests' });
  await expect(maxConcurrentInput).toBeVisible();
  await expect(maxConcurrentInput).toHaveValue('4');
});

test('can update audio max concurrent', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-max-concurrent', value: 3 });

  await page.goto('http://localhost:8180/settings/voices');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Audio max concurrent requests' });
  await maxConcurrentInput.fill('6');
  await maxConcurrentInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'audio-max-concurrent');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(6);
  }).toPass();
});
