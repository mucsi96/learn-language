import { test, expect } from '../fixtures';
import { clearChatModelSettings, createChatModelSetting, getModelUsageLogs, selectTextRange } from '../utils';

async function setupChatModelsForAllOperations(config: {
  extraction?: string[];
  classification?: string[];
  translation?: string[];
}): Promise<void> {
  await clearChatModelSettings();

  const defaultModel = 'gemini-3-pro-preview';
  const operations = [
    'extraction',
    'classification',
    'translation',
  ] as const;

  for (const op of operations) {
    const models = config[op] ?? [defaultModel];
    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      const isPrimary = i === 0 || modelName === defaultModel;
      await createChatModelSetting({ modelName, operationType: op, isPrimary });
    }
  }
}

test('word extraction only uses enabled models for extraction operation', async ({ page }) => {
  await setupChatModelsForAllOperations({
    extraction: ['gpt-4o', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByText('Create 3 Cards')).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordExtractionLogs = logs.filter((log) => log.operationType === 'extraction');

  expect(wordExtractionLogs.length).toBe(2);

  const modelNames = wordExtractionLogs.map((log) => log.modelName);
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for classification operation', async ({ page }) => {
  await setupChatModelsForAllOperations({
    classification: ['gpt-4o', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordTypeLogs = logs.filter((log) => log.operationType === 'classification');

  expect(wordTypeLogs.length).toBeGreaterThan(0);

  const modelNames = [...new Set(wordTypeLogs.map((log) => log.modelName))];
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for translation operations', async ({ page }) => {
  await setupChatModelsForAllOperations({
    translation: ['gpt-4o', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();

  const translationLogs = logs.filter((log) => log.operationType === 'translation');

  expect(translationLogs.length).toBeGreaterThan(0);
  const modelNames = [...new Set(translationLogs.map((log) => log.modelName))];

  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
});

test('different operation types can have different enabled models', async ({ page }) => {
  await setupChatModelsForAllOperations({
    classification: ['gpt-4o', 'gemini-3-pro-preview'],
    translation: ['gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();

  const classificationLogs = logs.filter((log) => log.operationType === 'classification');
  const translationLogs = logs.filter((log) => log.operationType === 'translation');

  const classificationModels = [...new Set(classificationLogs.map((log) => log.modelName))];
  const translationEnModels = [...new Set(translationLogs.map((log) => log.modelName))];
  expect(classificationModels).toContain('gpt-4o');
  expect(classificationModels).toContain('gemini-3-pro-preview');
  expect(translationEnModels).toEqual(['gemini-3-pro-preview']);
});
