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

test('displays all operation types', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  await expect(
    page.getByRole('heading', { name: 'English Translation' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Swiss German Translation' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Hungarian Translation' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Gender Detection' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Word Type Classification' })
  ).toBeVisible();
});

test('displays all chat models for each operation', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const englishSection = page.locator('.operation-group', {
    hasText: 'English Translation',
  });
  await expect(englishSection).toBeVisible();

  await expect(englishSection.getByText('gpt-4o')).toBeVisible();
  await expect(englishSection.getByText('gpt-4o-mini')).toBeVisible();
  await expect(englishSection.getByText('gemini-3-pro-preview')).toBeVisible();
});

test('can enable a model for an operation', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const englishSection = page.locator('.operation-group', {
    hasText: 'English Translation',
  });
  await expect(englishSection).toBeVisible();

  const gpt4oMiniItem = englishSection.locator('.model-item', {
    hasText: 'gpt-4o-mini',
  });
  const toggle = gpt4oMiniItem.getByRole('switch');
  await expect(toggle).not.toBeChecked();

  await toggle.click();
  await page.waitForTimeout(1000);

  const settings = await getAiModelSettings();
  const setting = settings.find(
    (s) => s.operationType === 'translation_en' && s.modelName === 'gpt-4o-mini'
  );
  expect(setting).toBeDefined();
  expect(setting?.isEnabled).toBe(true);
});

test('displays existing enabled model settings', async ({ page }) => {
  await createAiModelSetting({
    operationType: 'translation_hu',
    modelName: 'gpt-4.1',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/ai-models');

  const hungarianSection = page.locator('.operation-group', {
    hasText: 'Hungarian Translation',
  });
  const gpt41Item = hungarianSection.locator('.model-item', {
    hasText: 'gpt-4.1',
  });
  const toggle = gpt41Item.getByRole('switch');
  await expect(toggle).toBeChecked();
});

test('can disable a model for an operation', async ({ page }) => {
  await createAiModelSetting({
    operationType: 'gender',
    modelName: 'gpt-5-mini',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/ai-models');

  const genderSection = page.locator('.operation-group', {
    hasText: 'Gender Detection',
  });
  const gpt5MiniItem = genderSection.locator('.model-item', {
    hasText: 'gpt-5-mini',
  });
  const toggle = gpt5MiniItem.getByRole('switch');
  await expect(toggle).toBeChecked();

  await toggle.click();
  await page.waitForTimeout(1000);

  const settings = await getAiModelSettings();
  const setting = settings.find(
    (s) => s.operationType === 'gender' && s.modelName === 'gpt-5-mini'
  );
  expect(setting).toBeDefined();
  expect(setting?.isEnabled).toBe(false);
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
  await expect(
    page.getByRole('heading', { name: 'Model Usage' })
  ).toBeVisible();
});
