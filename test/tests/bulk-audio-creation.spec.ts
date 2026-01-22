import { test, expect } from '../fixtures';
import {
  createCard,
  createVoiceConfiguration,
  withDbConnection,
  germanAudioSample,
  hungarianAudioSample,
  downloadAudio,
} from '../utils';

async function setupVoiceConfigurations() {
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Test Voice DE',
    isEnabled: true,
  });
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu',
    model: 'eleven_v3',
    language: 'hu',
    displayName: 'Test Voice HU',
    isEnabled: true,
  });
}

test('bulk audio fab appears when cards without audio exist', async ({ page }) => {
  // Create cards without audio
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await createCard({
    cardId: 'sprechen-beszelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'sprechen',
      type: 'VERB',
      translation: { en: 'to speak', hu: 'beszélni', ch: 'rede' },
      forms: ['spricht', 'sprach', 'gesprochen'],
      examples: [
        {
          de: 'Ich spreche Deutsch.',
          hu: 'Németül beszélek.',
          en: 'I speak German.',
          ch: 'Ich red Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id-2' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');
  const fab = page.getByRole('button', { name: 'Generate audio for cards' });
  await expect(fab).toBeVisible();
  await expect(fab).toContainText('Generate audio for 2 cards');
});

test('bulk audio fab hides when all cards have audio', async ({ page }) => {
  // Create card with complete audio data
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
      audio: [
        {
          id: 'audio-id-1',
          text: 'verstehen',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'de',
          selected: true,
        },
        {
          id: 'audio-id-2',
          text: 'érteni',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'hu',
          selected: true,
        },
        {
          id: 'audio-id-3',
          text: 'Ich verstehe Deutsch.',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'de',
          selected: true,
        },
        {
          id: 'audio-id-4',
          text: 'Értem a németet.',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'hu',
          selected: true,
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // FAB should not be visible since card has complete audio
  await expect(page.getByRole('button', { name: 'Generate audio for cards' })).not.toBeVisible();
});

test('bulk audio fab shows partial count for mixed cards', async ({ page }) => {
  // Create one card with audio
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
      audio: [
        {
          id: 'audio-id-1',
          text: 'verstehen',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'de',
          selected: true,
        },
        {
          id: 'audio-id-2',
          text: 'érteni',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'hu',
          selected: true,
        },
        {
          id: 'audio-id-3',
          text: 'Ich verstehe Deutsch.',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'de',
          selected: true,
        },
        {
          id: 'audio-id-4',
          text: 'Értem a németet.',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'hu',
          selected: true,
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  // Create one card without audio
  await createCard({
    cardId: 'sprechen-beszelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'sprechen',
      type: 'VERB',
      translation: { en: 'to speak', hu: 'beszélni', ch: 'rede' },
      forms: ['spricht', 'sprach', 'gesprochen'],
      examples: [
        {
          de: 'Ich spreche Deutsch.',
          hu: 'Németül beszélek.',
          en: 'I speak German.',
          ch: 'Ich red Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id-2' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  // Create another card without audio
  await createCard({
    cardId: 'lernen-tanulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni', ch: 'lerne' },
      forms: ['lernt', 'lernte', 'gelernt'],
      examples: [
        {
          de: 'Ich lerne Deutsch.',
          hu: 'Németet tanulok.',
          en: 'I learn German.',
          ch: 'Ich lern Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id-3' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // FAB should show count for only cards without complete audio
  const fab = page.getByRole('button', { name: 'Generate audio for cards' });
  await expect(fab).toBeVisible();
  await expect(fab).toContainText('Generate audio for 2 cards');
});

test('bulk audio creation opens progress dialog', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Click the FAB
  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Progress dialog should open
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Creating Audio' })).toBeVisible();
});

test('bulk audio creation shows individual progress', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await createCard({
    cardId: 'sprechen-beszelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'sprechen',
      type: 'VERB',
      translation: { en: 'to speak', hu: 'beszélni', ch: 'rede' },
      forms: ['spricht', 'sprach', 'gesprochen'],
      examples: [
        {
          de: 'Ich spreche Deutsch.',
          hu: 'Németül beszélek.',
          en: 'I speak German.',
          ch: 'Ich red Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id-2' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Click the FAB
  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Check that individual cards are listed within the progress dialog
  await expect(page.getByRole('dialog').getByText('verstehen', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('sprechen', { exact: true })).toBeVisible();
});

test('bulk audio creation creates audio in database', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Click the FAB
  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Wait for creation to complete
  await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();

  // Verify audio data was added to database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'verstehen-erteni'");

    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    // Check that audio data was added
    expect(cardData.audio).toBeDefined();
    const audioList = cardData.audio;
    expect(Array.isArray(audioList)).toBeTruthy();

    // Helper function to find audio by text
    const findAudioByText = (text: string) => audioList.find((audio: any) => audio.text === text);

    // Should have audio for German word (German samples)
    const verstehenAudio = findAudioByText('verstehen');
    expect(verstehenAudio).toBeDefined();
    expect(downloadAudio(verstehenAudio.id).equals(germanAudioSample)).toBeTruthy();

    const exampleAudio = findAudioByText('Ich verstehe Deutsch.');
    expect(exampleAudio).toBeDefined();
    expect(downloadAudio(exampleAudio.id).equals(germanAudioSample)).toBeTruthy();

    // Should have audio for Hungarian translations (Hungarian samples)
    const translationAudio = findAudioByText('érteni');
    expect(translationAudio).toBeDefined();
    expect(downloadAudio(translationAudio.id).equals(hungarianAudioSample)).toBeTruthy();

    const translationExampleAudio = findAudioByText('Értem a németet.');
    expect(translationExampleAudio).toBeDefined();
    expect(downloadAudio(translationExampleAudio.id).equals(hungarianAudioSample)).toBeTruthy();
  });
});

test('bulk audio creation updates card readiness to ready', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Click the FAB
  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Wait for creation to complete
  await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();

  // Verify card readiness was updated
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT readiness FROM learn_language.cards WHERE id = 'verstehen-erteni'");

    expect(result.rows.length).toBe(1);
    const readiness = result.rows[0].readiness;

    expect(readiness).toBe('READY');
  });
});

test('bulk audio creation updates ui after completion', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await createCard({
    cardId: 'sprechen-beszelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'sprechen',
      type: 'VERB',
      translation: { en: 'to speak', hu: 'beszélni', ch: 'rede' },
      forms: ['spricht', 'sprach', 'gesprochen'],
      examples: [
        {
          de: 'Ich spreche Deutsch.',
          hu: 'Némető beszélek.',
          en: 'I speak German.',
          ch: 'Ich red Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id-2' }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Verify FAB is initially visible
  const fab = page.getByRole('button', { name: 'Generate audio for cards' });
  await expect(fab).toBeVisible();

  await fab.click();

  // Wait for creation to complete
  await expect(page.getByText('Audio generated successfully for 2 cards!')).toBeVisible();

  // Close the dialog
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  // FAB should no longer be visible since cards now have audio
  await expect(fab).not.toBeVisible();
});

test('bulk audio creation partial audio generation', async ({ page }) => {
  await setupVoiceConfigurations();
  // Create card with some existing audio
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      forms: ['versteht', 'verstand', 'verstanden'],
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: 'test-image-id' }],
        },
      ],
      audio: [
        {
          id: 'existing-audio-id-1',
          text: 'verstehen',
          voice: 'test-voice',
          model: 'eleven_turbo_v2_5',
          language: 'de',
          selected: true,
        },
        // Missing translation and example audio
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // FAB should still be visible since card needs additional audio
  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Wait for creation to complete
  await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();

  // Verify audio data was completed
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'verstehen-erteni'");

    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    const audioList = cardData.audio;
    expect(Array.isArray(audioList)).toBeTruthy();

    // Helper function to find audio by text
    const findAudioByText = (text: string) => audioList.find((audio: any) => audio.text === text);

    // Should preserve existing audio
    const verstehenAudio = findAudioByText('verstehen');
    expect(verstehenAudio).toBeDefined();
    expect(verstehenAudio.id).toBe('existing-audio-id-1');

    // Should have added missing audio (language-specific samples)
    const translationAudio = findAudioByText('érteni');
    expect(translationAudio).toBeDefined();
    expect(downloadAudio(translationAudio.id).equals(hungarianAudioSample)).toBeTruthy();

    const exampleAudio = findAudioByText('Ich verstehe Deutsch.');
    expect(exampleAudio).toBeDefined();
    expect(downloadAudio(exampleAudio.id).equals(germanAudioSample)).toBeTruthy();

    const translationExampleAudio = findAudioByText('Értem a németet.');
    expect(translationExampleAudio).toBeDefined();
    expect(downloadAudio(translationExampleAudio.id).equals(hungarianAudioSample)).toBeTruthy();
  });
});

test('bulk audio creation uses only enabled voice configurations', async ({ page }) => {
  // Create enabled German voice
  await createVoiceConfiguration({
    voiceId: 'test-voice-de',
    model: 'eleven_v3',
    language: 'de',
    displayName: 'Enabled German Voice',
    isEnabled: true,
  });
  // Create disabled Hungarian voice
  await createVoiceConfiguration({
    voiceId: 'test-voice-hu',
    model: 'eleven_v3',
    language: 'hu',
    displayName: 'Disabled Hungarian Voice',
    isEnabled: false,
  });

  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni' },
      examples: [
        {
          de: 'Ich verstehe.',
          hu: 'Értem.',
          isSelected: true,
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Should show error because Hungarian voice is disabled
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('No enabled voice configurations for languages: hu')).toBeVisible();
});

test('bulk audio creation succeeds with all enabled voice configurations', async ({ page }) => {
  // Create enabled voices for both languages
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

  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni' },
      examples: [
        {
          de: 'Ich verstehe.',
          hu: 'Értem.',
          isSelected: true,
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await page.getByRole('button', { name: 'Generate audio for cards' }).click();

  // Should complete successfully
  await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();

  // Verify the generated audio uses the configured voice
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'verstehen-erteni'");

    const cardData = result.rows[0].data;
    const audioList = cardData.audio;

    // All audio should use the configured voice IDs
    const germanAudios = audioList.filter((a: any) => a.language === 'de');
    const hungarianAudios = audioList.filter((a: any) => a.language === 'hu');

    expect(germanAudios.length).toBeGreaterThan(0);
    expect(hungarianAudios.length).toBeGreaterThan(0);

    germanAudios.forEach((audio: any) => {
      expect(audio.voice).toBe('test-voice-de');
      expect(audio.model).toBe('eleven_v3');
    });

    hungarianAudios.forEach((audio: any) => {
      expect(audio.voice).toBe('test-voice-hu');
      expect(audio.model).toBe('eleven_v3');
    });
  });
});

test('bulk audio creation for speech cards', async ({ page }) => {
  await setupVoiceConfigurations();
  await createCard({
    cardId: 'a1b2c3d4',
    sourceId: 'speech-a1',
    sourcePageNumber: 20,
    data: {
      sentence: 'Guten Morgen, wie geht es Ihnen?',
      translation: {
        hu: 'Jó reggelt, hogy van?',
        en: 'Good morning, how are you?',
      },
      examples: [
        {
          de: 'Guten Morgen, wie geht es Ihnen?',
          hu: 'Jó reggelt, hogy van?',
          en: 'Good morning, how are you?',
          isSelected: true,
          images: [{ id: 'test-image-id', isFavorite: true }],
        },
      ],
    },
    readiness: 'REVIEWED',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  const fab = page.getByRole('button', { name: 'Generate audio for cards' });
  await expect(fab).toBeVisible();
  await expect(fab).toContainText('Generate audio for 1 card');

  await fab.click();

  await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'a1b2c3d4'");

    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    expect(cardData.audio).toBeDefined();
    const audioList = cardData.audio;
    expect(Array.isArray(audioList)).toBeTruthy();

    const findAudioByText = (text: string) => audioList.find((audio: any) => audio.text === text);

    const germanSentenceAudio = findAudioByText('Guten Morgen, wie geht es Ihnen?');
    expect(germanSentenceAudio).toBeDefined();
    expect(downloadAudio(germanSentenceAudio.id).equals(germanAudioSample)).toBeTruthy();

    const hungarianTranslationAudio = findAudioByText('Jó reggelt, hogy van?');
    expect(hungarianTranslationAudio).toBeDefined();
    expect(downloadAudio(hungarianTranslationAudio.id).equals(hungarianAudioSample)).toBeTruthy();
  });
});
