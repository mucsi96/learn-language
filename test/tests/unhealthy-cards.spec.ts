import { test, expect } from '../fixtures';
import { createCard, getGridData, withDbConnection } from '../utils';

test('does not show unhealthy cards section when no unhealthy cards exist', async ({ page }) => {
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

  await page.goto('http://localhost:8180/sources');

  await expect(page.getByRole('article', { name: 'Goethe A1' })).toBeVisible();
  await expect(page.getByText('Unhealthy Cards')).not.toBeVisible();
});

test('shows unhealthy cards when vocabulary card is missing translation', async ({ page }) => {
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

  await page.goto('http://localhost:8180/sources');

  await expect(page.getByText('1 unhealthy')).toBeVisible();

  const section = page.getByRole('region', { name: 'Unhealthy cards' });
  await expect(section).toBeVisible();
  await expect(section.getByText('Unhealthy Cards (1)')).toBeVisible();

  const grid = section.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{ Word: string; Source: string; Missing: string }>(grid);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Word']).toBe('aber');
    expect(rows[0]['Source']).toBe('Goethe A1');
    expect(rows[0]['Missing']).toContain('Hungarian translation');
  }).toPass();
});

test('shows unhealthy cards when vocabulary card is missing gender', async ({ page }) => {
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

  await page.goto('http://localhost:8180/sources');

  const section = page.getByRole('region', { name: 'Unhealthy cards' });
  await expect(section).toBeVisible();

  const grid = section.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{ Word: string; Missing: string }>(grid);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Word']).toBe('Haus');
    expect(rows[0]['Missing']).toContain('gender');
  }).toPass();
});

test('shows unhealthy cards when vocabulary card is missing word type', async ({ page }) => {
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

  await page.goto('http://localhost:8180/sources');

  const section = page.getByRole('region', { name: 'Unhealthy cards' });
  await expect(section).toBeVisible();

  const grid = section.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData<{ Word: string; Missing: string }>(grid);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Missing']).toContain('word type');
  }).toPass();
});

test('does not flag speech cards for missing gender or word type', async ({ page }) => {
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

  await page.goto('http://localhost:8180/sources');

  await expect(page.getByRole('article', { name: 'Speech A1' })).toBeVisible();
  await expect(page.getByText('Unhealthy Cards')).not.toBeVisible();
});

test('move selected unhealthy cards to draft', async ({ page }) => {
  await createCard({
    cardId: 'unhealthy-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', ch: 'Huus' },
      forms: [],
      examples: [],
    },
  });

  await createCard({
    cardId: 'unhealthy-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Baum',
      type: 'NOUN',
      gender: 'M',
      translation: { en: 'tree', hu: 'fa', ch: 'Baum' },
      forms: [],
      examples: [],
    },
    readiness: 'KNOWN',
  });

  await page.goto('http://localhost:8180/sources');

  const section = page.getByRole('region', { name: 'Unhealthy cards' });
  await expect(section).toBeVisible();

  const grid = section.getByRole('grid');
  await expect(async () => {
    const rows = await getGridData(grid);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  }).toPass();

  await grid.getByRole('checkbox').first().click();

  const draftButton = section.getByRole('button', { name: /Move .* to draft/ });
  await expect(draftButton).toBeVisible();
  await draftButton.click();

  await expect(page.getByText('card(s) moved to draft')).toBeVisible();

  await expect(async () => {
    await withDbConnection(async (client) => {
      const result = await client.query(
        "SELECT readiness FROM learn_language.cards WHERE id = 'unhealthy-1'"
      );
      expect(result.rows[0].readiness).toBe('DRAFT');
    });
  }).toPass();
});

test('shows unhealthy count on source card', async ({ page }) => {
  await createCard({
    cardId: 'unhealthy-a1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', ch: 'Huus' },
      forms: [],
      examples: [],
    },
  });

  await createCard({
    cardId: 'unhealthy-a1-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Baum',
      translation: { en: 'tree' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8180/sources');

  const sourceCard = page.getByRole('article', { name: 'Goethe A1' });
  await expect(sourceCard).toBeVisible();
  await expect(sourceCard.getByText('2 unhealthy')).toBeVisible();
});
