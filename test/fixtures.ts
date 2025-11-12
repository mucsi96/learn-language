import { test as base } from '@playwright/test';
import {
  cleanupDb,
  populateDb,
  cleanupStorage,
  populateStorage,
} from './utils';

base.beforeEach(async () => {
  await cleanupDb();
  await populateDb();
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
});

export const test = base;

export { expect } from '@playwright/test';
