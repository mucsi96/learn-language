import { test, expect } from '../fixtures';
import { createCard, cleanupDbRecords } from '../utils';

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

test('can create a new source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Click the "Add Source" button
  await page.getByRole('button', { name: 'Add Source' }).click();

  // Fill in the form
  await page.getByLabel('Source ID').fill('test-source');
  await page.getByLabel('Name').fill('Test Source');
  await page.getByLabel('File Name (PDF)').fill('test-file.pdf');
  await page.getByLabel('Start Page').fill('1');
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'B2' }).click();

  // Click Create button
  await page.getByRole('button', { name: 'Create' }).click();

  // Verify the new source appears in the list
  await expect(page.getByText('Test Source')).toBeVisible();
  await expect(page.getByText('B2')).toBeVisible();
});

test('can edit an existing source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Hover over a source card to reveal action buttons
  const sourceCard = page.locator('.card-wrapper', { has: page.getByText('Goethe A1') });
  await sourceCard.hover();

  // Click the edit button
  await sourceCard.getByRole('button', { name: 'Edit source' }).click();

  // Verify the dialog opened with pre-filled data
  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();
  await expect(page.getByLabel('Source ID')).toBeDisabled();
  await expect(page.getByLabel('Name')).toHaveValue('Goethe A1');

  // Update the name
  await page.getByLabel('Name').clear();
  await page.getByLabel('Name').fill('Goethe A1 Updated');

  // Click Update button
  await page.getByRole('button', { name: 'Update' }).click();

  // Verify the updated source appears
  await expect(page.getByText('Goethe A1 Updated')).toBeVisible();
});

test('can delete a source and its cards', async ({ page }) => {
  // Create test cards for the source we're about to delete
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

  await page.goto('http://localhost:8180/sources');

  // Verify source has cards
  await expect(
    page.locator('text=Goethe B1').locator('..').getByText('2 cards')
  ).toBeVisible();

  // Hover over the source card
  const sourceCard = page.locator('.card-wrapper', { has: page.getByText('Goethe B1') });
  await sourceCard.hover();

  // Click the delete button
  await sourceCard.getByRole('button', { name: 'Delete source' }).click();

  // Confirm deletion and verify message mentions cards will be deleted
  await expect(page.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await expect(page.getByText(/All associated cards will also be deleted/)).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();

  // Verify the source is no longer visible
  await expect(page.getByText('Goethe B1')).not.toBeVisible();
});

test('can cancel source creation', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Click the "Add Source" button
  await page.getByRole('button', { name: 'Add Source' }).click();

  // Fill in partial data
  await page.getByLabel('Source ID').fill('test-cancelled');
  await page.getByLabel('Name').fill('Test Cancelled');

  // Click Cancel button
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Verify the dialog closed and source was not created
  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();
  await expect(page.getByText('Test Cancelled')).not.toBeVisible();
});

test('validates required fields when creating source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Click the "Add Source" button
  await page.getByRole('button', { name: 'Add Source' }).click();

  // Try to submit without filling required fields
  const createButton = page.getByRole('button', { name: 'Create' });
  await expect(createButton).toBeDisabled();

  // Fill in only some fields
  await page.getByLabel('Source ID').fill('test-id');
  await expect(createButton).toBeDisabled();

  // Fill in all required fields
  await page.getByLabel('Name').fill('Test Name');
  await page.getByLabel('File Name (PDF)').fill('test.pdf');
  await page.getByLabel('Start Page').fill('1');

  // Create button should now be enabled
  await expect(createButton).toBeEnabled();
});

test('displays empty state when no sources exist', async ({ page }) => {
  // Clear all sources from the database
  await cleanupDbRecords();

  await page.goto('http://localhost:8180/sources');

  // Check that empty state is displayed
  await expect(
    page.getByRole('heading', { name: 'No sources yet', exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('Create your first source to start adding cards.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Source' })).toBeVisible();

  // Check that the sources grid is not displayed
  await expect(page.locator('.sources')).not.toBeVisible();
});
