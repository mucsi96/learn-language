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
  setupDefaultChatModelSettings,
  setupDefaultImageModelSettings,
  selectTextRange,
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
        expect.objectContaining({ ID: 'test-card-1', State: 'NEW', Reviews: '0' }),
        expect.objectContaining({ ID: 'test-card-2', State: 'REVIEW', Reviews: '5' }),
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
    expect(before.map((r) => r.ID)).toEqual(expect.arrayContaining(['new-card', 'review-card']));
  }).toPass();

  await page.getByLabel('Filter by state').click();
  await page.getByRole('option', { name: 'NEW' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.ID)).toEqual(['new-card']);
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
    expect(before.map((r) => r.ID)).toEqual(['ready-card']);
  }).toPass();

  await page.getByLabel('Filter by readiness').click();
  await page.getByRole('option', { name: 'KNOWN' }).click();
  await page.keyboard.press('Escape');

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['ready-card', 'known-card'])
    );
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
    expect(rows[0]).toEqual(expect.objectContaining({ ID: 'mark-known-card' }));
  }).toPass();

  const checkbox = page.getByRole('row', { name: /mark-known-card/ }).getByRole('checkbox');
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
        ID: 'reviewed-card',
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
    expect(rows[0]).toEqual(expect.objectContaining({ ID: 'click-card' }));
  }).toPass();

  await page.getByRole('row', { name: /click-card/ }).click();

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
    expect(before.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['easy-card', 'hard-card'])
    );
  }).toPass();

  await page.getByLabel('Filter by last review grade').click();
  await page.getByRole('option', { name: '4 - Easy' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.ID)).toEqual(['easy-card']);
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
    expect(before.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['recent-card', 'old-card'])
    );
  }).toPass();

  await page.getByLabel('Filter by last review time').click();
  await page.getByRole('option', { name: 'Today' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.ID)).toEqual(['recent-card']);
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
    expect(rows.map((r) => r.ID)).toEqual(expect.arrayContaining(['few-reviews', 'many-reviews']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Reviews' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ ID: 'few-reviews' }));
    expect(asc[1]).toEqual(expect.objectContaining({ ID: 'many-reviews' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Reviews' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ ID: 'many-reviews' }));
    expect(desc[1]).toEqual(expect.objectContaining({ ID: 'few-reviews' }));
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
    expect(rows.map((r) => r.ID)).toEqual(expect.arrayContaining(['new-state-card', 'review-state-card']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ ID: 'new-state-card' }));
    expect(asc[1]).toEqual(expect.objectContaining({ ID: 'review-state-card' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'State' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ ID: 'review-state-card' }));
    expect(desc[1]).toEqual(expect.objectContaining({ ID: 'new-state-card' }));
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
    expect(rows.map((r) => r.ID)).toEqual(expect.arrayContaining(['reviewed-recently', 'reviewed-long-ago']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Last review' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ ID: 'reviewed-long-ago' }));
    expect(asc[1]).toEqual(expect.objectContaining({ ID: 'reviewed-recently' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Last review' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ ID: 'reviewed-recently' }));
    expect(desc[1]).toEqual(expect.objectContaining({ ID: 'reviewed-long-ago' }));
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
    expect(rows.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['delete-card-1', 'delete-card-2', 'keep-card'])
    );
  }).toPass();

  await page.getByRole('row', { name: /delete-card-1/ }).getByRole('checkbox').click();
  await page.getByRole('row', { name: /delete-card-2/ }).getByRole('checkbox').click();

  await page.getByRole('button', { name: /Delete 2/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirmation' });

  await expect(
    dialog.getByText('Are you sure you want to delete 2 card(s)?')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('2 card(s) deleted')).toBeVisible();

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.ID)).toEqual(['keep-card']);
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
    expect(rows[0]).toEqual(expect.objectContaining({ ID: 'cancel-delete-card' }));
  }).toPass();

  await page.getByRole('row', { name: /cancel-delete-card/ }).getByRole('checkbox').click();
  await page.getByRole('button', { name: /Delete 1/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirmation' });

  await expect(
    dialog.getByText('Are you sure you want to delete 1 card(s)?')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'No' }).click();

  await expect(async () => {
    const rows = await getGridData(page.getByRole('grid'));
    expect(rows[0]).toEqual(expect.objectContaining({ ID: 'cancel-delete-card' }));
  }).toPass();

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT id FROM learn_language.cards WHERE id = 'cancel-delete-card'"
    );
    expect(result.rows.length).toBe(1);
  });
});

test('selects all filtered cards with header checkbox', async ({ page }) => {
  await page.reload();

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

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['select-all-1', 'select-all-2', 'select-all-3'])
    );
  }).toPass();

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();

  await expect(
    page.getByRole('button', { name: /Mark 3 as known/ })
  ).toBeVisible();
});

test('deselects all cards with header checkbox', async ({ page }) => {
  await page.reload();

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

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['deselect-1', 'deselect-2'])
    );
  }).toPass();

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
    expect(rows.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['audio-card-1', 'audio-card-2'])
    );
  }).toPass();

  await page.getByRole('row', { name: /audio-card-1/ }).getByRole('checkbox').click();
  await page.getByRole('row', { name: /audio-card-2/ }).getByRole('checkbox').click();

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
        ID: 'score-card',
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
        ID: 'mixed-score-card',
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
    expect(before.map((r) => r.ID)).toEqual(
      expect.arrayContaining(['high-score-card', 'low-score-card'])
    );
  }).toPass();

  await page.getByLabel('Filter by review score').click();
  await page.getByRole('option', { name: '100%' }).click();

  await expect(async () => {
    const after = await getGridData(grid);
    expect(after.map((r) => r.ID)).toEqual(['high-score-card']);
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
    expect(rows.map((r) => r.ID)).toEqual(expect.arrayContaining(['sort-high-score', 'sort-low-score']));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Score' }).click();
  await expect(async () => {
    const asc = await getGridData(grid);
    expect(asc[0]).toEqual(expect.objectContaining({ ID: 'sort-low-score' }));
    expect(asc[1]).toEqual(expect.objectContaining({ ID: 'sort-high-score' }));
  }).toPass();

  await page.getByRole('columnheader', { name: 'Score' }).click();
  await expect(async () => {
    const desc = await getGridData(grid);
    expect(desc[0]).toEqual(expect.objectContaining({ ID: 'sort-high-score' }));
    expect(desc[1]).toEqual(expect.objectContaining({ ID: 'sort-low-score' }));
  }).toPass();
});

test('filters cards by ID', async ({ page }) => {
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

  await page.getByLabel('Filter by ID').fill('xyz');

  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.ID)).toEqual(['xyz-card']);
  }).toPass();
});

test('draft cards are hidden by default', async ({ page }) => {
  await createCard({
    cardId: 'draft-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Entwurf', type: 'NOUN', translation: { en: 'draft' } },
    readiness: 'DRAFT',
  });

  await createCard({
    cardId: 'ready-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'fertig', type: 'ADJECTIVE', translation: { en: 'ready' } },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.ID)).toEqual(['ready-card']);
  }).toPass();
});

test('draft query parameter shows only draft cards', async ({ page }) => {
  await createCard({
    cardId: 'draft-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Entwurf', type: 'NOUN', translation: { en: 'draft' } },
    readiness: 'DRAFT',
  });

  await createCard({
    cardId: 'ready-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'fertig', type: 'ADJECTIVE', translation: { en: 'ready' } },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards?draft=true');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.map((r) => r.ID)).toEqual(['draft-card']);
    expect(rows[0].Readiness).toBe('DRAFT');
  }).toPass();
});

test('dictionary lookup creates draft card visible on cards page', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();

  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByLabel('Token name').fill('Test Token');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();

  const download = await downloadPromise;
  const filePath = await download.path();
  const token = fs.readFileSync(filePath!, 'utf-8');

  const response = await fetch('http://localhost:8180/api/dictionary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Mein erstes Buch',
      author: 'Test Author',
      targetLanguage: 'hu',
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });

  expect(response.status).toBe(200);

  await expect(async () => {
    await page.goto(
      'http://localhost:8180/sources/mein-erstes-buch/cards?draft=true'
    );
    const grid = page.getByRole('grid');
    const rows = await getGridData(grid);
    expect(rows.length).toBe(1);
    expect(rows[0].Readiness).toBe('DRAFT');
  }).toPass();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, readiness, state FROM learn_language.cards WHERE source_id = 'mein-erstes-buch'`
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('DRAFT');
    expect(result.rows[0].state).toBe('NEW');
  });
});

test('dictionary lookup does not duplicate draft cards', async ({ page }) => {
  await setupDefaultChatModelSettings();

  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByLabel('Token name').fill('Test Token');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();

  const download = await downloadPromise;
  const filePath = await download.path();
  const token = fs.readFileSync(filePath!, 'utf-8');

  await fetch('http://localhost:8180/api/dictionary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Mein erstes Buch',
      author: 'Test Author',
      targetLanguage: 'hu',
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });

  await expect(async () => {
    await withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT id FROM learn_language.cards WHERE source_id = 'mein-erstes-buch'`
      );
      expect(result.rows.length).toBe(1);
    });
  }).toPass();

  await fetch('http://localhost:8180/api/dictionary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Mein erstes Buch',
      author: 'Test Author',
      targetLanguage: 'hu',
      sentence: 'Wir fahren um zwölf Uhr ab.',
      highlightedWord: 'fahren',
    }),
  });

  await expect(async () => {
    await withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT id FROM learn_language.cards WHERE source_id = 'mein-erstes-buch'`
      );
      expect(result.rows.length).toBe(1);
    });
  }).toPass();
});

test('completes selected draft cards from cards table', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();

  await page.goto('http://localhost:8180/settings/api-tokens');
  await page.getByLabel('Token name').fill('Test Token');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate token' }).click();

  const download = await downloadPromise;
  const filePath = await download.path();
  const token = fs.readFileSync(filePath!, 'utf-8');

  await fetch('http://localhost:8180/api/dictionary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Test Buch',
      author: 'Test Author',
      targetLanguage: 'hu',
      sentence: 'Der Hund läuft schnell.',
      highlightedWord: 'Hund',
    }),
  });

  await fetch('http://localhost:8180/api/dictionary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookTitle: 'Test Buch',
      author: 'Test Author',
      targetLanguage: 'hu',
      sentence: 'Die Katze schläft gern.',
      highlightedWord: 'Katze',
    }),
  });

  await expect(async () => {
    await withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT id FROM learn_language.cards WHERE source_id = 'test-buch'`
      );
      expect(result.rows.length).toBe(2);
    });
  }).toPass();

  await page.goto('http://localhost:8180/sources/test-buch/cards?draft=true');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(2);
    rows.forEach((row) => expect(row.Readiness).toBe('DRAFT'));
  }).toPass();

  await page.getByRole('checkbox', { name: 'Select all cards' }).click();

  await page.getByRole('button', { name: 'Complete draft cards' }).click();

  await expect(page.getByRole('heading', { name: 'Creating Cards' })).toBeVisible();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('2 card(s) completed')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, readiness, data FROM learn_language.cards WHERE source_id = 'test-buch'`
    );
    expect(result.rows.length).toBe(2);
    result.rows.forEach((row: { readiness: string; data: { translation?: Record<string, string> } }) => {
      expect(row.readiness).toBe('IN_REVIEW');
      expect(row.data.translation).toBeDefined();
    });
  });
});

test('complete draft cards button only visible in draft mode', async ({ page }) => {
  await createCard({
    cardId: 'non-draft-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: { word: 'Baum', type: 'NOUN', translation: { en: 'tree' } },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows[0]).toEqual(expect.objectContaining({ ID: 'non-draft-card' }));
  }).toPass();

  await page.getByRole('row', { name: /non-draft-card/ }).getByRole('checkbox').click();

  await expect(
    page.getByRole('button', { name: 'Complete draft cards' })
  ).not.toBeVisible();
});

test('bulk card creation produces cards visible on cards page', async ({
  page,
}) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('http://localhost:8180/sources/goethe-a1/cards');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBe(3);
    rows.forEach((row) => expect(row.Readiness).toBe('IN_REVIEW'));
  }).toPass();
});
