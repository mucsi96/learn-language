import { test, expect } from '../fixtures';
import { createCard, createVoiceConfiguration } from '../utils';

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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('heading', { name: 'helló' }).click();

  await expect(async () => {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hallo' })).toBeVisible();
  }).toPass();

  await page.getByRole('heading', { name: 'Hallo' }).click();

  await page.getByRole('heading', { name: 'helló' }).click();

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

  await page.goto('/sources/1/page/1');

  await expect(async () => {
    const serviceErrors = consoleMessages.filter(
      (msg) => msg.text().includes('AudioPlaybackService') && msg.type() === 'error'
    );
    expect(serviceErrors.length).toBe(0);
  }).toPass();
});

test('voice selection dialog shows only enabled voice configurations', async ({ page }) => {
  // Create enabled voice configurations
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Enabled German Voice',
    isEnabled: true,
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu',
    model: 'eleven_v3',
    language: 'hu',
    displayName: 'Enabled Hungarian Voice',
    isEnabled: true,
  });
  // Create disabled voice configuration that should NOT appear
  await createVoiceConfiguration({
    voiceId: 'test-voice-multilang',
    model: 'eleven_turbo_v2_5',
    language: 'de',
    displayName: 'Disabled German Voice',
    isEnabled: false,
  });

  // Create a card with translations for both languages
  await createCard({
    cardId: 'voice-selection-test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { hu: 'ház', en: 'house' },
      examples: [
        {
          de: 'Das ist ein Haus.',
          hu: 'Ez egy ház.',
          isSelected: true,
        },
      ],
    },
  });

  // Navigate to study page
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('heading', { name: 'ház' })).toBeVisible();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Voice Selection' }).click();

  // Wait for dialog to open
  await expect(page.getByRole('heading', { name: 'Voice Selection' })).toBeVisible();

  // Verify enabled voices are visible with their models
  await expect(page.getByText('Enabled German Voice')).toBeVisible();
  await expect(page.getByText('Enabled Hungarian Voice')).toBeVisible();
  await expect(page.getByText('eleven_v3').first()).toBeVisible();

  // Verify disabled voice is NOT visible
  await expect(page.getByText('Disabled German Voice')).not.toBeVisible();
});

test('voice selection dialog shows no voices when no configurations exist', async ({ page }) => {
  // Create a card without audio configurations
  await createCard({
    cardId: 'voice-selection-empty-test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Auto',
      type: 'NOUN',
      translation: { hu: 'autó' },
      examples: [
        {
          de: 'Das ist ein Auto.',
          hu: 'Ez egy autó.',
          isSelected: true,
        },
      ],
    },
  });

  // Navigate to study page
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('heading', { name: 'autó' })).toBeVisible();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Voice Selection' }).click();

  // Wait for dialog to open
  await expect(page.getByRole('heading', { name: 'Voice Selection' })).toBeVisible();

  // Verify no voice cards are visible (both language groups should be empty)
  const voiceCards = page.getByRole('dialog').getByRole('button', { name: /^Voice:/ });
  await expect(voiceCards).toHaveCount(0);
});

test('voice selection dialog displays model for each voice configuration', async ({ page }) => {
  // Create voice configurations with different models
  await createVoiceConfiguration({
    voiceId: 'voice-1',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'German V2 Voice',
    isEnabled: true,
  });
  await createVoiceConfiguration({
    voiceId: 'voice-2',
    model: 'eleven_turbo_v2_5',
    language: 'de',
    displayName: 'German Turbo Voice',
    isEnabled: true,
  });

  await createCard({
    cardId: 'model-display-test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Test',
      type: 'NOUN',
      translation: { hu: 'teszt' },
      examples: [{ de: 'Ein Test.', hu: 'Egy teszt.', isSelected: true }],
    },
  });

  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('heading', { name: 'teszt' })).toBeVisible();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Voice Selection' }).click();
  await expect(page.getByRole('heading', { name: 'Voice Selection' })).toBeVisible();

  // Verify both voices with their respective models are displayed
  await expect(page.getByText('German V2 Voice')).toBeVisible();
  await expect(page.getByText('German Turbo Voice')).toBeVisible();
  await expect(page.getByText('eleven_v3')).toBeVisible();
  await expect(page.getByText('eleven_turbo_v2_5')).toBeVisible();
});

test('speech card audio plays on study page', async ({ page }) => {
  await createCard({
    cardId: 'speech-audio-test',
    sourceId: 'speech-a1',
    data: {
      examples: [
        {
          de: 'Guten Morgen, wie geht es Ihnen?',
          hu: 'Jó reggelt, hogy van?',
          en: 'Good morning, how are you?',
          isSelected: true,
        },
      ],
    },
  });

  const consoleMessages: any[] = [];
  page.on('console', (msg) => consoleMessages.push(msg));

  await page.goto('/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByText('Jó reggelt, hogy van?' )).toBeVisible();

  await flashcard.click();

  await expect(flashcard.getByText('Guten Morgen, wie geht es Ihnen?' )).toBeVisible();

  const audioErrors = consoleMessages.filter(
    (msg) => msg.text().toLowerCase().includes('audio') && msg.type() === 'error'
  );
  expect(audioErrors.length).toBe(0);
});
