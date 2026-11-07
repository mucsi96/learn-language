import { test, expect } from '../fixtures';
import type { Route } from '@playwright/test';
import { createChatModelSetting, getChatModelSettings } from '../utils';

test('rolls back an optimistic model change when saving fails', async ({ page }) => {
  const pending = Promise.withResolvers<Route>();
  await page.route('**/api/chat-model-settings', route => pending.resolve(route));
  await page.goto('/settings/data-models');
  const toggle = page.getByRole('row', { name: 'gpt-5.6-sol' }).getByRole('switch').first();
  await expect(toggle).not.toBeChecked();
  await toggle.press('Space');
  const saving = await pending.promise;
  await expect(toggle).toBeChecked();
  await saving.fulfill({ status: 503, json: { message: 'Model settings unavailable' } });
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText('Model settings unavailable', { exact: true })).toBeVisible();
  expect(await getChatModelSettings()).toEqual([]);
});

test('navigates to data model settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Data Models' })).toBeVisible();
  await page.getByRole('link', { name: 'Data Models' }).click();
  await expect(page.getByRole('heading', { name: 'Data Models' })).toBeVisible();
});

test('displays matrix with all chat models and operation types', async ({ page }) => {
  await page.goto('/settings/data-models');

  await expect(page.getByRole('heading', { name: 'Data Models' })).toBeVisible();

  await expect(page.getByText('gpt-5.6-sol', { exact: true })).toBeVisible();
  await expect(page.getByRole('row', { name: 'gpt-6-astra' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'gpt-6-sol' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'gpt-6.1-sol' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'claude-opus-5-5' })).toBeVisible();
  await expect(page.getByText('gpt-5.6-terra', { exact: true })).toBeVisible();
  await expect(page.getByText('gpt-5.6-luna', { exact: true })).toBeVisible();
  await expect(page.getByText('claude-sonnet-5', { exact: true })).toBeVisible();
  await expect(page.getByText('grok-4.6', { exact: true })).toBeVisible();
  await expect(page.getByText('grok-4.3', { exact: true })).toBeVisible();
  await expect(page.getByText('gemini-3.1-pro-preview')).toBeVisible();
  await expect(page.getByText('gemini-3.5-flash', { exact: true })).toBeVisible();
  await expect(page.getByText('gemini-3.6-flash', { exact: true })).toBeVisible();
  await expect(page.getByText('gemini-3.7-flash', { exact: true })).toBeVisible();

  await expect(page.getByText('Translation')).toBeVisible();
  await expect(page.getByText('Extraction', { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Source Content Extraction/ })).toHaveCount(0);
  await expect(page.getByText('Classification')).toBeVisible();
  await expect(page.getByText('Image Description')).toBeVisible();
});

['gpt-6-astra', 'gpt-6-sol', 'gpt-6.1-sol', 'claude-opus-5-5'].forEach((modelName) => {
  test(`can enable ${modelName} as the primary translation model`, async ({ page }) => {
    await page.goto('/settings/data-models');

    const modelRow = page.getByRole('row', { name: modelName });
    await modelRow.getByRole('switch').first().press('Space');
    await modelRow.getByRole('radio').first().click();

    await expect(async () => {
      const settings = await getChatModelSettings();
      const setting = settings.find((value) => value.modelName === modelName
        && value.operationType === 'TRANSLATION');
      expect(setting).toMatchObject({ isEnabled: true, isPrimary: true });
    }).toPass();

    await page.reload();
    await expect(modelRow.getByRole('switch').first()).toBeChecked();
    await expect(modelRow.getByRole('radio').first()).toBeChecked();
  });
});

test('can set primary model for operation type', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gpt-5.6-sol',
    operationType: 'TRANSLATION',
    isEnabled: true,
    isPrimary: false,
  });
  await createChatModelSetting({
    modelName: 'gemini-3.1-pro-preview',
    operationType: 'TRANSLATION',
    isEnabled: true,
    isPrimary: true,
  });

  await page.goto('/settings/data-models');

  const gptRow = page.getByRole('row', { name: 'gpt-5.6-sol' });
  const geminiRow = page.getByRole('row', { name: 'gemini-3.1-pro-preview' });
  const gptPrimaryRadio = gptRow.getByRole('radio').first();
  const geminiPrimaryRadio = geminiRow.getByRole('radio').first();

  await expect(gptPrimaryRadio).not.toBeChecked();
  await expect(geminiPrimaryRadio).toBeChecked();

  await gptPrimaryRadio.click();

  await expect(gptPrimaryRadio).toBeChecked();
  await expect(geminiPrimaryRadio).not.toBeChecked();

  await expect(async () => {
    const settings = await getChatModelSettings();
    const gptSetting = settings.find((s) => s.modelName === 'gpt-5.6-sol' && s.operationType === 'TRANSLATION');
    const geminiSetting = settings.find(
      (s) => s.modelName === 'gemini-3.1-pro-preview' && s.operationType === 'TRANSLATION'
    );

    expect(gptSetting?.isPrimary).toBe(true);
    expect(geminiSetting?.isPrimary).toBe(false);
  }).toPass();
});

test('primary radio is disabled when model is not enabled', async ({ page }) => {
  await page.goto('/settings/data-models');

  const gptRow = page.getByRole('row', { name: 'gpt-5.6-sol' });
  const gptPrimaryRadio = gptRow.getByRole('radio').first();

  await expect(gptPrimaryRadio).toBeDisabled();
});

test('shows primary model indicator for enabled model', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gpt-5.6-sol',
    operationType: 'TRANSLATION',
    isEnabled: true,
    isPrimary: true,
  });

  await page.goto('/settings/data-models');

  const gptRow = page.getByRole('row', { name: 'gpt-5.6-sol' });
  const gptPrimaryRadio = gptRow.getByRole('radio').first();

  await expect(gptPrimaryRadio).toBeChecked();
});

test('can toggle model setting', async ({ page }) => {
  await page.goto('/settings/data-models');

  const gptRow = page.getByRole('row', { name: 'gpt-5.6-sol' });
  const toggleInGptRow = gptRow.getByRole('switch').first();

  await expect(toggleInGptRow).toBeVisible();

  const isCheckedBefore = await toggleInGptRow.isChecked();

  await toggleInGptRow.press('Space');
  await expect(toggleInGptRow).toBeChecked({ checked: !isCheckedBefore });

  await expect(async () => {
    const settings = await getChatModelSettings();
    const gptSetting = settings.find((s) => s.modelName === 'gpt-5.6-sol');
    expect(gptSetting).toBeDefined();
    expect(gptSetting!.isEnabled).toBe(!isCheckedBefore);
  }).toPass();
});

test('displays existing enabled settings from database', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gpt-5.6-sol',
    operationType: 'TRANSLATION',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gpt-5.6-luna',
    operationType: 'CLASSIFICATION',
    isEnabled: true,
  });

  await page.goto('/settings/data-models');

  const gptRow = page.getByRole('row', { name: 'gpt-5.6-sol' });
  const gptToggles = gptRow.getByRole('switch');
  const firstGptToggle = gptToggles.first();
  await expect(firstGptToggle).toBeChecked();

  const gptMiniRow = page.getByRole('row', { name: 'gpt-5.6-luna' });
  const gptMiniToggles = gptMiniRow.getByRole('switch');
  const classificationToggle = gptMiniToggles.nth(2);
  await expect(classificationToggle).toBeChecked();
});

test('can enable all models for an operation type', async ({ page }) => {
  await page.goto('/settings/data-models');

  const enableAllButton = page.getByRole('button', { name: 'Enable all models for Translation' });
  await expect(enableAllButton).toBeVisible();

  await enableAllButton.click();

  await expect(async () => {
    const settings = await getChatModelSettings();
    const translationSettings = settings.filter((s) => s.operationType === 'TRANSLATION');

    expect(translationSettings.length).toBeGreaterThan(0);
    expect(translationSettings.every((s) => s.isEnabled)).toBe(true);
  }).toPass();
});

test('toggle performs optimistic update', async ({ page }) => {
  await page.goto('/settings/data-models');

  const gptRow = page.getByRole('row', { name: 'gpt-5.6-sol' });
  const toggle = gptRow.getByRole('switch').first();

  await expect(toggle).not.toBeChecked();

  await toggle.press('Space');

  await expect(toggle).toBeChecked();
});

test('settings page shows data models link in navigation', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Data Models' })).toBeVisible();
});
