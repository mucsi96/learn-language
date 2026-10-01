import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test, expect } from '../fixtures';
import { createCard, createChatModelSetting, withDbConnection } from '../utils';

const podman = promisify(execFile);
const stats = async () => (await fetch('http://localhost:3070/content-fixtures/stats')).json();
const cards = () => withDbConnection(async db =>
  (await db.query('SELECT * FROM learn_language.cards ORDER BY id')).rows);
const pending = () => withDbConnection(async db =>
  (await db.query('SELECT * FROM learn_language.adjective_forms_backfill ORDER BY card_id')).rows);
const configureModel = () => createChatModelSetting({
  modelName: 'gpt-5.5', operationType: 'CLASSIFICATION', isEnabled: true, isPrimary: true,
});

test('upgrade backfills every saved adjective and preserves card data and completed work across restarts', async ({ page }) => {
  test.setTimeout(120000);
  await configureModel();
  const examples = [
    { word: 'schnell', forms: [], expected: ['schneller', 'am schnellsten'] },
    { word: 'groß', forms: null, expected: ['größer', 'am größten'] },
    { word: 'gut', forms: ['besser', 'custom form'], expected: ['besser', 'am besten', 'custom form'] },
    { word: 'hoch', expected: ['höher', 'am höchsten'] },
    { word: 'schwanger', forms: [], expected: [] },
  ];
  await Promise.all(examples.map(({ word, forms }) => createCard({
    cardId: word, sourceId: 'goethe-a1', readiness: word === 'hoch' ? 'DRAFT' : 'READY',
    state: 'REVIEW', reps: 12, lapses: 2, stability: 42, flagged: true,
    data: { word, type: 'ADJECTIVE', ...(forms != null ? { forms } : {}),
      translation: { hu: `translation-${word}` }, examples: [{ de: `Das ist ${word}.` }],
      audio: [{ id: 'existing-audio', language: 'de', selected: true }], hint: 'preserve me' },
  })));
  await withDbConnection(db => db.query("UPDATE learn_language.cards SET data = jsonb_set(data, '{forms}', 'null') WHERE id = 'groß'"));
  await createCard({ cardId: 'noun', sourceId: 'goethe-a1', data: { word: 'Haus', type: 'NOUN', forms: ['die Häuser'] } });
  await createCard({ cardId: 'grammar', sourceId: 'goethe-a1', cardType: 'GRAMMAR', data: { word: 'gut', type: 'ADJECTIVE' } });
  const before = await cards();
  await podman('podman', ['stop', 'learn-language-test-server']);
  try {
    await withDbConnection(async db => {
      await db.query('DROP TABLE learn_language.adjective_forms_backfill');
      await db.query("DELETE FROM learn_language.databasechangelog WHERE id = '61-backfill-adjective-degrees'");
    });
  } finally {
    await podman('podman', ['start', 'learn-language-test-server']);
  }
  await expect.poll(async () => (await page.request.get('/api/environment')).status(), { timeout: 90000 }).toBe(200);
  await expect.poll(pending, { timeout: 30000 }).toEqual([]);
  expect(await cards()).toEqual(before.map(card => {
    const example = examples.find(item => item.word === card.id);
    return example ? { ...card, data: { ...card.data, forms: example.expected } } : card;
  }));
  expect((await stats()).adjectiveInputs).toEqual(expect.arrayContaining(examples.map(item => item.word)));
  expect((await stats()).adjectiveInputs).toHaveLength(examples.length);
  expect((await stats()).adjectivePrompts.every((prompt: string) =>
    prompt.includes('Komparativ and Superlativ') && prompt.includes('non-gradable'))).toBe(true);

  await podman('podman', ['restart', 'learn-language-test-server']);
  await expect.poll(async () => (await page.request.get('/api/environment')).status(), { timeout: 90000 }).toBe(200);
  expect(await pending()).toEqual([]);
  expect((await stats()).adjectiveInputs).toHaveLength(examples.length);
  await page.goto('/sources/goethe-a1/page/1/cards/gut');
  await expect(page.getByLabel('Form', { exact: true }).nth(0)).toHaveValue('besser');
  await expect(page.getByLabel('Form', { exact: true }).nth(1)).toHaveValue('am besten');
  await expect(page.getByLabel('Form', { exact: true }).nth(2)).toHaveValue('custom form');
});

test('invalid degree responses preserve forms and retry successfully after restart', async ({ page }) => {
  test.setTimeout(120000);
  await configureModel();
  await createCard({ cardId: 'gut', sourceId: 'goethe-a1', data: { word: 'gut', type: 'ADJECTIVE', forms: ['besser'] } });
  const before = await cards();
  await fetch('http://localhost:3070/content-fixtures/invalid-degrees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: true }),
  });
  await withDbConnection(db => db.query("INSERT INTO learn_language.adjective_forms_backfill (card_id) VALUES ('gut')"));
  await expect.poll(async () => (await pending())[0]?.last_error).toContain('Invalid adjective degrees');
  expect(await cards()).toEqual(before);
  await podman('podman', ['restart', 'learn-language-test-server']);
  await expect.poll(async () => (await page.request.get('/api/environment')).status(), { timeout: 90000 }).toBe(200);
  expect(await pending()).toHaveLength(1);
  expect((await stats()).adjectiveInputs).toEqual(['gut']);
  await fetch('http://localhost:3070/content-fixtures/invalid-degrees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: false }),
  });
  await withDbConnection(db => db.query('UPDATE learn_language.adjective_forms_backfill SET next_attempt_at = now()'));
  await expect.poll(pending).toEqual([]);
  expect((await cards())[0].data.forms).toEqual(['besser', 'am besten']);
});

test('backfill retries against concurrent word and form edits instead of overwriting them', async ({ page }) => {
  await page.goto('/');
  await configureModel();
  await createCard({ cardId: 'edited', sourceId: 'goethe-a1', data: { word: 'hoch', type: 'ADJECTIVE', forms: [] } });
  await fetch('http://localhost:3070/content-fixtures/delay-degrees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ milliseconds: 2000 }),
  });
  await withDbConnection(db => db.query("INSERT INTO learn_language.adjective_forms_backfill (card_id) VALUES ('edited')"));
  await expect.poll(async () => (await stats()).adjectiveInputs).toEqual(['hoch']);
  await withDbConnection(async db => {
    await db.query(`UPDATE learn_language.cards SET data = data || '{"word":"gut","forms":["hand-edited"]}'::jsonb
      WHERE id = 'edited'`);
    await db.query('UPDATE learn_language.adjective_forms_backfill SET next_attempt_at = now()');
  });
  await expect.poll(pending, { timeout: 15000 }).toEqual([]);
  expect((await stats()).adjectiveInputs).toEqual(['hoch', 'gut']);
  expect((await cards())[0].data).toEqual({ word: 'gut', type: 'ADJECTIVE', forms: ['besser', 'am besten', 'hand-edited'] });
});
