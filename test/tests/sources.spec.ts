import { test, expect } from '../fixtures';
import { createCard, cleanupDbRecords, getSource, getDocuments, setupTestRateLimits, getCardFromDb, createLearningPartner } from '../utils';

test('displays sources', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Sources' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Goethe A1' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Goethe A2' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Goethe B1' })).toBeVisible();
});

test('can select a source', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  const source = page.getByRole('article', { name: 'Goethe A1' });
  await source.click();
  await expect(source).toHaveAttribute('aria-selected', 'true');
});

test('can deselect a source by clicking again', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  const source = page.getByRole('article', { name: 'Goethe A1' });
  await source.click();
  await expect(source).toHaveAttribute('aria-selected', 'true');
  await source.click();
  await expect(source).toHaveAttribute('aria-selected', 'false');
});

test('action buttons are hidden when no source is selected', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  await expect(page.getByRole('button', { name: 'Pages' })).toBeHidden();
});

test('action buttons appear when a source is selected', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await expect(page.getByRole('button', { name: 'Pages' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});

test('pages button navigates to page viewer', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();
  await expect(page).toHaveURL(/\/sources\/goethe-a1\/page\/9/);
});

test('cards button navigates to cards table', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Cards' }).click();
  await expect(page).toHaveURL(/\/sources\/goethe-a1\/cards/);
});

test('displays card counts excluding drafts', async ({ page }) => {
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
  await createCard({
    cardId: 'test-card-draft',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'draft1',
      type: 'NOUN',
      translation: { en: 'draft1' },
    },
    readiness: 'DRAFT',
  });
  await page.goto('http://localhost:8170/sources');
  await expect(page.getByRole('article', { name: 'Goethe A1' }).getByText('Ready 2')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Goethe A1' }).getByText('1 draft')).toBeVisible();
});

test('displays card count for sources', async ({ page }) => {
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

  await page.goto('http://localhost:8170/sources');

  await expect(page.getByRole('article', { name: 'Goethe A1' }).getByText('Ready 2')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Goethe A2' }).getByText('Ready 1')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Goethe B1' }).getByText('0')).toBeVisible();
});

test('displays card state counts only for ready cards', async ({ page }) => {
  await createCard({
    cardId: 'test-new-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    state: 'NEW',
    data: {
      word: 'neu1',
      type: 'NOUN',
      translation: { en: 'new1' },
    },
  });
  await createCard({
    cardId: 'test-new-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    state: 'NEW',
    data: {
      word: 'neu2',
      type: 'NOUN',
      translation: { en: 'new2' },
    },
  });
  await createCard({
    cardId: 'test-review-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    state: 'REVIEW',
    data: {
      word: 'review1',
      type: 'NOUN',
      translation: { en: 'review1' },
    },
  });
  await createCard({
    cardId: 'test-known-new',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    state: 'NEW',
    readiness: 'KNOWN',
    data: {
      word: 'known1',
      type: 'NOUN',
      translation: { en: 'known1' },
    },
  });
  await createCard({
    cardId: 'test-in-review-new',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    state: 'NEW',
    readiness: 'IN_REVIEW',
    data: {
      word: 'inreview1',
      type: 'NOUN',
      translation: { en: 'inreview1' },
    },
  });

  await page.goto('http://localhost:8170/sources');
  const source = page.getByRole('article', { name: 'Goethe A1' });
  await expect(source.getByText('Ready 3')).toBeVisible();
  await expect(source.getByText('Known 1')).toBeVisible();
  await expect(source.getByLabel('IN_REVIEW: 1')).toBeVisible();
  await expect(source.getByTitle('New')).toContainText('2');
  await expect(source.getByTitle('Review')).toContainText('1');
});

test('displays flagged and unhealthy card counts', async ({ page }) => {
  await createCard({
    cardId: 'test-flagged-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    flagged: true,
    data: {
      word: 'flagged1',
      type: 'NOUN',
      translation: { en: 'flagged1' },
    },
  });
  await createCard({
    cardId: 'test-flagged-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    flagged: true,
    data: {
      word: 'flagged2',
      type: 'NOUN',
      translation: { en: 'flagged2' },
    },
  });

  await page.goto('http://localhost:8170/sources');
  const source = page.getByRole('article', { name: 'Goethe A1' });
  await expect(source.getByLabel('Flagged cards')).toContainText('2 flagged');
});

test('displays readiness breakdown for sources', async ({ page }) => {
  await createCard({
    cardId: 'test-ready-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    readiness: 'READY',
    data: {
      word: 'ready1',
      type: 'NOUN',
      translation: { en: 'ready1' },
    },
  });
  await createCard({
    cardId: 'test-known-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    readiness: 'KNOWN',
    data: {
      word: 'known1',
      type: 'NOUN',
      translation: { en: 'known1' },
    },
  });

  await page.goto('http://localhost:8170/sources');
  const source = page.getByRole('article', { name: 'Goethe A1' });
  await expect(source.getByLabel('READY: 1')).toBeVisible();
  await expect(source.getByLabel('KNOWN: 1')).toBeVisible();
});

test('can create a new source', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByLabel('Source ID').fill('test-source');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Source');

  await page.getByLabel('Card Type').click();
  await page.getByRole('option', { name: 'Vocabulary' }).click();

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'PDF Document' }).click();

  await page.getByLabel('Upload PDF file').setInputFiles({
    name: 'test-file.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PDF content'),
  });

  await page.getByLabel('Start Page').fill('1');
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'B2' }).click();
  await page.getByLabel('Format Type').click();
  await page.getByRole('option', { name: 'Word list with examples' }).click();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();

  await expect(page.getByText('Test Source')).toBeVisible();

  const createdSource = await getSource('test-source');
  expect(createdSource).not.toBeNull();
  expect(createdSource?.name).toBe('Test Source');
  expect(createdSource?.startPage).toBe(1);
  expect(createdSource?.languageLevel).toBe('B2');
  expect(createdSource?.cardType).toBe('VOCABULARY');
  expect(createdSource?.formatType).toBe('WORD_LIST_WITH_EXAMPLES');

  const documents = await getDocuments('test-source');
  expect(documents).toHaveLength(1);
  expect(documents[0].fileName).toBe('test-file.pdf');
  expect(documents[0].pageNumber).toBeNull();
});

test('can edit an existing source', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  const initialSource = await getSource('goethe-a1');
  expect(initialSource?.name).toBe('Goethe A1');

  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();
  await expect(page.getByLabel('Source ID')).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Goethe A1');

  const nameField = page.getByRole('textbox', { name: 'Name', exact: true });
  await nameField.fill('Goethe A1 Updated');

  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  await expect(page.getByText('Goethe A1 Updated')).toBeVisible();

  const updatedSource = await getSource('goethe-a1');
  expect(updatedSource?.name).toBe('Goethe A1 Updated');
});

test('can delete a source and its cards', async ({ page }) => {
  await createCard({
    cardId: 'test-card-b1-1',
    sourceId: 'goethe-b1',
    sourcePageNumber: 16,
    data: {
      word: 'test1',
      type: 'NOUN',
      translation: { en: 'test1' },
    },
  });
  await createCard({
    cardId: 'test-card-b1-2',
    sourceId: 'goethe-b1',
    sourcePageNumber: 17,
    data: {
      word: 'test2',
      type: 'NOUN',
      translation: { en: 'test2' },
    },
  });

  const sourceBeforeDelete = await getSource('goethe-b1');
  expect(sourceBeforeDelete).not.toBeNull();
  expect(sourceBeforeDelete?.name).toBe('Goethe B1');

  await page.goto('http://localhost:8170/sources');

  await expect(page.getByRole('article', { name: 'Goethe B1' }).getByText('Ready 2')).toBeVisible();

  await page.getByRole('article', { name: 'Goethe B1' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await expect(page.getByText(/All associated cards will also be deleted/)).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByRole('heading', { name: 'Confirmation' })).not.toBeVisible();

  await expect(page.getByRole('article', { name: 'Goethe B1' })).not.toBeVisible();

  const sourceAfterDelete = await getSource('goethe-b1');
  expect(sourceAfterDelete).toBeNull();
});

test('can cancel source creation', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByLabel('Source ID').fill('test-cancelled');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Cancelled');

  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Confirmation' })).not.toBeVisible();

  await expect(page.getByText('Test Cancelled')).not.toBeVisible();

  const cancelledSource = await getSource('test-cancelled');
  expect(cancelledSource).toBeNull();
});

test('validates required fields when creating source', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  await page.getByRole('button', { name: 'Add Source' }).click();

  const createButton = page.getByRole('button', { name: 'Create' });
  await expect(createButton).toBeDisabled();

  await page.getByLabel('Source ID').fill('test-id');

  await page.getByLabel('Card Type').click();
  await page.getByRole('option', { name: 'Vocabulary' }).click();

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'PDF Document' }).click();

  await expect(createButton).toBeDisabled();

  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Name');

  await page.getByLabel('Upload PDF file').setInputFiles({
    name: 'test.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PDF content'),
  });

  await page.getByLabel('Start Page').fill('1');
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'A1' }).click();
  await page.getByLabel('Format Type').click();
  await page.getByRole('option', { name: 'Word list with forms and examples' }).click();

  await expect(createButton).toBeEnabled();
});

test('displays empty state when no sources exist', async ({ page }) => {
  await cleanupDbRecords({ withSources: true });
  await setupTestRateLimits();

  await page.goto('http://localhost:8170/sources');

  await expect(page.getByRole('heading', { name: 'No sources yet', exact: true })).toBeVisible();
  await expect(page.getByText('Create your first source to start adding cards.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Source' })).toBeVisible();

  await expect(page.getByRole('region', { name: 'Sources list' })).not.toBeVisible();
});

test('can create a speech source with image collection', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByLabel('Source ID').fill('test-speech-source');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Speech Source');

  await page.getByLabel('Card Type').click();
  await page.getByRole('option', { name: 'Speech' }).click();

  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'A1' }).click();

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'Image Collection' }).click();

  await expect(page.getByLabel('Format Type')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();
  await expect(page.getByText('Test Speech Source')).toBeVisible();

  const createdSource = await getSource('test-speech-source');
  expect(createdSource).not.toBeNull();
  expect(createdSource?.name).toBe('Test Speech Source');
  expect(createdSource?.cardType).toBe('SPEECH');
  expect(createdSource?.formatType).toBe('FLOWING_TEXT');
  expect(createdSource?.sourceType).toBe('IMAGES');
});

test('can create a grammar source with image collection', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

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

test('edit dialog shows card limit and new card limit fields with defaults', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();

  const cardLimitField = page.getByRole('spinbutton', { name: 'Card Limit', exact: true });
  const newCardLimitField = page.getByRole('spinbutton', { name: 'New Card Limit', exact: true });

  await expect(cardLimitField).toBeVisible();
  await expect(newCardLimitField).toBeVisible();
  await expect(cardLimitField).toHaveValue('50');
  await expect(newCardLimitField).toHaveValue('50');
});

test('can edit card limit and new card limit', async ({ page }) => {
  await page.goto('http://localhost:8170/sources');

  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();

  await page.getByRole('spinbutton', { name: 'Card Limit', exact: true }).fill('30');
  await page.getByRole('spinbutton', { name: 'New Card Limit', exact: true }).fill('10');

  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  await expect(async () => {
    const updatedSource = await getSource('goethe-a1');
    expect(updatedSource?.cardLimit).toBe(30);
    expect(updatedSource?.newCardLimit).toBe(10);
  }).toPass();

});

test('can assign a learning partner to a source', async ({ page }) => {
  await createLearningPartner({ name: 'Alice' });

  await page.goto('http://localhost:8170/sources');

  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();

  await page.getByLabel('Learning Partner').click();
  await page.getByRole('option', { name: 'Alice' }).click();

  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  await expect(async () => {
    const updatedSource = await getSource('goethe-a1');
    expect(updatedSource?.learningPartnerId).not.toBeNull();
  }).toPass();
});

test('can remove a learning partner from a source', async ({ page }) => {
  const aliceId = await createLearningPartner({ name: 'Alice' });

  await page.goto('http://localhost:8170/sources');

  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await page.getByLabel('Learning Partner').click();
  await page.getByRole('option', { name: 'Alice' }).click();
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  await expect(async () => {
    const source = await getSource('goethe-a1');
    expect(source?.learningPartnerId).toBe(aliceId);
  }).toPass();

  await page.goto('http://localhost:8170/sources');

  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await page.getByLabel('Learning Partner').click();
  await page.getByRole('option', { name: 'None' }).click();

  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  await expect(async () => {
    const updatedSource = await getSource('goethe-a1');
    expect(updatedSource?.learningPartnerId).toBeNull();
  }).toPass();
});

