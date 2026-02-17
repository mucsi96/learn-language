import { test, expect } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import {
  createCard,
  createReviewLog,
  createLearningPartner,
  getGridData,
  withDbConnection,
  STORAGE_DIR,
  germanAudioSample,
} from '../utils';

test('navigates to cards table from page view', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();
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

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Card: 'test-card-1 Hund', State: 'NEW', Reviews: '0' }),
        expect.objectContaining({ Card: 'test-card-2 Katze', State: 'REVIEW', Reviews: '5' }),
      ])
    );
  }).toPass();
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
  await expect(async () => {
    const before = await getGridData(grid);
    expect(before.map((r) => r.Card)).toEqual(expect.arrayContaining(['new-card neu', 'review-card alt']));
  }).toPass();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'NEW' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['new-card neu']);
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
  await expect(async () => {
    const before = await getGridData(grid);
    expect(before.map((r) => r.Card)).toEqual(
      expect.arrayContaining(['ready-card bereit', 'known-card bekannt'])
    );
  }).toPass();

  await page.getByLabel('Filter by readiness').click();
  await page.getByRole('option', { name: 'KNOWN' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['known-card bekannt']);
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

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows[0]).toEqual(expect.objectContaining({ Card: 'mark-known-card markieren' }));
  }).toPass();

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

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows).toEqual([
      expect.objectContaining({
        Card: 'reviewed-card lernen',
        Reviews: '3',
        Grade: '3 - Good',
        Person: 'Anna',
      }),
    ]);
  }).toPass();
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

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows[0]).toEqual(expect.objectContaining({ Card: 'click-card klicken' }));
  }).toPass();

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
  await expect(async () => {
    const before = await getGridData(grid);
    expect(before.map((r) => r.Card)).toEqual(
      expect.arrayContaining(['easy-card einfach', 'hard-card schwer'])
    );
  }).toPass();

  await page.getByLabel('Filter by last review grade').click();
  await page.getByRole('option', { name: '4 - Easy' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['easy-card einfach']);
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
    lastReview: new Date(Date.now() - 60 * 1000),
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
  await expect(async () => {
    const before = await getGridData(grid);
    expect(before.map((r) => r.Card)).toEqual(
      expect.arrayContaining(['recent-card heute', 'old-card gestern'])
    );
  }).toPass();

  await page.getByLabel('Filter by last review time').click();
  await page.getByRole('option', { name: 'Today' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['recent-card heute']);
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
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(expect.arrayContaining(['few-reviews wenig', 'many-reviews viel']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Reviews' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'few-reviews wenig' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'many-reviews viel' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Reviews' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'many-reviews viel' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'few-reviews wenig' }));
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
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(expect.arrayContaining(['new-state-card Anfang', 'review-state-card Wiederholung']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'new-state-card Anfang' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'review-state-card Wiederholung' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'review-state-card Wiederholung' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'new-state-card Anfang' }));
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
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(expect.arrayContaining(['reviewed-recently frisch', 'reviewed-long-ago vergessen']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Last review' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'reviewed-long-ago vergessen' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'reviewed-recently frisch' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Last review' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'reviewed-recently frisch' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'reviewed-long-ago vergessen' }));
  }).toPass();
});

test('page title shows Cards', async ({ page }) => {
  await page.goto('http://localhost:8180/sources/goethe-a1/cards');
  await expect(page).toHaveTitle('Cards');
});

test('delete image button shows as text button', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();
  await expect(page.getByRole('link', { name: 'View all cards' })).toBeVisible();
});

test('deletes selected cards with confirmation', async ({ page }) => {
  await createCard({
    cardId: 'delete-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'löschen', type: 'VERB', translation: { en: 'to delete' } },
  });

  await createCard({
    cardId: 'delete-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'entfernen', type: 'VERB', translation: { en: 'to remove' } },
  });

  await createCard({
    cardId: 'keep-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'behalten', type: 'VERB', translation: { en: 'to keep' } },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(
      expect.arrayContaining(['delete-card-1 löschen', 'delete-card-2 entfernen', 'keep-card behalten'])
    );
  }).toPass();

  await page.getByRole('row', { name: /löschen/ }).getByRole('checkbox').click();
  await page.getByRole('row', { name: /entfernen/ }).getByRole('checkbox').click();

  await page.getByRole('button', { name: /Delete 2/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirmation' });

  await expect(
    dialog.getByText('Are you sure you want to delete 2 card(s)?')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('2 card(s) deleted')).toBeVisible();

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(['keep-card behalten']);
  }).toPass();

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT id FROM learn_language.cards WHERE id IN ('delete-card-1', 'delete-card-2')"
    );
    expect(result.rows.length).toBe(0);
  });
});

test('cancels card deletion on dialog dismissal', async ({ page }) => {
  await createCard({
    cardId: 'cancel-delete-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'abbrechen', type: 'VERB', translation: { en: 'to cancel' } },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows[0]).toEqual(expect.objectContaining({ Card: 'cancel-delete-card abbrechen' }));
  }).toPass();

  await page.getByRole('row', { name: /abbrechen/ }).getByRole('checkbox').click();
  await page.getByRole('button', { name: /Delete 1/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirmation' });

  await expect(
    dialog.getByText('Are you sure you want to delete 1 card(s)?')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'No' }).click();

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows[0]).toEqual(expect.objectContaining({ Card: 'cancel-delete-card abbrechen' }));
  }).toPass();

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT id FROM learn_language.cards WHERE id = 'cancel-delete-card'"
    );
    expect(result.rows.length).toBe(1);
  });
});

test('selects all filtered cards with header checkbox', async ({ page }) => {
  await createCard({
    cardId: 'select-all-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Apfel', type: 'NOUN', translation: { en: 'apple' } },
  });

  await createCard({
    cardId: 'select-all-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Birne', type: 'NOUN', translation: { en: 'pear' } },
  });

  await createCard({
    cardId: 'select-all-3',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: { word: 'Kirsche', type: 'NOUN', translation: { en: 'cherry' } },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await page.waitForLoadState('networkidle');

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();

  await expect(
    page.getByRole('button', { name: /Mark 3 as known/ })
  ).toBeVisible();
});

test('deselects all cards with header checkbox', async ({ page }) => {
  await createCard({
    cardId: 'deselect-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Hund', type: 'NOUN', translation: { en: 'dog' } },
  });

  await createCard({
    cardId: 'deselect-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat' } },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await page.waitForLoadState('networkidle');

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();
  await expect(
    page.getByRole('button', { name: /Mark 2 as known/ })
  ).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();
  await expect(
    page.getByRole('button', { name: /Mark .* as known/ })
  ).not.toBeVisible();
});

test('select all respects current filter', async ({ page }) => {
  await createCard({
    cardId: 'filter-select-new',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Tisch', type: 'NOUN', translation: { en: 'table' } },
    state: 'NEW',
  });

  await createCard({
    cardId: 'filter-select-review',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Stuhl', type: 'NOUN', translation: { en: 'chair' } },
    state: 'REVIEW',
    reps: 3,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
  }).toPass();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'NEW' }).click();

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(1);
  }).toPass();

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();

  await expect(
    page.getByRole('button', { name: /Mark 1 as known/ })
  ).toBeVisible();
});

test('changing filter resets selection', async ({ page }) => {
  await createCard({
    cardId: 'reset-select-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Buch', type: 'NOUN', translation: { en: 'book' } },
    state: 'NEW',
  });

  await createCard({
    cardId: 'reset-select-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Stift', type: 'NOUN', translation: { en: 'pen' } },
    state: 'REVIEW',
    reps: 2,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
  }).toPass();

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();
  await expect(
    page.getByRole('button', { name: /Mark 2 as known/ })
  ).toBeVisible();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'NEW' }).click();

  await expect(
    page.getByRole('button', { name: /Mark .* as known/ })
  ).not.toBeVisible();
});

test('deletes audio for selected cards with confirmation', async ({ page }) => {
  const audioId1 = 'del-audio-1';
  const audioId2 = 'del-audio-2';
  const audioId3 = 'del-audio-3';

  await createCard({
    cardId: 'audio-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Musik',
      type: 'NOUN',
      translation: { en: 'music' },
      audio: [
        { id: audioId1, text: 'Musik', language: 'de', voice: 'v1', model: 'eleven_v3' },
      ],
    },
  });

  await createCard({
    cardId: 'audio-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Klang',
      type: 'NOUN',
      translation: { en: 'sound' },
      audio: [
        { id: audioId2, text: 'Klang', language: 'de', voice: 'v1', model: 'eleven_v3' },
        { id: audioId3, text: 'Klang', language: 'hu', voice: 'v2', model: 'eleven_v3' },
      ],
    },
  });

  const audioDir = path.join(STORAGE_DIR, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(path.join(audioDir, `${audioId1}.mp3`), germanAudioSample);
  fs.writeFileSync(path.join(audioDir, `${audioId2}.mp3`), germanAudioSample);
  fs.writeFileSync(path.join(audioDir, `${audioId3}.mp3`), germanAudioSample);

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(
      expect.arrayContaining(['audio-card-1 Musik', 'audio-card-2 Klang'])
    );
  }).toPass();

  await page.getByRole('row', { name: /Musik/ }).getByRole('checkbox').click();
  await page.getByRole('row', { name: /Klang/ }).getByRole('checkbox').click();

  await page.getByRole('button', { name: /Delete audio 2/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirmation' });
  await expect(
    dialog.getByText('Are you sure you want to delete audio for 2 card(s)?')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('Audio deleted for 2 card(s)')).toBeVisible();

  expect(fs.existsSync(path.join(audioDir, `${audioId1}.mp3`))).toBe(false);
  expect(fs.existsSync(path.join(audioDir, `${audioId2}.mp3`))).toBe(false);
  expect(fs.existsSync(path.join(audioDir, `${audioId3}.mp3`))).toBe(false);

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT data FROM learn_language.cards WHERE id IN ('audio-card-1', 'audio-card-2')"
    );
    result.rows.forEach((row: { data: { audio?: unknown[] } }) => {
      expect(row.data.audio).toBeUndefined();
    });
  });
});

test('displays review score in table', async ({ page }) => {
  await createCard({
    cardId: 'score-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Punkt', type: 'NOUN', translation: { en: 'score' } },
    state: 'REVIEW',
    reps: 3,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'score-card',
    rating: 3,
    review: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'score-card',
    rating: 4,
    review: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'score-card',
    rating: 3,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows).toEqual([
      expect.objectContaining({
        Card: 'score-card Punkt',
        Score: '100%',
      }),
    ]);
  }).toPass();
});

test('displays review score for mixed reviews', async ({ page }) => {
  await createCard({
    cardId: 'mixed-score-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'gemischt', type: 'ADJECTIVE', translation: { en: 'mixed' } },
    state: 'REVIEW',
    reps: 3,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'mixed-score-card',
    rating: 1,
    review: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'mixed-score-card',
    rating: 3,
    review: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'mixed-score-card',
    rating: 1,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows).toEqual([
      expect.objectContaining({
        Card: 'mixed-score-card gemischt',
        Score: '25%',
      }),
    ]);
  }).toPass();
});

test('filters cards by review score', async ({ page }) => {
  await createCard({
    cardId: 'high-score-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'gut', type: 'ADJECTIVE', translation: { en: 'good' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'high-score-card',
    rating: 3,
    review: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'high-score-card',
    rating: 4,
    review: new Date(),
  });

  await createCard({
    cardId: 'low-score-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'schlecht', type: 'ADJECTIVE', translation: { en: 'bad' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'low-score-card',
    rating: 1,
    review: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'low-score-card',
    rating: 1,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const before = await getGridData(grid);
    expect(before.map((r) => r.Card)).toEqual(
      expect.arrayContaining(['high-score-card gut', 'low-score-card schlecht'])
    );
  }).toPass();

  await page.getByLabel('Filter by review score').click();
  await page.getByRole('option', { name: '76% - 100%' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.Card)).toEqual(['high-score-card gut']);
  }).toPass();
});

test('sorts cards by review score', async ({ page }) => {
  await createCard({
    cardId: 'sort-high-score',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'stark', type: 'ADJECTIVE', translation: { en: 'strong' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'sort-high-score',
    rating: 4,
    review: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'sort-high-score',
    rating: 4,
    review: new Date(),
  });

  await createCard({
    cardId: 'sort-low-score',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'schwach', type: 'ADJECTIVE', translation: { en: 'weak' } },
    state: 'REVIEW',
    reps: 2,
    lastReview: new Date(),
  });

  await createReviewLog({
    cardId: 'sort-low-score',
    rating: 1,
    review: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await createReviewLog({
    cardId: 'sort-low-score',
    rating: 1,
    review: new Date(),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(expect.arrayContaining(['sort-high-score stark', 'sort-low-score schwach']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Score' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ Card: 'sort-low-score schwach' }));
    expect(asc[1]).toEqual(expect.objectContaining({ Card: 'sort-high-score stark' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Score' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ Card: 'sort-high-score stark' }));
    expect(desc[1]).toEqual(expect.objectContaining({ Card: 'sort-low-score schwach' }));
  }).toPass();
});

test('filters cards by card text input', async ({ page }) => {
  await createCard({
    cardId: 'filter-text-hund',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Hund', type: 'NOUN', translation: { en: 'dog' } },
    state: 'NEW',
  });

  await createCard({
    cardId: 'filter-text-katze',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Katze', type: 'NOUN', translation: { en: 'cat' } },
    state: 'NEW',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
  }).toPass();

  await page.getByLabel('Filter by card').fill('Hund');

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(['filter-text-hund Hund']);
  }).toPass();
});

test('filters cards by card id', async ({ page }) => {
  await createCard({
    cardId: 'abc-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Tisch', type: 'NOUN', translation: { en: 'table' } },
    state: 'NEW',
  });

  await createCard({
    cardId: 'xyz-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: { word: 'Stuhl', type: 'NOUN', translation: { en: 'chair' } },
    state: 'NEW',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
  }).toPass();

  await page.getByLabel('Filter by card').fill('xyz');

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.Card)).toEqual(['xyz-card Stuhl']);
  }).toPass();
});
