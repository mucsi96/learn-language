import { test, expect } from '../fixtures';
import {
  createCard,
  createLearningPartner,
  createReviewLog,
  getStudySessionCards,
  withDbConnection,
} from '../utils';

test('smart assignment: equal distribution between user and partner', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card3',
    sourceId: 'goethe-a1',
    data: { word: 'drei', type: 'NOUN', translation: { hu: 'három' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card4',
    sourceId: 'goethe-a1',
    data: { word: 'vier', type: 'NOUN', translation: { hu: 'négy' } },
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  expect(sessionId).toBeTruthy();

  const sessionCards = await getStudySessionCards(sessionId!);

  const userCards = sessionCards.filter((c) => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter((c) => c.learningPartnerId === partnerId);

  expect(userCards.length).toBe(2);
  expect(partnerCards.length).toBe(2);
});

test('smart assignment: odd number of cards gives extra card to user', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card3',
    sourceId: 'goethe-a1',
    data: { word: 'drei', type: 'NOUN', translation: { hu: 'három' } },
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const userCards = sessionCards.filter((c) => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter((c) => c.learningPartnerId === partnerId);

  expect(userCards.length).toBe(2);
  expect(partnerCards.length).toBe(1);
});

test('smart assignment: user gets first card, partner gets second', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  expect(sessionCards[0].position).toBe(0);
  expect(sessionCards[0].learningPartnerId).toBeNull();
  expect(sessionCards[1].position).toBe(1);
  expect(sessionCards[1].learningPartnerId).toBe(partnerId);
});

test('smart assignment: card with bad user rating assigned to user', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const hourAgo = new Date(Date.now() - 3600000);

  await createCard({
    cardId: 'hard_for_user',
    sourceId: 'goethe-a1',
    data: { word: 'schwierig', type: 'ADJECTIVE', translation: { hu: 'nehéz' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'easy_for_user',
    sourceId: 'goethe-a1',
    data: { word: 'leicht', type: 'ADJECTIVE', translation: { hu: 'könnyű' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'hard_for_user',
    learningPartnerId: null,
    rating: 1,
    review: hourAgo,
  });
  await createReviewLog({
    cardId: 'hard_for_user',
    learningPartnerId: partnerId,
    rating: 4,
    review: hourAgo,
  });

  await createReviewLog({
    cardId: 'easy_for_user',
    learningPartnerId: null,
    rating: 4,
    review: hourAgo,
  });
  await createReviewLog({
    cardId: 'easy_for_user',
    learningPartnerId: partnerId,
    rating: 1,
    review: hourAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const hardForUserCard = sessionCards.find((c) => c.cardId === 'hard_for_user');
  const easyForUserCard = sessionCards.find((c) => c.cardId === 'easy_for_user');

  expect(hardForUserCard?.learningPartnerId).toBeNull();
  expect(easyForUserCard?.learningPartnerId).toBe(partnerId);
});

test('smart assignment: card reviewed only by user assigned to partner', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const hourAgo = new Date(Date.now() - 3600000);

  await createCard({
    cardId: 'user_reviewed',
    sourceId: 'goethe-a1',
    data: { word: 'bekannt', type: 'ADJECTIVE', translation: { hu: 'ismert' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'partner_reviewed',
    sourceId: 'goethe-a1',
    data: { word: 'unbekannt', type: 'ADJECTIVE', translation: { hu: 'ismeretlen' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'user_reviewed',
    learningPartnerId: null,
    rating: 3,
    review: hourAgo,
  });

  await createReviewLog({
    cardId: 'partner_reviewed',
    learningPartnerId: partnerId,
    rating: 3,
    review: hourAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const userReviewedCard = sessionCards.find((c) => c.cardId === 'user_reviewed');
  const partnerReviewedCard = sessionCards.find((c) => c.cardId === 'partner_reviewed');

  expect(userReviewedCard?.learningPartnerId).toBe(partnerId);
  expect(partnerReviewedCard?.learningPartnerId).toBeNull();
});

test('smart assignment: equal ratings prefers person who reviewed less recently', async ({
  page,
}) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoHoursAgo = new Date(Date.now() - 7200000);
  const hourAgo = new Date(Date.now() - 3600000);

  await createCard({
    cardId: 'user_reviewed_recently',
    sourceId: 'goethe-a1',
    data: { word: 'neu', type: 'ADJECTIVE', translation: { hu: 'új' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'partner_reviewed_recently',
    sourceId: 'goethe-a1',
    data: { word: 'alt', type: 'ADJECTIVE', translation: { hu: 'régi' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'user_reviewed_recently',
    learningPartnerId: null,
    rating: 3,
    review: hourAgo,
  });
  await createReviewLog({
    cardId: 'user_reviewed_recently',
    learningPartnerId: partnerId,
    rating: 3,
    review: twoHoursAgo,
  });

  await createReviewLog({
    cardId: 'partner_reviewed_recently',
    learningPartnerId: null,
    rating: 3,
    review: twoHoursAgo,
  });
  await createReviewLog({
    cardId: 'partner_reviewed_recently',
    learningPartnerId: partnerId,
    rating: 3,
    review: hourAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const userReviewedRecentlyCard = sessionCards.find((c) => c.cardId === 'user_reviewed_recently');
  const partnerReviewedRecentlyCard = sessionCards.find(
    (c) => c.cardId === 'partner_reviewed_recently'
  );

  expect(userReviewedRecentlyCard?.learningPartnerId).toBe(partnerId);
  expect(partnerReviewedRecentlyCard?.learningPartnerId).toBeNull();
});

test('smart assignment: primary rule (equal distribution) overrides secondary preference', async ({
  page,
}) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const hourAgo = new Date(Date.now() - 3600000);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card3',
    sourceId: 'goethe-a1',
    data: { word: 'drei', type: 'NOUN', translation: { hu: 'három' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card4',
    sourceId: 'goethe-a1',
    data: { word: 'vier', type: 'NOUN', translation: { hu: 'négy' } },
    due: yesterday,
  });

  for (const cardId of ['card1', 'card2', 'card3', 'card4']) {
    await createReviewLog({
      cardId,
      learningPartnerId: null,
      rating: 1,
      review: hourAgo,
    });
    await createReviewLog({
      cardId,
      learningPartnerId: partnerId,
      rating: 4,
      review: hourAgo,
    });
  }

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const userCards = sessionCards.filter((c) => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter((c) => c.learningPartnerId === partnerId);

  expect(userCards.length).toBe(2);
  expect(partnerCards.length).toBe(2);
});

test('smart assignment: no partner means no smart assignment', async ({ page }) => {
  const yesterday = new Date(Date.now() - 86400000);

  await createCard({
    cardId: 'card1',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'card2',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  for (const card of sessionCards) {
    expect(card.learningPartnerId).toBeNull();
  }
});

test('smart assignment: new cards without reviews distributed evenly', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);

  for (let i = 1; i <= 6; i++) {
    await createCard({
      cardId: `new_card_${i}`,
      sourceId: 'goethe-a1',
      data: { word: `wort${i}`, type: 'NOUN', translation: { hu: `szó${i}` } },
      due: yesterday,
    });
  }

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const userCards = sessionCards.filter((c) => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter((c) => c.learningPartnerId === partnerId);

  expect(userCards.length).toBe(3);
  expect(partnerCards.length).toBe(3);

  for (let i = 0; i < sessionCards.length; i++) {
    if (i % 2 === 0) {
      expect(sessionCards[i].learningPartnerId).toBeNull();
    } else {
      expect(sessionCards[i].learningPartnerId).toBe(partnerId);
    }
  }
});

test('smart assignment: single card goes to user', async ({ page }) => {
  await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);

  await createCard({
    cardId: 'single_card',
    sourceId: 'goethe-a1',
    data: { word: 'allein', type: 'ADJECTIVE', translation: { hu: 'egyedül' } },
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  expect(sessionCards.length).toBe(1);
  expect(sessionCards[0].learningPartnerId).toBeNull();
});

test('smart assignment: mixed review history respects preferences within equal distribution', async ({
  page,
}) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const hourAgo = new Date(Date.now() - 3600000);

  await createCard({
    cardId: 'prefer_user_1',
    sourceId: 'goethe-a1',
    data: { word: 'user1', type: 'NOUN', translation: { hu: 'user1' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'prefer_user_2',
    sourceId: 'goethe-a1',
    data: { word: 'user2', type: 'NOUN', translation: { hu: 'user2' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'prefer_partner_1',
    sourceId: 'goethe-a1',
    data: { word: 'partner1', type: 'NOUN', translation: { hu: 'partner1' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'prefer_partner_2',
    sourceId: 'goethe-a1',
    data: { word: 'partner2', type: 'NOUN', translation: { hu: 'partner2' } },
    due: yesterday,
  });

  await createReviewLog({ cardId: 'prefer_user_1', learningPartnerId: null, rating: 1, review: hourAgo });
  await createReviewLog({ cardId: 'prefer_user_1', learningPartnerId: partnerId, rating: 4, review: hourAgo });

  await createReviewLog({ cardId: 'prefer_user_2', learningPartnerId: null, rating: 2, review: hourAgo });
  await createReviewLog({ cardId: 'prefer_user_2', learningPartnerId: partnerId, rating: 4, review: hourAgo });

  await createReviewLog({ cardId: 'prefer_partner_1', learningPartnerId: null, rating: 4, review: hourAgo });
  await createReviewLog({ cardId: 'prefer_partner_1', learningPartnerId: partnerId, rating: 1, review: hourAgo });

  await createReviewLog({ cardId: 'prefer_partner_2', learningPartnerId: null, rating: 4, review: hourAgo });
  await createReviewLog({ cardId: 'prefer_partner_2', learningPartnerId: partnerId, rating: 2, review: hourAgo });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionId = new URL(page.url()).searchParams.get('session');
  const sessionCards = await getStudySessionCards(sessionId!);

  const userCards = sessionCards.filter((c) => c.learningPartnerId === null);
  const partnerCards = sessionCards.filter((c) => c.learningPartnerId === partnerId);

  expect(userCards.length).toBe(2);
  expect(partnerCards.length).toBe(2);

  const userCardIds = userCards.map((c) => c.cardId);
  const partnerCardIds = partnerCards.map((c) => c.cardId);

  expect(userCardIds).toContain('prefer_user_1');
  expect(userCardIds).toContain('prefer_user_2');
  expect(partnerCardIds).toContain('prefer_partner_1');
  expect(partnerCardIds).toContain('prefer_partner_2');
});
