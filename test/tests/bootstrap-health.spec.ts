import { test, expect } from '@playwright/test';

test('readiness detects bootstrap provider failures and recovers without failing liveness', async ({ request }) => {
  test.setTimeout(150_000);
  const mock = process.env.ELEVENLABS_MOCK_URL ?? 'http://localhost:3072';
  const actuator = 'http://localhost:8172/actuator/health';
  const readiness = async () => (await request.get(`${actuator}/readiness`)).status();

  await request.post(`${mock}/reset`);
  await expect.poll(readiness, { timeout: 45_000 }).toBe(200);
  try {
    await request.post(`${mock}/test-failure`, {
      data: { path: '/v1/voices', status: 500, body: { detail: 'Provider unavailable' } },
    });
    await expect.poll(readiness, { timeout: 45_000 }).toBe(503);
    const health = await (await request.get(`${actuator}/readiness`)).json();
    expect(health.components.bootstrap.status).toBe('DOWN');
    expect(health.components.db.status).toBe('UP');
    expect((await request.get(`${actuator}/liveness`)).status()).toBe(200);
  } finally {
    await request.post(`${mock}/reset`);
  }
  await expect.poll(readiness, { timeout: 45_000 }).toBe(200);
});
