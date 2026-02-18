import { test, expect } from '../fixtures';
import {
  createCard,
  createModelUsageLog,
  createVoiceConfiguration,
  getGridData,
  getTableData,
  selectTextRange,
  setupDefaultChatModelSettings,
  setupDefaultImageModelSettings,
} from '../utils';

type UsageLogRow = {
  Model: string;
  Type: string;
  Operation: string;
  Usage: string;
  Diff: string;
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

test('displays chat model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-chat-1',
    inputTokens: 150,
    outputTokens: 50,
    costUsd: 0.0025,
    processingTimeMs: 1200,
    responseContent: '{"translation": "test1"}',
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'CLASSIFICATION',
    operationId: 'op-chat-2',
    inputTokens: 100,
    outputTokens: 25,
    costUsd: 0.0012,
    processingTimeMs: 800,
    responseContent: '{"classification": "test"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('heading', { name: 'Model Usage Logs', exact: true })).toBeVisible();

  const grid = page.getByRole('grid');

  await expect(async () => {
    const gridData = await getGridData<UsageLogRow>(grid);

    expect(gridData.map(({ Time, Rating, Diff, ...rest }) => rest)).toEqual([
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
  }).toPass();
});

test('displays image model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-image-1.5',
    modelType: 'IMAGE',
    operationType: 'IMAGE_GENERATION',
    operationId: 'op-image-1',
    imageCount: 1,
    costUsd: 0.04,
    processingTimeMs: 5000,
    responseContent: 'image generated',
  });

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');

  await expect(async () => {
    const gridData = await getGridData<UsageLogRow>(grid);

    expect(gridData.map(({ Time, Rating, Diff, ...rest }) => rest)).toEqual([
      {
        Model: 'gpt-image-1.5',
        Type: 'IMAGE',
        Operation: 'image_generation',
        Usage: '1 image(s)',
        'Per $1': '25',
        Seconds: '5',
      },
    ]);
  }).toPass();
});

test('displays audio model usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'eleven_v3',
    modelType: 'AUDIO',
    operationType: 'AUDIO_GENERATION',
    operationId: 'op-audio-1',
    inputCharacters: 250,
    costUsd: 0.005,
    processingTimeMs: 3000,
    responseContent: 'audio generated',
  });

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');

  await expect(async () => {
    const gridData = await getGridData<UsageLogRow>(grid);

    expect(gridData.map(({ Time, Rating, Diff, ...rest }) => rest)).toEqual([
      {
        Model: 'eleven_v3',
        Type: 'AUDIO',
        Operation: 'audio_generation',
        Usage: '250 chars',
        'Per $1': '200',
        Seconds: '3',
      },
    ]);
  }).toPass();
});

test('expands chat log to show response', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-expand-1',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "dog"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByText('{"translation": "dog"}')).not.toBeVisible();

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBeGreaterThan(0);
  }).toPass();

  await grid.locator('[role="row"]').filter({ has: page.locator('[role="gridcell"]') }).first().click();

  await expect(page.getByText('{"translation": "dog"}')).toBeVisible();
});

test('allows rating usage logs', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-rating-1',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "test"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  const ratingButtons = page.getByRole('button', { name: /Rate \d stars/ });
  await expect(ratingButtons).toHaveCount(5);

  await page.getByRole('button', { name: 'Rate 4 stars' }).click();

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  const summaryPanel = page.getByRole('tabpanel', { name: 'Model Summary' });

  await expect(async () => {
    const summaryData = await getTableData<ModelSummaryRow>(
      summaryPanel.getByRole('table', { name: 'translation summary' })
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
  }).toPass();
});

test('auto-rates duplicate logs with same response content', async ({ page }) => {
  const sharedResponse = '{"translation": "hello"}';

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-auto-rate',
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
    operationId: 'op-auto-rate',
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
    operationId: 'op-auto-rate',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "different"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('button', { name: 'Rate 4 stars' }).last().click();

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  const summaryPanel = page.getByRole('tabpanel', { name: 'Model Summary' });

  await expect(async () => {
    const summaryData = await getTableData<ModelSummaryRow>(
      summaryPanel.getByRole('table', { name: 'translation summary' })
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
  }).toPass();
});

test('allows clearing rating by clicking the same star', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-clear-rating',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    rating: 4,
    responseContent: '{"translation": "test"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('button', { name: 'Rate 4 stars' }).click();

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  const summaryPanel = page.getByRole('tabpanel', { name: 'Model Summary' });

  await expect(async () => {
    const summaryData = await getTableData<ModelSummaryRow>(
      summaryPanel.getByRole('table', { name: 'translation summary' })
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
  }).toPass();
});

test('does not show rating for image models', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-image-1.5',
    modelType: 'IMAGE',
    operationType: 'IMAGE_GENERATION',
    operationId: 'op-no-rating-image',
    imageCount: 1,
    costUsd: 0.04,
    processingTimeMs: 5000,
    responseContent: 'image generated',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('button', { name: /Rate \d stars/ })).toHaveCount(0);
});

test('does not show rating for audio models', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'eleven_v3',
    modelType: 'AUDIO',
    operationType: 'AUDIO_GENERATION',
    operationId: 'op-no-rating-audio',
    inputCharacters: 250,
    costUsd: 0.005,
    processingTimeMs: 3000,
    responseContent: 'audio generated',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByRole('button', { name: /Rate \d stars/ })).toHaveCount(0);
});

test('displays model summary tab', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-summary-1',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "summary1"}',
    rating: 5,
  });

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-summary-2',
    inputTokens: 150,
    outputTokens: 75,
    costUsd: 0.003,
    processingTimeMs: 1500,
    responseContent: '{"translation": "summary2"}',
    rating: 2,
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-summary-3',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    responseContent: '{"translation": "summary3"}',
    rating: 4,
  });

  await page.goto('http://localhost:8180/model-usage');

  await page.getByRole('tab', { name: 'Model Summary' }).click();

  const summaryPanel = page.getByRole('tabpanel', { name: 'Model Summary' });

  await expect(async () => {
    const summaryData = await getTableData<ModelSummaryRow>(
      summaryPanel.getByRole('table', { name: 'translation summary' })
    );

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
  }).toPass();
});

test('creates chat model usage logs when using bulk card creation', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');

  await expect(async () => {
    const gridData = await getGridData<UsageLogRow>(grid);

    expect(gridData.length).toBeGreaterThan(0);

    const chatLogs = gridData.filter((log) => log.Type === 'CHAT');
    expect(chatLogs.length).toBeGreaterThan(0);
    expect(chatLogs[0].Usage).toMatch(/\d+ \/ \d+ tokens/);
  }).toPass();
});

test('creates image model usage logs when using bulk card creation', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');

  await expect(async () => {
    const gridData = await getGridData<UsageLogRow>(grid);

    expect(gridData.length).toBeGreaterThan(0);

    const imageLogs = gridData.filter((log) => log.Type === 'IMAGE');
    expect(imageLogs.length).toBeGreaterThan(0);
    expect(imageLogs[0].Usage).toMatch(/\d+ image\(s\)/);
  }).toPass();
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

  const grid = page.getByRole('grid');

  await expect(async () => {
    const gridData = await getGridData<UsageLogRow>(grid);

    expect(gridData.length).toBeGreaterThan(0);

    const audioLogs = gridData.filter((log) => log.Type === 'AUDIO');
    expect(audioLogs.length).toBeGreaterThan(0);
    expect(audioLogs[0].Usage).toMatch(/\d+ chars/);
  }).toPass();
});

test('groups logs with same operation id and shows diff summary', async ({ page }) => {
  const operationId = 'test-op-123';

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 500,
    responseContent: 'line1\nline2\nline3',
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    responseContent: 'line1\nmodified\nline3',
  });

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
  }).toPass();

  await expect(page.getByText('+1')).toBeVisible();
  await expect(page.getByText('-1')).toBeVisible();
});

test('shows primary badge on fastest model in group', async ({ page }) => {
  const operationId = 'test-op-primary';

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 500,
    responseContent: 'response a',
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    responseContent: 'response b',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByText('primary')).toBeVisible();
});

test('shows diff view in expanded state for non-primary logs', async ({ page }) => {
  const operationId = 'test-op-diff';

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 500,
    responseContent: 'hello\nworld',
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    responseContent: 'hello\nearth',
  });

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
  }).toPass();

  const bodyRows = grid.locator('[role="row"]').filter({ has: page.locator('[role="gridcell"]') });
  await bodyRows.nth(1).click();

  await expect(page.getByText('Diff vs Primary')).toBeVisible();
  await expect(page.getByText('- world')).toBeVisible();
  await expect(page.getByText('+ earth')).toBeVisible();
});

test('shows copy to clipboard button in expanded state', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-clipboard',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "test"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBeGreaterThan(0);
  }).toPass();

  await grid.locator('[role="row"]').filter({ has: page.locator('[role="gridcell"]') }).first().click();

  await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toBeVisible();
});

test('clears logs when clicking delete button', async ({ page }) => {
  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId: 'op-clear-logs',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 1000,
    responseContent: '{"translation": "test"}',
  });

  await page.goto('http://localhost:8180/model-usage');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBeGreaterThan(0);
  }).toPass();

  await page.getByRole('button', { name: 'Clear logs' }).click();

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(0);
  }).toPass();
});

test('shows identical label when grouped logs have same response', async ({ page }) => {
  const operationId = 'test-op-identical';

  await createModelUsageLog({
    modelName: 'gpt-4o',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.002,
    processingTimeMs: 500,
    responseContent: 'same content',
  });

  await createModelUsageLog({
    modelName: 'gemini-3-pro-preview',
    modelType: 'CHAT',
    operationType: 'TRANSLATION',
    operationId,
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    processingTimeMs: 800,
    responseContent: 'same content',
  });

  await page.goto('http://localhost:8180/model-usage');

  await expect(page.getByText('identical')).toBeVisible();
});
