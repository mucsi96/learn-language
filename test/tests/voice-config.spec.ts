import { test, expect } from '../fixtures';
import { createVoiceConfiguration, getVoiceConfigurations, createCard } from '../utils';

test('navigates to voice configuration from profile menu', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await page.getByRole('button', { name: 'TU' }).click();
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Voice Configurations' })).toBeVisible();
});

test('displays empty state when no configurations exist', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/voices');
  await expect(page.getByText('No voice configurations yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Voice' }).first()).toBeVisible();
});

test('displays existing voice configurations grouped by language', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'German Voice',
    isEnabled: true,
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu',
    model: 'eleven_v3',
    language: 'hu',
    displayName: 'Hungarian Voice',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/voices');

  await expect(page.getByRole('heading', { name: 'German' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hungarian' })).toBeVisible();
  await expect(page.getByText('German Voice')).toBeVisible();
  await expect(page.getByText('Hungarian Voice')).toBeVisible();
});

test('can add a new voice configuration', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/voices');

  await page.getByRole('button', { name: 'Add voice' }).first().click();
  await expect(page.getByRole('heading', { name: 'Add Voice Configuration' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Voice' }).click();
  await page.getByRole('option', { name: /Test Voice DE/ }).click();

  await page.getByLabel('Language').click();
  await page.getByRole('option', { name: 'German' }).click();

  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByRole('heading', { name: 'Add Voice Configuration' })).not.toBeVisible();
  await expect(page.getByText('Test Voice DE')).toBeVisible();

  const configs = await getVoiceConfigurations();
  expect(configs).toHaveLength(1);
  expect(configs[0].voiceId).toBe('test-voice-de');
  expect(configs[0].language).toBe('de');
});

test('can toggle voice configuration enabled state', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Test Voice',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/voices');
  await expect(page.getByText('Test Voice')).toBeVisible();

  await page.getByRole('switch', { name: 'Disable voice' }).click();

  await page.waitForTimeout(2000);

  const configs = await getVoiceConfigurations();
  expect(configs[0].isEnabled).toBe(false);
});

test('can delete a voice configuration', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Voice to Delete',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/voices');
  await expect(page.getByText('Voice to Delete')).toBeVisible();

  await page.getByRole('button', { name: 'Delete voice' }).click();
  await expect(page.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('Voice to Delete', { exact: true})).not.toBeVisible();
  await expect(page.getByText('No voice configurations yet')).toBeVisible();

  const configs = await getVoiceConfigurations();
  expect(configs).toHaveLength(0);
});

test('displays card preview section', async ({ page }) => {
  await createCard({
    cardId: 'test-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', hu: 'ház' },
      examples: [{ de: 'Das Haus ist groß.', hu: 'A ház nagy.', isSelected: true }],
    },
  });

  await page.goto('http://localhost:8180/settings/voices');

  await expect(page.getByRole('heading', { name: 'Card Preview' })).toBeVisible();
  await expect(page.getByText('1 / 1')).toBeVisible();
});

test('can navigate between preview cards', async ({ page }) => {
  await createCard({
    cardId: 'test-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house' },
    },
  });
  await createCard({
    cardId: 'test-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Auto',
      type: 'NOUN',
      translation: { en: 'car' },
    },
  });

  await page.goto('http://localhost:8180/settings/voices');

  await expect(page.getByText('1 / 2')).toBeVisible();

  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();

  await page.getByRole('button', { name: 'Previous card' }).click();
  await expect(page.getByText('1 / 2')).toBeVisible();
});

test('displays voice category tags', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    isEnabled: true,
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu',
    model: 'eleven_v3',
    language: 'hu',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/voices');

  await expect(page.locator('.default-tag').first()).toBeVisible();
  await expect(page.locator('.favorite-tag').first()).toBeVisible();
});

test('displays model name in configuration list', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    isEnabled: true,
  });

  await page.goto('http://localhost:8180/settings/voices');

  await expect(page.getByText('Eleven v3')).toBeVisible();
});

test('shows skeleton loader while loading configurations', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/voices');

  await expect(page.getByRole('heading', { name: 'Voice Configurations' })).toBeVisible();
});

test('settings page has left navigation with voices link', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voices' })).toBeVisible();
});
