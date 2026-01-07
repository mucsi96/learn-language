import { test, expect } from '../fixtures';
import {
  createCard,
  createLearningPartner,
  getLearningPartners,
  getReviewLogs,
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
  expect(partners[0].isActive).toBe(false);
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

test('can activate a learning partner', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isActive: false });

  await page.goto('http://localhost:8180/settings/learning-partners');

  const toggle = page.getByRole('switch', { name: /Alice/ });
  await expect(toggle).not.toBeChecked();

  await toggle.click();

  const partners = await getLearningPartners();
  expect(partners[0].isActive).toBe(true);
});

test('activating one partner deactivates others', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isActive: true });
  await createLearningPartner({ name: 'Bob', isActive: false });

  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByRole('switch', { name: /Alice/ })).toBeChecked();
  await expect(page.getByRole('switch', { name: /Bob/ })).not.toBeChecked();

  await page.getByRole('switch', { name: /Bob/ }).click();

  const partners = await getLearningPartners();
  const alice = partners.find(p => p.name === 'Alice');
  const bob = partners.find(p => p.name === 'Bob');
  expect(alice?.isActive).toBe(false);
  expect(bob?.isActive).toBe(true);
});

test('can delete a learning partner', async ({ page }) => {
  await createLearningPartner({ name: 'Alice' });

  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByText('Alice')).toBeVisible();

  await page.getByRole('button', { name: 'Delete Alice' }).click();
  await page.getByRole('button', { name: 'OK' }).click();

  await expect(page.getByText('Alice')).not.toBeVisible();

  const partners = await getLearningPartners();
  expect(partners.length).toBe(0);
});

test('study page shows presenter indicator when partner is active', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isActive: true });
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

  await expect(page.locator('.presenter-indicator')).toBeVisible();
});

test('study page alternates between user and active partner', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isActive: true });

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

  const presenterIndicator = page.locator('.presenter-indicator');
  const initialPresenter = await presenterIndicator.textContent();

  await page.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(presenterIndicator).toContainText('Alice');
});

test('study page does not show presenter indicator when no partner is active', async ({ page }) => {
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

  await expect(page.locator('.presenter-indicator')).not.toBeVisible();
});

test('review log records learning partner when grading', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice', isActive: true });

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

  await page.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await page.getByRole('heading', { name: 'második' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  const reviewLogs = await getReviewLogs();
  expect(reviewLogs.length).toBe(2);
  expect(reviewLogs[0].learningPartnerId).toBeNull();
  expect(reviewLogs[1].learningPartnerId).toBe(aliceId);
});

test('review log has null learning partner when no partner is active', async ({ page }) => {
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

  await page.getByRole('heading', { name: 'tanulni' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  const reviewLogs = await getReviewLogs();
  expect(reviewLogs.length).toBe(1);
  expect(reviewLogs[0].learningPartnerId).toBeNull();
});
