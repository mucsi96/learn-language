import { test, expect } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import {
  STORAGE_DIR,
  createCard,
  yellowImage,
  redImage,
  germanAudioSample,
  withDbConnection,
  createColorJpeg,
  getImageDimensions,
  getImageColor,
  downloadImage,
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
          images: [{ id: referencedImageId, isFavorite: true }],
        },
      ],
    },
  });

  writeStorageFile(`images/${referencedImageId}.webp`, yellowImage);
  writeStorageFile(`images/${orphanImageId}.webp`, yellowImage);

  await triggerCleanup();

  expect(storageFileExists(`images/${referencedImageId}.webp`)).toBe(true);
  expect(storageFileExists(`images/${orphanImageId}.webp`)).toBe(false);
});

test('deletes unreferenced source documents on cleanup', async ({ page }) => {
  writeStorageFile('sources/orphan-document.pdf', germanAudioSample);

  await triggerCleanup();

  expect(storageFileExists('sources/A1_SD1_Wortliste_02.pdf')).toBe(true);
  expect(storageFileExists('sources/Goethe-Zertifikat_A2_Wortliste.pdf')).toBe(true);
  expect(storageFileExists('sources/Goethe-Zertifikat_B1_Wortliste.pdf')).toBe(true);
  expect(storageFileExists('sources/orphan-document.pdf')).toBe(false);
});

test('strips non-favorite images from reviewed cards and deletes their files', async ({ page }) => {
  const favoriteImageId = 'fav-image-1';
  const nonFavoriteImageId = 'non-fav-image-1';

  await createCard({
    cardId: 'reviewed-card-with-images',
    sourceId: 'goethe-a1',
    readiness: 'REVIEWED',
    data: {
      word: 'Schule',
      type: 'NOUN',
      translation: { en: 'school', hu: 'iskola' },
      forms: [],
      examples: [
        {
          de: 'Die Schule ist groß.',
          en: 'The school is big.',
          hu: 'Az iskola nagy.',
          isSelected: true,
          images: [
            { id: favoriteImageId, isFavorite: true },
            { id: nonFavoriteImageId },
          ],
        },
      ],
    },
  });

  writeStorageFile(`images/${favoriteImageId}.webp`, yellowImage);
  writeStorageFile(`images/${nonFavoriteImageId}.webp`, redImage);

  await triggerCleanup();

  expect(storageFileExists(`images/${favoriteImageId}.webp`)).toBe(true);
  expect(storageFileExists(`images/${nonFavoriteImageId}.webp`)).toBe(false);

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT data FROM learn_language.cards WHERE id = 'reviewed-card-with-images'"
    );
    const cardData = result.rows[0].data;
    expect(cardData.examples[0].images).toHaveLength(1);
    expect(cardData.examples[0].images[0].id).toBe(favoriteImageId);
    expect(cardData.examples[0].images[0].isFavorite).toBe(true);
  });
});

test('resizes oversized images on cleanup', async ({ page }) => {
  const oversizedImageId = 'oversized-image-1';
  const normalImageId = 'normal-image-1';

  await createCard({
    cardId: 'card-with-oversized-image',
    sourceId: 'goethe-a1',
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', hu: 'ház' },
      forms: [],
      examples: [
        {
          de: 'Das Haus ist groß.',
          en: 'The house is big.',
          hu: 'A ház nagy.',
          isSelected: true,
          images: [
            { id: oversizedImageId, isFavorite: true },
            { id: normalImageId },
          ],
        },
      ],
    },
  });

  const oversizedImage = await createColorJpeg(page, 'yellow', 2000, 1500);
  writeStorageFile(`images/${oversizedImageId}.webp`, oversizedImage);
  writeStorageFile(`images/${normalImageId}.webp`, yellowImage);

  const beforeSize = fs.statSync(path.join(STORAGE_DIR, `images/${oversizedImageId}.webp`)).size;

  await triggerCleanup();

  const afterData = downloadImage(oversizedImageId);
  const afterSize = afterData.length;
  expect(afterSize).toBeLessThan(beforeSize);

  const dimensions = await getImageDimensions(page, afterData);
  expect(dimensions.width).toBeLessThanOrEqual(1200);
  expect(dimensions.height).toBeLessThanOrEqual(1200);

  expect(await getImageColor(page, afterData)).toBe('yellow');
});

test('preserves non-favorite images on in-review cards', async ({ page }) => {
  const favoriteImageId = 'fav-image-2';
  const nonFavoriteImageId = 'non-fav-image-2';

  await createCard({
    cardId: 'in-review-card-with-images',
    sourceId: 'goethe-a1',
    readiness: 'IN_REVIEW',
    data: {
      word: 'Buch',
      type: 'NOUN',
      translation: { en: 'book', hu: 'könyv' },
      forms: [],
      examples: [
        {
          de: 'Das Buch ist interessant.',
          en: 'The book is interesting.',
          hu: 'A könyv érdekes.',
          isSelected: true,
          images: [
            { id: favoriteImageId, isFavorite: true },
            { id: nonFavoriteImageId },
          ],
        },
      ],
    },
  });

  writeStorageFile(`images/${favoriteImageId}.webp`, yellowImage);
  writeStorageFile(`images/${nonFavoriteImageId}.webp`, redImage);

  await triggerCleanup();

  expect(storageFileExists(`images/${favoriteImageId}.webp`)).toBe(true);
  expect(storageFileExists(`images/${nonFavoriteImageId}.webp`)).toBe(true);

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT data FROM learn_language.cards WHERE id = 'in-review-card-with-images'"
    );
    const cardData = result.rows[0].data;
    expect(cardData.examples[0].images).toHaveLength(2);
  });
});
