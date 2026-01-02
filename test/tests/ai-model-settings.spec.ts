import { test, expect } from '../fixtures';
import { createAiModelSetting, getAiModelSettings } from '../utils';

test('navigates to AI model settings from profile menu', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await page.getByRole('button', { name: 'TU' }).click();
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(
    page.getByRole('heading', { name: 'AI Model Settings' })
  ).toBeVisible();
});

test('displays all operation types grouped by model type', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  await expect(page.getByRole('heading', { name: 'Chat Models' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Image Generation' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Audio Generation' })
  ).toBeVisible();

  await expect(page.getByText('English Translation')).toBeVisible();
  await expect(page.getByText('Swiss German Translation')).toBeVisible();
  await expect(page.getByText('Hungarian Translation')).toBeVisible();
  await expect(page.getByText('Gender Detection')).toBeVisible();
  await expect(page.getByText('Word Type Classification')).toBeVisible();
  await expect(page.getByText('Image Generation').nth(1)).toBeVisible();
  await expect(page.getByText('Audio Generation').nth(1)).toBeVisible();
});

test('can select a model for an operation', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const englishRow = page.locator('tr', { hasText: 'English Translation' });
  await expect(englishRow).toBeVisible();

  await englishRow.getByRole('combobox').click();
  await page.getByRole('option', { name: /gpt-4o-mini/ }).click();

  await page.waitForTimeout(1000);

  const settings = await getAiModelSettings();
  const englishSetting = settings.find(
    (s) => s.operationType === 'translation_en'
  );
  expect(englishSetting).toBeDefined();
  expect(englishSetting?.modelName).toBe('gpt-4o-mini');
});

test('displays existing model settings', async ({ page }) => {
  await createAiModelSetting({
    operationType: 'translation_hu',
    modelType: 'CHAT',
    modelName: 'gpt-4.1',
  });

  await page.goto('http://localhost:8180/settings/ai-models');

  const hungarianRow = page.locator('tr', { hasText: 'Hungarian Translation' });
  await expect(hungarianRow).toBeVisible();

  const select = hungarianRow.getByRole('combobox');
  await expect(select).toHaveText(/gpt-4\.1/);
});

test('can reset a model setting to default', async ({ page }) => {
  await createAiModelSetting({
    operationType: 'gender',
    modelType: 'CHAT',
    modelName: 'gpt-5-mini',
  });

  await page.goto('http://localhost:8180/settings/ai-models');

  const genderRow = page.locator('tr', { hasText: 'Gender Detection' });
  await expect(genderRow).toBeVisible();

  await genderRow.getByRole('button', { name: 'Reset to default' }).click();

  await page.waitForTimeout(1000);

  const settings = await getAiModelSettings();
  const genderSetting = settings.find((s) => s.operationType === 'gender');
  expect(genderSetting).toBeUndefined();
});

test('reset button is disabled when no model is selected', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const englishRow = page.locator('tr', { hasText: 'English Translation' });
  await expect(englishRow).toBeVisible();

  const resetButton = englishRow.getByRole('button', {
    name: 'Reset to default',
  });
  await expect(resetButton).toBeDisabled();
});

test('can select image generation model', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const imageRow = page
    .locator('tr', { hasText: 'Image Generation' })
    .filter({ hasNot: page.locator('h3') });
  await expect(imageRow).toBeVisible();

  await imageRow.getByRole('combobox').click();
  await page.getByRole('option', { name: /Gemini 3 Pro/ }).click();

  await page.waitForTimeout(1000);

  const settings = await getAiModelSettings();
  const imageSetting = settings.find(
    (s) => s.operationType === 'image_generation'
  );
  expect(imageSetting).toBeDefined();
  expect(imageSetting?.modelName).toBe('gemini-3-pro-image-preview');
});

test('can select audio generation model', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const audioRow = page
    .locator('tr', { hasText: 'Audio Generation' })
    .filter({ hasNot: page.locator('h3') });
  await expect(audioRow).toBeVisible();

  await audioRow.getByRole('combobox').click();
  await page.getByRole('option', { name: /Eleven Turbo/ }).click();

  await page.waitForTimeout(1000);

  const settings = await getAiModelSettings();
  const audioSetting = settings.find(
    (s) => s.operationType === 'audio_generation'
  );
  expect(audioSetting).toBeDefined();
  expect(audioSetting?.modelName).toBe('eleven_turbo_v2_5');
});

test('settings page has left navigation with AI Models link', async ({
  page,
}) => {
  await page.goto('http://localhost:8180/settings');
  await expect(
    page.getByRole('navigation', { name: 'Settings navigation' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'AI Models' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voices' })).toBeVisible();
});

test('link to model usage logs is visible', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');
  await expect(
    page.getByRole('link', { name: 'View model usage logs' })
  ).toBeVisible();
});

test('can navigate to model usage logs from AI model settings', async ({
  page,
}) => {
  await page.goto('http://localhost:8180/settings/ai-models');
  await page.getByRole('link', { name: 'View model usage logs' }).click();
  await expect(page.getByRole('heading', { name: 'Model Usage' })).toBeVisible();
});
