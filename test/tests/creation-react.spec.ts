import { test, expect, type Page } from '@playwright/test';

const environment = {
  imageRateLimitPerMinute: 0, audioRateLimitPerMinute: 0, imageMaxConcurrentRequests: 0, audioMaxConcurrentRequests: 0,
  imageDailyLimit: 0, audioDailyLimit: 0, frontAudioDisabled: false,
  chatModels: [], imageModels: [], audioModels: [], voices: [], supportedLanguages: [], enabledModelsByOperation: {}, primaryModelByOperation: {},
  operationTypes: [], allOperationTypes: [], languageLevels: [], sourceFormatTypes: [], sourceTypes: [],
};
async function mockCreation(page: Page, type: string) {
  const card = {
    id: 'preserved-card', type, source: { id: 'creation-source' }, sourcePageNumber: 1, readiness: 'IN_REVIEW',
    due: '2026-01-01T00:00:00Z', stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, learningSteps: 0,
    reps: 0, lapses: 0, state: 'NEW', flagged: false,
    data: {
      word: 'lernen', frontText: 'Question', backText: 'Answer', hint: 'lernen',
      translation: { hu: 'tanulni', en: 'learn', ch: 'lärne' }, forms: ['lernt'],
      examples: [{ de: 'Ich [lerne] Deutsch.', hu: 'Németet tanulok.', isSelected: true, futureExampleMetadata: { keep: true } }],
      audio: [{ id: 'old-audio', text: 'lernen', selected: true }], futureMetadata: { keep: ['one', 'two'] },
    },
  };
  await page.route('**/oauth2/userinfo', route => route.fulfill({ json: { email: 'creation@example.test' } }));
  await page.route('**/_telemetry/collect', route => route.fulfill({ status: 202, body: 'ok' }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/environment') return route.fulfill({ json: environment });
    if (path === '/api/card/preserved-card') return route.fulfill({ json: card });
    if (path === '/api/card') return route.fulfill({ status: 201, json: {} });
    if (path === '/api/model-usage-logs/daily-usage') return route.fulfill({ json: { imageUsageToday: 0, audioUsageToday: 0 } });
    return route.fulfill({ json: [] });
  });
  return card;
}

([
  { type: 'vocabulary', field: 'Hungarian translation', value: 'megtanulni' },
  { type: 'speech', field: 'Hungarian translation', value: 'Tanulok.' },
  { type: 'grammar', field: 'Hint in German', value: 'lernen / ich' },
  { type: 'simple', field: 'Back text', value: 'Updated **answer**' },
] as const).forEach(({ type, field, value }) => {
  test(`${type} editor preserves unknown persisted metadata and legacy audio when saving`, async ({ page }) => {
    const original = await mockCreation(page, type);
    await page.goto('/sources/creation-source/page/1/cards/preserved-card');
    await page.getByRole('textbox', { name: field, exact: true }).fill(value);
    const saving = page.waitForRequest(request => request.url().endsWith('/api/card/preserved-card') && request.method() === 'PUT');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    const saved = (await saving).postDataJSON();
    expect(saved.data.futureMetadata).toEqual(original.data.futureMetadata);
    expect(saved.data.examples[0].futureExampleMetadata).toEqual(original.data.examples[0].futureExampleMetadata);
    expect(saved.data.audio).toEqual(original.data.audio);
    expect(type === 'vocabulary' ? saved.data.translation.hu : type === 'speech' ? saved.data.examples[0].hu : type === 'grammar' ? saved.data.hint : saved.data.backText).toBe(value);
    await expect(page.getByRole('status')).toContainText('Card updated successfully');
  });
});

test('JSON import rejects incomplete cards and creates valid cards as drafts', async ({ page }) => {
  await mockCreation(page, 'simple');
  await page.goto('/sources/creation-source/json');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import cards from JSON' });
  await dialog.getByRole('textbox', { name: 'Cards JSON' }).fill('[{"id":"test","frontText":"Question"}]');
  await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Cards JSON' }).fill('[{"id":"test","frontText":"Question","backText":"Answer","topic":"Topic"}]');
  const creating = page.waitForRequest(request => request.url().endsWith('/api/card') && request.method() === 'POST');
  await dialog.getByRole('button', { name: 'Import 1 cards', exact: true }).click();
  expect((await creating).postDataJSON()).toMatchObject({ id: 'test', sourceId: 'creation-source', sourcePageNumber: 1, type: 'simple', readiness: 'DRAFT', state: 'NEW', data: { frontText: 'Question', backText: 'Answer', topic: 'Topic' } });
  await expect(page.getByRole('status')).toContainText('Imported 1 cards as drafts');
});
