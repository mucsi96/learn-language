import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './availability',
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL: process.env.APPLICATION_URL ?? 'https://language.ibari.ch',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
