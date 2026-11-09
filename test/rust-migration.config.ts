import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './migration-tests',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:8073' },
});
