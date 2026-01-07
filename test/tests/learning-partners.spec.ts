import { test, expect } from '../fixtures';
import {
  createCard,
  createLearningPartner,
  setStudySettings,
  getLearningPartners,
  getStudySettings,
  getReviewLogs,
} from '../utils';

test('learning partners settings page displays empty state', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByRole('heading', { name: 'Study Mode' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learning Partners' })).toBeVisible();
  await expect(page.getByText('No learning partners yet')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Solo study' })).toBeChecked();
});

test('can add a learning partner', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/learning-partners');

  await page.getByLabel('Partner name').fill('Alice');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('Alice')).toBeVisible();

  const partners = await getLearningPartners();
  expect(partners.length).toBe(1);
  expect(partners[0].name).toBe('Alice');
  expect(partners[0].isEnabled).toBe(true);
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

test('can toggle learning partner enabled state', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isEnabled: true });

  await page.goto('http://localhost:8180/settings/learning-partners');

  const toggle = page.getByRole('switch', { name: /Alice/ });
  await expect(toggle).toBeChecked();

  await toggle.click();

  const partners = await getLearningPartners();
  expect(partners[0].isEnabled).toBe(false);
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

test('can change study mode to with partner', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/learning-partners');

  await page.getByRole('radio', { name: 'Study with partner' }).click();

  const settings = await getStudySettings();
  expect(settings?.studyMode).toBe('WITH_PARTNER');
});

test('can change study mode back to solo', async ({ page }) => {
  await setStudySettings({ studyMode: 'WITH_PARTNER' });

  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByRole('radio', { name: 'Study with partner' })).toBeChecked();

  await page.getByRole('radio', { name: 'Solo study' }).click();

  const settings = await getStudySettings();
  expect(settings?.studyMode).toBe('SOLO');
});

test('study page shows presenter banner when studying with partner', async ({ page }) => {
  await createLearningPartner({ name: 'Alice' });
  await setStudySettings({ studyMode: 'WITH_PARTNER' });
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

  await expect(page.getByRole('status')).toContainText('Myself');
});

test('study page alternates between presenter and partner', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });
  await setStudySettings({ studyMode: 'WITH_PARTNER' });

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

  await expect(page.getByRole('status')).toContainText('Myself');

  await page.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByRole('status')).toContainText('Alice');
});

test('study page does not show presenter banner in solo mode', async ({ page }) => {
  await setStudySettings({ studyMode: 'SOLO' });
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

  await expect(page.getByRole('status')).not.toBeVisible();
});

test('review log records learning partner when grading', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });
  await setStudySettings({ studyMode: 'WITH_PARTNER' });

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

test('review log has null learning partner in solo mode', async ({ page }) => {
  await setStudySettings({ studyMode: 'SOLO' });

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
