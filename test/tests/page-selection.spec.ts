import { test, expect, Page } from '@playwright/test';

const wordsByPage = [
  ['aber', 'abfahren', 'Abfahrt', 'Absender', 'Achtung', 'Adresse'],
  ['ankommen', 'Ankunft'],
];

async function mockPages(page: Page, options: { mixedWidths?: boolean; multipleCardTypes?: boolean } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('oidc.user:http://page-selection.test/default:mock-client-id', JSON.stringify({
      access_token: 'page-selection-test',
      token_type: 'Bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      profile: { sub: 'page-selection', name: 'Page Selection', roles: ['readDecks', 'createDeck'] },
    }));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/environment') {
      await route.fulfill({ json: {
        mockOAuth2ServerUri: 'http://page-selection.test',
        clientAppName: 'page-selection-test',
        chatModels: [{ modelName: 'test-model', provider: 'google' }],
        imageModels: [], audioModels: [], voices: [], supportedLanguages: [],
        enabledModelsByOperation: { extraction: ['test-model'], translation: ['test-model'] },
        primaryModelByOperation: { extraction: 'test-model', translation: 'test-model' },
        operationTypes: [], allOperationTypes: [], languageLevels: [], sourceFormatTypes: [], sourceTypes: [],
      } });
      return;
    }
    if (path.startsWith('/api/source/selection-test/page/')) {
      const number = Number(path.split('/').at(-1));
      await new Promise(resolve => setTimeout(resolve, 150));
      await route.fulfill({ json: {
        sourceId: 'selection-test', sourceName: 'Selection Test', number,
        width: options.mixedWidths && number === 2 ? 800 : 600,
        height: 800, pageCount: 2, sourceType: 'pdf', formatType: 'wordList',
        cardTypes: options.multipleCardTypes ? ['vocabulary', 'grammar'] : ['vocabulary'],
        documents: [], extractionRegions: [],
        spans: wordsByPage[number - 1].map((word, index) => ({
          text: word, searchTerm: word, font: 'Arial', fontSize: '12', color: '#000000',
          bbox: { x: 50, y: 50 + index * 30, width: word.length * 6, height: 20 },
        })),
      } });
      return;
    }
    if (path === '/api/source/selection-test/extract/words') {
      const { regions } = route.request().postDataJSON();
      await route.fulfill({ json: {
        words: regions.flatMap((region: { pageNumber: number }) =>
          wordsByPage[region.pageNumber - 1].map(word => ({ word, forms: [], examples: [] }))
        ),
      } });
      return;
    }
    if (path === '/api/translate/hu') {
      await route.fulfill({ json: { translation: 'translation', examples: [] } });
      return;
    }
    if (path === '/api/word-id') {
      const { germanWord } = route.request().postDataJSON();
      await route.fulfill({ json: { id: germanWord, exists: germanWord === 'aber', warning: false } });
      return;
    }
    if (['/api/sources', '/api/known-words', '/api/sources/due-cards-count',
      '/api/model-usage-logs/daily-usage', '/api/cards/readiness/IN_REVIEW'].includes(path)) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.abort();
  });
}

async function selectWords(page: Page, words: string[]) {
  const content = page.getByRole('region', { name: 'Page content', exact: true });
  const first = content.getByText(words[0], { exact: true });
  const last = content.getByText(words.at(-1)!, { exact: true });
  await expect(first).toBeVisible();
  await expect(last).toBeVisible();
  await page.waitForLoadState('networkidle');
  const start = await first.boundingBox();
  const end = await last.boundingBox();
  if (!start || !end) throw new Error('Word bounds are unavailable');
  await page.mouse.move(start.x - 10, start.y - 10);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width + 10, end.y + end.height + 10);
  await page.mouse.up();
  await expect(page.getByRole('region', { name: 'Selected area 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm selection' }).click();
}

test('confirmed regions and candidate counts persist when extracting on the next page', async ({ page }) => {
  await mockPages(page);
  await page.goto('/sources/selection-test/page/1');
  await selectWords(page, wordsByPage[0]);
  const create = page.getByRole('button', { name: 'Create cards in bulk' });
  await expect(create).toContainText('Create 5 Cards');
  await expect(page.getByRole('region', { name: 'Extracted region', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.getByText('ankommen', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Extracted region', exact: true })).toHaveCount(0);
  await selectWords(page, wordsByPage[1]);
  await expect(create).toContainText('Create 7 Cards');
  await expect(page.getByRole('region', { name: 'Extracted region', exact: true })).toBeVisible();
  await expect(page.getByText('ankommen', { exact: true })).toHaveAccessibleDescription('Card does not exist');

  await page.getByRole('link', { name: 'Previous page' }).click();
  await expect(page.getByRole('link', { name: 'aber', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Extracted region', exact: true })).toHaveCount(1);
  await expect(create).toContainText('Create 7 Cards');
});

test('page navigation preserves the chosen card type and rescales selections to the new page', async ({ page }) => {
  await mockPages(page, { mixedWidths: true, multipleCardTypes: true });
  await page.goto('/sources/selection-test/page/1');
  await page.getByRole('combobox', { name: 'Card type', exact: true }).click();
  await page.getByRole('option', { name: 'Vocabulary', exact: true }).click();
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await selectWords(page, wordsByPage[0]);
  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).toContainText('Create 5 Cards');

  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.getByText('ankommen', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Card type', exact: true })).toContainText('Vocabulary');
  await selectWords(page, wordsByPage[1]);
  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).toContainText('Create 7 Cards');
  await expect(page.getByText('ankommen', { exact: true })).toHaveAccessibleDescription('Card does not exist');
  const region = await page.getByRole('region', { name: 'Extracted region', exact: true }).boundingBox();
  const word = await page.getByText('ankommen', { exact: true }).boundingBox();
  if (!region || !word) throw new Error('Region or word bounds are unavailable');
  expect(region.x).toBeLessThan(word.x);
  expect(region.x + region.width).toBeGreaterThan(word.x + word.width);
  expect(region.y).toBeLessThan(word.y);
});

test('existing-card word buttons keep the page text typography and dimensions', async ({ page }) => {
  await mockPages(page);
  await page.goto('/sources/selection-test/page/1');
  const word = page.getByText('aber', { exact: true });
  await expect(word).toBeVisible();
  const original = await word.evaluate(element => {
    const style = getComputedStyle(element);
    return { font: style.font, letterSpacing: style.letterSpacing, width: style.width, height: style.height };
  });
  await selectWords(page, wordsByPage[0]);
  const existing = page.getByRole('link', { name: 'aber', exact: true });
  await expect(existing).toHaveAccessibleDescription('Card exists');
  await expect(existing).toHaveCSS('font', original.font);
  await expect(existing).toHaveCSS('letter-spacing', original.letterSpacing);
  await expect(existing).toHaveCSS('width', original.width);
  await expect(existing).toHaveCSS('height', original.height);
});
