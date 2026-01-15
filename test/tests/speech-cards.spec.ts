import { test, expect } from '../fixtures';
import {
  createCard,
  createSource,
  uploadMockImage,
  yellowImage,
  greenImage,
  getImageContent,
  getColorImageBytes,
  withDbConnection,
  setupDefaultChatModelSettings,
  createChatModelSetting,
} from '../utils';

test.beforeEach(async () => {
  await createSource({
    id: 'speech-test',
    name: 'Speech Test',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'SPEECH',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'PDF',
  });
});

test('speech card shows hungarian translation on front', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'test-sentence-1',
    sourceId: 'speech-test',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich gehe heute ins Kino.',
      translation: { hu: 'Ma moziba megyek.' },
      images: [{ id: image1, isFavorite: true }],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-test/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Speech Card' });
  await expect(flashcard.getByText('Ma moziba megyek.')).toBeVisible();
  await expect(flashcard.getByText('Ich gehe heute ins Kino.')).not.toBeVisible();
  await expect(flashcard.getByRole('img', { name: 'Ma moziba megyek.' })).toBeVisible();
});

test('speech card shows german sentence on back when revealed', async ({ page }) => {
  const image1 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'test-sentence-2',
    sourceId: 'speech-test',
    sourcePageNumber: 1,
    data: {
      sentence: 'Das Wetter ist sehr schön.',
      translation: { hu: 'Az időjárás nagyon szép.' },
      images: [{ id: image1, isFavorite: true }],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-test/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Speech Card' });
  await flashcard.click();

  await expect(flashcard.getByText('Das Wetter ist sehr schön.')).toBeVisible();
  await expect(flashcard.getByText('Az időjárás nagyon szép.')).not.toBeVisible();
  await expect(flashcard.getByRole('img', { name: 'Das Wetter ist sehr schön.' })).toBeVisible();
});

test('speech card displays favorite images correctly', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'test-sentence-3',
    sourceId: 'speech-test',
    sourcePageNumber: 1,
    data: {
      sentence: 'Können Sie mir bitte helfen?',
      translation: { hu: 'Tudna nekem segíteni?' },
      images: [
        { id: image1, isFavorite: false },
        { id: image2, isFavorite: true },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-test/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Speech Card' });
  const imageContent = await getImageContent(flashcard.getByRole('img', { name: 'Tudna nekem segíteni?' }));
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
});

test('speech card shows grading buttons when revealed', async ({ page }) => {
  await createCard({
    cardId: 'test-sentence-4',
    sourceId: 'speech-test',
    sourcePageNumber: 1,
    data: {
      sentence: 'Wo ist der Bahnhof?',
      translation: { hu: 'Hol van a pályaudvar?' },
      images: [],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/speech-test/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Speech Card' });
  await flashcard.click();

  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
});

test('speech card state indicator is visible', async ({ page }) => {
  await createCard({
    cardId: 'test-sentence-5',
    sourceId: 'speech-test',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich verstehe nicht.',
      translation: { hu: 'Nem értem.' },
      images: [],
    },
    state: 'NEW',
  });

  await page.goto('http://localhost:8180/sources/speech-test/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Speech Card' });
  await expect(flashcard.getByLabel('State: New')).toBeVisible();
});

test('speech card without images displays correctly', async ({ page }) => {
  await createCard({
    cardId: 'test-sentence-6',
    sourceId: 'speech-test',
    sourcePageNumber: 1,
    data: {
      sentence: 'Guten Morgen!',
      translation: { hu: 'Jó reggelt!' },
      images: [],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-test/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Speech Card' });
  await expect(flashcard.getByText('Jó reggelt!')).toBeVisible();
  await expect(flashcard.locator('img')).toHaveCount(0);
});
