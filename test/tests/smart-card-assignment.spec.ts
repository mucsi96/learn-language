import { test, expect } from '../fixtures';
import {
  createCard,
  createLearningPartner,
  createReviewLog,
  getStudySessionCards,
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

  const sessionCards = await getStudySessionCards(page);

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

  const sessionCards = await getStudySessionCards(page);

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

  const sessionCards = await getStudySessionCards(page);

  expect(sessionCards[0].position).toBe(0);
  expect(sessionCards[0].learningPartnerId).toBeNull();
  expect(sessionCards[1].position).toBe(1);
  expect(sessionCards[1].learningPartnerId).toBe(partnerId);
});

test('smart assignment: card with higher user complexity assigned to user', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  await createCard({
    cardId: 'hard_for_user',
    sourceId: 'goethe-a1',
    data: { word: 'schwierig', type: 'ADJECTIVE', translation: { hu: 'nehéz' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'hard_for_partner',
    sourceId: 'goethe-a1',
    data: { word: 'leicht', type: 'ADJECTIVE', translation: { hu: 'könnyű' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'hard_for_user',
    learningPartnerId: null,
    rating: 1,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'hard_for_user',
    learningPartnerId: partnerId,
    rating: 4,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'hard_for_partner',
    learningPartnerId: null,
    rating: 4,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'hard_for_partner',
    learningPartnerId: partnerId,
    rating: 1,
    review: twoDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const hardForUserCard = sessionCards.find((c) => c.cardId === 'hard_for_user');
  const hardForPartnerCard = sessionCards.find((c) => c.cardId === 'hard_for_partner');

  expect(hardForUserCard?.learningPartnerId).toBeNull();
  expect(hardForPartnerCard?.learningPartnerId).toBe(partnerId);
});

test('smart assignment: card reviewed only by user assigned to partner', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

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
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'partner_reviewed',
    learningPartnerId: partnerId,
    rating: 3,
    review: twoDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const userReviewedCard = sessionCards.find((c) => c.cardId === 'user_reviewed');
  const partnerReviewedCard = sessionCards.find((c) => c.cardId === 'partner_reviewed');

  expect(userReviewedCard?.learningPartnerId).toBe(partnerId);
  expect(partnerReviewedCard?.learningPartnerId).toBeNull();
});

test('smart assignment: elapsed days increases complexity', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);

  await createCard({
    cardId: 'user_old_review',
    sourceId: 'goethe-a1',
    data: { word: 'alt', type: 'ADJECTIVE', translation: { hu: 'régi' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'partner_old_review',
    sourceId: 'goethe-a1',
    data: { word: 'neu', type: 'ADJECTIVE', translation: { hu: 'új' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'user_old_review',
    learningPartnerId: null,
    rating: 2,
    review: fiveDaysAgo,
  });
  await createReviewLog({
    cardId: 'user_old_review',
    learningPartnerId: partnerId,
    rating: 2,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'partner_old_review',
    learningPartnerId: null,
    rating: 2,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'partner_old_review',
    learningPartnerId: partnerId,
    rating: 2,
    review: fiveDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const userOldReviewCard = sessionCards.find((c) => c.cardId === 'user_old_review');
  const partnerOldReviewCard = sessionCards.find((c) => c.cardId === 'partner_old_review');

  expect(userOldReviewCard?.learningPartnerId).toBeNull();
  expect(partnerOldReviewCard?.learningPartnerId).toBe(partnerId);
});

test('smart assignment: primary rule (equal distribution) overrides secondary preference', async ({
  page,
}) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

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
      review: twoDaysAgo,
    });
    await createReviewLog({
      cardId,
      learningPartnerId: partnerId,
      rating: 4,
      review: twoDaysAgo,
    });
  }

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

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

  const sessionCards = await getStudySessionCards(page);

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

  const sessionCards = await getStudySessionCards(page);

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

  const sessionCards = await getStudySessionCards(page);

  expect(sessionCards.length).toBe(1);
  expect(sessionCards[0].learningPartnerId).toBeNull();
});

test('smart assignment: complexity combines rating and elapsed days', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);

  await createCard({
    cardId: 'user_high_complexity',
    sourceId: 'goethe-a1',
    data: { word: 'komplex', type: 'ADJECTIVE', translation: { hu: 'összetett' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'partner_high_complexity',
    sourceId: 'goethe-a1',
    data: { word: 'einfach', type: 'ADJECTIVE', translation: { hu: 'egyszerű' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'user_high_complexity',
    learningPartnerId: null,
    rating: 1,
    review: tenDaysAgo,
  });
  await createReviewLog({
    cardId: 'user_high_complexity',
    learningPartnerId: partnerId,
    rating: 4,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'partner_high_complexity',
    learningPartnerId: null,
    rating: 4,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'partner_high_complexity',
    learningPartnerId: partnerId,
    rating: 1,
    review: tenDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const userHighComplexityCard = sessionCards.find((c) => c.cardId === 'user_high_complexity');
  const partnerHighComplexityCard = sessionCards.find((c) => c.cardId === 'partner_high_complexity');

  expect(userHighComplexityCard?.learningPartnerId).toBeNull();
  expect(partnerHighComplexityCard?.learningPartnerId).toBe(partnerId);
});

test('smart assignment: hardest cards for each person at front of their queue', async ({
  page,
}) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);

  await createCard({
    cardId: 'user_hardest',
    sourceId: 'goethe-a1',
    data: { word: 'schwerste', type: 'ADJECTIVE', translation: { hu: 'legnehezebb' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'user_medium',
    sourceId: 'goethe-a1',
    data: { word: 'mittel', type: 'ADJECTIVE', translation: { hu: 'közepes' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'partner_hardest',
    sourceId: 'goethe-a1',
    data: { word: 'schwerste_p', type: 'ADJECTIVE', translation: { hu: 'legnehezebb_p' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'partner_medium',
    sourceId: 'goethe-a1',
    data: { word: 'mittel_p', type: 'ADJECTIVE', translation: { hu: 'közepes_p' } },
    due: yesterday,
  });

  await createReviewLog({ cardId: 'user_hardest', learningPartnerId: null, rating: 1, review: tenDaysAgo });
  await createReviewLog({ cardId: 'user_hardest', learningPartnerId: partnerId, rating: 4, review: twoDaysAgo });

  await createReviewLog({ cardId: 'user_medium', learningPartnerId: null, rating: 2, review: fiveDaysAgo });
  await createReviewLog({ cardId: 'user_medium', learningPartnerId: partnerId, rating: 3, review: twoDaysAgo });

  await createReviewLog({ cardId: 'partner_hardest', learningPartnerId: null, rating: 4, review: twoDaysAgo });
  await createReviewLog({ cardId: 'partner_hardest', learningPartnerId: partnerId, rating: 1, review: tenDaysAgo });

  await createReviewLog({ cardId: 'partner_medium', learningPartnerId: null, rating: 3, review: twoDaysAgo });
  await createReviewLog({ cardId: 'partner_medium', learningPartnerId: partnerId, rating: 2, review: fiveDaysAgo });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  expect(sessionCards[0].cardId).toBe('user_hardest');
  expect(sessionCards[0].learningPartnerId).toBeNull();

  expect(sessionCards[1].cardId).toBe('partner_hardest');
  expect(sessionCards[1].learningPartnerId).toBe(partnerId);

  expect(sessionCards[2].cardId).toBe('user_medium');
  expect(sessionCards[2].learningPartnerId).toBeNull();

  expect(sessionCards[3].cardId).toBe('partner_medium');
  expect(sessionCards[3].learningPartnerId).toBe(partnerId);
});

test('smart assignment: session limited to 50 most complex cards', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);

  for (let i = 1; i <= 60; i++) {
    await createCard({
      cardId: `card_${i}`,
      sourceId: 'goethe-a1',
      data: { word: `wort${i}`, type: 'NOUN', translation: { hu: `szó${i}` } },
      due: yesterday,
    });

    if (i <= 50) {
      await createReviewLog({
        cardId: `card_${i}`,
        learningPartnerId: null,
        rating: 1,
        review: tenDaysAgo,
      });
    } else {
      await createReviewLog({
        cardId: `card_${i}`,
        learningPartnerId: null,
        rating: 4,
        review: twoDaysAgo,
      });
      await createReviewLog({
        cardId: `card_${i}`,
        learningPartnerId: partnerId,
        rating: 4,
        review: twoDaysAgo,
      });
    }
  }

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  expect(sessionCards.length).toBe(50);

  const cardIds = sessionCards.map((c) => c.cardId);
  for (let i = 51; i <= 60; i++) {
    expect(cardIds).not.toContain(`card_${i}`);
  }
});
