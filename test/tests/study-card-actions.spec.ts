import { test, expect } from '../fixtures';
import { createCard, createChatModelSetting, getReviewLogsByCardId } from '../utils';

test('study actions preserve the active answer and chat sends its conversation history', async ({ page }) => {
  await createChatModelSetting({ modelName: 'gemini-3.1-pro-preview', operationType: 'EXPLANATION', isPrimary: true });
  await createCard({
    cardId: 'study-actions', sourceId: 'goethe-a1', sourcePageNumber: 1,
    data: { word: 'lernen', type: 'VERB', translation: { hu: 'tanulni', en: 'learn' } },
  });
  await page.route('**/api/card/study-actions/explain?*', route => route.fulfill({
    json: { answer: 'Das Verb **lernen** bedeutet tanulni.' },
  }));
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session', exact: true }).click();
  await page.getByRole('article', { name: 'Flashcard' }).getByRole('heading', { name: 'tanulni' }).click();
  await page.getByRole('button', { name: 'Card actions', exact: true }).click();
  await page.keyboard.press('k');
  expect(await getReviewLogsByCardId('study-actions')).toHaveLength(0);
  await page.getByRole('menuitem', { name: 'Ask AI', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Ask a question' }).fill('Explain this verb');
  await dialog.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(dialog.getByRole('log', { name: 'Conversation' })).toContainText('Das Verb lernen');
  await dialog.getByRole('textbox', { name: 'Ask a question' }).fill('Give another example');
  const nextRequest = page.waitForRequest('**/api/card/study-actions/explain?*');
  await dialog.getByRole('button', { name: 'Send', exact: true }).click();
  expect((await nextRequest).postDataJSON().messages).toEqual([
    { role: 'user', content: 'Explain this verb' },
    { role: 'assistant', content: 'Das Verb **lernen** bedeutet tanulni.' },
    { role: 'user', content: 'Give another example' },
  ]);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeVisible();
  expect(await getReviewLogsByCardId('study-actions')).toHaveLength(0);
});
