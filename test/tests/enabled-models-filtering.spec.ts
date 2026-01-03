import { test, expect } from '../fixtures';
import {
  createChatModelSetting,
  getModelUsageLogs,
  selectTextRange,
} from '../utils';

test('word extraction only uses enabled models for word_extraction operation', async ({
  page,
}) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'word_extraction',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gemini-3-pro-preview',
    operationType: 'word_extraction',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByRole('link', { name: 'aber' })).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordExtractionLogs = logs.filter(
    (log) => log.operationType === 'word_extraction'
  );

  expect(wordExtractionLogs.length).toBe(2);

  const modelNames = wordExtractionLogs.map((log) => log.modelName);
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for word_type operation', async ({
  page,
}) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'word_type',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gemini-3-pro-preview',
    operationType: 'word_type',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page
    .locator("button:has-text('Create')")
    .filter({ hasText: 'Cards' })
    .click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  const logs = await getModelUsageLogs();
  const wordTypeLogs = logs.filter((log) => log.operationType === 'word_type');

  expect(wordTypeLogs.length).toBeGreaterThan(0);

  const modelNames = [...new Set(wordTypeLogs.map((log) => log.modelName))];
  expect(modelNames).toContain('gpt-4o');
  expect(modelNames).toContain('gemini-3-pro-preview');
  expect(modelNames).not.toContain('claude-sonnet-4-5');
  expect(modelNames).not.toContain('gpt-4.1');
});

test('bulk card creation only uses enabled models for gender operation', async ({
  page,
}) => {
  await createChatModelSetting({
    modelName: 'claude-sonnet-4-5',
    operationType: 'gender',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page
    .locator("button:has-text('Create')")
    .filter({ hasText: 'Cards' })
    .click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  const logs = await getModelUsageLogs();
  const genderLogs = logs.filter((log) => log.operationType === 'gender');

  expect(genderLogs.length).toBeGreaterThan(0);

  const modelNames = [...new Set(genderLogs.map((log) => log.modelName))];
  expect(modelNames).toEqual(['claude-sonnet-4-5']);
});

test('bulk card creation only uses enabled models for translation operations', async ({
  page,
}) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'translation_en',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'translation_hu',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'translation_ch',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page
    .locator("button:has-text('Create')")
    .filter({ hasText: 'Cards' })
    .click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  const logs = await getModelUsageLogs();

  const translationEnLogs = logs.filter(
    (log) => log.operationType === 'translation_en'
  );
  const translationHuLogs = logs.filter(
    (log) => log.operationType === 'translation_hu'
  );
  const translationChLogs = logs.filter(
    (log) => log.operationType === 'translation_ch'
  );

  expect(translationEnLogs.length).toBeGreaterThan(0);
  expect(translationHuLogs.length).toBeGreaterThan(0);
  expect(translationChLogs.length).toBeGreaterThan(0);

  const enModelNames = [...new Set(translationEnLogs.map((log) => log.modelName))];
  const huModelNames = [...new Set(translationHuLogs.map((log) => log.modelName))];
  const chModelNames = [...new Set(translationChLogs.map((log) => log.modelName))];

  expect(enModelNames).toEqual(['gpt-4o']);
  expect(huModelNames).toEqual(['gpt-4o']);
  expect(chModelNames).toEqual(['gpt-4o']);
});

test('different operation types can have different enabled models', async ({
  page,
}) => {
  await createChatModelSetting({
    modelName: 'gpt-4o',
    operationType: 'word_type',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'claude-sonnet-4-5',
    operationType: 'gender',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gemini-3-pro-preview',
    operationType: 'translation_en',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gemini-3-pro-preview',
    operationType: 'translation_hu',
    isEnabled: true,
  });
  await createChatModelSetting({
    modelName: 'gemini-3-pro-preview',
    operationType: 'translation_ch',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page
    .locator("button:has-text('Create')")
    .filter({ hasText: 'Cards' })
    .click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  const logs = await getModelUsageLogs();

  const wordTypeLogs = logs.filter((log) => log.operationType === 'word_type');
  const genderLogs = logs.filter((log) => log.operationType === 'gender');
  const translationEnLogs = logs.filter(
    (log) => log.operationType === 'translation_en'
  );

  const wordTypeModels = [...new Set(wordTypeLogs.map((log) => log.modelName))];
  const genderModels = [...new Set(genderLogs.map((log) => log.modelName))];
  const translationEnModels = [
    ...new Set(translationEnLogs.map((log) => log.modelName)),
  ];

  expect(wordTypeModels).toEqual(['gpt-4o']);
  expect(genderModels).toEqual(['claude-sonnet-4-5']);
  expect(translationEnModels).toEqual(['gemini-3-pro-preview']);
});
