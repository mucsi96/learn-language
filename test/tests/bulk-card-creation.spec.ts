import { test, expect } from '../fixtures';
import {
  createCard,
  createSource,
  createRateLimitSetting,
  selectTextRange,
  selectRegion,
  scrollElementToTop,
  withDbConnection,
  downloadImage,
  getImageColor,
  menschenA1Image,
  ensureTimezoneAware,
  setupDefaultChatModelSettings,
  setupDefaultImageModelSettings,
  menschenA1GrammarImage,
} from '../utils';

test('bulk create fab appears when words without cards selected', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await createCard({
    cardId: 'aber-de',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'aber',
      type: 'CONJUNCTION',
      translation: { en: 'but', hu: 'de', ch: 'aber' },
      forms: [],
      examples: [],
    },
  });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Initially no FAB should be visible
  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).not.toBeVisible();

  // Select a region with words that don't have cards
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByText('Create 2 Cards')).toBeVisible();

  // FAB should now be visible with correct count
  const fab = page.getByRole('button', { name: 'Create cards in bulk' });
  await expect(fab).toBeVisible();
  await expect(fab).toContainText('Create 2 Cards');
});

test('multiple regions can be selected before confirmation', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await createCard({
    cardId: 'aber-de',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'aber',
      type: 'CONJUNCTION',
      translation: { en: 'but', hu: 'de', ch: 'aber' },
      forms: [],
      examples: [],
    },
  });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  await scrollElementToTop(page, 'A', true);

  // Select first region (without confirming yet)
  await selectRegion(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Confirm button should show with badge count 1
  await expect(page.getByRole('button', { name: 'Confirm selection' })).toBeVisible();

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  // Select second region (without confirming yet)
  await selectRegion(page, 'der Absender', 'Können Sie mir seine Adresse sagen?');

  // Badge should now show 2 selections
  const confirmButton = page.getByRole('button', { name: 'Confirm selection' });
  await expect(confirmButton).toBeVisible();

  // Cancel button should also be visible
  await expect(page.getByRole('button', { name: 'Cancel selection' })).toBeVisible();

  await page.getByRole('button', { name: 'Confirm selection' }).click();

  // FAB should show count from both regions (5 cards: abfahren, die Abfahrt, der Absender, Achtung, die Adresse - aber already exists)
  const fab = page.getByRole('button', { name: 'Create cards in bulk' });
  await expect(fab).toBeVisible();
  await expect(fab).toContainText('Create 5 Cards');
});

test('selections persist across page navigation', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  // Select a region on page 9
  await selectRegion(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Confirm button should show with badge
  await expect(page.getByRole('button', { name: 'Confirm selection' })).toBeVisible();

  // Navigate to the next page
  await page.getByRole('link', { name: 'Next page' }).click();
  await page.getByRole('region', { name: 'Page content' }).waitFor();

  // Confirm button should still be visible (selection persisted)
  await expect(page.getByRole('button', { name: 'Confirm selection' })).toBeVisible();

  // Navigate back to page 9
  await page.getByRole('link', { name: 'Previous page' }).click();
  await page.getByRole('region', { name: 'Page content' }).waitFor();

  // Selection rectangle should be visible on the page
  await expect(page.getByRole('region', { name: 'Selected area 1' })).toBeVisible();
});

test('regions from different pages are combined into single extraction', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await createSource({
    id: 'cross-page-source',
    name: 'Cross Page Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'FLOWING_TEXT',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/cross-page-source/page/1');

  await page.getByLabel('Upload image file').setInputFiles({
    name: 'cross-page-1.png',
    mimeType: 'image/png',
    buffer: menschenA1Image,
  });

  const pageContent = page.getByRole('region', { name: 'Page content' });
  await expect(pageContent).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const box1 = await pageContent.boundingBox();
  if (box1) {
    await page.mouse.move(box1.x + box1.width * 0.155, box1.y + box1.height * 0.696);
    await page.mouse.down();
    await page.mouse.move(box1.x + box1.width * 0.434, box1.y + box1.height * 0.715);
    await page.mouse.up();
  }

  await expect(page.getByRole('button', { name: 'Confirm selection' })).toBeVisible();

  await page.getByRole('link', { name: 'Next page' }).click();

  await page.getByLabel('Upload image file').setInputFiles({
    name: 'cross-page-2.png',
    mimeType: 'image/png',
    buffer: menschenA1Image,
  });

  await expect(pageContent).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const box2 = await pageContent.boundingBox();
  if (box2) {
    await page.mouse.move(box2.x + box2.width * 0.155, box2.y + box2.height * 0.696);
    await page.mouse.down();
    await page.mouse.move(box2.x + box2.width * 0.434, box2.y + box2.height * 0.715);
    await page.mouse.up();
  }

  await page.getByRole('button', { name: 'Confirm selection' }).click();

  const extractedWords = page.getByRole('region', { name: 'Extracted items' });
  await expect(extractedWords).toBeVisible();
  await expect(extractedWords.getByRole('button').first()).toHaveText('hören');
  await expect(extractedWords.getByRole('button').nth(1)).toHaveText('das Lied');
});

test('cancel selection clears all selections', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  // Select a region
  await selectRegion(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Confirm and cancel buttons should appear
  await expect(page.getByRole('button', { name: 'Confirm selection' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel selection' })).toBeVisible();

  // Click cancel
  await page.getByRole('button', { name: 'Cancel selection' }).click();

  // Buttons should disappear
  await expect(page.getByRole('button', { name: 'Confirm selection' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel selection' })).not.toBeVisible();

  // Selection rectangle should not be visible
  await expect(page.getByRole('region', { name: 'Selected area 1' })).not.toBeVisible();
});

test('bulk create fab hides when all words have cards', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await createCard({
    cardId: 'aber-de',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'aber',
      type: 'CONJUNCTION',
      translation: { en: 'but', hu: 'de', ch: 'aber' },
      forms: [],
      examples: [],
    },
  });
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
      translation: { en: 'to depart', hu: 'elindulni', ch: 'abfahren' },
      forms: [],
      examples: [],
    },
  });
  await createCard({
    cardId: 'abfahrt-indulas',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'Abfahrt',
      type: 'NOUN',
      translation: { en: 'departure', hu: 'indulás', ch: 'die Abfahrt' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select region with words that now have cards
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByRole('link', { name: 'aber' })).toBeVisible();

  // FAB should not be visible
  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).not.toBeVisible();
});

test('bulk card creation opens progress dialog', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Progress dialog should open
  await expect(page.getByRole('heading', { name: 'Creating Cards' })).toBeVisible();
});

test('bulk card creation shows individual progress', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Check that individual words are represented as dots in the progress dialog
  await expect(page.getByRole('dialog').getByRole('status', { name: 'aber' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status', { name: 'abfahren' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status', { name: 'die Abfahrt' })).toBeVisible();
});

test('bulk card creation creates cards in database', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify cards were created in database
  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT id, data FROM learn_language.cards WHERE id IN ('aber-de', 'abfahren-elindulni', 'abfahrt-indulas')"
    );

    expect(result.rows.length).toBe(3);

    const cardIds = result.rows.map((row) => row.id);
    expect(cardIds).toContain('aber-de');
    expect(cardIds).toContain('abfahren-elindulni');
    expect(cardIds).toContain('abfahrt-indulas');
  });
});

test('bulk card creation includes word data', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify word data in database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'abfahren-elindulni'");

    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    // Check word data
    expect(cardData.word).toBe('abfahren');
    expect(cardData.type).toBe('VERB');
    expect(cardData.gender).toBeUndefined();
    expect(cardData.forms).toEqual(['fährt ab', 'fuhr ab', 'abgefahren']);
    expect(cardData.translation.en).toBe('to depart, to leave');
    expect(cardData.translation.hu).toBe('elindulni, elhagyni');
    expect(cardData.translation.ch).toBe('abfahra, verlah');
    expect(cardData.examples[0].de).toBe('Wir fahren um zwölf Uhr ab.');
    expect(cardData.examples[0].en).toBe("We are departing at twelve o'clock.");
    expect(cardData.examples[0].hu).toBe('Tizenkét órakor indulunk.');
    expect(cardData.examples[0].ch).toBe('Mir fahred am zwöufi ab.');
    expect(cardData.examples[1].de).toBe('Wann fährt der Zug ab?');
    expect(cardData.examples[1].en).toBe('When does the train leave?');
    expect(cardData.examples[1].hu).toBe('Mikor indul a vonat?');
    expect(cardData.examples[1].ch).toBe('Wänn fahrt de Zug ab?');

    const image1 = downloadImage(cardData.examples[0].images[0].id);
    const image2 = downloadImage(cardData.examples[1].images[0].id);
    expect(await getImageColor(page, image1)).toBe('yellow');
    expect(await getImageColor(page, image2)).toBe('red');

    expect(cardData.examples[0].images[0].model).toBe('GPT Image 1.5');
    expect(cardData.examples[0].images[1].model).toBe('Gemini 3 Pro');
    expect(cardData.examples[0].images[2].model).toBe('Gemini 3 Pro');
    expect(cardData.examples[0].images[3].model).toBe('Gemini 3 Pro');
    expect(cardData.examples[1].images[0].model).toBe('GPT Image 1.5');

    expect(cardData.translationModel).toBe('gemini-3.1-pro-preview');
    expect(cardData.classificationModel).toBe('gemini-3.1-pro-preview');
    expect(cardData.extractionModel).toBe('gemini-3.1-pro-preview');

    const result2 = await client.query("SELECT data FROM learn_language.cards WHERE id = 'abfahrt-indulas'");
    expect(result2.rows.length).toBe(1);
    const cardData2 = result2.rows[0].data;

    // Check word data
    expect(cardData2.word).toBe('die Abfahrt');
    expect(cardData2.type).toBe('NOUN');
    expect(cardData2.gender).toBe('FEMININE');
    expect(cardData2.forms).toEqual(['die Abfahrten']);
    expect(cardData2.translationModel).toBe('gemini-3.1-pro-preview');
    expect(cardData2.classificationModel).toBe('gemini-3.1-pro-preview');
    expect(cardData2.extractionModel).toBe('gemini-3.1-pro-preview');
  });
});

test('bulk card creation updates ui after completion', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Verify FAB is initially visible
  const fab = page.getByRole('button', { name: 'Create cards in bulk' });

  await fab.click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Close the dialog
  await page.getByRole('button', { name: 'Close' }).click();

  // FAB should no longer be visible since cards now exist
  await expect(fab).not.toBeVisible();

  await expect(page.getByRole('link', { name: 'aber' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'aber' })).toHaveAccessibleDescription('Card exists');
  await expect(page.getByRole('link', { name: 'abfahren' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'abfahren' })).toHaveAccessibleDescription('Card exists');
  await expect(page.getByRole('link', { name: 'die Abfahrt' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'die Abfahrt' })).toHaveAccessibleDescription('Card exists');
});

test('bulk card creation fsrs attributes', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify FSRS attributes in database
  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT state, learning_steps, stability, difficulty, reps, lapses, due
       FROM learn_language.cards
       WHERE id = 'abfahren-elindulni'`
    );

    expect(result.rows.length).toBe(1);
    const row = result.rows[0];

    // Check FSRS initial values (from createEmptyCard())
    expect(row.state).toBe('NEW');
    expect(row.learning_steps).toBe(0);
    expect(row.stability).toBe(0);
    expect(row.difficulty).toBe(0);
    expect(row.reps).toBe(0);
    expect(row.lapses).toBe(0);
    expect(row.due).not.toBeNull();
  });
});

test('bulk card creation source metadata', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify source metadata in database
  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT c.source_id, c.source_page_number, s.name
       FROM learn_language.cards c
       JOIN learn_language.sources s ON c.source_id = s.id
       WHERE c.id = 'abfahren-elindulni'`
    );

    expect(result.rows.length).toBe(1);
    const row = result.rows[0];

    expect(row.source_id).toBe('goethe-a1');
    expect(row.source_page_number).toBe(9);
    expect(row.name).toBe('Goethe A1');
  });
});

test('bulk card creation learning parameters and review state', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify learning parameters and review state in database
  await withDbConnection(async (client) => {
    // Check all three cards
    const result = await client.query(
      `SELECT state, learning_steps, stability, difficulty, reps, lapses, due, readiness
       FROM learn_language.cards
       WHERE id IN ('aber-de', 'abfahren-elindulni', 'abfahrt-indulas')`
    );

    expect(result.rows.length).toBe(3);

    // Get current time for due date comparison
    const currentTime = new Date();

    // Check that all cards have the correct initial learning parameters
    for (const row of result.rows) {
      // Check FSRS initial values
      expect(row.state).toBe('NEW');
      expect(row.learning_steps).toBe(0);
      expect(row.stability).toBe(0);
      expect(row.difficulty).toBe(0);
      expect(row.reps).toBe(0);
      expect(row.lapses).toBe(0);

      expect(row.due).not.toBeNull();
      const timeDifference = Math.abs((ensureTimezoneAware(row.due).getTime() - currentTime.getTime()) / 1000);
      expect(timeDifference).toBeLessThan(60); // Within 1 minute of test execution
      expect(row.readiness).toBe('IN_REVIEW');
    }
  });
});

test('bulk speech card creation includes sentence data', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Speech A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await page.getByLabel('Upload image').setInputFiles({
    name: 'test-speech-image.png',
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

  await page.getByRole('button', { name: 'Confirm selection' }).click();

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, data, source_id, source_page_number, state, readiness
       FROM learn_language.cards WHERE source_id = 'speech-a1'`
    );

    expect(result.rows.length).toBe(2);

    const card1 = result.rows.find((row) => row.data.examples?.[0]?.de === 'Wie heißt das Lied?');
    expect(card1).toBeDefined();
    expect(card1?.source_id).toBe('speech-a1');
    expect(card1?.source_page_number).toBe(1);
    expect(card1?.state).toBe('NEW');
    expect(card1?.readiness).toBe('IN_REVIEW');
    expect(card1?.data.examples[0].de).toBe('Wie heißt das Lied?');
    expect(card1?.data.examples[0].hu).toBe('Hogy hívják a dalt?');
    expect(card1?.data.examples[0].en).toBe('What is the name of the song?');
    expect(card1?.data.translationModel).toBe('gemini-3.1-pro-preview');
    expect(card1?.data.extractionModel).toBe('gemini-3.1-pro-preview');

    const card2 = result.rows.find((row) => row.data.examples?.[0]?.de === 'Hören Sie.');
    expect(card2).toBeDefined();
    expect(card2?.data.examples[0].hu).toBe('Hallgasson.');
    expect(card2?.data.examples[0].en).toBe('Listen.');
    expect(card2?.data.translationModel).toBe('gemini-3.1-pro-preview');
    expect(card2?.data.extractionModel).toBe('gemini-3.1-pro-preview');
  });
});

test('hungarian translation failure shows error on word spans', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });

  await fetch('http://localhost:3001/configure', {
    method: 'POST',
    body: JSON.stringify({ failHungarianTranslation: true }),
    headers: { 'Content-Type': 'application/json' },
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByRole('status').filter({ hasText: 'aber' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'aber' })).toHaveAccessibleDescription('Hungarian translation failed');
  await expect(page.getByRole('status').filter({ hasText: 'abfahren' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'abfahren' })).toHaveAccessibleDescription('Hungarian translation failed');
  await expect(page.getByRole('status').filter({ hasText: 'die Abfahrt' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'die Abfahrt' })).toHaveAccessibleDescription('Hungarian translation failed');

  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).not.toBeVisible();
});

test('bulk card creation persists extraction regions', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT source_id, page_number, x, y, width, height
       FROM learn_language.extraction_regions
       WHERE source_id = 'goethe-a1'
       ORDER BY id`
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].source_id).toBe('goethe-a1');
    expect(result.rows[0].page_number).toBe(9);
    expect(result.rows[0].x).toBeGreaterThan(0);
    expect(result.rows[0].y).toBeGreaterThan(0);
    expect(result.rows[0].width).toBeGreaterThan(0);
    expect(result.rows[0].height).toBeGreaterThan(0);
  });
});

test('persisted extraction regions are shown on page reload', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('region', { name: 'Extracted region' }).first()).toBeVisible();
});

test('persisted extraction regions are shown when navigating back to page', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Goethe A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('link', { name: 'Next page' }).click();
  await page.getByRole('region', { name: 'Page content' }).waitFor();

  await page.getByRole('link', { name: 'Previous page' }).click();
  await page.getByRole('region', { name: 'Page content' }).waitFor();

  await expect(page.getByRole('region', { name: 'Extracted region' }).first()).toBeVisible();
});

test('bulk grammar card creation extracts sentences with gaps', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  await createRateLimitSetting({ key: 'image-per-minute', value: 60 });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('article', { name: 'Grammar A1' }).click();
  await page.getByRole('button', { name: 'Pages' }).click();

  await page.getByLabel('Upload image').setInputFiles({
    name: 'test-grammar-image.png',
    mimeType: 'image/png',
    buffer: menschenA1GrammarImage,
  });

  const pageContent = page.getByRole('region', { name: 'Page content' });
  await expect(pageContent).toBeVisible();

  const boxBefore = await pageContent.boundingBox();

  if (boxBefore) {
    await page.evaluate((y) => window.scrollTo(0, y), boxBefore.y);
  }

  const box = await pageContent.boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width * 0.173, box.height * 0.366);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.518, box.height * 0.389);
    await page.mouse.up();
  }

  await page.getByRole('button', { name: 'Confirm selection' }).click();

  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, data, source_id, source_page_number, state, readiness
       FROM learn_language.cards WHERE source_id = 'grammar-a1'`
    );


    expect(result.rows.length).toBe(2);

    const card1 = result.rows.find((row) => row.data.examples?.[0]?.de === 'Das [ist] Paco.');
    expect(card1).toBeDefined();
    expect(card1?.source_id).toBe('grammar-a1');
    expect(card1?.source_page_number).toBe(1);
    expect(card1?.state).toBe('NEW');
    expect(card1?.readiness).toBe('IN_REVIEW');
    expect(card1?.data.examples[0].en).toBe('This is Paco.');
    expect(card1?.data.examples[0].de).toContain('[ist]');

    expect(card1?.data.translationModel).toBe('gemini-3.1-pro-preview');
    expect(card1?.data.extractionModel).toBe('gemini-3.1-pro-preview');

    const card2 = result.rows.find((row) => row.data.examples?.[0]?.de === 'Und [das] ist Frau Wachter.');
    expect(card2).toBeDefined();
    expect(card2?.data.examples[0].de).toContain('[das]');
    expect(card2?.data.translationModel).toBe('gemini-3.1-pro-preview');
    expect(card2?.data.extractionModel).toBe('gemini-3.1-pro-preview');
  });
});
