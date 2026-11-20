import { test, expect } from '../fixtures';
import { createCard, getCardFromDb, getReviewLogsByCardId } from '../utils';

test('source preview setting persists and introduces only the limited new-card queue before studying', async ({ page }) => {
  await Promise.all([
    createCard({ cardId: 'intro-new', sourceId: 'goethe-a1', data: { word: 'lernen', translation: { hu: 'tanulni', en: 'learn' } }, due: new Date('2020-01-01') }),
    createCard({ cardId: 'intro-limited', sourceId: 'goethe-a1', data: { word: 'Excluded new word' }, due: new Date('2020-01-02') }),
    createCard({ cardId: 'intro-review', sourceId: 'goethe-a1', state: 'REVIEW', data: { word: 'Review word', translation: { hu: 'ismétlés' } } }),
  ]);
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Goethe A1' }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'New card introduction' })).toHaveText('Start studying immediately');
  await page.getByRole('combobox', { name: 'New card introduction' }).click();
  await page.getByRole('option', { name: 'Preview new cards in a table' }).click();
  await page.getByRole('spinbutton', { name: 'New Card Limit', exact: true }).fill('1');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Actions for Goethe A1' }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'New card introduction' })).toHaveText('Preview new cards in a table');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  const table = page.getByRole('table', { name: "Today's new cards (1)", exact: true });
  await expect(table.getByRole('cell', { name: 'lernen', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'tanulni learn' })).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('article', { name: 'Flashcard' })).not.toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Study Pomodoro' })).not.toBeVisible();
  await page.keyboard.press('l');
  await page.keyboard.press('k');
  expect(await getReviewLogsByCardId('intro-new')).toHaveLength(0);
  expect((await getCardFromDb('intro-new')).state).toBe('NEW');
  await page.getByRole('button', { name: 'Continue to study' }).click();
  await expect(page.getByRole('article', { name: 'Flashcard' })).toBeVisible();
  await expect(table).not.toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Study Pomodoro' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue study session' }).click();
  await expect(table).toBeVisible();
});

test('default introduction starts studying directly', async ({ page }) => {
  await createCard({ cardId: 'direct-new', sourceId: 'goethe-a1', data: { word: 'lernen', translation: { hu: 'tanulni' } } });
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('article', { name: 'Flashcard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meet your new cards' })).not.toBeVisible();
});

test('preview supports every card type and skips sessions without new cards', async ({ page, request, apiHeaders }) => {
  const update = await request.put('/api/source/goethe-a1', { headers: apiHeaders, data: { newCardIntroduction: 'TABLE' } });
  expect(update.ok()).toBe(true);
  await Promise.all([
    createCard({ cardId: 'intro-speech', sourceId: 'goethe-a1', cardType: 'SPEECH', data: { examples: [{ de: 'Guten Tag.', hu: 'Jó napot.' }] } }),
    createCard({ cardId: 'intro-grammar', sourceId: 'goethe-a1', cardType: 'GRAMMAR', data: { examples: [{ de: 'Ich bin gegangen.', hu: 'Elmentem.' }] } }),
    createCard({ cardId: 'intro-simple', sourceId: 'goethe-a1', cardType: 'SIMPLE', data: { frontText: 'Question', backText: 'Answer' } }),
  ]);
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('row', { name: 'Guten Tag. Jó napot.' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Ich bin gegangen. Elmentem.' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Question Answer' })).toBeVisible();
  const otherUpdate = await request.put('/api/source/goethe-a2', { headers: apiHeaders, data: { newCardIntroduction: 'TABLE' } });
  expect(otherUpdate.ok()).toBe(true);
  await createCard({ cardId: 'only-review', sourceId: 'goethe-a2', state: 'REVIEW', data: { word: 'lernen', translation: { hu: 'tanulni' } } });
  await page.goto('/sources/goethe-a2/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('article', { name: 'Flashcard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meet your new cards' })).not.toBeVisible();
});
