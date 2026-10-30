import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'startup.spec.ts',
  use: {
    baseURL: process.env.APPLICATION_URL ?? 'http://localhost:8170',
    browserName: 'chromium',
  },
});
