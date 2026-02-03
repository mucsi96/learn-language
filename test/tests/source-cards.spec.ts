import { test, expect } from '../fixtures';
import { createCard, createReviewLog, createLearningPartner } from '../utils';

test('navigates to cards table from sources page', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  const sourceCard = page.getByRole('article', { name: 'Goethe A1' });
  await sourceCard.hover();
  await sourceCard.getByRole('link', { name: 'Cards' }).click();

  await expect(page).toHaveURL(/\/sources\/goethe-a1\/cards/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cards' })).toBeVisible();
});

test('displays cards in table', async ({ page }) => {
  await createCard({
    cardId: 'table-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Apfel', type: 'NOUN', translation: { en: 'apple' } },
    state: 'NEW',
    reps: 0,
  });
  await createCard({
    cardId: 'table-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Birne', type: 'NOUN', translation: { en: 'pear' } },
    state: 'REVIEW',
    reps: 5,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'Apfel' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Birne' })).toBeVisible();
});

test('filters cards by state', async ({ page }) => {
  await createCard({
    cardId: 'filter-new',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Tisch', type: 'NOUN', translation: { en: 'table' } },
    state: 'NEW',
  });
  await createCard({
    cardId: 'filter-review',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Stuhl', type: 'NOUN', translation: { en: 'chair' } },
    state: 'REVIEW',
    reps: 3,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'Tisch' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Stuhl' })).toBeVisible();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'New' }).click();

  await expect(page.getByRole('gridcell', { name: 'Tisch' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Stuhl' })).not.toBeVisible();
});

test('marks cards as known', async ({ page }) => {
  await createCard({
    cardId: 'known-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Haus', type: 'NOUN', translation: { en: 'house' } },
    state: 'NEW',
  });
  await createCard({
    cardId: 'known-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Auto', type: 'NOUN', translation: { en: 'car' } },
    state: 'NEW',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();

  const hausRow = page.getByRole('row').filter({ hasText: 'Haus' });
  await hausRow.getByRole('checkbox').check();

  await expect(page.getByText('1 selected')).toBeVisible();
  await page.getByRole('button', { name: 'Mark selected cards as known' }).click();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'Known' }).click();

  await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Auto' })).not.toBeVisible();
});

test('marks known cards back as ready', async ({ page }) => {
  await createCard({
    cardId: 'ready-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Buch', type: 'NOUN', translation: { en: 'book' } },
    readiness: 'KNOWN',
    state: 'REVIEW',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'Known' }).click();

  await expect(page.getByRole('gridcell', { name: 'Buch' })).toBeVisible();

  const buchRow = page.getByRole('row').filter({ hasText: 'Buch' });
  await buchRow.getByRole('checkbox').check();

  await page.getByRole('button', { name: 'Mark selected cards as ready' }).click();

  await expect(page.getByRole('gridcell', { name: 'Buch' })).not.toBeVisible();
});

test('displays review information in table', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Anna', isActive: true });

  await createCard({
    cardId: 'review-info-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat' } },
    state: 'REVIEW',
    reps: 3,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'review-info-card',
    rating: 3,
    learningPartnerId: partnerId,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Katze' });
  await expect(row.getByRole('gridcell', { name: '3' }).first()).toBeVisible();
  await expect(row.getByRole('gridcell', { name: 'Good' })).toBeVisible();
  await expect(row.getByRole('gridcell', { name: 'Anna' })).toBeVisible();
});

test('filters by review grade', async ({ page }) => {
  await createCard({
    cardId: 'grade-card-good',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Hund', type: 'NOUN', translation: { en: 'dog' } },
    state: 'REVIEW',
    reps: 2,
  });
  await createReviewLog({
    cardId: 'grade-card-good',
    rating: 3,
    review: new Date(),
  });

  await createCard({
    cardId: 'grade-card-hard',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Vogel', type: 'NOUN', translation: { en: 'bird' } },
    state: 'LEARNING',
    reps: 1,
  });
  await createReviewLog({
    cardId: 'grade-card-hard',
    rating: 2,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'Hund' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Vogel' })).toBeVisible();

  await page.getByLabel('Filter by last review grade').click();
  await page.getByRole('option', { name: 'Good' }).click();

  await expect(page.getByRole('gridcell', { name: 'Hund' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: 'Vogel' })).not.toBeVisible();
});

test('source page shows text buttons for edit and delete', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  const sourceCard = page.getByRole('article', { name: 'Goethe A1' });
  await sourceCard.hover();

  await expect(sourceCard.getByRole('button', { name: 'Edit source' })).toBeVisible();
  await expect(sourceCard.getByRole('button', { name: 'Edit source' })).toContainText('Edit');
  await expect(sourceCard.getByRole('button', { name: 'Delete source' })).toBeVisible();
  await expect(sourceCard.getByRole('button', { name: 'Delete source' })).toContainText('Delete');
});

test('navigates to card editing page on row click', async ({ page }) => {
  await createCard({
    cardId: 'nav-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Fenster', type: 'NOUN', translation: { en: 'window' } },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(page.getByRole('gridcell', { name: 'Fenster' })).toBeVisible();
  await page.getByRole('gridcell', { name: 'Fenster' }).click();

  await expect(page).toHaveURL(/\/sources\/goethe-a1\/page\/9\/cards\/nav-card-1/);
});
