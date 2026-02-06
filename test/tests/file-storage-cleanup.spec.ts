import { test, expect } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import {
  STORAGE_DIR,
  createCard,
  yellowImage,
  germanAudioSample,
} from '../utils';

function writeStorageFile(relativePath: string, data: Buffer): void {
  const fullPath = path.join(STORAGE_DIR, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, data);
}

function storageFileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(STORAGE_DIR, relativePath));
}

async function triggerCleanup(): Promise<void> {
  const response = await fetch(
    'http://localhost:8180/api/test/cleanup-storage',
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error(`Cleanup trigger failed: ${response.status}`);
  }
}

test('deletes unreferenced audio files on cleanup', async ({ page }) => {
  const referencedAudioId = 'ref-audio-cleanup-1';
  const orphanAudioId = 'orphan-audio-cleanup-1';

  await createCard({
    cardId: 'cleanup-audio-card',
    sourceId: 'goethe-a1',
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', hu: 'ház' },
      forms: [],
      examples: [],
      audio: [
        {
          id: referencedAudioId,
          text: 'Haus',
          language: 'de',
          voice: 'test-voice',
          model: 'eleven_v3',
        },
      ],
    },
  });

  writeStorageFile(`audio/${referencedAudioId}.mp3`, germanAudioSample);
  writeStorageFile(`audio/${orphanAudioId}.mp3`, germanAudioSample);

  await triggerCleanup();

  expect(storageFileExists(`audio/${referencedAudioId}.mp3`)).toBe(true);
  expect(storageFileExists(`audio/${orphanAudioId}.mp3`)).toBe(false);
});

test('deletes unreferenced image files on cleanup', async ({ page }) => {
  const referencedImageId = 'ref-image-cleanup-1';
  const orphanImageId = 'orphan-image-cleanup-1';

  await createCard({
    cardId: 'cleanup-image-card',
    sourceId: 'goethe-a1',
    data: {
      word: 'Baum',
      type: 'NOUN',
      translation: { en: 'tree', hu: 'fa' },
      forms: [],
      examples: [
        {
          de: 'Der Baum ist groß.',
          en: 'The tree is big.',
          hu: 'A fa nagy.',
          isSelected: true,
          images: [{ id: referencedImageId }],
        },
      ],
    },
  });

  writeStorageFile(`images/${referencedImageId}.jpg`, yellowImage);
  writeStorageFile(`images/${orphanImageId}.jpg`, yellowImage);

  await triggerCleanup();

  expect(storageFileExists(`images/${referencedImageId}.jpg`)).toBe(true);
  expect(storageFileExists(`images/${orphanImageId}.jpg`)).toBe(false);
});

test('deletes unreferenced source documents on cleanup', async ({ page }) => {
  writeStorageFile('sources/orphan-document.pdf', germanAudioSample);

  await triggerCleanup();

  expect(storageFileExists('sources/A1_SD1_Wortliste_02.pdf')).toBe(true);
  expect(storageFileExists('sources/Goethe-Zertifikat_A2_Wortliste.pdf')).toBe(true);
  expect(storageFileExists('sources/Goethe-Zertifikat_B1_Wortliste.pdf')).toBe(true);
  expect(storageFileExists('sources/orphan-document.pdf')).toBe(false);
});
