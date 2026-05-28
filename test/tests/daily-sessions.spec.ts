import { test, expect } from '../fixtures';
import {
  createCard,
  createStudySession,
  getStudySessionCardsBySource,
} from '../utils';

test('navigates to daily sessions settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Daily Sessions' })).toBeVisible();
  await page.getByRole('link', { name: 'Daily Sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Daily Sessions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cleanup daily sessions' })).toBeVisible();
});

test('cleanup daily sessions button removes all study sessions', async ({ page }) => {
  await createCard({
    cardId: 'haus-haz',
    sourceId: 'goethe-a1',
    sourcePageNumber: 5,
    data: {
      word: 'Haus',
      type: 'NOUN',
      translation: { en: 'house', hu: 'ház', ch: 'Huus' },
    },
  });
  await createStudySession({
    sourceId: 'goethe-a1',
    cardIds: ['haus-haz'],
  });

  expect((await getStudySessionCardsBySource('goethe-a1')).length).toBe(1);

  await page.goto('/settings/daily-sessions');
  await page.getByRole('button', { name: 'Cleanup daily sessions' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Delete all daily study sessions?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByRole('dialog')).not.toBeVisible();

  expect(await getStudySessionCardsBySource('goethe-a1')).toEqual([]);
});

test('cancelling the confirmation dialog keeps sessions intact', async ({ page }) => {
  await createCard({
    cardId: 'baum-fa',
    sourceId: 'goethe-a1',
    sourcePageNumber: 5,
    data: {
      word: 'Baum',
      type: 'NOUN',
      translation: { en: 'tree', hu: 'fa', ch: 'Baum' },
    },
  });
  await createStudySession({
    sourceId: 'goethe-a1',
    cardIds: ['baum-fa'],
  });

  await page.goto('/settings/daily-sessions');
  await page.getByRole('button', { name: 'Cleanup daily sessions' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'No' }).click();

  await expect(page.getByRole('dialog')).not.toBeVisible();

  expect((await getStudySessionCardsBySource('goethe-a1')).length).toBe(1);
});
