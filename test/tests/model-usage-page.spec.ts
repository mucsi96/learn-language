import { test, expect } from '../fixtures';
import { createModelUsageLog, getTableData, selectTextRange } from '../utils';

type UsageLogRow = {
  Model: string;
  Type: string;
  Operation: string;
  Usage: string;
  Cost: string;
  Duration: string;
  Time: string;
  Rating: string;
};

type ModelSummaryRow = {
  Model: string;
  'Total Calls': string;
  'Rated Calls': string;
  'Avg Rating': string;
  'Total Cost': string;
};

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

  const table = page
    .getByRole('tabpanel', { name: 'Usage Logs' })
    .getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.map(({ Time, Rating, ...rest }) => rest)).toEqual([
    {
      Model: 'gemini-3-pro-preview',
      Type: 'CHAT',
      Operation: 'word_type_detection',
      Usage: '100 / 25 tokens',
      Cost: '$0.001200',
      Duration: '800ms',
    },
    {
      Model: 'gpt-4o',
      Type: 'CHAT',
      Operation: 'translation',
      Usage: '150 / 50 tokens',
      Cost: '$0.002500',
      Duration: '1200ms',
    },
  ]);
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

  const table = page
    .getByRole('tabpanel', { name: 'Usage Logs' })
    .getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.map(({ Time, Rating, ...rest }) => rest)).toEqual([
    {
      Model: 'gpt-image-1',
      Type: 'IMAGE',
      Operation: 'image_generation',
      Usage: '1 image(s)',
      Cost: '$0.040000',
      Duration: '5000ms',
    },
  ]);
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

  const table = page
    .getByRole('tabpanel', { name: 'Usage Logs' })
    .getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.map(({ Time, Rating, ...rest }) => rest)).toEqual([
    {
      Model: 'eleven_multilingual_v2',
      Type: 'AUDIO',
      Operation: 'audio_generation',
      Usage: '250 chars',
      Cost: '$0.005000',
      Duration: '3000ms',
    },
  ]);
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

test('allows rating usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
  });

  await page.goto('http://localhost:8180/model-usage');

  const ratingButtons = page.getByRole('button', { name: /Rate \d stars/ });
  await expect(ratingButtons).toHaveCount(5);

  await page.getByRole('button', { name: 'Rate 4 stars' }).click();

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  await expect(
    page.getByRole('tabpanel', { name: 'Usage Logs' })
  ).not.toBeVisible();

  const summaryData = await getTableData<ModelSummaryRow>(
    page.getByRole('tabpanel', { name: 'Model Summary' }).getByRole('table')
  );

  expect(summaryData).toEqual([
    {
      Model: 'gpt-4o',
      'Total Calls': '1',
      'Rated Calls': '1',
      'Avg Rating': '4.00',
      'Total Cost': '$0.0020',
    },
  ]);
});

test('allows clearing rating by clicking the same star', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    rating: 4,
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('button', { name: 'Rate 4 stars' }).click();

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  const summaryData = await getTableData<ModelSummaryRow>(
    page.getByRole('tabpanel', { name: 'Model Summary' }).getByRole('table')
  );

  expect(summaryData).toEqual([
    {
      Model: 'gpt-4o',
      'Total Calls': '1',
      'Rated Calls': '0',
      'Avg Rating': '-',
      'Total Cost': '$0.0020',
    },
  ]);
});

test('displays model summary tab', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    rating: 5,
  });

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 150,
    outputTokens: 75,
    costUsd: 0.003,
    processingTimeMs: 1500,
    rating: 2,
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'translation',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    rating: 4,
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  await expect(
    page.getByRole('tabpanel', { name: 'Usage Logs' })
  ).not.toBeVisible();

  const table = page
    .getByRole('tabpanel', { name: 'Model Summary' })
    .getByRole('table');
  const summaryData = await getTableData<ModelSummaryRow>(table);

  expect(summaryData).toEqual([
    {
      Model: 'gemini-3-pro-preview',
      'Total Calls': '1',
      'Rated Calls': '1',
      'Avg Rating': '4.00',
      'Total Cost': '$0.0010',
    },
    {
      Model: 'gpt-4o',
      'Total Calls': '2',
      'Rated Calls': '2',
      'Avg Rating': '3.50',
      'Total Cost': '$0.0050',
    },
  ]);
});

test('creates chat model usage logs when using bulk card creation', async ({
  page,
}) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const table = page
    .getByRole('tabpanel', { name: 'Usage Logs' })
    .getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.length).toBeGreaterThan(0);

  const chatLogs = tableData.filter((log) => log.Type === 'CHAT');
  expect(chatLogs.length).toBeGreaterThan(0);
  expect(chatLogs[0].Usage).toMatch(/\d+ \/ \d+ tokens/);
});

test('creates image model usage logs when using bulk card creation', async ({
  page,
}) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const table = page
    .getByRole('tabpanel', { name: 'Usage Logs' })
    .getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.length).toBeGreaterThan(0);

  const imageLogs = tableData.filter((log) => log.Type === 'IMAGE');
  expect(imageLogs.length).toBeGreaterThan(0);
  expect(imageLogs[0].Usage).toMatch(/\d+ image\(s\)/);
});

test('creates audio model usage logs when using bulk audio creation', async ({
  page,
}) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.locator("button:has-text('Create')").filter({ hasText: 'Cards' }).click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  await page.getByRole('dialog').getByRole('link', { name: 'Review' }).click();

  await expect(page).toHaveURL('http://localhost:8180/in-review-cards');

  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  await expect(
    page.getByText(/Audio generated successfully for \d+ cards?!/)
  ).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const table = page
    .getByRole('tabpanel', { name: 'Usage Logs' })
    .getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.length).toBeGreaterThan(0);

  const audioLogs = tableData.filter((log) => log.Type === 'AUDIO');
  expect(audioLogs.length).toBeGreaterThan(0);
  expect(audioLogs[0].Usage).toMatch(/\d+ chars/);
});
