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

test('can import words from csv textarea', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await expect(textarea).toBeVisible();

  await textarea.fill('die Bank,a pad\ndas Haus,a ház\ngehen,menni');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toHaveLength(3);
  expect(words.map(w => w.germanWord).sort()).toEqual(['das Haus', 'die Bank', 'gehen']);
  expect(words.map(w => w.hungarianTranslation).sort()).toEqual(['a ház', 'a pad', 'menni']);
});

test('can import words with semicolon separator', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('das Auto;az autó\nder Tisch;az asztal');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toHaveLength(2);
});

test('displays existing known words in table', async ({ page }) => {
  await createKnownWords([
    { wordId: 'haus-haz', germanWord: 'das Haus', hungarianTranslation: 'a ház' },
    { wordId: 'bank-pad', germanWord: 'die Bank', hungarianTranslation: 'a pad' },
    { wordId: 'gehen-menni', germanWord: 'gehen', hungarianTranslation: 'menni' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(3\)/ })).toBeVisible();

  const table = page.getByRole('table', { name: 'Known words' });
  await expect(table).toBeVisible();

  await expect(table.getByRole('cell', { name: 'das Haus' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'a ház' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'die Bank' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'a pad' })).toBeVisible();
});

test('can delete individual words', async ({ page }) => {
  await createKnownWords([
    { wordId: 'remove-torlendo', germanWord: 'remove', hungarianTranslation: 'törlendő' },
    { wordId: 'keep-marad', germanWord: 'keep', hungarianTranslation: 'marad' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(2\)/ })).toBeVisible();

  const removeRow = page.getByRole('row').filter({ hasText: 'remove' });
  await removeRow.getByRole('button', { name: 'Remove word' }).click();

  await expect(page.getByRole('heading', { name: /Known Words \(1\)/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'remove' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'keep' })).toBeVisible();

  const words = await getKnownWords();
  expect(words).toHaveLength(1);
  expect(words[0].germanWord).toBe('keep');
});

test('can clear all words', async ({ page }) => {
  await createKnownWords([
    { wordId: 'one-egy', germanWord: 'one', hungarianTranslation: 'egy' },
    { wordId: 'two-ketto', germanWord: 'two', hungarianTranslation: 'kettő' },
    { wordId: 'three-harom', germanWord: 'three', hungarianTranslation: 'három' },
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

test('skips duplicate words during import', async ({ page }) => {
  await createKnownWords([
    { wordId: 'existing-letezo', germanWord: 'existing', hungarianTranslation: 'létező' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('existing,létező\nnew1,új1\nnew2,új2');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toHaveLength(3);
});

test('import button is disabled when textarea is empty', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const importButton = page.getByRole('button', { name: 'Import' });
  await expect(importButton).toBeDisabled();

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('   ');
  await expect(importButton).toBeDisabled();

  await textarea.fill('word,szó');
  await expect(importButton).toBeEnabled();
});

test('clears textarea after successful import', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('test,teszt');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('1 new words imported')).toBeVisible();
  await expect(textarea).toHaveValue('');
});

test('settings navigation shows known words link', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Known Words' })).toBeVisible();
});

test('generates correct card ID from German and Hungarian', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('die Bank,a pad\ndie Bank,a bank');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toHaveLength(2);

  const wordIds = words.map(w => w.wordId).sort();
  expect(wordIds).toContain('bank-pad');
  expect(wordIds).toContain('bank-bank');
});
