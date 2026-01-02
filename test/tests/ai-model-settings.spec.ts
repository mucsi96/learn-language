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

test('displays matrix with models as rows', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  await expect(page.getByRole('cell', { name: 'gpt-4o', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'gpt-4o-mini' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'gemini-3-pro-preview' })).toBeVisible();
});

test('displays operation names as column headers', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  await expect(page.getByText('English Translation')).toBeVisible();
  await expect(page.getByText('Swiss German Translation')).toBeVisible();
  await expect(page.getByText('Hungarian Translation')).toBeVisible();
  await expect(page.getByText('Gender Detection')).toBeVisible();
  await expect(page.getByText('Word Type Classification')).toBeVisible();
});

test('can enable a model for an operation', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/ai-models');

  const modelRow = page.locator('tr', { hasText: 'gpt-4o-mini' });
  await expect(modelRow).toBeVisible();

  const toggle = modelRow.getByRole('switch', { name: /English Translation/ });
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

  const modelRow = page.locator('tr', { hasText: 'gpt-4.1' }).first();
  const toggle = modelRow.getByRole('switch', { name: /Hungarian Translation/ });
  await expect(toggle).toBeChecked();
});

test('can disable a model for an operation', async ({ page }) => {
  await createAiModelSetting({
    operationType: 'gender',
    modelName: 'gpt-5-mini',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/ai-models');

  const modelRow = page.locator('tr', { hasText: 'gpt-5-mini' });
  const toggle = modelRow.getByRole('switch', { name: /Gender Detection/ });
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
