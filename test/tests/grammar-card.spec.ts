import { test, expect } from '../fixtures';
import {
  selectTextRange,
  scrollElementToTop,
  createCard,
} from '../utils';

test('grammar card fab appears when text is selected', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await scrollElementToTop(page, 'Ich', true);

  await selectTextRange(page, 'Ich', 'arbeite.');

  const grammarFab = page.locator("button:has-text('Create Grammar Card')");
  await expect(grammarFab).toBeVisible();
});

test('can create grammar card with sentence masking', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await scrollElementToTop(page, 'Ich', true);

  await selectTextRange(page, 'Ich', 'arbeite.');

  const grammarFab = page.locator("button:has-text('Create Grammar Card')");
  await expect(grammarFab).toBeVisible();
  await grammarFab.click();

  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Create Grammar Card' })).toBeVisible();

  const wordChips = page.locator('mat-chip');
  await expect(wordChips).toHaveCount(2);

  await wordChips.nth(0).click();

  const maskedPreview = page.locator('.masked-preview');
  await expect(maskedPreview).toContainText('___ arbeite');

  const createButton = page.getByRole('button', { name: 'Create Card', exact: true });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  await expect(dialog).not.toBeVisible();
});

test('grammar card shows masked sentence in unrevealed state', async ({ page }) => {
  await createCard({
    cardId: 'grammar-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      cardType: 'grammar',
      sentence: 'Ich arbeite in Berlin.',
      maskedIndices: [0, 3],
      translation: { hu: 'Berlinben dolgozom.' },
    },
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'Study' }).click();

  const cardTypeBadge = page.locator('.card-type-badge');
  await expect(cardTypeBadge).toContainText('Grammar');

  const sentence = page.locator('.sentence');
  await expect(sentence).toContainText('___ arbeite in ___');

  const translationSection = page.locator('.translation-section');
  await expect(translationSection).not.toBeVisible();
});

test('grammar card shows full sentence and translation in revealed state', async ({ page }) => {
  await createCard({
    cardId: 'grammar-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      cardType: 'grammar',
      sentence: 'Ich arbeite in Berlin.',
      maskedIndices: [0, 3],
      translation: { hu: 'Berlinben dolgozom.' },
    },
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'Study' }).click();

  const learnCard = page.locator('.learn-card');
  await learnCard.click();

  const sentence = page.locator('.sentence');
  await expect(sentence).toContainText('Ich arbeite in Berlin.');

  const translationSection = page.locator('.translation-section');
  await expect(translationSection).toBeVisible();
  await expect(translationSection).toContainText('Berlinben dolgozom.');

  const gradingButtons = page.locator('app-card-grading-buttons');
  await expect(gradingButtons).toBeVisible();
});

test('can grade grammar card', async ({ page }) => {
  await createCard({
    cardId: 'grammar-card-3',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      cardType: 'grammar',
      sentence: 'Das Buch ist interessant.',
      maskedIndices: [1],
      translation: { hu: 'A könyv érdekes.' },
    },
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'Study' }).click();

  const learnCard = page.locator('.learn-card');
  await learnCard.click();

  const goodButton = page.getByRole('button', { name: 'Good' });
  await expect(goodButton).toBeVisible();
  await goodButton.click();

  const emptyState = page.locator('.empty-state');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('All caught up!');
});
