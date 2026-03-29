import { test, expect } from '../fixtures';
import {
  createCard,
  createLearningPartner,
  getLearningPartners,
  getReviewLogs,
  setSourceLearningPartner,
} from '../utils';

test('learning partners settings page displays empty state', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByRole('heading', { name: 'Learning Partners' })).toBeVisible();
  await expect(page.getByText('No learning partners yet')).toBeVisible();
});

test('can add a learning partner', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/learning-partners');

  await page.getByLabel('Partner name').fill('Alice');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('Alice')).toBeVisible();

  const partners = await getLearningPartners();
  expect(partners.length).toBe(1);
  expect(partners[0].name).toBe('Alice');
});

test('can add multiple learning partners', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/learning-partners');

  await page.getByLabel('Partner name').fill('Alice');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Alice')).toBeVisible();

  await page.getByLabel('Partner name').fill('Bob');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Bob')).toBeVisible();

  const partners = await getLearningPartners();
  expect(partners.length).toBe(2);
});

test('can delete a learning partner', async ({ page }) => {
  await createLearningPartner({ name: 'Alice' });

  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByText('Alice')).toBeVisible();

  await page.getByRole('button', { name: 'Delete Alice' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('No learning partners yet')).toBeVisible();
  await expect(page.getByText('Alice')).not.toBeVisible();

  const partners = await getLearningPartners();
  expect(partners.length).toBe(0);
});

test('study page shows turn indicator when source has learning partner', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });
  await setSourceLearningPartner('goethe-a1', aliceId);
  await createCard({
    cardId: 'test-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  await expect(page.getByRole('status', { name: 'Current turn' })).toBeVisible();
});

test('study page hides turn indicator when card is revealed', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });
  await setSourceLearningPartner('goethe-a1', aliceId);
  await createCard({
    cardId: 'test-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const turnIndicator = page.getByRole('status', { name: 'Current turn' });

  await expect(turnIndicator).toBeVisible();

  await page.getByRole('heading', { name: 'tanulni' }).click();

  await expect(turnIndicator).not.toBeVisible();
});

test('study page alternates between user and source partner', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });
  await setSourceLearningPartner('goethe-a1', aliceId);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'erste',
      type: 'NOUN',
      translation: { en: 'first', hu: 'első' },
    },
  });

  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: {
      word: 'zweite',
      type: 'NOUN',
      translation: { en: 'second', hu: 'második' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const turnIndicator = page.getByRole('status', { name: 'Current turn' });

  await page.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(turnIndicator).toContainText('Alice');
});

test('study page does not show turn indicator when source has no partner', async ({ page }) => {
  await createCard({
    cardId: 'test-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  await expect(page.getByRole('status', { name: 'Current turn' })).not.toBeVisible();
});

test('review log records learning partner when grading', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });
  await setSourceLearningPartner('goethe-a1', aliceId);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'erste',
      type: 'NOUN',
      translation: { en: 'first', hu: 'első' },
    },
  });

  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: {
      word: 'zweite',
      type: 'NOUN',
      translation: { en: 'second', hu: 'második' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await flashcard.getByRole('heading', { name: 'második' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();

  const reviewLogs = await getReviewLogs();
  expect(reviewLogs.length).toBe(2);
  expect(reviewLogs[0].learningPartnerId).toBeNull();
  expect(reviewLogs[1].learningPartnerId).toBe(aliceId);
});

test('review log has null learning partner when source has no partner', async ({ page }) => {
  await createCard({
    cardId: 'test-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByRole('heading', { name: 'tanulni' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();

  const reviewLogs = await getReviewLogs();
  expect(reviewLogs.length).toBe(1);
  expect(reviewLogs[0].learningPartnerId).toBeNull();
});
