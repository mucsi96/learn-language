import { test, expect } from '../fixtures';
import {
  createCard,
  createReviewLog,
  createLearningPartner,
  getGridData,
} from '../utils';

test('navigates to cards table from page view', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'View all cards' }).click();
  await expect(page).toHaveTitle('Cards');
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

  const rows = await getGridData(page.getByRole('grid'));
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ Card: 'Hund', State: 'NEW', Reviews: '0' }),
      expect.objectContaining({ Card: 'Katze', State: 'REVIEW', Reviews: '5' }),
    ])
  );
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

  const grid = page.getByRole('grid');
  const before = await getGridData(grid);
  expect(before.map((r) => r.Card)).toEqual(expect.arrayContaining(['neu', 'alt']));

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'NEW' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['neu']);
  }).toPass();
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

  const grid = page.getByRole('grid');
  const before = await getGridData(grid);
  expect(before.map((r) => r.Card)).toEqual(
    expect.arrayContaining(['bereit', 'bekannt'])
  );

  await page.getByLabel('Filter by readiness').click();
  await page.getByRole('option', { name: 'KNOWN' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['bekannt']);
  }).toPass();
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

  const rows = await getGridData(page.getByRole('grid'));
  expect(rows[0]).toEqual(expect.objectContaining({ Card: 'markieren' }));

  const checkbox = page.getByRole('row', { name: /markieren/ }).getByRole('checkbox');
  await checkbox.click();

  await page.getByRole('button', { name: /Mark 1 as known/ }).click();

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

  const rows = await getGridData(page.getByRole('grid'));
  expect(rows).toEqual([
    expect.objectContaining({
      Card: 'lernen',
      Reviews: '3',
      Grade: '3 - Good',
      Person: 'Anna',
    }),
  ]);
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

  const rows = await getGridData(page.getByRole('grid'));
  expect(rows[0]).toEqual(expect.objectContaining({ Card: 'klicken' }));

  await page.getByRole('row', { name: /klicken/ }).click();

  await expect(page).toHaveTitle('Edit Card');
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

  const grid = page.getByRole('grid');
  const before = await getGridData(grid);
  expect(before.map((r) => r.Card)).toEqual(
    expect.arrayContaining(['einfach', 'schwer'])
  );

  await page.getByLabel('Filter by last review grade').click();
  await page.getByRole('option', { name: '4 - Easy' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['einfach']);
  }).toPass();
});

test('filters cards by last review time', async ({ page }) => {
  await createCard({
    cardId: 'recent-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'heute', type: 'ADVERB', translation: { en: 'today' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createCard({
    cardId: 'old-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'gestern', type: 'ADVERB', translation: { en: 'yesterday' } },
    state: 'REVIEW',
    reps: 4,
    lastReview: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  const before = await getGridData(grid);
  expect(before.map((r) => r.Card)).toEqual(
    expect.arrayContaining(['heute', 'gestern'])
  );

  await page.getByLabel('Filter by last review time').click();
  await page.getByRole('option', { name: 'Today' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['heute']);
  }).toPass();
});

test('sorts cards by reviews count', async ({ page }) => {
  await createCard({
    cardId: 'few-reviews',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'wenig', type: 'ADJECTIVE', translation: { en: 'few' } },
    state: 'REVIEW',
    reps: 1,
  });

  await createCard({
    cardId: 'many-reviews',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'viel', type: 'ADJECTIVE', translation: { en: 'many' } },
    state: 'REVIEW',
    reps: 10,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await getGridData(grid);

  await page.getByRole('columnheader', { name: 'Reviews' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'wenig' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'viel' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Reviews' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'viel' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'wenig' }));
  }).toPass();
});

test('sorts cards by state', async ({ page }) => {
  await createCard({
    cardId: 'new-state-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Anfang', type: 'NOUN', translation: { en: 'beginning' } },
    state: 'NEW',
  });

  await createCard({
    cardId: 'review-state-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Wiederholung', type: 'NOUN', translation: { en: 'review' } },
    state: 'REVIEW',
    reps: 3,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await getGridData(grid);

  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'Anfang' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'Wiederholung' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'Wiederholung' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'Anfang' }));
  }).toPass();
});

test('sorts cards by last review', async ({ page }) => {
  await createCard({
    cardId: 'reviewed-recently',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'frisch', type: 'ADJECTIVE', translation: { en: 'fresh' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createCard({
    cardId: 'reviewed-long-ago',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'vergessen', type: 'VERB', translation: { en: 'to forget' } },
    state: 'REVIEW',
    reps: 5,
    lastReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await getGridData(grid);

  await page.getByRole('columnheader', { name: 'Last review' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'vergessen' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'frisch' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Last review' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'frisch' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'vergessen' }));
  }).toPass();
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
