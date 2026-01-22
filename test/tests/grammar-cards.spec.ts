import { test, expect } from '../fixtures';
import { createCard, createSource, getSource, uploadMockImage, yellowImage } from '../utils';

test('can create a grammar source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByLabel('Source ID').fill('test-grammar-source');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Grammar Source');

  await page.getByLabel('Card Type').click();
  await page.getByRole('option', { name: 'Grammar' }).click();

  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'A1' }).click();

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'Image Collection' }).click();

  await expect(page.getByLabel('Format Type')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();
  await expect(page.getByText('Test Grammar Source')).toBeVisible();

  const createdSource = await getSource('test-grammar-source');
  expect(createdSource).not.toBeNull();
  expect(createdSource?.name).toBe('Test Grammar Source');
  expect(createdSource?.cardType).toBe('GRAMMAR');
  expect(createdSource?.formatType).toBe('FLOWING_TEXT');
  expect(createdSource?.sourceType).toBe('IMAGES');
});

test('displays grammar card with gaps in edit page', async ({ page }) => {
  const imageId = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'test-grammar-card-1',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich gehe in die Schule.',
      gaps: [{ start: 13, end: 16, text: 'die' }],
      translation: { en: 'I go to school.' },
      examples: [
        {
          de: 'Ich gehe in die Schule.',
          en: 'I go to school.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/page/1/cards/test-grammar-card-1');

  await expect(page.getByRole('heading', { name: 'Grammar' })).toBeVisible();
  await expect(page.getByLabel('German Sentence')).toHaveValue('Ich gehe in die Schule.');
  await expect(page.getByText('die', { exact: true })).toBeVisible();
  await expect(page.getByText('Preview:')).toBeVisible();
});

test('can add gap in grammar card editor', async ({ page }) => {
  await createCard({
    cardId: 'test-grammar-card-2',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Er hat gestern einen Apfel gegessen.',
      gaps: [],
      translation: { en: 'He ate an apple yesterday.' },
      examples: [
        {
          de: 'Er hat gestern einen Apfel gegessen.',
          en: 'He ate an apple yesterday.',
          isSelected: true,
          images: [],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/page/1/cards/test-grammar-card-2');

  await expect(page.getByRole('heading', { name: 'Grammar' })).toBeVisible();

  const sentenceTextarea = page.getByLabel('German Sentence');
  await sentenceTextarea.click();

  await sentenceTextarea.evaluate((el: HTMLTextAreaElement) => {
    el.setSelectionRange(7, 14);
  });
  await sentenceTextarea.dispatchEvent('select');

  await page.getByRole('button', { name: 'Add gap from selection' }).click();

  await expect(page.getByRole('list', { name: 'Gaps' }).getByText('gestern')).toBeVisible();
});

test('displays grammar card in study mode with gap on front', async ({ page }) => {
  const imageId = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'test-grammar-study-1',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    state: 'NEW',
    data: {
      sentence: 'Ich fahre mit dem Bus zur Arbeit.',
      gaps: [{ start: 14, end: 17, text: 'dem' }],
      translation: { en: 'I take the bus to work.' },
      examples: [
        {
          de: 'Ich fahre mit dem Bus zur Arbeit.',
          en: 'I take the bus to work.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/study');

  await page.getByRole('button', { name: 'Start study session' }).click();

  await expect(page.getByRole('article', { name: 'Flashcard' })).toBeVisible();

  const sentenceText = page.getByRole('article', { name: 'Flashcard' }).locator('p');
  const sentenceContent = await sentenceText.textContent();
  expect(sentenceContent).toContain('___');
  expect(sentenceContent).not.toContain('dem');

  await page.getByRole('article', { name: 'Flashcard' }).click();

  const revealedSentence = await sentenceText.textContent();
  expect(revealedSentence).toContain('dem');
  expect(revealedSentence).not.toContain('___');
});

test('can remove gap in grammar card editor', async ({ page }) => {
  await createCard({
    cardId: 'test-grammar-card-3',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Das Wetter ist heute sehr schön.',
      gaps: [
        { start: 16, end: 21, text: 'heute' },
        { start: 27, end: 32, text: 'schön' },
      ],
      translation: { en: 'The weather is very nice today.' },
      examples: [
        {
          de: 'Das Wetter ist heute sehr schön.',
          en: 'The weather is very nice today.',
          isSelected: true,
          images: [],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/page/1/cards/test-grammar-card-3');

  await expect(page.getByRole('list', { name: 'Gaps' }).getByText('heute')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Gaps' }).getByText('schön')).toBeVisible();

  await page.getByRole('list', { name: 'Gaps' }).getByText('heute').locator('..').getByRole('button', { name: 'Remove gap' }).click();

  await expect(page.getByRole('list', { name: 'Gaps' }).getByText('heute')).not.toBeVisible();
  await expect(page.getByRole('list', { name: 'Gaps' }).getByText('schön')).toBeVisible();
});
