import { test, expect } from '../fixtures';

test('deep links and profile work without browser OAuth tokens', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('oidc.user:legacy', '{"access_token":"old-token"}');
    sessionStorage.setItem('oidc.state', 'old-state');
    localStorage.setItem('unrelated-preference', 'keep');
  });
  await page.route('**/default/**', () => { throw new Error('Browser attempted OAuth'); });
  await page.route('**/api/**', async route => {
    expect(route.request().headers()['authorization']).toBeUndefined();
    await route.fallback();
  });
  await page.goto('/settings/known-words');
  await expect(page.getByRole('heading', { name: 'Import Known Words', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Profile menu' })).toHaveText('TU');
  expect(await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(key => key.startsWith('oidc.')))).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('unrelated-preference'))).toBe('keep');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Import Known Words', exact: true })).toBeVisible();
});

test('API keeps JWT and mutation-origin checks behind the gateway', async ({ request, apiHeaders }) => {
  expect((await request.get('/api/sources')).status()).toBe(401);
  expect((await request.get('/api/sources', { headers: { Authorization: 'Bearer invalid' } })).status()).toBe(401);
  expect((await request.get('/api/sources', { headers: apiHeaders })).status()).toBe(200);
  const body = { text: 'gateway-origin-test' };
  await Promise.all([undefined, 'null', 'https://attacker.example', 'http://localhost:8170.attacker.example'].map(async origin => {
    const headers = { Authorization: apiHeaders.Authorization, ...(origin ? { Origin: origin } : {}) };
    expect((await request.post('/api/known-words/import', { headers, data: body })).status()).toBe(403);
  }));
  expect((await request.post('/api/known-words/import', {
    headers: { ...apiHeaders, Origin: 'https://attacker.example', 'X-Forwarded-Host': 'attacker.example', 'X-Forwarded-Proto': 'https' },
    data: body,
  })).status()).toBe(403);
  expect((await request.post('/api/known-words/import', { headers: apiHeaders, data: body })).status()).toBe(200);
});

test('Faro uses build-time configuration and the app origin', async ({ page }) => {
  const telemetry = page.waitForRequest(request => request.url().endsWith('/_telemetry/collect') && request.method() === 'POST');
  await page.goto('/');
  const request = await telemetry;
  expect(new URL(request.url()).origin).toBe(new URL(page.url()).origin);
  expect(request.postDataJSON().meta.app.name).toBe('learn-language-client');
  const environment = await (await page.request.get('/api/environment')).json();
  expect(environment).not.toHaveProperty('clientLogUrl');
  expect(environment).not.toHaveProperty('clientId');
});
