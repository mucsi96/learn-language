import { test, expect } from '../fixtures';
import { createCard, getGridData } from '../utils';

test('unhealthy filter shows cards with missing translations', async ({ page }) => {
  await createCard({
    cardId: 'missing-hu',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'aber',
      type: 'CONJUNCTION',
      gender: 'N/A',
      translation: { en: 'but', ch: 'aber' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8170/sources/goethe-a1/cards?filter=unhealthy');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(1);
    expect(rows[0]['ID']).toBe('missing-hu');
  }).toPass();
});

test('unhealthy filter shows cards with missing gender', async ({ page }) => {
  await createCard({
    cardId: 'missing-gender',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', hu: 'ház', ch: 'Huus' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8170/sources/goethe-a1/cards?filter=unhealthy');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(1);
    expect(rows[0]['ID']).toBe('missing-gender');
  }).toPass();
});

test('unhealthy filter shows cards with missing word type', async ({ page }) => {
  await createCard({
    cardId: 'missing-type',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      gender: 'N',
      translation: { en: 'house', hu: 'ház', ch: 'Huus' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8170/sources/goethe-a1/cards?filter=unhealthy');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(1);
    expect(rows[0]['ID']).toBe('missing-type');
  }).toPass();
});

test('unhealthy filter does not show speech cards missing gender or word type', async ({ page }) => {
  await createCard({
    cardId: 'speech-card',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      word: 'Guten Morgen',
      translation: { en: 'Good morning', hu: 'Jó reggelt', ch: 'Guete Morge' },
      forms: [],
      examples: [
        {
          de: 'Guten Morgen, wie geht es Ihnen?',
          en: 'Good morning, how are you?',
          hu: 'Jó reggelt, hogy van?',
          ch: 'Guete Morge, wie gaats Ihne?',
        },
      ],
    },
  });

  await page.goto('http://localhost:8170/sources/speech-a1/cards?filter=unhealthy');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(0);
  }).toPass();
});

test('unhealthy filter does not show non-noun vocabulary cards without gender', async ({ page }) => {
  await createCard({
    cardId: 'verb-no-gender',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'spielen',
      type: 'VERB',
      translation: { en: 'to play', hu: 'játszani', ch: 'spile' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8170/sources/goethe-a1/cards?filter=unhealthy');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(0);
  }).toPass();
});

test('unhealthy filter does not show healthy cards', async ({ page }) => {
  await createCard({
    cardId: 'healthy-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'aber',
      type: 'CONJUNCTION',
      gender: 'N/A',
      translation: { en: 'but', hu: 'de', ch: 'aber' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8170/sources/goethe-a1/cards?filter=unhealthy');

  const grid = page.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows).toHaveLength(0);
  }).toPass();
});
