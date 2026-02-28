import { test, expect } from '../fixtures';
import { clearChatModelSettings, createChatModelSetting, createRateLimitSetting, getModelUsageLogs, selectTextRange, setupDefaultImageModelSettings } from '../utils';

async function setupChatModelsForAllOperations(config: {
  EXTRACTION?: string[];
  CLASSIFICATION?: string[];
  TRANSLATION?: string[];
}): Promise<void> {
  await clearChatModelSettings();

  const defaultModel = 'gemini-3.1-pro-preview';
  const operations = [
    'EXTRACTION',
    'CLASSIFICATION',
    'TRANSLATION',
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
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await setupChatModelsForAllOperations({
    EXTRACTION: ['gpt-4o', 'gemini-3.1-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByText('Create 3 Cards')).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordExtractionLogs = logs.filter((log) => log.operationType === 'EXTRACTION');

  expect(wordExtractionLogs.length).toBe(2);

  const modelNames = wordExtractionLogs.map((log) => log.modelName);
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3.1-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for classification operation', async ({ page }) => {
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await setupChatModelsForAllOperations({
    CLASSIFICATION: ['gpt-4o', 'gemini-3.1-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordTypeLogs = logs.filter((log) => log.operationType === 'CLASSIFICATION');

  expect(wordTypeLogs.length).toBeGreaterThan(0);

  const modelNames = [...new Set(wordTypeLogs.map((log) => log.modelName))];
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3.1-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for translation operations', async ({ page }) => {
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await setupChatModelsForAllOperations({
    TRANSLATION: ['gpt-4o', 'gemini-3.1-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();

  const translationLogs = logs.filter((log) => log.operationType === 'TRANSLATION');

  expect(translationLogs.length).toBeGreaterThan(0);
  const modelNames = [...new Set(translationLogs.map((log) => log.modelName))];

  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3.1-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
});

test('different operation types can have different enabled models', async ({ page }) => {
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await setupChatModelsForAllOperations({
    CLASSIFICATION: ['gpt-4o', 'gemini-3.1-pro-preview'],
    TRANSLATION: ['gemini-3.1-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();

  const classificationLogs = logs.filter((log) => log.operationType === 'CLASSIFICATION');
  const translationLogs = logs.filter((log) => log.operationType === 'TRANSLATION');

  const classificationModels = [...new Set(classificationLogs.map((log) => log.modelName))];
  const translationEnModels = [...new Set(translationLogs.map((log) => log.modelName))];
  expect(classificationModels).toContain('gpt-4o');
  expect(classificationModels).toContain('gemini-3.1-pro-preview');
  expect(translationEnModels).toEqual(['gemini-3.1-pro-preview']);
});
