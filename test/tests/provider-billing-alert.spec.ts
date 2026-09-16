import { test, expect } from '../fixtures';
import {
  createCard,
  createChatModelSetting,
  createImageModelSetting,
  withDbConnection,
} from '../utils';

const mockUrl = process.env.OPENAI_MOCK_URL ?? 'http://localhost:3070';
const billingUrl = 'https://platform.openai.com/settings/organization/billing/';

async function failOpenAi(path: string, code = 'insufficient_quota') {
  const response = await fetch(`${mockUrl}/test-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, code }),
  });
  expect(response.ok).toBe(true);
}

async function prepareImageCard() {
  await createChatModelSetting({
    modelName: 'gpt-5.6-sol', operationType: 'IMAGE_DESCRIPTION', isEnabled: true, isPrimary: true,
  });
  await createImageModelSetting({ modelName: 'gpt-image-2.5-sunburst-auto', imageCount: 1 });
  await createCard({
    cardId: 'abfahren-elindulni', sourceId: 'goethe-a1', sourcePageNumber: 9,
    data: {
      word: 'abfahren', type: 'VERB', forms: [],
      translation: { en: 'to leave', hu: 'elindulni', ch: 'abfahra' },
      examples: [{ de: 'Wann fährt der Zug ab?', en: 'When does the train leave?',
        hu: 'Mikor indul a vonat?', ch: 'Wänn fahrt dr Zug ab?', images: [] }],
    },
  });
}

['/chat/completions', '/images/generations'].map((path) => {
  test(`image failure at ${path} shows a persistent billing alert with a resolution link`, async ({ page }) => {
    test.setTimeout(60_000);
    await prepareImageCard();
    await failOpenAi(path);
    await page.goto('/sources/goethe-a1/page/9/cards/abfahren-elindulni');
    await page.getByRole('button', { name: 'Add example image' }).first().click();

    const alert = page.getByRole('alert', { name: 'OpenAI billing needs attention' });
    await expect(alert).toBeVisible({ timeout: 20_000 });
    await expect(alert.getByRole('link', { name: 'Open OpenAI billing' })).toHaveAttribute('href', billingUrl);
    await expect(alert.getByRole('link', { name: 'Open OpenAI billing' })).toHaveAttribute('target', '_blank');
    await expect(alert).toContainText('AI operations using OpenAI');

    await page.reload();
    await expect(alert).toBeVisible();
    await page.goto('/sources');
    await expect(alert).toBeVisible();

    await alert.getByRole('button', { name: "I've resolved billing" }).click();
    await expect(alert).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
    await expect(alert).not.toBeVisible();

    await page.goto('/sources/goethe-a1/page/9/cards/abfahren-elindulni');
    await page.getByRole('button', { name: 'Add example image' }).first().click();
    await expect(alert).toBeVisible({ timeout: 20_000 });
  });
});

test('failed card translation records billing trouble, and a later success does not hide it', async ({ page, baseURL }) => {
  await failOpenAi('/chat/completions');
  const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];
  const request = () => fetch(`${baseURL}/api/translate/hu?model=gpt-5.6-sol`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ word: 'abfahren', examples: ['Wann fährt der Zug ab?'] }),
  });

  const failed = await request();
  expect(failed.status).toBe(503);
  expect(await failed.json()).toMatchObject({ code: 'PROVIDER_BILLING_REQUIRED', provider: 'openai', billingUrl });
  await page.reload();
  const alert = page.getByRole('alert', { name: 'OpenAI billing needs attention' });
  await expect(alert).toBeVisible();

  expect((await fetch(`${mockUrl}/reset`, { method: 'POST' })).ok).toBe(true);
  expect((await request()).ok).toBe(true);
  await page.reload();
  await expect(alert).toBeVisible();
});

test('temporary rate limiting is not reported as exhausted credits', async ({ page, baseURL }) => {
  await failOpenAi('/chat/completions', 'rate_limit_exceeded');
  const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];
  const response = await fetch(`${baseURL}/api/translate/hu?model=gpt-5.6-sol`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ word: 'abfahren', examples: [] }),
  });
  expect(response.status).toBe(500);
  const issues = await fetch(`${baseURL}/api/provider-billing-issues`, { headers: { Authorization: authorization } });
  expect(await issues.json()).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
  await expect(page.getByRole('alert', { name: 'OpenAI billing needs attention' })).not.toBeVisible();
});

test('card creation explains the credit problem in its progress dialog and the app banner', async ({ page }) => {
  await createChatModelSetting({
    modelName: 'gemini-3.1-pro-preview', operationType: 'CLASSIFICATION', isEnabled: true, isPrimary: true,
  });
  await createChatModelSetting({
    modelName: 'gpt-5.6-sol', operationType: 'TRANSLATION', isEnabled: true, isPrimary: true,
  });
  await createCard({
    cardId: 'billing-draft', sourceId: 'goethe-a1', sourcePageNumber: 9, readiness: 'DRAFT',
    data: { word: 'abfahren', forms: [], examples: [] },
  });
  await failOpenAi('/chat/completions');
  await page.goto('/sources/goethe-a1/cards?filter=draft');
  await page.getByRole('row', { name: /billing-draft/ }).getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Complete draft cards' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('OpenAI reported an API credit or billing problem', { timeout: 20_000 });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('alert', { name: 'OpenAI billing needs attention' })).toBeVisible();
});

test('resolving an older occurrence does not erase a newly reported failure', async ({ page, baseURL }) => {
  const occurrenceId = crypto.randomUUID();
  await withDbConnection(client => client.query(
    `INSERT INTO learn_language.provider_billing_issues VALUES ('openai', $1, now(), now())`, [occurrenceId]
  ));
  const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];
  await expect(page.getByRole('alert', { name: 'OpenAI billing needs attention' })).toBeVisible();
  await withDbConnection(client => client.query(
    `UPDATE learn_language.provider_billing_issues SET occurrence_id = $1, last_detected_at = now()`, [crypto.randomUUID()]
  ));
  const response = await fetch(`${baseURL}/api/provider-billing-issues/${occurrenceId}`, {
    method: 'DELETE', headers: { Authorization: authorization },
  });
  expect(response.ok).toBe(true);
  await page.reload();
  await expect(page.getByRole('alert', { name: 'OpenAI billing needs attention' })).toBeVisible();
});
