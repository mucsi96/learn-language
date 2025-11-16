import { test, expect } from '../fixtures';
import { createCard } from '../utils';

test('audio plays sequentially', async ({ page }) => {
  // Create a card with audio for testing
  await createCard({
    cardId: 'test-audio-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Hallo',
      type: 'NOUN',
      translation: { en: 'hello', hu: 'helló', ch: 'hallo' },
      examples: [
        {
          de: 'Hallo, wie geht es dir?',
          hu: 'Helló, hogy vagy?',
          en: 'Hello, how are you?',
          ch: 'Hallo, wie gaats?',
          isSelected: true,
        },
      ],
    },
  });

  // Set up console message collection
  const consoleMessages: any[] = [];
  page.on('console', (msg) => consoleMessages.push(msg));

  // Navigate to a study page with cards that have audio
  await page.goto('/sources/goethe-a1/study');

  // Wait for the learn card component to load
  await page.waitForSelector('app-learn-card', { timeout: 10000 });

  // Click reveal to trigger audio playback
  const revealButton = page.locator("button:has-text('Reveal')");
  if (await revealButton.isVisible()) {
    await revealButton.click();
  }

  // Wait a moment for audio to start
  await page.waitForTimeout(500);

  // Check that the component is present and audio would be playing
  // Note: We can't directly test audio playback in headless mode,
  // but we can verify the component structure is correct
  const learnCard = page.locator('app-learn-card');
  await expect(learnCard).toBeVisible();

  // Verify the vocabulary card component is present
  const vocabCard = page.locator('app-learn-vocabulary-card');
  await expect(vocabCard).toBeVisible();

  // Test toggling reveal again
  const hideButton = page.locator('button').filter({ hasText: 'Hide' });
  if (await hideButton.isVisible()) {
    await hideButton.click();
    await page.waitForTimeout(500);
  }

  // Click reveal again to test audio restart
  const revealButton2 = page.locator('button').filter({ hasText: 'Reveal' });
  if (await revealButton2.isVisible()) {
    await revealButton2.click();
  }

  // Wait for potential audio errors
  await page.waitForTimeout(2000);

  // Check for audio-related errors
  const audioErrors = consoleMessages.filter(
    (msg) => msg.text().toLowerCase().includes('audio') && msg.type() === 'error'
  );
  expect(audioErrors.length).toBe(0);
});

test('voice selection dialog audio', async ({ page }) => {
  // Set up console message collection
  const consoleMessages: any[] = [];
  page.on('console', (msg) => consoleMessages.push(msg));

  // Navigate to a card editing page
  await page.goto('/sources/1/page/1');
  await page.waitForSelector('app-page', { timeout: 10000 });

  // Wait for potential errors
  await page.waitForTimeout(1000);

  // Check for service-related errors
  const serviceErrors = consoleMessages.filter(
    (msg) =>
      msg.text().includes('AudioPlaybackService') && msg.type() === 'error'
  );
  expect(serviceErrors.length).toBe(0);
});
