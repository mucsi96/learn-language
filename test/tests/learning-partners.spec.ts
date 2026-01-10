import { test, expect } from '../fixtures';
import {
  createCard,
  createLearningPartner,
  createReviewLog,
  getLearningPartners,
  getReviewLogs,
  getStudySessionCards,
  getStudySessions,
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

  await page.getByRole('switch', { name: "Activate Alice" }).click();

  await expect(page.getByRole('switch', { name: "Deactivate Alice" })).toBeVisible();

  const partners = await getLearningPartners();
  expect(partners[0].isActive).toBe(true);
});

test('activating one partner deactivates others', async ({ page }) => {
  await createLearningPartner({ name: 'Alice', isActive: true });
  await createLearningPartner({ name: 'Bob', isActive: false });

  await page.goto('http://localhost:8180/settings/learning-partners');

  await expect(page.getByRole('switch', { name: 'Deactivate Alice' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Activate Bob' })).toBeVisible();

  await page.getByRole('switch', { name: 'Activate Bob' }).click();

  await expect(page.getByRole('switch', { name: 'Activate Alice' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Deactivate Bob' })).toBeVisible();

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
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('No learning partners yet')).toBeVisible();
  await expect(page.getByText('Alice')).not.toBeVisible();

  const partners = await getLearningPartners();
  expect(partners.length).toBe(0);
});

test('study page shows turn indicator when partner is active', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await expect(page.getByRole('status', { name: 'Current turn' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const turnIndicator = page.getByRole('status', { name: 'Current turn' });

  await page.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(turnIndicator).toContainText('Alice');
});

test('study page does not show turn indicator when no partner is active', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await flashcard.getByRole('heading', { name: 'második' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();

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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByRole('heading', { name: 'tanulni' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();

  const reviewLogs = await getReviewLogs();
  expect(reviewLogs.length).toBe(1);
  expect(reviewLogs[0].learningPartnerId).toBeNull();
});

test('smart assignment distributes cards equally between myself and partner', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'eins', type: 'NOUN', translation: { en: 'one', hu: 'egy' } },
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'zwei', type: 'NOUN', translation: { en: 'two', hu: 'kettő' } },
  });
  await createCard({
    cardId: 'card3',
    sourceId: 'goethe-a1',
    sourcePageNumber: 12,
    data: { word: 'drei', type: 'NOUN', translation: { en: 'three', hu: 'három' } },
  });
  await createCard({
    cardId: 'card4',
    sourceId: 'goethe-a1',
    sourcePageNumber: 13,
    data: { word: 'vier', type: 'NOUN', translation: { en: 'four', hu: 'négy' } },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessions = await getStudySessions();
  const sessionCards = await getStudySessionCards(sessions[0].id);

  expect(sessionCards.length).toBe(4);

  const myCards = sessionCards.filter(c => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter(c => c.learningPartnerId === partnerId);

  expect(myCards.length).toBe(2);
  expect(partnerCards.length).toBe(2);

  expect(sessionCards[0].learningPartnerId).toBeNull();
  expect(sessionCards[1].learningPartnerId).toBe(partnerId);
  expect(sessionCards[2].learningPartnerId).toBeNull();
  expect(sessionCards[3].learningPartnerId).toBe(partnerId);
});

test('smart assignment assigns card to partner when I reviewed it with good rating', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'card-i-know',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'gut', type: 'ADJ', translation: { en: 'good', hu: 'jó' } },
  });
  await createCard({
    cardId: 'card-neutral',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'neu', type: 'ADJ', translation: { en: 'new', hu: 'új' } },
  });

  await createReviewLog({
    cardId: 'card-i-know',
    learningPartnerId: null,
    rating: 3,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessions = await getStudySessions();
  const sessionCards = await getStudySessionCards(sessions[0].id);

  const cardIKnow = sessionCards.find(c => c.cardId === 'card-i-know');
  expect(cardIKnow?.learningPartnerId).toBe(partnerId);
});

test('smart assignment assigns card to me when I reviewed it with bad rating', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'card-i-dont-know',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'schwer', type: 'ADJ', translation: { en: 'difficult', hu: 'nehéz' } },
  });
  await createCard({
    cardId: 'card-neutral',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'leicht', type: 'ADJ', translation: { en: 'easy', hu: 'könnyű' } },
  });

  await createReviewLog({
    cardId: 'card-i-dont-know',
    learningPartnerId: null,
    rating: 1,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessions = await getStudySessions();
  const sessionCards = await getStudySessionCards(sessions[0].id);

  const cardIDontKnow = sessionCards.find(c => c.cardId === 'card-i-dont-know');
  expect(cardIDontKnow?.learningPartnerId).toBeNull();
});

test('smart assignment assigns card to me when partner reviewed it with good rating', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'card-partner-knows',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'kennen', type: 'VERB', translation: { en: 'to know', hu: 'ismerni' } },
  });
  await createCard({
    cardId: 'card-neutral',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'lernen', type: 'VERB', translation: { en: 'to learn', hu: 'tanulni' } },
  });

  await createReviewLog({
    cardId: 'card-partner-knows',
    learningPartnerId: partnerId,
    rating: 4,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessions = await getStudySessions();
  const sessionCards = await getStudySessionCards(sessions[0].id);

  const cardPartnerKnows = sessionCards.find(c => c.cardId === 'card-partner-knows');
  expect(cardPartnerKnows?.learningPartnerId).toBeNull();
});

test('smart assignment assigns card to partner when partner reviewed it with bad rating', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'card-partner-doesnt-know',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'vergessen', type: 'VERB', translation: { en: 'to forget', hu: 'elfelejteni' } },
  });
  await createCard({
    cardId: 'card-neutral',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'erinnern', type: 'VERB', translation: { en: 'to remember', hu: 'emlékezni' } },
  });

  await createReviewLog({
    cardId: 'card-partner-doesnt-know',
    learningPartnerId: partnerId,
    rating: 2,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessions = await getStudySessions();
  const sessionCards = await getStudySessionCards(sessions[0].id);

  const cardPartnerDoesntKnow = sessionCards.find(c => c.cardId === 'card-partner-doesnt-know');
  expect(cardPartnerDoesntKnow?.learningPartnerId).toBe(partnerId);
});

test('smart assignment respects equal distribution over optimal assignment', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Alice', isActive: true });

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'eins', type: 'NOUN', translation: { en: 'one', hu: 'egy' } },
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'zwei', type: 'NOUN', translation: { en: 'two', hu: 'kettő' } },
  });
  await createCard({
    cardId: 'card3',
    sourceId: 'goethe-a1',
    sourcePageNumber: 12,
    data: { word: 'drei', type: 'NOUN', translation: { en: 'three', hu: 'három' } },
  });
  await createCard({
    cardId: 'card4',
    sourceId: 'goethe-a1',
    sourcePageNumber: 13,
    data: { word: 'vier', type: 'NOUN', translation: { en: 'four', hu: 'négy' } },
  });

  await createReviewLog({ cardId: 'card1', learningPartnerId: null, rating: 4 });
  await createReviewLog({ cardId: 'card2', learningPartnerId: null, rating: 4 });
  await createReviewLog({ cardId: 'card3', learningPartnerId: null, rating: 4 });
  await createReviewLog({ cardId: 'card4', learningPartnerId: null, rating: 4 });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessions = await getStudySessions();
  const sessionCards = await getStudySessionCards(sessions[0].id);

  const myCards = sessionCards.filter(c => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter(c => c.learningPartnerId === partnerId);

  expect(myCards.length).toBe(2);
  expect(partnerCards.length).toBe(2);
});
