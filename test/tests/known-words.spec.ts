import { test, expect } from '../fixtures';
import { createKnownWords, getKnownWords, getTableData } from '../utils';

test('navigates to known words settings from settings page', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('link', { name: 'Known Words' })).toBeVisible();
  await page.getByRole('link', { name: 'Known Words' }).click();
  await expect(page.getByRole('heading', { name: 'Import Known Words' })).toBeVisible();
});

test('displays empty state when no known words exist', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(0\)/ })).toBeVisible();
  await expect(page.getByText('No known words yet')).toBeVisible();
  await expect(page.getByText('Import words from other applications')).toBeVisible();
});

test('can import CSV with German words and Hungarian translations', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await expect(textarea).toBeVisible();

  await textarea.fill('Haus, ház\nBaum, fa\nWasser, víz');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { word: 'baum', hungarianTranslation: 'fa' },
    { word: 'haus', hungarianTranslation: 'ház' },
    { word: 'wasser', hungarianTranslation: 'víz' },
  ]);
});

test('can import words without Hungarian translations', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('apple\nbanana\ncherry');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { word: 'apple', hungarianTranslation: null },
    { word: 'banana', hungarianTranslation: null },
    { word: 'cherry', hungarianTranslation: null },
  ]);
});

test('displays existing known words in table', async ({ page }) => {
  await createKnownWords([
    { word: 'hello', hungarianTranslation: 'helló' },
    { word: 'world', hungarianTranslation: 'világ' },
    { word: 'test', hungarianTranslation: 'teszt' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(3\)/ })).toBeVisible();

  const table = page.getByRole('table');
  await expect(table).toBeVisible();

  const tableData = await getTableData<{ German: string; Hungarian: string }>(table);
  expect(tableData).toEqual([
    { German: 'hello', Hungarian: 'helló' },
    { German: 'test', Hungarian: 'teszt' },
    { German: 'world', Hungarian: 'világ' },
  ]);
});

test('displays dash for missing Hungarian translation', async ({ page }) => {
  await createKnownWords([
    { word: 'apple', hungarianTranslation: null },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  const table = page.getByRole('table');
  await expect(table).toBeVisible();

  const tableData = await getTableData<{ German: string; Hungarian: string }>(table);
  expect(tableData).toEqual([
    { German: 'apple', Hungarian: '-' },
  ]);
});

test('can delete individual words from table', async ({ page }) => {
  await createKnownWords([
    { word: 'remove', hungarianTranslation: 'eltávolít' },
    { word: 'keep', hungarianTranslation: 'tart' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(2\)/ })).toBeVisible();

  const table = page.getByRole('table');
  const removeRow = table.getByRole('row').filter({ hasText: 'remove' });
  await removeRow.getByRole('button', { name: 'Delete word' }).click();

  await expect(page.getByRole('heading', { name: /Known Words \(1\)/ })).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([{ word: 'keep', hungarianTranslation: 'tart' }]);
});

test('can clear all words', async ({ page }) => {
  await createKnownWords([
    { word: 'one', hungarianTranslation: 'egy' },
    { word: 'two', hungarianTranslation: 'kettő' },
    { word: 'three', hungarianTranslation: 'három' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(3\)/ })).toBeVisible();

  await page.getByRole('button', { name: 'Clear all known words' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Delete all 3 known words?')).toBeVisible();

  await dialog.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByRole('heading', { name: /Known Words \(0\)/ })).toBeVisible();
  await expect(page.getByText('No known words yet')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([]);
});

test('skips duplicate words during CSV import', async ({ page }) => {
  await createKnownWords([{ word: 'existing', hungarianTranslation: 'meglévő' }]);

  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('existing, új\nnew1, új1\nnew2, új2');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { word: 'existing', hungarianTranslation: 'meglévő' },
    { word: 'new1', hungarianTranslation: 'új1' },
    { word: 'new2', hungarianTranslation: 'új2' },
  ]);
});

test('normalizes German words to lowercase', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('HAUS, ház\nBaum, fa\nwasser, víz');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { word: 'baum', hungarianTranslation: 'fa' },
    { word: 'haus', hungarianTranslation: 'ház' },
    { word: 'wasser', hungarianTranslation: 'víz' },
  ]);
});

test('import button is disabled when textarea is empty', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const importButton = page.getByRole('button', { name: 'Import' });
  await expect(importButton).toBeDisabled();

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('   ');
  await expect(importButton).toBeDisabled();

  await textarea.fill('word, szó');
  await expect(importButton).toBeEnabled();
});

test('clears textarea after successful import', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('test, teszt');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('1 new words imported')).toBeVisible();
  await expect(textarea).toHaveValue('');
});

test('settings navigation shows known words link', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Known Words' })).toBeVisible();
});
