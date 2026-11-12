import { test, expect } from '../fixtures';
import { createVoiceConfiguration, getVoiceConfigurations, createCard, createAudioSetting, withDbConnection, assertAudioExists } from '../utils';

test('navigates to voice configuration from profile menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Voice' })).toBeVisible();
});

test('displays empty state when no configurations exist', async ({ page }) => {
  await page.goto('/settings/voices');
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

  await page.goto('/settings/voices');

  await expect(page.getByRole('heading', { name: 'German' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hungarian' })).toBeVisible();
  await expect(page.getByText('German Voice')).toBeVisible();
  await expect(page.getByText('Hungarian Voice')).toBeVisible();
});

test('can add a new voice configuration', async ({ page }) => {
  await createCard({
    cardId: 'v4-preview',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Haus', type: 'NOUN', translation: { en: 'house' } },
  });
  await page.goto('/settings/voices');

  await page.getByRole('button', { name: 'Add voice' }).first().click();
  await expect(page.getByRole('heading', { name: 'Add Voice Configuration' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Voice' }).click();
  await page.getByRole('option', { name: /Test Voice DE/ }).click();

  await page.getByLabel('Language').click();
  await page.getByRole('option', { name: 'German' }).click();

  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await page.getByLabel('Voice gender').click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByRole('heading', { name: 'Add Voice Configuration' })).not.toBeVisible();
  await expect(page.getByText('Test Voice DE')).toBeVisible();

  const configs = await getVoiceConfigurations();
  expect(configs).toHaveLength(1);
  expect(configs[0].voiceId).toBe('test-voice-de');
  expect(configs[0].language).toBe('de');
  expect(configs[0].model).toBe('eleven_v4');
  expect(configs[0].gender).toBe('male');
  await page.reload();
  await expect(page.getByText('Eleven v4', { exact: true })).toBeVisible();

  const audioResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/audio') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Preview voice' }).click();
  const audioResponse = await audioResponsePromise;
  expect(audioResponse.ok()).toBe(true);
  expect(audioResponse.request().postDataJSON()).toMatchObject({
    model: 'eleven_v4', voice: 'test-voice-de', input: 'Haus', language: 'de',
  });
  assertAudioExists((await audioResponse.json()).id);
});

test('can add a Gemini TTS voice configuration', async ({ page }) => {
  await page.goto('/settings/voices');

  await page.getByRole('button', { name: 'Add voice' }).first().click();
  await expect(page.getByRole('heading', { name: 'Add Voice Configuration' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Voice' }).click();
  await page.getByRole('option', { name: /Kore/ }).click();

  await page.getByLabel('Language').click();
  await page.getByRole('option', { name: 'German' }).click();

  await page.getByLabel('Model').click();
  await expect(page.getByRole('option', { name: /Gemini 3.1 Flash TTS/ })).toBeVisible();
  await expect(page.getByRole('option', { name: /Eleven v3/ })).not.toBeVisible();
  await expect(page.getByRole('option', { name: /Eleven v4/ })).not.toBeVisible();
  await page.getByRole('option', { name: /Gemini 3.1 Flash TTS/ }).click();

  await page.getByLabel('Voice gender').click();
  await page.getByRole('option', { name: 'Female', exact: true }).click();
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByRole('heading', { name: 'Add Voice Configuration' })).not.toBeVisible();
  await expect(page.getByText('Kore (Firm)')).toBeVisible();
  await expect(page.getByText('Gemini 3.1 Flash TTS')).toBeVisible();

  const configs = await getVoiceConfigurations();
  expect(configs).toHaveLength(1);
  expect(configs[0].voiceId).toBe('Kore');
  expect(configs[0].model).toBe('gemini-3.1-flash-tts-preview');
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

  await page.goto('/settings/voices');
  await expect(page.getByText('Test Voice')).toBeVisible();

  await page.getByRole('switch', { name: 'Disable voice' }).click();

  await expect(async () => {
    const configs = await getVoiceConfigurations();
    expect(configs[0].isEnabled).toBe(false);
  }).toPass();
});

test('can delete a voice configuration', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Voice to Delete',
    isEnabled: true,
  });

  await page.goto('/settings/voices');
  await expect(page.getByText('Voice to Delete')).toBeVisible();

  await page.getByRole('button', { name: 'Delete voice' }).click();
  await expect(page.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('Voice to Delete', { exact: true })).not.toBeVisible();
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

  await page.goto('/settings/voices');

  await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
  await expect(page.getByText('1 / 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Haus', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ház', exact: true })).toBeVisible();
  await expect(page.getByText('Das Haus ist groß.', { exact: true })).toBeVisible();
});

test('previews vocabulary audio when newer cards cannot be used for voice previews', async ({ page }) => {
  await Promise.all(Array.from({ length: 11 }, (_, index) => createCard({
    cardId: `simple-${index}`,
    sourceId: 'goethe-a1',
    cardType: 'SIMPLE',
    lastReview: new Date('2026-11-06'),
    data: { frontText: 'Question', backText: 'Answer' },
  })));
  await createCard({
    cardId: 'empty-vocabulary', sourceId: 'goethe-a1', data: { word: '   ' },
  });
  await createCard({
    cardId: 'missing-word', sourceId: 'goethe-a1', data: {},
  });
  await createCard({
    cardId: 'preview-vocabulary', sourceId: 'goethe-a1',
    lastReview: new Date('2026-11-01'),
    data: {
      word: 'Haus', translation: { hu: 'ház' },
      examples: [{ de: 'Das Haus ist groß.', hu: 'A ház nagy.', isSelected: true }],
    },
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-de', model: 'eleven_v4', language: 'de', displayName: 'German preview',
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu', model: 'eleven_v3', language: 'hu', displayName: 'Hungarian preview',
  });
  await page.goto('/settings/voices');
  await expect(page.getByText('1 / 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Haus', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ház', exact: true })).toBeVisible();

  const preview = async (voiceName: string, language: string, texts: string[]) => {
    const responses = Promise.all(texts.map(input => page.waitForResponse(response =>
      response.url().endsWith('/api/audio') && response.request().method() === 'POST'
      && response.request().postDataJSON().input === input
    )));
    const playback = page.waitForResponse(response =>
      /\/api\/audio\/.+/.test(response.url()) && response.request().method() === 'GET'
    );
    await page.getByRole('row').filter({ hasText: voiceName })
      .getByRole('button', { name: 'Preview voice' }).click();
    const generated = await responses;
    generated.forEach(response => {
      expect(response.ok()).toBe(true);
      expect(response.request().postDataJSON().language).toBe(language);
    });
    expect((await playback).ok()).toBe(true);
  };

  await preview('German preview', 'de', ['Haus', 'Das Haus ist groß.']);
  await page.reload();
  await preview('Hungarian preview', 'hu', ['ház', 'A ház nagy.']);
  await page.getByRole('button', { name: 'Load new cards' }).click();
  await expect(page.getByRole('heading', { name: 'Haus', exact: true })).toBeVisible();
});

test('shows an actionable empty preview for decks without vocabulary text', async ({ page }) => {
  await createCard({
    cardId: 'simple-only', sourceId: 'goethe-a1', cardType: 'SIMPLE',
    data: { frontText: 'Question', backText: 'Answer' },
  });
  await createVoiceConfiguration({ voiceId: 'test-voice-de', model: 'eleven_v4', language: 'de' });
  await page.goto('/settings/voices');
  await expect(page.getByText('No vocabulary cards with text available for preview')).toBeVisible();
  await expect(page.getByText('0 / 0')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview voice' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next card' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous card' })).toBeDisabled();
});

test('disables voice preview when the card has no text in that language', async ({ page }) => {
  await createCard({ cardId: 'german-only', sourceId: 'goethe-a1', data: { word: 'Haus' } });
  await createVoiceConfiguration({ voiceId: 'test-voice-hu', model: 'eleven_v3', language: 'hu' });
  await page.goto('/settings/voices');
  await expect(page.getByRole('heading', { name: 'Haus', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview voice' })).toBeDisabled();
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

  await page.goto('/settings/voices');

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

  await page.goto('/settings/voices');

  await expect(page.getByText('default').first()).toBeVisible();
  await expect(page.getByText('cloned').first()).toBeVisible();
});

test('displays model name in configuration list', async ({ page }) => {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    isEnabled: true,
  });

  await page.goto('/settings/voices');

  await expect(page.getByText('Eleven v3')).toBeVisible();
});

test('shows skeleton loader while loading configurations', async ({ page }) => {
  await page.goto('/settings/voices');

  await expect(page.getByRole('heading', { name: 'Voice' })).toBeVisible();
});

test('settings page has left navigation with voices and data models links', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voices' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Data Models' })).toBeVisible();
});

test('displays front audio toggle in settings', async ({ page }) => {
  await page.goto('/settings/voices');
  const toggle = page.getByRole('switch', { name: 'Front audio' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toBeChecked();
});

test('front audio toggle persists when disabled', async ({ page }) => {
  await page.goto('/settings/voices');
  const toggle = page.getByRole('switch', { name: 'Front audio' });
  await expect(toggle).toBeChecked();

  await toggle.click();
  await expect(toggle).not.toBeChecked();

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT value FROM learn_language.audio_settings WHERE key = 'front-disabled'"
    );
    expect(result.rows[0].value).toBe(1);
  });
});

test('front audio toggle reflects disabled state from server', async ({ page }) => {
  await createAudioSetting({ key: 'front-disabled', value: 1 });
  await page.goto('/settings/voices');
  const toggle = page.getByRole('switch', { name: 'Front audio' });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
});
