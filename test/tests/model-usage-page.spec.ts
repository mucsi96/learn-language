import { test, expect } from '../fixtures';
import {
  createCard,
  createModelUsageLog,
  createVoiceConfiguration,
  getTableData,
  selectTextRange,
  setupDefaultChatModelSettings,
} from '../utils';

type UsageLogRow = {
  Model: string;
  Type: string;
  Operation: string;
  Usage: string;
  'Per $1': string;
  Seconds: string;
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

async function setupVoiceConfigurations() {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Test Voice DE',
    isEnabled: true,
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu',
    model: 'eleven_v3',
    language: 'hu',
    displayName: 'Test Voice HU',
    isEnabled: true,
  });
}

test('page title', async ({ page }) => {
  await page.goto('http://localhost:8180/model-usage');
  await expect(page).toHaveTitle('Model Usage');
});

test('navigates to model usage from profile menu', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await page.getByRole('button', { name: 'TU' }).click();
  await expect(page.getByRole('menuitem', { name: 'Model usage' })).toHaveAttribute('href', '/model-usage');
  await page.getByRole('menuitem', { name: 'Model usage' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Model Usage Logs' })).toBeVisible();
});

test('displays empty state when no usage logs', async ({ page }) => {
  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('heading', { name: 'Model Usage Logs', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No usage logs yet', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).not.toBeVisible();
});

test('displays chat model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 150,
    outputTokens: 50,
    costUsd: 0.0025,
    processingTimeMs: 1200,
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'CLASSIFICATION',
    inputTokens: 100,
    outputTokens: 25,
    costUsd: 0.0012,
    processingTimeMs: 800,
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('heading', { name: 'Model Usage Logs', exact: true })).toBeVisible();

  const table = page.getByRole('tabpanel', { name: 'Usage Logs' }).getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.map(({ Time, Rating, ...rest }) => rest)).toEqual([
    {
      Model: 'gemini-3-pro-preview',
      Type: 'CHAT',
      Operation: 'classification',
      Usage: '100 / 25 tokens',
      'Per $1': '833',
      Seconds: '0.8',
    },
    {
      Model: 'gpt-4o',
      Type: 'CHAT',
      Operation: 'translation',
      Usage: '150 / 50 tokens',
      'Per $1': '400',
      Seconds: '1.2',
    },
  ]);
});

test('displays image model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-image-1',
    modelType: 'IMAGE',
    operationType: 'IMAGE_GENERATION',
    imageCount: 1,
    costUsd: 0.04,
    processingTimeMs: 5000,
  });

  await page.goto('http://localhost:8180/model-usage');

  const table = page.getByRole('tabpanel', { name: 'Usage Logs' }).getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.map(({ Time, Rating, ...rest }) => rest)).toEqual([
    {
      Model: 'gpt-image-1',
      Type: 'IMAGE',
      Operation: 'image_generation',
      Usage: '1 image(s)',
      'Per $1': '25',
      Seconds: '5',
    },
  ]);
});

test('displays audio model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'eleven_v3',
    modelType: 'AUDIO',
    operationType: 'AUDIO_GENERATION',
    inputCharacters: 250,
    costUsd: 0.005,
    processingTimeMs: 3000,
  });

  await page.goto('http://localhost:8180/model-usage');

  const table = page.getByRole('tabpanel', { name: 'Usage Logs' }).getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.map(({ Time, Rating, ...rest }) => rest)).toEqual([
    {
      Model: 'eleven_v3',
      Type: 'AUDIO',
      Operation: 'audio_generation',
      Usage: '250 chars',
      'Per $1': '200',
      Seconds: '3',
    },
  ]);
});

test('expands chat log to show request and response', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
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
    operationType: 'TRANSLATION',
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

  await expect(page.getByRole('tabpanel', { name: 'Usage Logs' })).not.toBeVisible();

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

test('auto-rates duplicate logs with same response content', async ({ page }) => {
  const sharedResponse = '{"translation": "hello"}';

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: sharedResponse,
  });

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: sharedResponse,
  });

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "different"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('button', { name: 'Rate 4 stars' }).last().click();

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  const summaryData = await getTableData<ModelSummaryRow>(
    page.getByRole('tabpanel', { name: 'Model Summary' }).getByRole('table')
  );

  expect(summaryData).toEqual([
    {
      Model: 'gpt-4o',
      'Total Calls': '3',
      'Rated Calls': '2',
      'Avg Rating': '4.00',
      'Total Cost': '$0.0060',
    },
  ]);
});

test('allows clearing rating by clicking the same star', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
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

test('does not show rating for image models', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-image-1',
    modelType: 'IMAGE',
    operationType: 'IMAGE_GENERATION',
    imageCount: 1,
    costUsd: 0.04,
    processingTimeMs: 5000,
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('button', { name: /Rate \d stars/ })).toHaveCount(0);
});

test('does not show rating for audio models', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'eleven_v3',
    modelType: 'AUDIO',
    operationType: 'AUDIO_GENERATION',
    inputCharacters: 250,
    costUsd: 0.005,
    processingTimeMs: 3000,
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('button', { name: /Rate \d stars/ })).toHaveCount(0);
});

test('displays model summary tab', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    rating: 5,
  });

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 150,
    outputTokens: 75,
    costUsd: 0.003,
    processingTimeMs: 1500,
    rating: 2,
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    rating: 4,
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  await expect(page.getByRole('tabpanel', { name: 'Usage Logs' })).not.toBeVisible();

  const table = page.getByRole('tabpanel', { name: 'Model Summary' }).getByRole('table');
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

test('creates chat model usage logs when using bulk card creation', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const table = page.getByRole('tabpanel', { name: 'Usage Logs' }).getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.length).toBeGreaterThan(0);

  const chatLogs = tableData.filter((log) => log.Type === 'CHAT');
  expect(chatLogs.length).toBeGreaterThan(0);
  expect(chatLogs[0].Usage).toMatch(/\d+ \/ \d+ tokens/);
});

test('creates image model usage logs when using bulk card creation', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const table = page.getByRole('tabpanel', { name: 'Usage Logs' }).getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.length).toBeGreaterThan(0);

  const imageLogs = tableData.filter((log) => log.Type === 'IMAGE');
  expect(imageLogs.length).toBeGreaterThan(0);
  expect(imageLogs[0].Usage).toMatch(/\d+ image\(s\)/);
});

test('creates audio model usage logs when using bulk audio creation', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'verstehen',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const table = page.getByRole('tabpanel', { name: 'Usage Logs' }).getByRole('table');
  const tableData = await getTableData<UsageLogRow>(table, {
    excludeRowSelector: '.detail-row',
  });

  expect(tableData.length).toBeGreaterThan(0);

  const audioLogs = tableData.filter((log) => log.Type === 'AUDIO');
  expect(audioLogs.length).toBeGreaterThan(0);
  expect(audioLogs[0].Usage).toMatch(/\d+ chars/);
});
