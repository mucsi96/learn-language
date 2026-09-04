import { test, expect } from '../fixtures';
import { createDayGoalSetting, createReviewCard, getDayGoalSettings } from '../utils';

test('navigates to day goals settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('link', { name: 'Day Goals' }).click();

  await expect(page.getByRole('heading', { name: 'Day Goals' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Bronze goal' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Silver goal' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Gold goal' })).toBeVisible();
});

test('displays default day goal requirements', async ({ page }) => {
  await page.goto('/settings/day-goals');

  await expect(page.getByRole('spinbutton', { name: 'Bronze required completed cards percent' })).toHaveValue('50');
  await expect(page.getByRole('spinbutton', { name: 'Bronze required accuracy percent' })).toHaveValue('0');
  await expect(page.getByRole('spinbutton', { name: 'Silver required completed cards percent' })).toHaveValue('75');
  await expect(page.getByRole('spinbutton', { name: 'Silver required accuracy percent' })).toHaveValue('0');
  await expect(page.getByRole('spinbutton', { name: 'Gold required completed cards percent' })).toHaveValue('100');
  await expect(page.getByRole('spinbutton', { name: 'Gold required accuracy percent' })).toHaveValue('0');
});

test('displays day goal requirements from database', async ({ page }) => {
  await createDayGoalSetting({ tier: 'GOLD', requiredCompletionPercent: 90, requiredAccuracyPercent: 80 });

  await page.goto('/settings/day-goals');

  await expect(page.getByRole('spinbutton', { name: 'Gold required completed cards percent' })).toHaveValue('90');
  await expect(page.getByRole('spinbutton', { name: 'Gold required accuracy percent' })).toHaveValue('80');
  await expect(page.getByRole('spinbutton', { name: 'Silver required completed cards percent' })).toHaveValue('75');
});

test('can update day goal requirements', async ({ page }) => {
  await page.goto('/settings/day-goals');

  const completionInput = page.getByRole('spinbutton', { name: 'Silver required completed cards percent' });
  await completionInput.fill('60');
  await completionInput.dispatchEvent('change');

  await expect(async () => {
    const silver = (await getDayGoalSettings()).find((setting) => setting.tier === 'SILVER');
    expect(silver).toEqual({ tier: 'SILVER', requiredCompletionPercent: 60, requiredAccuracyPercent: 0 });
  }).toPass();

  const accuracyInput = page.getByRole('spinbutton', { name: 'Silver required accuracy percent' });
  await accuracyInput.fill('70');
  await accuracyInput.dispatchEvent('change');

  await expect(async () => {
    const silver = (await getDayGoalSettings()).find((setting) => setting.tier === 'SILVER');
    expect(silver).toEqual({ tier: 'SILVER', requiredCompletionPercent: 60, requiredAccuracyPercent: 70 });
  }).toPass();
});

test('does not save day goal requirements above 100 percent', async ({ page }) => {
  await page.goto('/settings/day-goals');

  const completionInput = page.getByRole('spinbutton', { name: 'Gold required completed cards percent' });
  await completionInput.fill('150');
  await completionInput.dispatchEvent('change');

  await page.reload();

  await expect(page.getByRole('spinbutton', { name: 'Gold required completed cards percent' })).toHaveValue('100');
  expect(await getDayGoalSettings()).toEqual([]);
});

test('study page shows a goal as achieved once the configured share of cards is done', async ({ page }) => {
  await createDayGoalSetting({ tier: 'GOLD', requiredCompletionPercent: 50, requiredAccuracyPercent: 0 });
  await createReviewCard({
    cardId: 'day-goal-ziel',
    sourceId: 'goethe-a1',
    sourcePageNumber: 91,
    data: {
      word: 'Ziel',
      type: 'NOUN',
      gender: 'NEUTER',
      translation: { en: 'goal', hu: 'cél', ch: 'Ziel' },
    },
  });
  await createReviewCard({
    cardId: 'day-goal-medaille',
    sourceId: 'goethe-a1',
    sourcePageNumber: 92,
    data: {
      word: 'Medaille',
      type: 'NOUN',
      gender: 'FEMININE',
      translation: { en: 'medal', hu: 'érem', ch: 'Medaille' },
    },
  });

  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const dayGoal = page.getByRole('group', { name: 'Day goal' });
  await expect(dayGoal.getByRole('listitem', { name: 'Gold goal: not achieved' })).toBeVisible();
  await expect(dayGoal).toContainText('Gold 50% cards');

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByRole('heading', { name: 'cél' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(dayGoal.getByRole('listitem', { name: 'Gold goal: achieved' })).toBeVisible();
  await expect(dayGoal).toContainText('Gold goal achieved');
  await expect(dayGoal).toContainText('1 of 2 cards done');
});

test('accuracy requirement withholds a goal on the celebration page', async ({ page }) => {
  await createDayGoalSetting({ tier: 'GOLD', requiredCompletionPercent: 100, requiredAccuracyPercent: 100 });
  await createReviewCard({
    cardId: 'day-goal-erfolg',
    sourceId: 'goethe-a1',
    sourcePageNumber: 93,
    data: {
      word: 'Erfolg',
      type: 'NOUN',
      gender: 'MASCULINE',
      translation: { en: 'success', hu: 'siker', ch: 'Erfolg' },
    },
  });
  await createReviewCard({
    cardId: 'day-goal-fehler',
    sourceId: 'goethe-a1',
    sourcePageNumber: 94,
    data: {
      word: 'Fehler',
      type: 'NOUN',
      gender: 'MASCULINE',
      translation: { en: 'mistake', hu: 'hiba', ch: 'Fähler' },
    },
  });

  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByRole('heading', { name: 'siker' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await flashcard.getByRole('heading', { name: 'hiba' }).click();
  await page.getByRole('button', { name: 'Incorrect' }).click();

  await flashcard.getByRole('heading', { name: 'hiba' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  const dayGoal = page.getByRole('group', { name: 'Day goal' });
  await expect(dayGoal).toContainText('Silver goal achieved');
  await expect(dayGoal).toContainText('2 of 2 cards done · 50% accuracy');
  await expect(dayGoal.getByRole('listitem', { name: 'Gold goal: not achieved' })).toBeVisible();
  await expect(dayGoal).toContainText('Gold 100% cards · 100% accuracy');
});
