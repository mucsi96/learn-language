import { test, expect } from '../fixtures';
import {
  createCard,
  withDbConnection,
  menschenA1Image,
  setupDefaultChatModelSettings,
  uploadMockImage,
  yellowImage,
} from '../utils';

test('bulk grammar card creation extracts sentences with gaps', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Grammar A1' }).click();

  await page.getByLabel('Upload image').setInputFiles({
    name: 'test-grammar-image.png',
    mimeType: 'image/png',
    buffer: menschenA1Image,
  });

  const pageContent = page.getByRole('region', { name: 'Page content' });
  await expect(pageContent).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const box = await pageContent.boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width * 0.155, box.y + box.height * 0.696);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.434, box.y + box.height * 0.715);
    await page.mouse.up();
  }

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, data, source_id, source_page_number, state, readiness
       FROM learn_language.cards WHERE source_id = 'grammar-a1'`
    );

    expect(result.rows.length).toBeGreaterThan(0);

    const card = result.rows[0];
    expect(card.source_id).toBe('grammar-a1');
    expect(card.source_page_number).toBe(1);
    expect(card.state).toBe('NEW');
    expect(card.readiness).toBe('IN_REVIEW');
    expect(card.data.sentence).toBeDefined();
    expect(card.data.translation?.en).toBeDefined();
  });
});

test('grammar card study shows sentence with gaps on front, full sentence on reveal', async ({ page }) => {
  await setupDefaultChatModelSettings();

  const imageId = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'grammar-test-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich gehe jeden Tag in die Schule.',
      translation: { en: 'I go to school every day.' },
      gaps: [{ startIndex: 10, length: 5 }],
      examples: [
        {
          de: 'Ich gehe jeden Tag in die Schule.',
          en: 'I go to school every day.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
      audio: [{ id: 'test-audio', text: 'Ich gehe jeden Tag in die Schule.', language: 'de' }],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/study');

  await page.getByRole('button', { name: 'Start' }).click();

  const sentenceText = page.locator('.sentence-text');
  await expect(sentenceText).toBeVisible();
  await expect(sentenceText).toContainText('Ich gehe _____ Tag in die Schule.');

  await page.click('.learn-card');

  await expect(sentenceText).toContainText('Ich gehe jeden Tag in die Schule.');
});

test('grammar card editing shows complete sentence and allows adding gaps', async ({ page }) => {
  await setupDefaultChatModelSettings();

  const imageId = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'grammar-edit-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Der Hund läuft schnell.',
      translation: { en: 'The dog runs fast.' },
      gaps: [],
      examples: [
        {
          de: 'Der Hund läuft schnell.',
          en: 'The dog runs fast.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await page.getByRole('link', { name: 'Der Hund läuft schnell.' }).click();

  await expect(page.getByRole('heading', { name: 'Grammar' })).toBeVisible();

  const sentenceInput = page.getByLabel('German sentence');
  await expect(sentenceInput).toHaveValue('Der Hund läuft schnell.');

  await sentenceInput.focus();
  await sentenceInput.evaluate((el: HTMLTextAreaElement) => {
    el.setSelectionRange(9, 14);
  });

  await page.getByRole('button', { name: 'Add Gap from Selection' }).click();

  await expect(page.getByRole('listitem')).toContainText('läuft');

  await expect(page.locator('.sentence-preview')).toContainText('Der Hund _____ schnell.');
});

test('grammar card editing allows removing gaps', async ({ page }) => {
  await setupDefaultChatModelSettings();

  const imageId = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'grammar-remove-gap-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Sie trinkt Kaffee.',
      translation: { en: 'She drinks coffee.' },
      gaps: [{ startIndex: 4, length: 6 }],
      examples: [
        {
          de: 'Sie trinkt Kaffee.',
          en: 'She drinks coffee.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await page.getByRole('link', { name: 'Sie trinkt Kaffee.' }).click();

  await expect(page.getByRole('listitem')).toContainText('trinkt');

  await page.getByRole('button', { name: 'Remove gap' }).click();

  await expect(page.locator('.sentence-preview')).toContainText('Sie trinkt Kaffee.');
});
