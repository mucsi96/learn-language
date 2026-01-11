import { test, expect } from '../fixtures';
import {
  createCard,
  selectTextRange,
  scrollElementToTop,
  withDbConnection,
  downloadImage,
  yellowImage,
  redImage,
  ensureTimezoneAware,
  setupDefaultChatModelSettings,
} from '../utils';

test('bulk create fab appears when words without cards selected', async ({ page }) => {
  await setupDefaultChatModelSettings();
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
  await page.getByRole('link', { name: 'Goethe A1' }).click();

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

test('bulk create fab shows correct count for multiple regions', async ({ page }) => {
  await setupDefaultChatModelSettings();
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
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  await scrollElementToTop(page, 'A', true);

  // Select first region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  // Select second region
  await selectTextRange(page, 'der Absender', 'Können Sie mir seine Adresse sagen?');

  await expect(page.getByText('Create 5 Cards')).toBeVisible();

  // FAB should show total count from both regions
  const fab = page.getByRole('button', { name: 'Create cards in bulk' });
  await expect(fab).toBeVisible();
  await expect(fab).toContainText('Create 5 Cards');
});

test('bulk create fab hides when all words have cards', async ({ page }) => {
  await setupDefaultChatModelSettings();
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
      word: 'die Abfahrt',
      type: 'NOUN',
      translation: { en: 'departure', hu: 'indulás', ch: 'die Abfahrt' },
      forms: [],
      examples: [],
    },
  });

  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  // Select region with words that now have cards
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByRole('link', { name: 'aber' })).toBeVisible();

  // FAB should not be visible
  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).not.toBeVisible();
});

test('bulk card creation opens progress dialog', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Progress dialog should open
  await expect(page.getByRole('heading', { name: 'Creating Cards' })).toBeVisible();
});

test('bulk card creation shows individual progress', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Check that individual words are listed within the progress dialog
  await expect(page.getByRole('dialog').getByText('aber')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('abfahren')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('die Abfahrt')).toBeVisible();

  // Check that progress bars are present
  await expect(page.getByRole('dialog').locator('mat-progress-bar')).toHaveCount(3);
});

test('bulk card creation creates cards in database', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify cards were created in database
  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT id, data FROM learn_language.cards WHERE data->>'word' IN ('aber', 'abfahren', 'die Abfahrt')"
    );

    expect(result.rows.length).toBe(3);

    const cardWords = result.rows.map((row) => row.data.word);
    expect(cardWords).toContain('aber');
    expect(cardWords).toContain('abfahren');
    expect(cardWords).toContain('die Abfahrt');
  });
});

test('bulk card creation includes word data', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Wait for creation to complete
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

  // Verify word data in database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE data->>'word' = 'abfahren'");

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
    expect(image1.equals(yellowImage)).toBeTruthy();
    expect(image2.equals(redImage)).toBeTruthy();

    expect(cardData.examples[0].images[0].model).toBe('GPT Image 1');
    expect(cardData.examples[0].images[1].model).toBe('GPT Image 1.5');
    expect(cardData.examples[0].images[2].model).toBe('Imagen 4 Ultra');
    expect(cardData.examples[0].images[3].model).toBe('Gemini 3 Pro');
    expect(cardData.examples[1].images[0].model).toBe('GPT Image 1');

    const result2 = await client.query("SELECT data FROM learn_language.cards WHERE data->>'word' = 'die Abfahrt'");
    expect(result2.rows.length).toBe(1);
    const cardData2 = result2.rows[0].data;

    // Check word data
    expect(cardData2.word).toBe('die Abfahrt');
    expect(cardData2.type).toBe('NOUN');
    expect(cardData2.gender).toBe('FEMININE');
    expect(cardData2.forms).toEqual(['die Abfahrten']);
  });
});

test('bulk card creation updates ui after completion', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

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
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

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
       WHERE data->>'word' = 'abfahren'`
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
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

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
       WHERE c.data->>'word' = 'abfahren'`
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
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

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
       WHERE data->>'word' IN ('aber', 'abfahren', 'die Abfahrt')`
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

test('bulk card creation dialog review link', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  // Select a region
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  // Click the FAB to open the dialog
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();

  // Click the review link
  await page.getByRole('dialog').getByRole('link', { name: 'Review' }).click();

  // Verify that we navigate to the in-review-cards page
  await expect(page).toHaveURL('http://localhost:8180/in-review-cards');
});
