import { test as base } from '@playwright/test';
import { cleanupDbRecords, cleanupStorage, populateStorage } from './utils';

export const test = base.extend({
  page: async ({ page }, use) => {
    await cleanupDbRecords();
    cleanupStorage();
    populateStorage();

    // Reset mock OpenAI servers
    try {
      await fetch('http://localhost:3000/reset', {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      await fetch('http://localhost:3001/reset', {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      console.warn('Warning: Could not reset mock OpenAI server:', error);
    }

    // Now expose the page to tests
    await use(page);

    // Any cleanup after the test would go here (currently none needed)
  },
});

export { expect } from '@playwright/test';
