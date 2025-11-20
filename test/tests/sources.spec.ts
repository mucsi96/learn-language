import { test, expect } from '../fixtures';
import { createCard, cleanupDbRecords, getSource } from '../utils';

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
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Source');

  // Upload a PDF file via the file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-file.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PDF content')
  });

  await page.getByLabel('Start Page').fill('1');
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'B2' }).click();

  // Click Create button
  await page.getByRole('button', { name: 'Create' }).click();

  // Wait for dialog to close
  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();

  // Verify the new source appears in the list
  await expect(page.getByText('Test Source')).toBeVisible();

  // Verify the source was created in the database
  const createdSource = await getSource('test-source');
  expect(createdSource).not.toBeNull();
  expect(createdSource?.name).toBe('Test Source');
  expect(createdSource?.fileName).toBe('test-file.pdf');
  expect(createdSource?.startPage).toBe(1);
  expect(createdSource?.languageLevel).toBe('B2');
  expect(createdSource?.cardType).toBe('VOCABULARY');
});

test('can edit an existing source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Verify initial state in database
  const initialSource = await getSource('goethe-a1');
  expect(initialSource?.name).toBe('Goethe A1');

  // Hover over a source card to reveal action buttons
  const sourceCard = page.locator('.card-wrapper', { has: page.getByText('Goethe A1') });
  await sourceCard.hover();

  // Click the edit button
  await sourceCard.getByRole('button', { name: 'Edit source' }).click();

  // Verify the dialog opened with pre-filled data
  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();
  await expect(page.getByLabel('Source ID')).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Goethe A1');

  // Update the name
  const nameField = page.getByRole('textbox', { name: 'Name', exact: true });
  await nameField.fill('Goethe A1 Updated');

  // Click Update button
  await page.getByRole('button', { name: 'Update' }).click();

  // Wait for dialog to close
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  // Verify the updated source appears
  await expect(page.getByText('Goethe A1 Updated')).toBeVisible();

  // Verify the source was updated in the database
  const updatedSource = await getSource('goethe-a1');
  expect(updatedSource?.name).toBe('Goethe A1 Updated');
  expect(updatedSource?.fileName).toBe('A1_SD1_Wortliste_02.pdf');
});

test('can replace PDF file when editing source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Verify the initial file name in the database
  const initialSource = await getSource('goethe-a1');
  expect(initialSource?.fileName).toBe('A1_SD1_Wortliste_02.pdf');

  // Hover over a source card to reveal action buttons
  const sourceCard = page.locator('.card-wrapper', { has: page.getByText('Goethe A1') });
  await sourceCard.hover();

  // Click the edit button
  await sourceCard.getByRole('button', { name: 'Edit source' }).click();

  // Verify the dialog opened and shows the current file
  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();
  await expect(page.getByText('A1_SD1_Wortliste_02.pdf')).toBeVisible();

  // Remove the current file
  await page.getByRole('button', { name: 'Remove file' }).click();

  // Verify dropzone is empty after removal
  await expect(page.getByText('Drag and drop a PDF file here')).toBeVisible();

  // Upload a new PDF file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'new-document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('New PDF content')
  });

  // Verify the new file is shown
  await expect(page.getByText('new-document.pdf')).toBeVisible();

  // Click Update button
  await page.getByRole('button', { name: 'Update' }).click();

  // Wait for dialog to close
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  // Verify the fileName is updated in the database
  const updatedSource = await getSource('goethe-a1');
  expect(updatedSource?.fileName).toBe('new-document.pdf');
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

  // Verify the source exists in the database
  const sourceBeforeDelete = await getSource('goethe-b1');
  expect(sourceBeforeDelete).not.toBeNull();
  expect(sourceBeforeDelete?.name).toBe('Goethe B1');

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

  // Wait for dialog to close
  await expect(page.getByRole('heading', { name: 'Confirmation' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  // Verify the source is no longer visible
  await expect(page.getByText('Goethe B1')).not.toBeVisible();

  // Verify the source was deleted from the database
  const sourceAfterDelete = await getSource('goethe-b1');
  expect(sourceAfterDelete).toBeNull();
});

test('can cancel source creation', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  // Click the "Add Source" button
  await page.getByRole('button', { name: 'Add Source' }).click();

  // Fill in partial data
  await page.getByLabel('Source ID').fill('test-cancelled');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Cancelled');

  // Click Cancel button
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Verify the dialog closed and source was not created
  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Confirmation' })).not.toBeVisible();

  await expect(page.getByText('Test Cancelled')).not.toBeVisible();

  // Verify the source was NOT created in the database
  const cancelledSource = await getSource('test-cancelled');
  expect(cancelledSource).toBeNull();
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
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Name');

  // Upload a PDF file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PDF content')
  });

  await page.getByLabel('Start Page').fill('1');

  // Create button should now be enabled
  await expect(createButton).toBeEnabled();
});

test('displays empty state when no sources exist', async ({ page }) => {
  await cleanupDbRecords({ withSources: true });

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
