import { test, expect } from '../fixtures';
import { createModelUsageLog } from '../utils';

test('page title', async ({ page }) => {
  await page.goto('http://localhost:8180/model-usage');
  await expect(page).toHaveTitle('Model Usage');
});

test('navigates to model usage from profile menu', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await page.getByRole('button', { name: 'TU' }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Model usage' })
  ).toHaveAttribute('href', '/model-usage');
  await page.getByRole('menuitem', { name: 'Model usage' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Model Usage Logs' })
  ).toBeVisible();
});

test('displays empty state when no usage logs', async ({ page }) => {
  await page.goto('http://localhost:8180/model-usage');

  await expect(
    page.getByRole('heading', { name: 'Model Usage Logs', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No usage logs yet', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('table')).not.toBeVisible();
});

test('displays chat model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 150,
    outputTokens: 50,
    costUsd: 0.0025,
    processingTimeMs: 1200,
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'word_type_detection',
    inputTokens: 100,
    outputTokens: 25,
    costUsd: 0.0012,
    processingTimeMs: 800,
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(
    page.getByRole('heading', { name: 'Model Usage Logs', exact: true })
  ).toBeVisible();

  await expect(page.getByRole('columnheader', { name: 'Model' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Operation' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Usage' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Cost' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Time' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Duration' })).toBeVisible();

  await expect(page.getByText('gpt-4o', { exact: true })).toBeVisible();
  await expect(page.getByText('gemini-3-pro-preview', { exact: true })).toBeVisible();
  await expect(page.getByText('translation', { exact: true })).toBeVisible();
  await expect(page.getByText('word_type_detection', { exact: true })).toBeVisible();
  await expect(page.getByText('150 / 50 tokens')).toBeVisible();
  await expect(page.getByText('100 / 25 tokens')).toBeVisible();
});

test('displays image model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-image-1',
    modelType: 'IMAGE',
    operationType: 'image_generation',
    imageCount: 1,
    costUsd: 0.04,
    processingTimeMs: 5000,
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByText('gpt-image-1', { exact: true })).toBeVisible();
  await expect(page.getByText('IMAGE', { exact: true })).toBeVisible();
  await expect(page.getByText('image_generation', { exact: true })).toBeVisible();
  await expect(page.getByText('1 image(s)')).toBeVisible();
});

test('displays audio model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'eleven_multilingual_v2',
    modelType: 'AUDIO',
    operationType: 'audio_generation',
    inputCharacters: 250,
    costUsd: 0.005,
    processingTimeMs: 3000,
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByText('eleven_multilingual_v2', { exact: true })).toBeVisible();
  await expect(page.getByText('AUDIO', { exact: true })).toBeVisible();
  await expect(page.getByText('audio_generation', { exact: true })).toBeVisible();
  await expect(page.getByText('250 chars')).toBeVisible();
});

test('expands chat log to show request and response', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "dog"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByText('Translate "Hund" to English')).not.toBeVisible();
  await expect(page.getByText('{"translation": "dog"}')).not.toBeVisible();

  await page.getByRole('button', { name: 'Expand' }).click();

  await expect(page.getByText('{"translation": "dog"}')).toBeVisible();
});
