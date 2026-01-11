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

test('can import words from CSV textarea', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await expect(textarea).toBeVisible();

  await textarea.fill('Apfel, alma\nBanane, banán\nKirsche, cseresznye');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { german: 'Apfel', hungarian: 'alma' },
    { german: 'Banane', hungarian: 'banán' },
    { german: 'Kirsche', hungarian: 'cseresznye' },
  ]);
});

test('can import words with semicolon separator', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('Hund; kutya\nKatze; macska\nVogel; madár');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('3 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { german: 'Hund', hungarian: 'kutya' },
    { german: 'Katze', hungarian: 'macska' },
    { german: 'Vogel', hungarian: 'madár' },
  ]);
});

test('displays existing known words in a table', async ({ page }) => {
  await createKnownWords([
    { german: 'Haus', hungarian: 'ház' },
    { german: 'Welt', hungarian: 'világ' },
    { german: 'Test', hungarian: 'teszt' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(3\)/ })).toBeVisible();

  const table = page.getByRole('table', { name: 'Known words' });
  await expect(table).toBeVisible();

  await expect(table.getByRole('columnheader', { name: 'German' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Hungarian' })).toBeVisible();

  await expect(table.getByRole('cell', { name: 'Haus' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'ház' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Welt' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'világ' })).toBeVisible();
});

test('can delete individual words', async ({ page }) => {
  await createKnownWords([
    { german: 'Entfernen', hungarian: 'eltávolítani' },
    { german: 'Behalten', hungarian: 'megtartani' },
  ]);

  await page.goto('http://localhost:8180/settings/known-words');

  await expect(page.getByRole('heading', { name: /Known Words \(2\)/ })).toBeVisible();

  const removeRow = page.getByRole('row').filter({ hasText: 'Entfernen' });
  await removeRow.getByRole('button', { name: 'Remove word' }).click();

  await expect(page.getByRole('heading', { name: /Known Words \(1\)/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Entfernen' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'Behalten' })).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([{ german: 'Behalten', hungarian: 'megtartani' }]);
});

test('can clear all words', async ({ page }) => {
  await createKnownWords([
    { german: 'Eins', hungarian: 'egy' },
    { german: 'Zwei', hungarian: 'kettő' },
    { german: 'Drei', hungarian: 'három' },
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
  await createKnownWords([{ german: 'Existierend', hungarian: 'létező' }]);

  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('Existierend, létező\nNeu1, új1\nNeu2, új2');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { german: 'Existierend', hungarian: 'létező' },
    { german: 'Neu1', hungarian: 'új1' },
    { german: 'Neu2', hungarian: 'új2' },
  ]);
});

test('import button is disabled when textarea is empty', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const importButton = page.getByRole('button', { name: 'Import' });
  await expect(importButton).toBeDisabled();

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('   ');
  await expect(importButton).toBeDisabled();

  await textarea.fill('Wort, szó');
  await expect(importButton).toBeEnabled();
});

test('clears textarea after successful import', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('Test, teszt');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('1 new words imported')).toBeVisible();
  await expect(textarea).toHaveValue('');
});

test('settings navigation shows known words link', async ({ page }) => {
  await page.goto('http://localhost:8180/settings');
  await expect(page.getByRole('navigation', { name: 'Settings navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Known Words' })).toBeVisible();
});

test('handles words with same German but different Hungarian translations', async ({ page }) => {
  await page.goto('http://localhost:8180/settings/known-words');

  const textarea = page.getByRole('textbox', { name: 'Words to import' });
  await textarea.fill('die Bank, pad\ndie Bank, bank');
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByText('2 new words imported')).toBeVisible();

  const words = await getKnownWords();
  expect(words).toEqual([
    { german: 'die Bank', hungarian: 'bank' },
    { german: 'die Bank', hungarian: 'pad' },
  ]);
});
