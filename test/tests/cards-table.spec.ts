import { test, expect } from '../fixtures';
import {
  createCard,
  createReviewLog,
  createLearningPartner,
  withDbConnection,
  getCardFromDb,
} from '../utils';

test.describe('cards table', () => {
  test('displays cards in AG Grid table', async ({ page }) => {
    await createCard({
      cardId: 'card-1',
      sourceId: 'goethe-a1',
      data: { word: 'Haus', type: 'NOUN', translation: { en: 'house', hu: 'ház' } },
      reps: 3,
      lastReview: new Date('2025-06-15T10:00:00Z'),
    });

    await createCard({
      cardId: 'card-2',
      sourceId: 'goethe-a2',
      data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat', hu: 'macska' } },
      reps: 0,
    });

    await page.goto('http://localhost:8180/cards');

    await expect(page.getByRole('heading', { name: 'All Cards' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Goethe A1' }).first()).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Goethe A2' }).first()).toBeVisible();
  });

  test('displays review info from latest review log', async ({ page }) => {
    const partnerId = await createLearningPartner({ name: 'Anna', isActive: true });

    await createCard({
      cardId: 'card-1',
      sourceId: 'goethe-a1',
      data: { word: 'Haus', type: 'NOUN', translation: { en: 'house', hu: 'ház' } },
      reps: 3,
      lastReview: new Date('2025-06-15T10:00:00Z'),
    });

    await createReviewLog({
      cardId: 'card-1',
      learningPartnerId: partnerId,
      rating: 3,
      review: new Date('2025-06-15T10:00:00Z'),
    });

    await page.goto('http://localhost:8180/cards');

    await expect(page.getByRole('gridcell', { name: 'Good' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Anna' })).toBeVisible();
  });

  test('filters by review count', async ({ page }) => {
    await createCard({
      cardId: 'card-1',
      sourceId: 'goethe-a1',
      data: { word: 'Haus', type: 'NOUN', translation: { en: 'house', hu: 'ház' } },
      reps: 3,
    });

    await createCard({
      cardId: 'card-2',
      sourceId: 'goethe-a1',
      data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat', hu: 'macska' } },
      reps: 0,
    });

    await page.goto('http://localhost:8180/cards');
    await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();

    await page.getByLabel('Filter by review count').click();
    await page.getByRole('option', { name: '0' }).click();

    await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Haus' })).not.toBeVisible();
  });

  test('filters by last review grade', async ({ page }) => {
    await createCard({
      cardId: 'card-1',
      sourceId: 'goethe-a1',
      data: { word: 'Haus', type: 'NOUN', translation: { en: 'house', hu: 'ház' } },
      reps: 3,
      lastReview: new Date('2025-06-15T10:00:00Z'),
    });

    await createReviewLog({
      cardId: 'card-1',
      rating: 3,
      review: new Date('2025-06-15T10:00:00Z'),
    });

    await createCard({
      cardId: 'card-2',
      sourceId: 'goethe-a1',
      data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat', hu: 'macska' } },
      reps: 1,
      lastReview: new Date('2025-06-14T10:00:00Z'),
    });

    await createReviewLog({
      cardId: 'card-2',
      rating: 1,
      review: new Date('2025-06-14T10:00:00Z'),
    });

    await page.goto('http://localhost:8180/cards');
    await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();

    await page.getByLabel('Filter by last review grade').click();
    await page.getByRole('option', { name: 'Again' }).click();

    await expect(page.getByRole('gridcell', { name: 'Katze' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Haus' })).not.toBeVisible();
  });

  test('marks selected cards as known', async ({ page }) => {
    await createCard({
      cardId: 'card-1',
      sourceId: 'goethe-a1',
      data: { word: 'Haus', type: 'NOUN', translation: { en: 'house', hu: 'ház' } },
    });

    await createCard({
      cardId: 'card-2',
      sourceId: 'goethe-a1',
      data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat', hu: 'macska' } },
    });

    await page.goto('http://localhost:8180/cards');
    await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();

    const checkboxes = page.locator('.ag-checkbox-input');
    await checkboxes.nth(1).click();
    await checkboxes.nth(2).click();

    await page.getByRole('button', { name: /Mark .* card\(s\) as known/ }).click();

    await expect(page.getByText('2 card(s) marked as known')).toBeVisible();

    const card1 = await getCardFromDb('card-1');
    const card2 = await getCardFromDb('card-2');
    expect(card1.readiness).toBe('KNOWN');
    expect(card2.readiness).toBe('KNOWN');
  });

  test('navigates to card editing on row click', async ({ page }) => {
    await createCard({
      cardId: 'card-1',
      sourceId: 'goethe-a1',
      sourcePageNumber: 9,
      data: { word: 'Haus', type: 'NOUN', translation: { en: 'house', hu: 'ház' } },
    });

    await page.goto('http://localhost:8180/cards');
    await expect(page.getByRole('gridcell', { name: 'Haus' })).toBeVisible();

    await page.getByRole('gridcell', { name: 'Haus' }).click();

    await page.waitForURL(/\/sources\/goethe-a1\/page\/9\/cards\/card-1/);
  });

  test('shows empty state when no cards exist', async ({ page }) => {
    await page.goto('http://localhost:8180/cards');

    await expect(page.getByRole('heading', { name: 'No cards yet' })).toBeVisible();
  });

  test('anchor button on source page navigates to cards table', async ({ page }) => {
    await page.goto('http://localhost:8180/sources/goethe-a1/page/9');

    await page.getByRole('link', { name: 'All cards' }).click();

    await page.waitForURL(/\/cards/);
    await expect(page.getByRole('heading', { name: 'All Cards' })).toBeVisible();
  });
});
