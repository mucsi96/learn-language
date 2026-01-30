import { test, expect } from '../fixtures';
import { createChatModelSetting, getChatModelSettings } from '../utils';

test('navigates to data model settings from settings page', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('link', { name: 'Data Models' })).toBeVisible();
  await page.getByRole('link', { name: 'Data Models' }).click();
  await expect(page.getByRole('heading', { name: 'Data Models' })).toBeVisible();
});

test('displays matrix with all chat models and operation types', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/data-models');

  await expect(page.getByRole('heading', { name: 'Data Models' })).toBeVisible();

  await expect(page.getByText('gpt-4o', { exact: true })).toBeVisible();
  await expect(page.getByText('gemini-3-pro-preview')).toBeVisible();

  await expect(page.getByText('Translation')).toBeVisible();
  await expect(page.getByText('Extraction')).toBeVisible();
  await expect(page.getByText('Classification')).toBeVisible();
});

test('can set primary model for operation type', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'TRANSLATION',
    isEnabled: true,
    isPrimary: false,
  });
  await createChatModelSetting({
    modelName: 'gemini-3-pro-preview',
    operationType: 'TRANSLATION',
    isEnabled: true,
    isPrimary: true,
  });

  await page.goto('http://localhost:8180/settings/data-models');

  const gptRow = page.getByRole('row', { name: /gpt-4o(?!\S)/ });
  const geminiRow = page.getByRole('row', { name: 'gemini-3-pro-preview' });
  const gptPrimaryRadio = gptRow.getByRole('radio').first();
  const geminiPrimaryRadio = geminiRow.getByRole('radio').first();

  await expect(gptPrimaryRadio).not.toBeChecked();
  await expect(geminiPrimaryRadio).toBeChecked();

  await gptPrimaryRadio.click();
  await page.waitForTimeout(500);

  await expect(gptPrimaryRadio).toBeChecked();
  await expect(geminiPrimaryRadio).not.toBeChecked();

  const settings = await getChatModelSettings();
  const gptSetting = settings.find((s) => s.modelName === 'gpt-4o' && s.operationType === 'TRANSLATION');
  const geminiSetting = settings.find(
    (s) => s.modelName === 'gemini-3-pro-preview' && s.operationType === 'TRANSLATION'
  );

  expect(gptSetting?.isPrimary).toBe(true);
  expect(geminiSetting?.isPrimary).toBe(false);
});

test('primary radio is disabled when model is not enabled', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/data-models');

  const gptRow = page.getByRole('row', { name: /gpt-4o(?!\S)/ });
  const gptPrimaryRadio = gptRow.getByRole('radio').first();

  await expect(gptPrimaryRadio).toBeDisabled();
});

test('shows primary model indicator for enabled model', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'TRANSLATION',
    isEnabled: true,
    isPrimary: true,
  });

  await page.goto('http://localhost:8180/settings/data-models');

  const gptRow = page.getByRole('row', { name: /gpt-4o(?!\S)/ });
  const gptPrimaryRadio = gptRow.getByRole('radio').first();

  await expect(gptPrimaryRadio).toBeChecked();
});

test('can toggle model setting', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/data-models');

  const gptRow = page.getByRole('row', { name: /gpt-4o(?!\S)/ });
  const toggleInGptRow = gptRow.getByRole('switch').first();

  await expect(toggleInGptRow).toBeVisible();

  const isCheckedBefore = await toggleInGptRow.isChecked();

  await toggleInGptRow.click();
  await page.waitForTimeout(500);

  const isCheckedAfter = await toggleInGptRow.isChecked();
  expect(isCheckedAfter).toBe(!isCheckedBefore);

  const settings = await getChatModelSettings();
  const gptSetting = settings.find((s) => s.modelName === 'gpt-4o');
  expect(gptSetting).toBeDefined();
  expect(gptSetting!.isEnabled).toBe(!isCheckedBefore);
});

test('displays existing enabled settings from database', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'TRANSLATION',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gpt-4o-mini',
    operationType: 'CLASSIFICATION',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/data-models');

  const gptRow = page.getByRole('row', { name: /gpt-4o(?!\S)/ });
  const gptToggles = gptRow.getByRole('switch');
  const firstGptToggle = gptToggles.first();
  await expect(firstGptToggle).toBeChecked();

  const gptMiniRow = page.getByRole('row', { name: 'gpt-4o-mini' });
  const gptMiniToggles = gptMiniRow.getByRole('switch');
  const classificationToggle = gptMiniToggles.nth(2);
  await expect(classificationToggle).toBeChecked();
});

test('can enable all models for an operation type', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/data-models');

  const enableAllButton = page.getByRole('button', { name: 'Enable all models for Translation' });
  await expect(enableAllButton).toBeVisible();

  await enableAllButton.click();
  await page.waitForTimeout(500);

  const settings = await getChatModelSettings();
  const translationSettings = settings.filter((s) => s.operationType === 'translation');

  expect(translationSettings.length).toBeGreaterThan(0);
  expect(translationSettings.every((s) => s.isEnabled)).toBe(true);
});

test('toggle performs optimistic update', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/data-models');

  const gptRow = page.getByRole('row', { name: /gpt-4o(?!\S)/ });
  const toggle = gptRow.getByRole('switch').first();

  await expect(toggle).not.toBeChecked();

  await toggle.click();

  await expect(toggle).toBeChecked();
});

test('settings page shows data models link in navigation', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Data Models' })).toBeVisible();
});
