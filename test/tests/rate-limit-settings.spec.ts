import { test, expect } from '../fixtures';
import { createRateLimitSetting, getRateLimitSettings } from '../utils';

test('does not save blank or negative limits and saves valid zero on blur', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 12 });
  await page.goto('/settings/voices');
  const input = page.getByRole('textbox', { name: 'Audio daily limit', exact: true });
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await input.fill('');
  await input.press('Tab');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  expect((await getRateLimitSettings()).find(setting => setting.key === 'audio-daily-limit')?.value).toBe(12);
  await input.fill('-1');
  await input.press('Tab');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  expect((await getRateLimitSettings()).find(setting => setting.key === 'audio-daily-limit')?.value).toBe(12);
  await input.fill('0');
  await input.press('Tab');
  await expect.poll(async () => (await getRateLimitSettings()).find(setting => setting.key === 'audio-daily-limit')?.value).toBe(0);
  await page.reload();
  await expect(input).toHaveValue('0');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
});

test('displays image rate limit from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-per-minute', value: 10 });

  await page.goto('/settings/image-models');

  const rateLimitInput = page.getByRole('textbox', { name: 'Image rate limit per minute', exact: true });
  await expect(rateLimitInput).toBeVisible();
  await expect(rateLimitInput).toHaveValue('10');
});

test('can update image rate limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-per-minute', value: 6 });

  await page.goto('/settings/image-models');

  const rateLimitInput = page.getByRole('textbox', { name: 'Image rate limit per minute', exact: true });
  await rateLimitInput.fill('15');
  await rateLimitInput.press('Tab');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const imageSetting = settings.find((s) => s.key === 'image-per-minute');
    expect(imageSetting).toBeDefined();
    expect(imageSetting!.value).toBe(15);
  }).toPass();
});

test('keyboard increments save numeric settings and respect the zero bound', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 0 });
  await page.goto('/settings/voices');
  const input = page.getByRole('textbox', { name: 'Audio daily limit', exact: true });
  await input.focus();
  await input.press('ArrowDown');
  await expect(input).toHaveValue('0');
  await input.press('ArrowUp');
  await expect.poll(async () => (await getRateLimitSettings()).find(setting => setting.key === 'audio-daily-limit')?.value).toBe(1);
  await page.reload();
  await expect(input).toHaveValue('1');
});

test('displays audio rate limit from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-per-minute', value: 20 });

  await page.goto('/settings/voices');

  const rateLimitInput = page.getByRole('textbox', { name: 'Audio rate limit per minute', exact: true });
  await expect(rateLimitInput).toBeVisible();
  await expect(rateLimitInput).toHaveValue('20');
});

test('can update audio rate limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-per-minute', value: 12 });

  await page.goto('/settings/voices');

  const rateLimitInput = page.getByRole('textbox', { name: 'Audio rate limit per minute', exact: true });
  await rateLimitInput.fill('25');
  await rateLimitInput.press('Tab');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const audioSetting = settings.find((s) => s.key === 'audio-per-minute');
    expect(audioSetting).toBeDefined();
    expect(audioSetting!.value).toBe(25);
  }).toPass();
});

test('displays image max concurrent requests from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-max-concurrent', value: 5 });

  await page.goto('/settings/image-models');

  const maxConcurrentInput = page.getByRole('textbox', { name: 'Image max concurrent requests', exact: true });
  await expect(maxConcurrentInput).toBeVisible();
  await expect(maxConcurrentInput).toHaveValue('5');
});

test('can update image max concurrent requests', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-max-concurrent', value: 0 });

  await page.goto('/settings/image-models');

  const maxConcurrentInput = page.getByRole('textbox', { name: 'Image max concurrent requests', exact: true });
  await maxConcurrentInput.fill('4');
  await maxConcurrentInput.press('Tab');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'image-max-concurrent');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(4);
  }).toPass();
});

test('displays audio max concurrent requests from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-max-concurrent', value: 3 });

  await page.goto('/settings/voices');

  const maxConcurrentInput = page.getByRole('textbox', { name: 'Audio max concurrent requests', exact: true });
  await expect(maxConcurrentInput).toBeVisible();
  await expect(maxConcurrentInput).toHaveValue('3');
});

test('can update audio max concurrent requests', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-max-concurrent', value: 3 });

  await page.goto('/settings/voices');

  const maxConcurrentInput = page.getByRole('textbox', { name: 'Audio max concurrent requests', exact: true });
  await maxConcurrentInput.fill('6');
  await maxConcurrentInput.press('Tab');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'audio-max-concurrent');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(6);
  }).toPass();
});

test('displays image daily limit from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-daily-limit', value: 50 });

  await page.goto('/settings/image-models');

  const dailyLimitInput = page.getByRole('textbox', { name: 'Image daily limit', exact: true });
  await expect(dailyLimitInput).toBeVisible();
  await expect(dailyLimitInput).toHaveValue('50');
});

test('can update image daily limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-daily-limit', value: 0 });

  await page.goto('/settings/image-models');

  const dailyLimitInput = page.getByRole('textbox', { name: 'Image daily limit', exact: true });
  await dailyLimitInput.fill('30');
  await dailyLimitInput.press('Tab');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'image-daily-limit');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(30);
  }).toPass();
});

test('displays audio daily limit from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 100 });

  await page.goto('/settings/voices');

  const dailyLimitInput = page.getByRole('textbox', { name: 'Audio daily limit', exact: true });
  await expect(dailyLimitInput).toBeVisible();
  await expect(dailyLimitInput).toHaveValue('100');
});

test('can update audio daily limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 0 });

  await page.goto('/settings/voices');

  const dailyLimitInput = page.getByRole('textbox', { name: 'Audio daily limit', exact: true });
  await dailyLimitInput.fill('75');
  await dailyLimitInput.press('Tab');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'audio-daily-limit');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(75);
  }).toPass();
});
