import { test, expect } from '../fixtures';
import {
  setupDefaultChatModelSettings,
  createSource,
  createCard,
  withDbConnection,
} from '../utils';

async function stubDisplayAudioCapture(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const track = { stop() {} };
    (navigator.mediaDevices as unknown as {
      getDisplayMedia: () => Promise<MediaStream>;
    }).getDisplayMedia = async () =>
      ({
        getTracks: () => [track],
        getVideoTracks: () => [],
        getAudioTracks: () => [track],
      } as unknown as MediaStream);

    class FakeAudioContext {
      sampleRate = 48000;
      state = 'running';
      destination = {};
      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }
      createScriptProcessor() {
        return { connect() {}, disconnect() {}, addEventListener() {} };
      }
      close() {
        return Promise.resolve();
      }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  });
}

async function getCardIdsForSource(sourceId: string): Promise<string[]> {
  return withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id FROM learn_language.cards WHERE source_id = $1`,
      [sourceId]
    );
    return result.rows.map((row) => row.id as string);
  });
}

test('audio stream transcribes and creates draft cards only for unknown words', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();

  await createSource({
    id: 'known-words-source',
    name: 'Known Words',
    startPage: 1,
    languageLevel: 'B1',
    cardTypes: ['vocabulary'],
    formatType: 'wordListWithExamples',
    sourceType: 'pdf',
  });
  await createCard({
    cardId: 'hund-kutya',
    sourceId: 'known-words-source',
    data: {
      word: 'der Hund',
      translation: { hu: 'kutya' },
      forms: ['die Hunde'],
      examples: [],
    },
    readiness: 'READY',
  });

  await createSource({
    id: 'cartoon',
    name: 'German Cartoon',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['vocabulary'],
    formatType: 'wordListWithExamples',
    sourceType: 'audioStream',
    aiLanguage: 'hungarian',
    detectionSourceIds: ['known-words-source'],
  });

  await stubDisplayAudioCapture(page);

  await page.goto('/sources/cartoon/audio-stream');
  await page.getByRole('button', { name: 'Record' }).click();

  await expect(
    page.getByRole('region', { name: 'Transcript' })
  ).toContainText('Katze');

  await expect(async () => {
    const cardIds = await getCardIdsForSource('cartoon');
    expect(cardIds).toContain('katze-macska');
    expect(cardIds.some((id) => id.startsWith('hund-'))).toBe(false);
  }).toPass();
});
