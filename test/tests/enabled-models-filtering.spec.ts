import { test, expect } from '../fixtures';
import { clearChatModelSettings, createChatModelSetting, getModelUsageLogs, selectTextRange } from '../utils';

async function setupChatModelsForAllOperations(config: {
  word_extraction?: string[];
  word_type?: string[];
  gender?: string[];
  translation_en?: string[];
  translation_hu?: string[];
  translation_ch?: string[];
}): Promise<void> {
  await clearChatModelSettings();

  const defaultModel = 'gemini-3-pro-preview';
  const operations = [
    'word_extraction',
    'word_type',
    'gender',
    'translation_en',
    'translation_hu',
    'translation_ch',
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

test('word extraction only uses enabled models for word_extraction operation', async ({ page }) => {
  await setupChatModelsForAllOperations({
    word_extraction: ['gpt-4o', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByText('Create 3 Cards')).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordExtractionLogs = logs.filter((log) => log.operationType === 'word_extraction');

  expect(wordExtractionLogs.length).toBe(2);

  const modelNames = wordExtractionLogs.map((log) => log.modelName);
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for word_type operation', async ({ page }) => {
  await setupChatModelsForAllOperations({
    word_type: ['gpt-4o', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordTypeLogs = logs.filter((log) => log.operationType === 'word_type');

  expect(wordTypeLogs.length).toBeGreaterThan(0);

  const modelNames = [...new Set(wordTypeLogs.map((log) => log.modelName))];
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for gender operation', async ({ page }) => {
  await setupChatModelsForAllOperations({
    gender: ['claude-sonnet-4-5', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();
  const genderLogs = logs.filter((log) => log.operationType === 'gender');

  expect(genderLogs.length).toBeGreaterThan(0);

  const modelNames = [...new Set(genderLogs.map((log) => log.modelName))];
  expect(modelNames).toContain('claude-sonnet-4-5');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('gpt-4o');
});

test('bulk card creation only uses enabled models for translation operations', async ({ page }) => {
  await setupChatModelsForAllOperations({
    translation_en: ['gpt-4o', 'gemini-3-pro-preview'],
    translation_hu: ['gpt-4o', 'gemini-3-pro-preview'],
    translation_ch: ['gpt-4o', 'gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();

  const translationEnLogs = logs.filter((log) => log.operationType === 'translation_en');
  const translationHuLogs = logs.filter((log) => log.operationType === 'translation_hu');
  const translationChLogs = logs.filter((log) => log.operationType === 'translation_ch');

  expect(translationEnLogs.length).toBeGreaterThan(0);
  expect(translationHuLogs.length).toBeGreaterThan(0);
  expect(translationChLogs.length).toBeGreaterThan(0);

  const enModelNames = [...new Set(translationEnLogs.map((log) => log.modelName))];
  const huModelNames = [...new Set(translationHuLogs.map((log) => log.modelName))];
  const chModelNames = [...new Set(translationChLogs.map((log) => log.modelName))];

  expect(enModelNames).toContain('gpt-4o');
  expect(enModelNames).toContain('gemini-3-pro-preview');
  expect(enModelNames).not.toContain('claude-sonnet-4-5');
  expect(huModelNames).toContain('gpt-4o');
  expect(huModelNames).toContain('gemini-3-pro-preview');
  expect(chModelNames).toContain('gpt-4o');
  expect(chModelNames).toContain('gemini-3-pro-preview');
});

test('different operation types can have different enabled models', async ({ page }) => {
  await setupChatModelsForAllOperations({
    word_type: ['gpt-4o', 'gemini-3-pro-preview'],
    gender: ['claude-sonnet-4-5', 'gemini-3-pro-preview'],
    translation_en: ['gemini-3-pro-preview'],
    translation_hu: ['gemini-3-pro-preview'],
    translation_ch: ['gemini-3-pro-preview'],
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  const logs = await getModelUsageLogs();

  const wordTypeLogs = logs.filter((log) => log.operationType === 'word_type');
  const genderLogs = logs.filter((log) => log.operationType === 'gender');
  const translationEnLogs = logs.filter((log) => log.operationType === 'translation_en');

  const wordTypeModels = [...new Set(wordTypeLogs.map((log) => log.modelName))];
  const genderModels = [...new Set(genderLogs.map((log) => log.modelName))];
  const translationEnModels = [...new Set(translationEnLogs.map((log) => log.modelName))];

  expect(wordTypeModels).toContain('gpt-4o');
  expect(wordTypeModels).toContain('gemini-3-pro-preview');
  expect(genderModels).toContain('claude-sonnet-4-5');
  expect(genderModels).toContain('gemini-3-pro-preview');
  expect(translationEnModels).toEqual(['gemini-3-pro-preview']);
});
