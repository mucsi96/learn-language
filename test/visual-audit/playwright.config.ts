import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'audit.spec.ts',
  workers: 1,
  timeout: 60000,
  outputDir: process.env.AUDIT_OUTPUT ? `${process.env.AUDIT_OUTPUT}/results` : '../../test-results/visual-audit',
  use: { baseURL: 'http://localhost:8170', browserName: 'chromium', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
});
