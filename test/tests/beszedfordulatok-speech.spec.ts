import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '../fixtures';
import { createCard, createReviewLog, createSource, createStudySession, withDbConnection } from '../utils';

const migration = readFileSync(resolve(__dirname,
  '../../server/src/main/resources/db/changelog/beszedfordulatok-speech.sql'), 'utf8');
const migrate = () => withDbConnection(client => client.query(migration));
const snapshot = async () => Object.fromEntries(
  await Promise.all(['sources', 'cards', 'review_logs', 'study_sessions', 'study_session_cards'].map(async table => [
    table, await withDbConnection(async client => (await client.query(`SELECT * FROM learn_language.${table} ORDER BY id`)).rows),
  ] as const))
);
const createDeck = () => createSource({
  id: 'beszedfordulatok', name: 'Beszédfordulatok', languageLevel: 'A2', cardTypes: ['SIMPLE'], sourceType: 'JSON',
});

test('converts phrases to studyable speech while preserving content, scheduling and history', async ({ page }) => {
  await createDeck();
  const data = {
    frontText: '**Mondd németül:**\n\nAttól függ.\n\n**Példa:** Az időjárástól függ.',
    backText: '**Das kommt darauf an.**\n\nDas kommt auf das Wetter an.\n\nKötetlen forma.',
    topic: 'Beszélgetés', category: 'Német beszédfordulatok',
    audio: [{ id: 'phrase-audio', text: 'Das kommt darauf an.', language: 'de' }],
  };
  await createCard({ cardId: 'phrase', sourceId: 'beszedfordulatok', cardType: 'SIMPLE', data,
    state: 'REVIEW', stability: 18, difficulty: 4, reps: 7, lapses: 1,
    elapsedDays: 8, scheduledDays: 12, lastReview: new Date('2026-10-01T12:00:00Z'), flagged: true });
  const draftData = { frontText: '**Mondd németül:**\n\nJó napot!\n\n**Példa:** Jó napot! Szabad itt?',
    backText: '**Guten Tag!**\n\nGuten Tag! Ist hier frei?' };
  await createCard({ cardId: 'draft', sourceId: 'beszedfordulatok', cardType: 'SIMPLE', readiness: 'DRAFT',
    data: draftData });
  await createCard({ cardId: 'existing-speech', sourceId: 'beszedfordulatok', cardType: 'SPEECH',
    data: { examples: [{ de: 'Hallo!', hu: 'Szia!', isSelected: true }] } });
  await createSource({ id: 'other', name: 'beszedfordulatok', languageLevel: 'A1', cardTypes: ['VOCABULARY'] });
  await createCard({ cardId: 'other-card', sourceId: 'other', data });
  await createReviewLog({ cardId: 'phrase', rating: 3, state: 'REVIEW', stability: 18 });
  await createStudySession({ sourceId: 'beszedfordulatok', cardIds: ['phrase'] });
  const before = await snapshot();
  await migrate();
  const after = await snapshot();
  expect(after).toEqual({
    ...before,
    sources: before.sources.map(source => source.id === 'beszedfordulatok'
      ? { ...source, card_types: 'SPEECH' } : source),
    cards: before.cards.map(card => card.id === 'phrase' ? {
      ...card, type: 'SPEECH', data: { ...data, examples: [
        { de: 'Das kommt auf das Wetter an.', hu: 'Az időjárástól függ.', isSelected: true },
      ] },
    } : card.id === 'draft' ? { ...card, type: 'SPEECH',
      data: { ...draftData, examples: [{ de: 'Guten Tag! Ist hier frei?', hu: 'Jó napot! Szabad itt?', isSelected: true }] } } : card),
  });
  expect(await withDbConnection(async client => (await client.query(
    "SELECT type FROM learn_language.card_view WHERE id = 'phrase'"
  )).rows)).toEqual([{ type: 'SPEECH' }]);
  await migrate();
  expect(await snapshot()).toEqual(after);

  await page.goto('/sources/beszedfordulatok/study');
  await page.getByRole('button', { name: 'Continue study session', exact: true }).click();
  const card = page.getByRole('article', { name: 'Flashcard' });
  await expect(card.getByText('Az időjárástól függ.', { exact: true })).toBeVisible();
  await card.getByText('Az időjárástól függ.', { exact: true }).click();
  await expect(card.getByText('Das kommt auf das Wetter an.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect.poll(async () => (await snapshot()).review_logs.length).toBe(2);
});

test('does not change other decks when the target source is absent', async ({ page }) => {
  await createCard({ cardId: 'untouched', sourceId: 'goethe-a1', data: { word: 'Haus' } });
  const before = await snapshot();
  await migrate();
  expect(await snapshot()).toEqual(before);
});

[
  { label: 'unsupported card type', cardType: 'VOCABULARY', data: { word: 'Hallo!' } },
  { label: 'missing example', cardType: 'SIMPLE', data: { frontText: 'Front', backText: 'Back' } },
].forEach(({ label, cardType, data }) => {
  test(`rejects ${label} atomically`, async ({ page }) => {
    await createDeck();
    await createCard({ cardId: 'valid', sourceId: 'beszedfordulatok', cardType: 'SIMPLE', data: {
      frontText: '**Mondd németül:**\n\nSzia!\n\n**Példa:** Szia Anna!',
      backText: '**Hallo!**\n\nHallo Anna!',
    } });
    await createCard({ cardId: 'invalid', sourceId: 'beszedfordulatok', cardType, data });
    const before = await snapshot();
    await expect(migrate()).rejects.toThrow('Cannot convert beszedfordulatok');
    expect(await snapshot()).toEqual(before);
  });
});
