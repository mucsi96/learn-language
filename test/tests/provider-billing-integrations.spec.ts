import { test, expect } from '../fixtures';
import { createChatModelSetting } from '../utils';

const openaiMock = process.env.OPENAI_MOCK_URL ?? 'http://localhost:3070';
const translation = { word: 'abfahren', examples: ['Wann fährt der Zug ab?'] };
const googleError = {
  error: { code: 403, status: 'PERMISSION_DENIED', message: 'Billing is disabled for this project. Please enable billing.' },
};
const elevenError = { detail: { status: 'quota_exceeded', message: 'This request exceeds your quota of characters.' } };
const anthropicError = { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } };

const scenarios = [
  {
    name: 'Anthropic chat', provider: 'anthropic', providerName: 'Anthropic', mockUrl: 'http://localhost:3073',
    path: '/v1/messages', status: 400, body: anthropicError,
    endpoint: '/translate/hu?model=claude-sonnet-5', request: translation,
    billingUrl: 'https://platform.claude.com/settings/billing', image: false,
  },
  {
    name: 'xAI chat', provider: 'xai', providerName: 'xAI', mockUrl: openaiMock,
    path: '/chat/completions', status: 403,
    body: { error: 'Your team doesn\'t have any credits yet. Please purchase credits to use the API.' },
    endpoint: '/translate/hu?model=grok-4.6', request: translation,
    billingUrl: 'https://console.x.ai/team/default/billing', image: false,
  },
  {
    name: 'Gemini chat', provider: 'google', providerName: 'Google Gemini', mockUrl: 'http://localhost:3071',
    path: '/v1beta/models/gemini-3.1-pro-preview:generateContent', status: 403, body: googleError,
    endpoint: '/translate/hu?model=gemini-3.1-pro-preview', request: translation,
    billingUrl: 'https://aistudio.google.com/usage?tab=billing', image: false,
  },
  {
    name: 'Gemini image', provider: 'google', providerName: 'Google Gemini', mockUrl: 'http://localhost:3071',
    path: '/v1beta/models/gemini-3-pro-image-preview:generateContent', status: 403, body: googleError,
    endpoint: '/image', request: { input: 'Wann fährt der Zug ab?', model: 'gemini-3-pro-image-preview' },
    billingUrl: 'https://aistudio.google.com/usage?tab=billing', image: true,
  },
  {
    name: 'Gemini audio', provider: 'google', providerName: 'Google Gemini', mockUrl: 'http://localhost:3071',
    path: '/v1beta/models/gemini-3.1-flash-tts-preview:generateContent', status: 403, body: googleError,
    endpoint: '/audio', request: { input: 'Hallo', model: 'gemini-3.1-flash-tts-preview', voice: 'Kore', language: 'de' },
    billingUrl: 'https://aistudio.google.com/usage?tab=billing', image: false,
  },
  {
    name: 'ElevenLabs audio legacy quota', provider: 'elevenlabs', providerName: 'ElevenLabs', mockUrl: 'http://localhost:3072',
    path: '/v1/text-to-speech/test-voice', status: 401, body: elevenError,
    endpoint: '/audio', request: { input: 'Hallo', model: 'eleven_v3', voice: 'test-voice', language: 'de' },
    billingUrl: 'https://elevenlabs.io/app/subscription', image: false,
  },
  {
    name: 'ElevenLabs audio payment required', provider: 'elevenlabs', providerName: 'ElevenLabs', mockUrl: 'http://localhost:3072',
    path: '/v1/text-to-speech/test-voice', status: 402,
    body: { detail: { code: 'insufficient_credits', type: 'payment_required', message: 'Not enough credits.' } },
    endpoint: '/audio', request: { input: 'Hallo', model: 'eleven_v3', voice: 'test-voice', language: 'de' },
    billingUrl: 'https://elevenlabs.io/app/subscription', image: false,
  },
  {
    name: 'Ideogram image', provider: 'ideogram', providerName: 'Ideogram', mockUrl: 'http://localhost:3074',
    path: '/v1/ideogram-v4/generate', status: 402, body: { error: 'Insufficient balance' },
    endpoint: '/image', request: { input: 'Wann fährt der Zug ab?', model: 'ideogram-4-default' },
    billingUrl: 'https://ideogram.ai/manage-api', image: true,
  },
];

async function configureFailure(scenario: { mockUrl: string; path: string; status: number; body: unknown }) {
  const endpoint = scenario.mockUrl === openaiMock ? 'test-provider-failure' : 'test-failure';
  const configured = await fetch(`${scenario.mockUrl}/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scenario),
  });
  expect(configured.ok).toBe(true);
}

scenarios.map(scenario => {
  test(`${scenario.name} persists a correctly attributed billing alert`, async ({ page, baseURL }) => {
    await createChatModelSetting({
      modelName: 'gpt-5.6-sol', operationType: 'IMAGE_DESCRIPTION', isEnabled: true, isPrimary: true,
    });
    await configureFailure(scenario);
    const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
    await page.goto('/sources');
    const authorization = (await sourcesRequest).headers()['authorization'];
    const response = await fetch(`${baseURL}/api${scenario.endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify(scenario.request),
    });

    if (scenario.image) {
      expect(response.ok).toBe(true);
      const { id } = await response.json();
      await expect.poll(async () => {
        const status = await fetch(`${baseURL}/api/image/${id}/status`, { headers: { Authorization: authorization } });
        return status.json();
      }).toMatchObject({ status: 'failed', error: expect.stringContaining(scenario.providerName) });
    } else {
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: 'PROVIDER_BILLING_REQUIRED', provider: scenario.provider });
    }

    await page.reload();
    const alert = page.getByRole('alert', { name: `${scenario.providerName} billing needs attention` });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('link', { name: `Open ${scenario.providerName} billing` }))
      .toHaveAttribute('href', scenario.billingUrl);
    await expect(page.getByRole('alert')).toHaveCount(1);
    await alert.getByRole('button', { name: "I've resolved billing" }).click();
    await expect(alert).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
    await expect(alert).not.toBeVisible();
  });
});

test('multiple providers remain independently visible and independently resolvable', async ({ page, baseURL }) => {
  const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];
  await Promise.all(scenarios.filter(scenario => ['Anthropic chat', 'ElevenLabs audio legacy quota'].includes(scenario.name))
    .map(async scenario => {
      await configureFailure(scenario);
      const response = await fetch(`${baseURL}/api${scenario.endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify(scenario.request),
      });
      expect(response.status).toBe(503);
    }));
  await page.reload();
  const anthropic = page.getByRole('alert', { name: 'Anthropic billing needs attention' });
  const elevenlabs = page.getByRole('alert', { name: 'ElevenLabs billing needs attention' });
  await expect(anthropic).toBeVisible();
  await expect(elevenlabs).toBeVisible();
  await anthropic.getByRole('button', { name: "I've resolved billing" }).click();
  await expect(anthropic).not.toBeVisible();
  await expect(elevenlabs).toBeVisible();
  await page.reload();
  await expect(elevenlabs).toBeVisible();
  await expect(anthropic).not.toBeVisible();
});

test('OpenAI transcription failures also persist a billing alert', async ({ page, baseURL }) => {
  await configureFailure({ mockUrl: openaiMock, path: '/audio/transcriptions', status: 429,
    body: { error: { code: 'insufficient_quota', message: 'You have no credits remaining.' } } });
  const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];
  const body = new FormData();
  body.set('file', new Blob(['mock audio'], { type: 'audio/webm' }), 'speech.webm');
  const response = await fetch(`${baseURL}/api/transcribe`, {
    method: 'POST', headers: { Authorization: authorization }, body,
  });
  expect(response.status).toBe(503);
  await page.reload();
  await expect(page.getByRole('alert', { name: 'OpenAI billing needs attention' })).toBeVisible();
});

test('Gemini temporary quota errors do not create a billing alert', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await configureFailure({ mockUrl: 'http://localhost:3071',
    path: '/v1beta/models/gemini-3.1-pro-preview:generateContent', status: 429,
    body: { error: { code: 429, status: 'RESOURCE_EXHAUSTED',
      message: 'You exceeded your current quota, please check your plan and billing details. Retry in 30 seconds.' } } });
  const sourcesRequest = page.waitForRequest(request => request.url().includes('/api/sources'));
  await page.goto('/sources');
  const authorization = (await sourcesRequest).headers()['authorization'];
  const response = await page.request.post(`${baseURL}/api/translate/hu?model=gemini-3.1-pro-preview`, {
    headers: { Authorization: authorization },
    data: translation,
    timeout: 90_000,
  });
  expect(response.status()).toBe(500);
  const issues = await page.request.get(`${baseURL}/api/provider-billing-issues`, { headers: { Authorization: authorization } });
  expect(issues.ok()).toBe(true);
  expect(await issues.json()).toEqual([]);
});
