import { test, expect } from '../fixtures';
import { createCard, createLearningPartner } from '../utils';

test('export struggled cards button appears on celebration page when there are struggled cards', async ({ page }) => {
  await createCard({
    cardId: 'pdf-export-good',
    sourceId: 'goethe-a1',
    sourcePageNumber: 90,
    data: {
      word: 'Erfolg',
      type: 'NOUN',
      gender: 'MASCULINE',
      translation: { en: 'success', hu: 'siker', ch: 'Erfolg' },
      examples: [
        {
          de: 'Das ist ein Erfolg.',
          hu: 'Ez egy siker.',
          en: 'This is a success.',
          ch: 'Das isch en Erfolg.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await createCard({
    cardId: 'pdf-export-bad',
    sourceId: 'goethe-a1',
    sourcePageNumber: 91,
    data: {
      word: 'Fehler',
      type: 'NOUN',
      gender: 'MASCULINE',
      translation: { en: 'mistake', hu: 'hiba', ch: 'Fehler' },
      examples: [
        {
          de: 'Ich habe einen Fehler gemacht.',
          hu: 'Hibat kovettem el.',
          en: 'I made a mistake.',
          ch: 'Ich ha en Fehler gmacht.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Incorrect' }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Export struggled cards as PDF' })).toBeVisible();
});

test('export struggled cards button does not appear when all cards answered correctly', async ({ page }) => {
  await createCard({
    cardId: 'pdf-no-export',
    sourceId: 'goethe-a1',
    sourcePageNumber: 92,
    data: {
      word: 'Richtig',
      type: 'ADJECTIVE',
      translation: { en: 'correct', hu: 'helyes', ch: 'richtig' },
      examples: [
        {
          de: 'Das ist richtig.',
          hu: 'Ez helyes.',
          en: 'This is correct.',
          ch: 'Das isch richtig.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Export struggled cards as PDF' })).not.toBeVisible();
});

test('export struggled cards button triggers PDF download', async ({ page }) => {
  await createCard({
    cardId: 'pdf-download-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 93,
    data: {
      word: 'Laden',
      type: 'VERB',
      translation: { en: 'to download', hu: 'letolteni', ch: 'lade' },
      examples: [
        {
          de: 'Ich lade die Datei herunter.',
          hu: 'Letoltom a fajlt.',
          en: 'I download the file.',
          ch: 'Ich lade d Datei abe.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Incorrect' }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export struggled cards as PDF' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('struggled-cards.pdf');
});

test('export struggled cards button visible on study page when returning after session completion', async ({ page }) => {
  await createCard({
    cardId: 'return-pdf-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 94,
    data: {
      word: 'Haus',
      type: 'NOUN',
      gender: 'NEUTER',
      translation: { en: 'house', hu: 'haz', ch: 'Huus' },
      examples: [
        {
          de: 'Das ist mein Haus.',
          hu: 'Ez az en hazam.',
          en: 'This is my house.',
          ch: 'Das isch mis Huus.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Incorrect' }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export struggled cards as PDF' })).toBeVisible();
});

test('export button not visible on study page return when no struggled cards', async ({ page }) => {
  await createCard({
    cardId: 'return-no-pdf-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 95,
    data: {
      word: 'Richtig',
      type: 'ADJECTIVE',
      translation: { en: 'correct', hu: 'helyes', ch: 'richtig' },
      examples: [
        {
          de: 'Das ist richtig.',
          hu: 'Ez helyes.',
          en: 'This is correct.',
          ch: 'Das isch richtig.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export struggled cards as PDF' })).not.toBeVisible();
});

test('export struggled cards with partner mode triggers PDF download', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'partner-pdf-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 96,
    data: {
      word: 'Zusammen',
      type: 'ADVERB',
      translation: { en: 'together', hu: 'egyutt', ch: 'zame' },
      examples: [
        {
          de: 'Wir lernen zusammen.',
          hu: 'Egyutt tanulunk.',
          en: 'We learn together.',
          ch: 'Mir lerne zame.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await createCard({
    cardId: 'partner-pdf-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 97,
    data: {
      word: 'Allein',
      type: 'ADVERB',
      translation: { en: 'alone', hu: 'egyedul', ch: 'elei' },
      examples: [
        {
          de: 'Ich bin allein.',
          hu: 'Egyedul vagyok.',
          en: 'I am alone.',
          ch: 'Ich bi elei.',
          isSelected: true,
        },
      ],
    },
    state: 'REVIEW',
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: new Date(),
    elapsedDays: 1,
    scheduledDays: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Incorrect' }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Incorrect' }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export struggled cards as PDF' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('struggled-cards.pdf');
});
