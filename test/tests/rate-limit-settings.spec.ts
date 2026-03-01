import { test, expect } from '../fixtures';
import { createRateLimitSetting, getRateLimitSettings, createModelUsageLog } from '../utils';

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

test('displays image max concurrent requests from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-max-concurrent', value: 5 });

  await page.goto('http://localhost:8180/settings/image-models');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Image max concurrent requests' });
  await expect(maxConcurrentInput).toBeVisible();
  await expect(maxConcurrentInput).toHaveValue('5');
});

test('can update image max concurrent requests', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-max-concurrent', value: 0 });

  await page.goto('http://localhost:8180/settings/image-models');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Image max concurrent requests' });
  await maxConcurrentInput.fill('4');
  await maxConcurrentInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'image-max-concurrent');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(4);
  }).toPass();
});

test('displays audio max concurrent requests from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-max-concurrent', value: 3 });

  await page.goto('http://localhost:8180/settings/voices');

  const maxConcurrentInput = page.getByRole('spinbutton', { name: 'Audio max concurrent requests' });
  await expect(maxConcurrentInput).toBeVisible();
  await expect(maxConcurrentInput).toHaveValue('3');
});

test('can update audio max concurrent requests', async ({ page }) => {
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

test('displays image daily limit from database on image models settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-daily-limit', value: 50 });

  await page.goto('http://localhost:8180/settings/image-models');

  const dailyLimitInput = page.getByRole('spinbutton', { name: 'Image daily limit' });
  await expect(dailyLimitInput).toBeVisible();
  await expect(dailyLimitInput).toHaveValue('50');
});

test('can update image daily limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'image-daily-limit', value: 0 });

  await page.goto('http://localhost:8180/settings/image-models');

  const dailyLimitInput = page.getByRole('spinbutton', { name: 'Image daily limit' });
  await dailyLimitInput.fill('30');
  await dailyLimitInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'image-daily-limit');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(30);
  }).toPass();
});

test('displays audio daily limit from database on voices settings page', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 100 });

  await page.goto('http://localhost:8180/settings/voices');

  const dailyLimitInput = page.getByRole('spinbutton', { name: 'Audio daily limit' });
  await expect(dailyLimitInput).toBeVisible();
  await expect(dailyLimitInput).toHaveValue('100');
});

test('can update audio daily limit', async ({ page }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 0 });

  await page.goto('http://localhost:8180/settings/voices');

  const dailyLimitInput = page.getByRole('spinbutton', { name: 'Audio daily limit' });
  await dailyLimitInput.fill('75');
  await dailyLimitInput.dispatchEvent('change');

  await expect(async () => {
    const settings = await getRateLimitSettings();
    const setting = settings.find((s) => s.key === 'audio-daily-limit');
    expect(setting).toBeDefined();
    expect(setting!.value).toBe(75);
  }).toPass();
});

async function seedImageUsageLogs(count: number): Promise<void> {
  const promises = Array.from({ length: count }, (_, i) =>
    createModelUsageLog({
      modelName: 'test-image-model',
      modelType: 'IMAGE',
      operationType: 'IMAGE_GENERATION',
      operationId: `daily-limit-test-${i}`,
      costUsd: 0.01,
      processingTimeMs: 100,
      responseContent: `test-image-${i}`,
    })
  );
  await Promise.all(promises);
}

async function seedAudioUsageLogs(count: number): Promise<void> {
  const promises = Array.from({ length: count }, (_, i) =>
    createModelUsageLog({
      modelName: 'test-audio-model',
      modelType: 'AUDIO',
      operationType: 'AUDIO_GENERATION',
      operationId: `daily-limit-test-${i}`,
      costUsd: 0.01,
      processingTimeMs: 100,
      responseContent: `test-audio-${i}`,
    })
  );
  await Promise.all(promises);
}

test('returns 429 when image daily limit is reached', async ({ request }) => {
  await createRateLimitSetting({ key: 'image-daily-limit', value: 2 });
  await seedImageUsageLogs(2);

  const response = await request.post('http://localhost:8080/api/image', {
    data: {
      input: 'test prompt',
      model: 'gemini-2.0-flash-preview-image-generation',
    },
  });

  expect(response.status()).toBe(429);
});

test('returns 429 when audio daily limit is reached', async ({ request }) => {
  await createRateLimitSetting({ key: 'audio-daily-limit', value: 2 });
  await seedAudioUsageLogs(2);

  const response = await request.post('http://localhost:8080/api/audio', {
    data: {
      input: 'test text',
      voice: 'test-voice',
      model: 'eleven_multilingual_v2',
      language: 'de',
    },
  });

  expect(response.status()).toBe(429);
});

