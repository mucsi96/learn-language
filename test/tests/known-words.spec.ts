import { test, expect } from '../fixtures';
import { createKnownWords, getKnownWords } from '../utils';

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

test('can import words from textarea', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await expect(textarea).toBeVisible();

  await textarea.fill('apple, banana, cherry');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual(['apple', 'banana', 'cherry']);
});

test('can import words separated by newlines', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('dog\ncat\nbird');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual(['bird', 'cat', 'dog']);
});

test('displays existing known words as chips', async ({ page }) => {
  await createKnownWords(['hello', 'world', 'test']);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(3\)/ })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'hello' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'world' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'test' })).toBeVisible();
});

test('can delete individual words', async ({ page }) => {
  await createKnownWords(['remove', 'keep']);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(2\)/ })).toBeVisible();

  const removeChip = page.getByRole('listitem').filter({ hasText: 'remove' });
  await removeChip.getByRole('button', { name: 'Remove word' }).click();

  await expect(page.getByRole('heading', { name: /Known Words \(1\)/ })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'remove' })).not.toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'keep' })).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual(['keep']);
});

test('can clear all words', async ({ page }) => {
  await createKnownWords(['one', 'two', 'three']);

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

test('skips duplicate words during import', async ({ page }) => {
  await createKnownWords(['existing']);

  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('existing, new1, new2');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual(['existing', 'new1', 'new2']);
});

test('normalizes words to lowercase', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('HELLO, World, TeSt');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual(['hello', 'test', 'world']);
});

test('import button is disabled when textarea is empty', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const importButton = page.getByRole('button', { name: 'Import' });
  await expect(importButton).toBeDisabled();

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('   ');
  await expect(importButton).toBeDisabled();

  await textarea.fill('word');
  await expect(importButton).toBeEnabled();
});

test('clears textarea after successful import', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('test');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('1 new words imported')).toBeVisible();
  await expect(textarea).toHaveValue('');
});

test('settings navigation shows known words link', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Known Words' })).toBeVisible();
});

test('can import words using German - Hungarian format', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('die Bank - a bank\ndie Bank - a pad\nder Tisch - az asztal');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual(['bank-bank', 'bank-pad', 'tisch-asztal']);
});
