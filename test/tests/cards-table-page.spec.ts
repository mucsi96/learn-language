import { test, expect } from '../fixtures';
import { createCard, createReviewLog, createLearningPartner } from '../utils';

test('navigates to cards table from page view', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'View all cards' }).click();
  await expect(page).toHaveTitle('Cards');
  await expect(page.getByRole('heading', { name: 'Cards' })).toBeVisible();
});

test('displays cards in table', async ({ page }) => {
  await createCard({
    cardId: 'test-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Hund',
      type: 'NOUN',
      translation: { en: 'dog', hu: 'kutya', ch: 'Hund' },
    },
    state: 'NEW',
    reps: 0,
  });

  await createCard({
    cardId: 'test-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'Katze',
      type: 'NOUN',
      translation: { en: 'cat', hu: 'macska', ch: 'Chatz' },
    },
    state: 'REVIEW',
    reps: 5,
    lastReview: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('heading', { name: 'Cards' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Hund' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();
});

test('filters cards by state', async ({ page }) => {
  await createCard({
    cardId: 'new-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'neu', type: 'ADJECTIVE', translation: { en: 'new' } },
    state: 'NEW',
  });

  await createCard({
    cardId: 'review-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'alt', type: 'ADJECTIVE', translation: { en: 'old' } },
    state: 'REVIEW',
    reps: 3,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'neu' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'alt' })).toBeVisible();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'NEW' }).click();

  await expect(page.getByRole('gridcell', { name: 'neu' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'alt' })).not.toBeVisible();
});

test('filters cards by readiness', async ({ page }) => {
  await createCard({
    cardId: 'ready-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'bereit', type: 'ADJECTIVE', translation: { en: 'ready' } },
    readiness: 'READY',
  });

  await createCard({
    cardId: 'known-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'bekannt', type: 'ADJECTIVE', translation: { en: 'known' } },
    readiness: 'KNOWN',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'bereit' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'bekannt' })).toBeVisible();

  await page.getByLabel('Filter by readiness').click();
  await page.getByRole('option', { name: 'KNOWN' }).click();

  await expect(page.getByRole('gridcell', { name: 'bekannt' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'bereit' })).not.toBeVisible();
});

test('marks selected cards as known', async ({ page }) => {
  await createCard({
    cardId: 'mark-known-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'markieren', type: 'VERB', translation: { en: 'to mark' } },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'markieren' })).toBeVisible();

  const checkbox = page.getByRole('row', { name: /markieren/ }).getByRole('checkbox');
  await checkbox.click();

  await expect(page.getByText('1 card(s) selected')).toBeVisible();

  await page.getByRole('button', { name: 'Mark as known' }).click();

  await expect(page.getByText('1 card(s) marked as known')).toBeVisible();
});

test('displays review information in table', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Anna', isActive: true });

  await createCard({
    cardId: 'reviewed-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'lernen', type: 'VERB', translation: { en: 'to learn' } },
    state: 'REVIEW',
    reps: 3,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'reviewed-card',
    rating: 3,
    learningPartnerId: partnerId,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'lernen' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: '3' }).first()).toBeVisible();
  await expect(page.getByRole('gridcell', { name: /3 - Good/ })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Anna' })).toBeVisible();
});

test('navigates to card editing on row click', async ({ page }) => {
  await createCard({
    cardId: 'click-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'klicken',
      type: 'VERB',
      translation: { en: 'to click', hu: 'kattintani', ch: 'klicke' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await page.getByRole('gridcell', { name: 'klicken' }).click();

  await expect(page).toHaveTitle('Edit Card');
});

test('navigates back to pages from cards table', async ({ page }) => {
  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await page.getByRole('link', { name: 'Back to pages' }).click();

  await expect(page).toHaveURL(/\/sources\/goethe-a1\/page\/1/);
});

test('filters cards by last review grade', async ({ page }) => {
  await createCard({
    cardId: 'easy-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'einfach', type: 'ADJECTIVE', translation: { en: 'easy' } },
    state: 'REVIEW',
    reps: 5,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'easy-card',
    rating: 4,
    review: new Date(),
  });

  await createCard({
    cardId: 'hard-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'schwer', type: 'ADJECTIVE', translation: { en: 'hard' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'hard-card',
    rating: 2,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'einfach' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'schwer' })).toBeVisible();

  await page.getByLabel('Filter by last review grade').click();
  await page.getByRole('option', { name: '4 - Easy' }).click();

  await expect(page.getByRole('gridcell', { name: 'einfach' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'schwer' })).not.toBeVisible();
});

test('page title shows Cards', async ({ page }) => {
  await page.goto('http://localhost:8180/sources/goethe-a1/cards');
  await expect(page).toHaveTitle('Cards');
});

test('delete image button shows as text button', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await expect(page.getByRole('link', { name: 'View all cards' })).toBeVisible();
});
