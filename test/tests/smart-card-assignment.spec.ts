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
    cardId: 'eins-egy',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'zwei-ketto',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'drei-harom',
    sourceId: 'goethe-a1',
    data: { word: 'drei', type: 'NOUN', translation: { hu: 'három' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'vier-negy',
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
    cardId: 'eins-egy',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'zwei-ketto',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'drei-harom',
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
    cardId: 'eins-egy',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'zwei-ketto',
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
    cardId: 'schwierig-nehez',
    sourceId: 'goethe-a1',
    data: { word: 'schwierig', type: 'ADJECTIVE', translation: { hu: 'nehéz' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'leicht-konnyu',
    sourceId: 'goethe-a1',
    data: { word: 'leicht', type: 'ADJECTIVE', translation: { hu: 'könnyű' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'schwierig-nehez',
    learningPartnerId: null,
    rating: 1,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'schwierig-nehez',
    learningPartnerId: partnerId,
    rating: 4,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'leicht-konnyu',
    learningPartnerId: null,
    rating: 4,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'leicht-konnyu',
    learningPartnerId: partnerId,
    rating: 1,
    review: twoDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const hardForUserCard = sessionCards.find((c) => c.cardId === 'schwierig-nehez');
  const hardForPartnerCard = sessionCards.find((c) => c.cardId === 'leicht-konnyu');

  expect(hardForUserCard?.learningPartnerId).toBeNull();
  expect(hardForPartnerCard?.learningPartnerId).toBe(partnerId);
});

test('smart assignment: card reviewed only by user assigned to partner', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  await createCard({
    cardId: 'bekannt-ismert',
    sourceId: 'goethe-a1',
    data: { word: 'bekannt', type: 'ADJECTIVE', translation: { hu: 'ismert' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'unbekannt-ismeretlen',
    sourceId: 'goethe-a1',
    data: { word: 'unbekannt', type: 'ADJECTIVE', translation: { hu: 'ismeretlen' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'bekannt-ismert',
    learningPartnerId: null,
    rating: 3,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'unbekannt-ismeretlen',
    learningPartnerId: partnerId,
    rating: 3,
    review: twoDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const userReviewedCard = sessionCards.find((c) => c.cardId === 'bekannt-ismert');
  const partnerReviewedCard = sessionCards.find((c) => c.cardId === 'unbekannt-ismeretlen');

  expect(userReviewedCard?.learningPartnerId).toBe(partnerId);
  expect(partnerReviewedCard?.learningPartnerId).toBeNull();
});

test('smart assignment: elapsed days increases complexity', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);

  await createCard({
    cardId: 'alt-regi',
    sourceId: 'goethe-a1',
    data: { word: 'alt', type: 'ADJECTIVE', translation: { hu: 'régi' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'neu-uj',
    sourceId: 'goethe-a1',
    data: { word: 'neu', type: 'ADJECTIVE', translation: { hu: 'új' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'alt-regi',
    learningPartnerId: null,
    rating: 2,
    review: fiveDaysAgo,
  });
  await createReviewLog({
    cardId: 'alt-regi',
    learningPartnerId: partnerId,
    rating: 2,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'neu-uj',
    learningPartnerId: null,
    rating: 2,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'neu-uj',
    learningPartnerId: partnerId,
    rating: 2,
    review: fiveDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const userOldReviewCard = sessionCards.find((c) => c.cardId === 'alt-regi');
  const partnerOldReviewCard = sessionCards.find((c) => c.cardId === 'neu-uj');

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
    cardId: 'eins-egy',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'zwei-ketto',
    sourceId: 'goethe-a1',
    data: { word: 'zwei', type: 'NOUN', translation: { hu: 'kettő' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'drei-harom',
    sourceId: 'goethe-a1',
    data: { word: 'drei', type: 'NOUN', translation: { hu: 'három' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'vier-negy',
    sourceId: 'goethe-a1',
    data: { word: 'vier', type: 'NOUN', translation: { hu: 'négy' } },
    due: yesterday,
  });

  for (const cardId of ['eins-egy', 'zwei-ketto', 'drei-harom', 'vier-negy']) {
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
    cardId: 'eins-egy',
    sourceId: 'goethe-a1',
    data: { word: 'eins', type: 'NOUN', translation: { hu: 'egy' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'zwei-ketto',
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
      cardId: `wort${i}-szo${i}`,
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
    cardId: 'allein-egyedul',
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
    cardId: 'komplex-osszetett',
    sourceId: 'goethe-a1',
    data: { word: 'komplex', type: 'ADJECTIVE', translation: { hu: 'összetett' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'einfach-egyszeru',
    sourceId: 'goethe-a1',
    data: { word: 'einfach', type: 'ADJECTIVE', translation: { hu: 'egyszerű' } },
    due: yesterday,
  });

  await createReviewLog({
    cardId: 'komplex-osszetett',
    learningPartnerId: null,
    rating: 1,
    review: tenDaysAgo,
  });
  await createReviewLog({
    cardId: 'komplex-osszetett',
    learningPartnerId: partnerId,
    rating: 4,
    review: twoDaysAgo,
  });

  await createReviewLog({
    cardId: 'einfach-egyszeru',
    learningPartnerId: null,
    rating: 4,
    review: twoDaysAgo,
  });
  await createReviewLog({
    cardId: 'einfach-egyszeru',
    learningPartnerId: partnerId,
    rating: 1,
    review: tenDaysAgo,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  const userHighComplexityCard = sessionCards.find((c) => c.cardId === 'komplex-osszetett');
  const partnerHighComplexityCard = sessionCards.find((c) => c.cardId === 'einfach-egyszeru');

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
    cardId: 'schwerste-legnehezebb',
    sourceId: 'goethe-a1',
    data: { word: 'schwerste', type: 'ADJECTIVE', translation: { hu: 'legnehezebb' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'mittel-kozepes',
    sourceId: 'goethe-a1',
    data: { word: 'mittel', type: 'ADJECTIVE', translation: { hu: 'közepes' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'schwerste_p-legnehezebb_p',
    sourceId: 'goethe-a1',
    data: { word: 'schwerste_p', type: 'ADJECTIVE', translation: { hu: 'legnehezebb_p' } },
    due: yesterday,
  });
  await createCard({
    cardId: 'mittel_p-kozepes_p',
    sourceId: 'goethe-a1',
    data: { word: 'mittel_p', type: 'ADJECTIVE', translation: { hu: 'közepes_p' } },
    due: yesterday,
  });

  await createReviewLog({ cardId: 'schwerste-legnehezebb', learningPartnerId: null, rating: 1, review: tenDaysAgo });
  await createReviewLog({ cardId: 'schwerste-legnehezebb', learningPartnerId: partnerId, rating: 4, review: twoDaysAgo });

  await createReviewLog({ cardId: 'mittel-kozepes', learningPartnerId: null, rating: 2, review: fiveDaysAgo });
  await createReviewLog({ cardId: 'mittel-kozepes', learningPartnerId: partnerId, rating: 3, review: twoDaysAgo });

  await createReviewLog({ cardId: 'schwerste_p-legnehezebb_p', learningPartnerId: null, rating: 4, review: twoDaysAgo });
  await createReviewLog({ cardId: 'schwerste_p-legnehezebb_p', learningPartnerId: partnerId, rating: 1, review: tenDaysAgo });

  await createReviewLog({ cardId: 'mittel_p-kozepes_p', learningPartnerId: null, rating: 3, review: twoDaysAgo });
  await createReviewLog({ cardId: 'mittel_p-kozepes_p', learningPartnerId: partnerId, rating: 2, review: fiveDaysAgo });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const sessionCards = await getStudySessionCards(page);

  expect(sessionCards[0].cardId).toBe('schwerste-legnehezebb');
  expect(sessionCards[0].learningPartnerId).toBeNull();

  expect(sessionCards[1].cardId).toBe('schwerste_p-legnehezebb_p');
  expect(sessionCards[1].learningPartnerId).toBe(partnerId);

  expect(sessionCards[2].cardId).toBe('mittel-kozepes');
  expect(sessionCards[2].learningPartnerId).toBeNull();

  expect(sessionCards[3].cardId).toBe('mittel_p-kozepes_p');
  expect(sessionCards[3].learningPartnerId).toBe(partnerId);
});

test('smart assignment: session limited to 50 most complex cards', async ({ page }) => {
  const partnerId = await createLearningPartner({ name: 'Partner', isActive: true });
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);

  for (let i = 1; i <= 60; i++) {
    const dueDate = new Date(Date.now() - (60 - i) * 86400000);

    await createCard({
      cardId: `wort${i}-szo${i}`,
      sourceId: 'goethe-a1',
      data: { word: `wort${i}`, type: 'NOUN', translation: { hu: `szó${i}` } },
      due: dueDate,
    });

    if (i <= 50) {
      await createReviewLog({
        cardId: `wort${i}-szo${i}`,
        learningPartnerId: null,
        rating: 1,
        review: tenDaysAgo,
      });
    } else {
      await createReviewLog({
        cardId: `wort${i}-szo${i}`,
        learningPartnerId: null,
        rating: 4,
        review: twoDaysAgo,
      });
      await createReviewLog({
        cardId: `wort${i}-szo${i}`,
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
    expect(cardIds).not.toContain(`wort${i}-szo${i}`);
  }
});
