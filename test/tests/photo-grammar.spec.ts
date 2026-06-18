import { test, expect } from '../fixtures';
import {
  createGrammarTopic,
  createRateLimitSetting,
  getModelUsageLogs,
  getPendingPhotos,
  menschenA1GrammarImage,
  setupDefaultChatModelSettings,
  setupDefaultImageModelSettings,
  withDbConnection,
} from '../utils';

const PHOTO_FILENAME = 'photo-grammar-lesson.png';

test('capture photo button is hidden on non-grammar sources', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Goethe A1' }).click();
  await page.getByRole('menuitem', { name: 'Pages' }).click();

  await expect(
    page.getByRole('button', { name: 'Capture photo for grammar cards' })
  ).not.toBeVisible();
});

test('capture photo button is visible on grammar IMAGES source and uploading produces a pending photo', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Grammar A1' }).click();
  await page.getByRole('menuitem', { name: 'Pages' }).click();

  const captureButton = page.getByRole('button', {
    name: 'Capture photo for grammar cards',
  });
  await expect(captureButton).toBeVisible();

  await page.getByLabel('Capture or upload grammar lesson photo').setInputFiles({
    name: PHOTO_FILENAME,
    mimeType: 'image/png',
    buffer: menschenA1GrammarImage,
  });

  await expect(
    page.getByText('Photo ready - open this source on your computer to create cards')
  ).toBeVisible();

  const stored = await getPendingPhotos('grammar-a1');
  expect(stored.length).toBe(1);
  expect(stored[0].contentType).toContain('image');
  expect(stored[0].imageDataLength).toBe(menschenA1GrammarImage.length);
});

test('pending photo banner consumes photo and creates grammar cards', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await createGrammarTopic({ name: 'Sein conjugation' });

  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Grammar A1' }).click();
  await page.getByRole('menuitem', { name: 'Pages' }).click();

  await page.getByLabel('Capture or upload grammar lesson photo').setInputFiles({
    name: PHOTO_FILENAME,
    mimeType: 'image/png',
    buffer: menschenA1GrammarImage,
  });

  await expect(
    page.getByRole('region', { name: 'Pending photo for grammar cards' })
  ).toBeVisible();

  await expect(
    page.getByAltText('Pending grammar lesson photo')
  ).toBeVisible();

  await page.getByRole('combobox', { name: 'How many cards?' }).click();
  await page.getByRole('option', { name: '5 cards', exact: true }).click();

  await page
    .getByRole('button', { name: 'Create grammar cards from this photo' })
    .click();

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  const topicDialog = page.getByRole('dialog', { name: 'Choose Grammar Topic' });
  await expect(topicDialog).toBeVisible();
  await topicDialog.getByLabel('Grammar topic').click();
  await page.getByRole('option', { name: 'Sein conjugation' }).click();
  await topicDialog.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Close' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  const cards = await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, data, source_id, source_page_number, state, readiness
       FROM learn_language.cards WHERE source_id = 'grammar-a1'`
    );
    return result.rows;
  });

  expect(cards.length).toBe(4);

  const cardsBySentence = new Map<string, (typeof cards)[number]>(
    cards.map((card) => [card.data.examples?.[0]?.de as string, card])
  );

  expect([...cardsBySentence.keys()].sort()).toEqual(
    [
      'Heute [bin] ich müde.',
      '[Der] Mann gibt [dem] Kind das Buch.',
      'Im Sommer [machte] sie oft Sport im Park.',
      'Der Hund läuft schnell durch den [Park].',
    ].sort()
  );

  expect(cardsBySentence.get('Heute [bin] ich müde.')?.data.hint).toBe('sein');
  expect(cardsBySentence.get('[Der] Mann gibt [dem] Kind das Buch.')?.data.hint).toBe('der / der');
  expect(cardsBySentence.get('Im Sommer [machte] sie oft Sport im Park.')?.data.hint).toBe('machen (3. Person Singular)');
  expect(cardsBySentence.get('Der Hund läuft schnell durch den [Park].')?.data.hint).toBeUndefined();

  for (const card of cards) {
    expect(card.data.grammarTopic).toBe('Sein conjugation');
    expect(card.readiness).toBe('IN_REVIEW');
    expect(card.data.extractionModel).toBe('gemini-3.1-pro-preview');
  }

  const stored = await getPendingPhotos('grammar-a1');
  expect(stored.length).toBe(0);

  await expect(
    page.getByRole('region', { name: 'Pending photo for grammar cards' })
  ).not.toBeVisible();

  const usageLogs = await getModelUsageLogs();
  const operationTypes = usageLogs.map((log) => log.operationType);
  expect(operationTypes).toContain('LESSON_DESCRIPTION');
  expect(operationTypes).toContain('CARD_GENERATION');

  const lessonLog = usageLogs.find(
    (log) => log.operationType === 'LESSON_DESCRIPTION'
  );
  const cardLog = usageLogs.find(
    (log) => log.operationType === 'CARD_GENERATION'
  );
  expect(lessonLog).toBeDefined();
  expect(cardLog).toBeDefined();
  expect(lessonLog!.operationId).toMatch(/:lesson-description$/);
  expect(cardLog!.operationId).toMatch(/:card-generation$/);
  expect(lessonLog!.operationId).not.toBe(cardLog!.operationId);
});

test('discarding the pending photo banner removes the photo and no cards are created', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });

  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Grammar A1' }).click();
  await page.getByRole('menuitem', { name: 'Pages' }).click();

  await page.getByLabel('Capture or upload grammar lesson photo').setInputFiles({
    name: PHOTO_FILENAME,
    mimeType: 'image/png',
    buffer: menschenA1GrammarImage,
  });

  await expect(
    page.getByRole('region', { name: 'Pending photo for grammar cards' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Discard pending photo' }).click();

  await expect(
    page.getByRole('region', { name: 'Pending photo for grammar cards' })
  ).not.toBeVisible();

  const stored = await getPendingPhotos('grammar-a1');
  expect(stored.length).toBe(0);

  const cards = await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id FROM learn_language.cards WHERE source_id = 'grammar-a1'`
    );
    return result.rows;
  });
  expect(cards.length).toBe(0);
});
