import { test, expect } from '../fixtures';
import { createCard } from '../utils';

test('displays sources', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sources' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Goethe A1' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Goethe A2' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Goethe B1' })).toBeVisible();
});

test('sources have links', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await expect(page.getByRole('link', { name: 'Goethe A1' })).toHaveAttribute(
    'href',
    '/sources/goethe-a1/page/9'
  );
  await expect(page.getByRole('link', { name: 'Goethe A2' })).toHaveAttribute(
    'href',
    '/sources/goethe-a2/page/8'
  );
  await expect(page.getByRole('link', { name: 'Goethe B1' })).toHaveAttribute(
    'href',
    '/sources/goethe-b1/page/16'
  );
});

test('displays card counts', async ({ page }) => {
  await createCard({
    cardId: 'test-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'test1',
      type: 'NOUN',
      translation: { en: 'test1' },
    },
  });
  await createCard({
    cardId: 'test-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'test2',
      type: 'NOUN',
      translation: { en: 'test2' },
    },
  });
  await page.goto('http://localhost:8180/sources');
  await expect(page.getByText('2 cards')).toBeVisible();
});

test('displays card count for sources', async ({ page }) => {
  // Create some test cards for different sources
  await createCard({
    cardId: 'test-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'lernen',
      type: 'NOUN',
      translation: { en: 'to learn' },
    },
  });
  await createCard({
    cardId: 'test-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'sprechen',
      type: 'NOUN',
      translation: { en: 'to speak' },
    },
  });
  await createCard({
    cardId: 'test-card-3',
    sourceId: 'goethe-a2',
    sourcePageNumber: 8,
    data: {
      word: 'hören',
      type: 'NOUN',
      translation: { en: 'to hear' },
    },
  });

  await page.goto('http://localhost:8180/sources');

  // Check that card counts are displayed
  await expect(
    page.locator('text=Goethe A1').locator('..').getByText('2 cards')
  ).toBeVisible();
  await expect(
    page.locator('text=Goethe A2').locator('..').getByText('1 cards')
  ).toBeVisible();
  await expect(
    page.locator('text=Goethe B1').locator('..').getByText('0 cards')
  ).toBeVisible();
});
