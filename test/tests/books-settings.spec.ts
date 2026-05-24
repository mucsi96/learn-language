import { test, expect } from '../fixtures';
import { createSource, getSource } from '../utils';

test('navigates to books settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Books' })).toBeVisible();
  await page.getByRole('link', { name: 'Books' }).click();
  await expect(page.getByRole('heading', { name: 'Books', level: 1 })).toBeVisible();
});

test('settings page redirects to books by default', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Books', level: 1 })).toBeVisible();
});

test('groups books in three categories', async ({ page }) => {
  await page.goto('/settings/books');

  await expect(page.getByRole('heading', { name: 'Reading in progress' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Already read' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'To be read' })).toBeVisible();
});

test('displays books with page count under reading in progress', async ({ page }) => {
  await page.goto('/settings/books');

  const inProgress = page.getByRole('region', { name: 'Reading in progress' });
  await expect(inProgress.getByRole('article', { name: 'Goethe A1' })).toBeVisible();
  await expect(inProgress.getByRole('article', { name: 'Goethe A2' })).toBeVisible();
  await expect(inProgress.getByRole('article', { name: 'Goethe B1' })).toBeVisible();
});

test('displays book in already read category when bookmarked page reaches page count', async ({ page }) => {
  await createSource({
    id: 'finished-book',
    name: 'Finished Book',
    startPage: 1,
    pageCount: 50,
    bookmarkedPage: 50,
    languageLevel: 'B2',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
  });

  await page.goto('/settings/books');

  const read = page.getByRole('region', { name: 'Already read' });
  await expect(read.getByRole('article', { name: 'Finished Book' })).toBeVisible();
});

test('displays book in to-be-read category when page count is empty', async ({ page }) => {
  await createSource({
    id: 'wanted-book',
    name: 'Wanted Book',
    startPage: 1,
    languageLevel: 'C1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
  });

  await page.goto('/settings/books');

  const wanted = page.getByRole('region', { name: 'To be read' });
  await expect(wanted.getByRole('article', { name: 'Wanted Book' })).toBeVisible();
});

test('wanted books are not shown on home page', async ({ page }) => {
  await createSource({
    id: 'wanted-book',
    name: 'Wanted Book',
    startPage: 1,
    languageLevel: 'C1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Wanted Book' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Goethe A1' })).toBeVisible();
});

test('can add a new book with page count', async ({ page }) => {
  await page.goto('/settings/books');

  await page.getByRole('button', { name: 'Add Book' }).click();

  await page.getByLabel('Source ID').fill('new-book');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('New Book');

  await page.getByLabel('Card Type').click();
  await page.getByRole('option', { name: 'Vocabulary' }).click();

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'PDF Document' }).click();

  await page.getByLabel('Upload PDF file').setInputFiles({
    name: 'new-book.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PDF content'),
  });

  await page.getByLabel('Start Page').fill('1');
  await page.getByLabel('Page Count').fill('250');
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'B1' }).click();
  await page.getByLabel('Format Type').click();
  await page.getByRole('option', { name: 'Word list with examples' }).click();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();

  const created = await getSource('new-book');
  expect(created).not.toBeNull();
  expect(created?.pageCount).toBe(250);
});

test('can add a wanted book without page count or file', async ({ page }) => {
  await page.goto('/settings/books');

  await page.getByRole('button', { name: 'Add Book' }).click();

  await page.getByLabel('Source ID').fill('wishlist-book');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Wishlist Book');

  await page.getByLabel('Card Type').click();
  await page.getByRole('option', { name: 'Vocabulary' }).click();

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'PDF Document' }).click();

  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'C2' }).click();
  await page.getByLabel('Format Type').click();
  await page.getByRole('option', { name: 'Word list with examples' }).click();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();

  const created = await getSource('wishlist-book');
  expect(created).not.toBeNull();
  expect(created?.pageCount).toBeNull();

  const wanted = page.getByRole('region', { name: 'To be read' });
  await expect(wanted.getByRole('article', { name: 'Wishlist Book' })).toBeVisible();
});

test('can edit a book to add page count', async ({ page }) => {
  await createSource({
    id: 'editable-book',
    name: 'Editable Book',
    startPage: 1,
    languageLevel: 'A2',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
  });

  await page.goto('/settings/books');

  const wanted = page.getByRole('region', { name: 'To be read' });
  await wanted
    .getByRole('article', { name: 'Editable Book' })
    .getByRole('button', { name: 'Edit Editable Book' })
    .click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();
  await page.getByLabel('Page Count').fill('120');
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).not.toBeVisible();

  const updated = await getSource('editable-book');
  expect(updated?.pageCount).toBe(120);

  const inProgress = page.getByRole('region', { name: 'Reading in progress' });
  await expect(inProgress.getByRole('article', { name: 'Editable Book' })).toBeVisible();
});

test('can delete a book from settings', async ({ page }) => {
  await createSource({
    id: 'delete-me',
    name: 'Delete Me',
    startPage: 1,
    pageCount: 100,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
  });

  await page.goto('/settings/books');

  await page
    .getByRole('article', { name: 'Delete Me' })
    .getByRole('button', { name: 'Delete Delete Me' })
    .click();

  await expect(page.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByRole('article', { name: 'Delete Me' })).not.toBeVisible();

  const deleted = await getSource('delete-me');
  expect(deleted).toBeNull();
});

test('shows progress label on books with page count', async ({ page }) => {
  await createSource({
    id: 'progress-book',
    name: 'Progress Book',
    startPage: 1,
    pageCount: 200,
    bookmarkedPage: 75,
    languageLevel: 'B1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
  });

  await page.goto('/settings/books');

  const book = page.getByRole('article', { name: 'Progress Book' });
  await expect(book.getByLabel('Progress: 75 / 200')).toBeVisible();
});
