import { test, expect } from '../fixtures';
import { createGrammarTopic, getGrammarTopics } from '../utils';

test('grammar topics settings page displays empty state', async ({ page }) => {
  await page.goto('/settings/grammar-topics');

  await expect(page.getByRole('heading', { name: 'Grammar Topics' })).toBeVisible();
  await expect(page.getByText('No grammar topics yet')).toBeVisible();
});

test('can add a grammar topic', async ({ page }) => {
  await page.goto('/settings/grammar-topics');

  await page.getByLabel('Topic name').fill('Akkusativ');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('Akkusativ')).toBeVisible();

  const topics = await getGrammarTopics();
  expect(topics.length).toBe(1);
  expect(topics[0].name).toBe('Akkusativ');
});

test('can add multiple grammar topics', async ({ page }) => {
  await page.goto('/settings/grammar-topics');

  await page.getByLabel('Topic name').fill('Akkusativ');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Akkusativ')).toBeVisible();

  await page.getByLabel('Topic name').fill('Dativ');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Dativ')).toBeVisible();

  const topics = await getGrammarTopics();
  expect(topics.length).toBe(2);
});

test('can edit a grammar topic', async ({ page }) => {
  await createGrammarTopic({ name: 'Akkusativ' });

  await page.goto('/settings/grammar-topics');

  await expect(page.getByText('Akkusativ')).toBeVisible();

  await page.getByRole('button', { name: 'Edit Akkusativ' }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit Grammar Topic' });
  await dialog.getByRole('textbox', { name: 'Topic name' }).fill('Dativ');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Dativ')).toBeVisible();
  await expect(page.getByText('Akkusativ')).not.toBeVisible();

  const topics = await getGrammarTopics();
  expect(topics.length).toBe(1);
  expect(topics[0].name).toBe('Dativ');
});

test('can delete a grammar topic', async ({ page }) => {
  await createGrammarTopic({ name: 'Akkusativ' });

  await page.goto('/settings/grammar-topics');

  await expect(page.getByText('Akkusativ')).toBeVisible();

  await page.getByRole('button', { name: 'Delete Akkusativ' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('No grammar topics yet')).toBeVisible();
  await expect(page.getByText('Akkusativ')).not.toBeVisible();

  const topics = await getGrammarTopics();
  expect(topics.length).toBe(0);
});
