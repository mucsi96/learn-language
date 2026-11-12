import { expect, test } from '../fixtures';
import { createCard, createLearningPartner, createSource, getStudySessionCardsBySource } from '../utils';

(['solo', 'partner'] as const).forEach(mode => {
  test(`study dots follow the ${mode} queue through grading, skipping and resume`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mode === 'partner' ? 'reduce' : 'no-preference' });
    const partnerId = mode === 'partner' ? await createLearningPartner({ name: 'Dot partner' }) : null;
    await createSource({
      id: 'dot-queue', name: 'Dot queue', languageLevel: 'A1', cardTypes: ['VOCABULARY'],
      cardLimit: 3, learningPartnerId: partnerId,
    });
    await Promise.all(Array.from({ length: 4 }, (_, index) => createCard({
      cardId: `dot-${index}`, sourceId: 'dot-queue', state: 'REVIEW',
      due: new Date(Date.now() - (4 - index) * 86400000),
      stability: 10, difficulty: 5, reps: 3,
      lastReview: new Date(Date.now() - 5 * 86400000),
      data: { word: `Wort ${index}`, type: 'NOUN', translation: { hu: `Szó ${index}` } },
    })));

    await page.goto('/sources/dot-queue/study');
    await page.getByRole('button', { name: 'Start study session' }).click();
    const queue = page.getByRole('list', { name: 'Study queue' });
    const dots = queue.getByRole('listitem');
    await expect(dots).toHaveCount(3);
    const initial = (await getStudySessionCardsBySource('dot-queue')).map(card => card.cardId);
    const dotIds = () => dots.evaluateAll(elements => elements.map(element => element.getAttribute('data-card-id')));
    await expect.poll(dotIds).toEqual(initial);
    await expect(dots.first()).toHaveAttribute('aria-current', 'step');
    await expect(dots.nth(1)).not.toHaveAttribute('aria-current');
    await expect(dots.first().getByRole('img')).toHaveCSS('scale', '1.5');
    await expect(dots.nth(1).getByRole('img')).toHaveCSS('scale', 'none');
    const flashcard = page.getByRole('article', { name: 'Flashcard' });
    await expect(flashcard.getByLabel(/^State:/)).toHaveCount(0);
    const retainedDot = await dots.first().elementHandle();

    await page.keyboard.press('h');
    await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
    await expect.poll(dotIds).toEqual([initial[1], initial[2], initial[0]]);
    await expect(dots.last().getByRole('img', { name: 'State: Relearning', exact: true })).toBeVisible();
    expect(await retainedDot!.evaluate(element => element.isConnected)).toBe(true);
    await expect(dots.first()).toHaveAttribute('aria-current', 'step');
    await expect(dots.last()).not.toHaveAttribute('aria-current');
    await expect(dots.first()).toHaveCSS('transition-duration', mode === 'partner' ? '0s' : '0.45s');

    await page.keyboard.press('h');
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
    await expect.poll(dotIds).toEqual([initial[2], initial[0]]);
    await expect(dots.first()).toHaveAttribute('aria-current', 'step');

    await page.keyboard.press('h');
    await page.getByRole('button', { name: 'Card actions' }).click();
    await page.getByRole('menuitem', { name: 'Skip Card' }).click();
    await expect.poll(dotIds).toEqual([initial[0], initial[2]]);
    await expect(dots.first().getByRole('img', { name: 'State: Relearning', exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Continue study session' }).click();
    await expect.poll(dotIds).toEqual([initial[0], initial[2]]);
    await expect(dots.first()).toHaveAttribute('aria-current', 'step');
    await retainedDot!.dispose();
  });
});
