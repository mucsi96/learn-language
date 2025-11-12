import { test, expect } from '../fixtures';
import { createCard, createCardsWithStates } from '../utils';
import { v4 as uuidv4 } from 'uuid';

test('displays welcome message', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await expect(
    page.getByRole('heading', { name: 'Welcome to Learn Language', exact: true })
  ).toBeVisible();
});

test('displays source list', async ({ page }) => {
  await page.goto('http://localhost:8180');
  await expect(
    page.getByRole('heading', { name: 'Goethe A1', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Goethe A2', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Goethe B1', exact: true })
  ).toBeVisible();
});

test('due cards count by state', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const tomorrow = new Date(now.getTime() + 86400000);

  const cardsToCreate = [
    { state: 'NEW', count: 2, due_date: yesterday },
    { state: 'REVIEW', count: 2, due_date: yesterday },
    { state: 'LEARNING', count: 1, due_date: tomorrow },
    { state: 'RELEARNING', count: 1, due_date: tomorrow },
  ];

  await createCardsWithStates('goethe-a1', cardsToCreate);

  await page.goto('http://localhost:8180');
  await expect(page.getByTitle('New', { exact: true })).toContainText('2');
  await expect(page.getByTitle('Learning', { exact: true })).not.toBeVisible();
  await expect(page.getByTitle('Review', { exact: true })).toContainText('2');
  await expect(page.getByTitle('Relearning', { exact: true })).not.toBeVisible();
});

test('due cards limited to max 50', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  const cardsToCreate = [{ state: 'NEW', count: 60, due_date: yesterday }];

  await createCardsWithStates('goethe-a1', cardsToCreate);

  await page.goto('http://localhost:8180');
  await expect(page.getByTitle('New', { exact: true })).toContainText('50');
});

test('due cards limited to max 50 mixed states', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  const cardsToCreate = [
    { state: 'NEW', count: 20, due_date: yesterday },
    { state: 'LEARNING', count: 15, due_date: yesterday },
    { state: 'REVIEW', count: 10, due_date: yesterday },
    { state: 'RELEARNING', count: 25, due_date: yesterday },
  ];

  await createCardsWithStates('goethe-a1', cardsToCreate);

  await page.goto('http://localhost:8180');
  await expect(page.getByTitle('New', { exact: true })).toContainText('20');
  await expect(page.getByTitle('Learning', { exact: true })).toContainText('15');
  await expect(page.getByTitle('Review', { exact: true })).toContainText('10');
  await expect(page.getByTitle('Relearning', { exact: true })).toContainText('5');
});

test('in review cards not on home page', async ({ page }) => {
  await createCard({
    cardId: uuidv4(),
    sourceId: 'goethe-a1',
    data: { word: 'test', type: 'NOUN', translation: { en: 'test', hu: 'teszt', ch: 'test' } },
    readiness: 'IN_REVIEW',
  });

  await createCard({
    cardId: uuidv4(),
    sourceId: 'goethe-a1',
    data: { word: 'test2', type: 'NOUN', translation: { en: 'test2', hu: 'teszt2', ch: 'test2' } },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180');
  await expect(page.getByTitle('New', { exact: true })).toContainText('1');
});
