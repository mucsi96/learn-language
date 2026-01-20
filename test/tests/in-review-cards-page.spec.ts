import { test, expect } from '../fixtures';
import { createCard, uploadMockImage, yellowImage, redImage, withDbConnection } from '../utils';

test('displays in review cards in table', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  // Create cards with IN_REVIEW readiness
  await createCard({
    cardId: 'verstehen-erteni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'verstehen',
      type: 'VERB',
      gender: 'NEUTER',
      forms: ['versteht', 'verstand', 'verstanden'],
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstoh' },
      examples: [
        {
          de: 'Ich verstehe Deutsch.',
          hu: 'Értem a németet.',
          en: 'I understand German.',
          ch: 'Ich verstoh Tüütsch.',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await createCard({
    cardId: 'sprechen-beszelni',
    sourceId: 'goethe-b1',
    sourcePageNumber: 22,
    data: {
      word: 'sprechen',
      type: 'VERB',
      forms: ['spricht', 'sprach', 'gesprochen'],
      translation: { en: 'to speak', hu: 'beszélni' },
      examples: [],
    },
    readiness: 'IN_REVIEW',
  });

  // Create a card that should not appear (READY readiness)
  await createCard({
    cardId: 'lernen-tanulni',
    sourceId: 'goethe-a2',
    sourcePageNumber: 10,
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni' },
    },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Check page title and description
  await expect(page.getByRole('heading', { name: 'Cards In Review', exact: true })).toBeVisible();
  await expect(page.getByText('These cards are currently being reviewed')).toBeVisible();

  // Check table headers
  await expect(page.getByRole('columnheader', { name: 'Word' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Translation' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Source' })).toBeVisible();

  // Check that IN_REVIEW cards are displayed
  await expect(page.getByText('verstehen', { exact: true })).toBeVisible();
  await expect(page.getByText('sprechen', { exact: true })).toBeVisible();
  await expect(page.getByText('Ige', { exact: true })).toHaveCount(2); // Hungarian for "verb"

  // Check translations are displayed
  await expect(page.getByText('HU: érteni • EN: to understand • CH: verstoh')).toBeVisible();
  await expect(page.getByText('HU: beszélni • EN: to speak')).toBeVisible();

  // Check source information
  await expect(page.getByText('Goethe A1')).toBeVisible();
  await expect(page.getByText('Page 15')).toBeVisible();
  await expect(page.getByText('Goethe B1')).toBeVisible();
  await expect(page.getByText('Page 22')).toBeVisible();

  // Check that READY card is not displayed
  await expect(page.getByText('lernen', { exact: true })).not.toBeVisible();
});

test('navigation on row click', async ({ page }) => {
  await createCard({
    cardId: 'schreiben-irni',
    sourceId: 'goethe-a2',
    sourcePageNumber: 18,
    data: {
      word: 'schreiben',
      type: 'VERB',
      forms: ['schreibt', 'schrieb', 'geschrieben'],
      translation: { en: 'to write', hu: 'írni', ch: 'schriibe' },
      examples: [],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Wait for the table to load
  await expect(page.getByText('schreiben', { exact: true })).toBeVisible();

  // Click on the row containing 'schreiben'
  const row = page.getByRole('row').filter({ hasText: 'schreiben' });
  await row.click();

  // Wait for card page to load and check content
  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('schreiben');
});

test('navigation back after row click', async ({ page }) => {
  await createCard({
    cardId: 'lesen-olvasni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 12,
    data: {
      word: 'lesen',
      type: 'VERB',
      forms: ['liest', 'las', 'gelesen'],
      translation: { en: 'to read', hu: 'olvasni', ch: 'läse' },
      examples: [],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Wait for the table to load and click on the row
  await expect(page.getByText('lesen', { exact: true })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'lesen' });
  await row.click();

  // Verify we're on the card page
  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('lesen');

  // Click the back button
  await page.getByRole('link', { name: 'Back' }).click();

  // Verify we're back on the in-review-cards page
  await expect(page).toHaveURL('http://localhost:8180/in-review-cards');
  await expect(page.getByRole('heading', { name: 'Cards In Review', exact: true })).toBeVisible();
  await expect(page.getByText('lesen', { exact: true })).toBeVisible();
});

test('displays empty state when no cards in review', async ({ page }) => {
  // Create cards that are not IN_REVIEW
  await createCard({
    cardId: 'fertig-kesz',
    sourceId: 'goethe-a1',
    sourcePageNumber: 5,
    data: {
      word: 'fertig',
      type: 'ADJECTIVE',
      translation: { en: 'ready', hu: 'kész' },
    },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Check that empty state is displayed
  await expect(page.getByRole('heading', { name: 'No cards in review', exact: true })).toBeVisible();
  // Check that table is not displayed
  await expect(page.getByRole('table')).not.toBeVisible();
});

test('page title', async ({ page }) => {
  await page.goto('http://localhost:8180/in-review-cards');
  await expect(page).toHaveTitle('Cards In Review');
});

test('mark as reviewed button disabled when no example selected', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(redImage);

  await createCard({
    cardId: 'testen-tesztelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'testen',
      type: 'VERB',
      forms: ['testet', 'testete', 'getestet'],
      translation: { en: 'to test', hu: 'tesztelni', ch: 'teste' },
      examples: [
        {
          de: 'Wir testen die Anwendung.',
          hu: 'Teszteljük az alkalmazást.',
          en: 'We test the application.',
          ch: "Mir tested d'Aawändig.",
          images: [{ id: image1 }, { id: image2 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'testen' });
  await row.click();

  // Verify the button exists but is disabled
  const markAsReviewedBtn = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedBtn).toBeVisible();
  await expect(markAsReviewedBtn).toBeDisabled();
});

test('mark as reviewed button disabled when no favorite image', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(redImage);

  await createCard({
    cardId: 'prufen-ellenorizni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 10,
    data: {
      word: 'prüfen',
      type: 'VERB',
      forms: ['prüft', 'prüfte', 'geprüft'],
      translation: { en: 'to check', hu: 'ellenőrizni', ch: 'prüefe' },
      examples: [
        {
          de: 'Ich prüfe die Ergebnisse.',
          hu: 'Ellenőrzöm az eredményeket.',
          en: 'I check the results.',
          ch: "Ich prüef d'Resultat.",
          images: [{ id: image1 }, { id: image2 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'prüfen' });
  await row.click();

  // Select the first example (radio button)
  await page.getByRole('radio').click();

  // Verify the button is still disabled because no image is marked as favorite
  const markAsReviewedBtn = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedBtn).toBeDisabled();
});

test('mark as reviewed button enabled when conditions met', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'kontrollieren-iranyitani',
    sourceId: 'goethe-a1',
    sourcePageNumber: 11,
    data: {
      word: 'kontrollieren',
      type: 'VERB',
      forms: ['kontrolliert', 'kontrollierte', 'kontrolliert'],
      translation: { en: 'to control', hu: 'irányítani', ch: 'kontrolliere' },
      examples: [
        {
          de: 'Sie kontrolliert alles genau.',
          hu: 'Mindent pontosan irányít.',
          en: 'She controls everything precisely.',
          ch: 'Sie kontrolliert alles gnau.',
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'kontrollieren' });
  await row.click();

  // Select the first example and mark image as favorite
  await page.getByRole('radio').click();
  await page.getByRole('button', { name: 'Toggle favorite' }).click();

  // Verify the button is now enabled
  const markAsReviewedBtn = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedBtn).toBeEnabled();
});

test('mark as reviewed updates readiness in database', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'verwalten-kezelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 12,
    data: {
      word: 'verwalten',
      type: 'VERB',
      forms: ['verwaltet', 'verwaltete', 'verwaltet'],
      translation: { en: 'to manage', hu: 'kezelni', ch: 'verwalte' },
      examples: [
        {
          de: 'Er verwaltet das System.',
          hu: 'Ő kezeli a rendszert.',
          en: 'He manages the system.',
          ch: "Er verwaltet s'System.",
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'verwalten' });
  await row.click();

  // Select the first example and mark image as favorite
  await page.getByRole('radio').click();
  await page.getByRole('button', { name: 'Toggle favorite' }).click();

  // Click Mark as reviewed button
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  // Verify success message
  await expect(page.getByText('Card marked as reviewed successfully')).toBeVisible();

  // Verify readiness was updated in database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT readiness FROM learn_language.cards WHERE id = 'verwalten-kezelni'");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('REVIEWED');
  });
});

test('mark as reviewed saves card data changes', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'organisieren-szervezni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 13,
    data: {
      word: 'organisieren',
      type: 'VERB',
      forms: ['organisiert', 'organisierte', 'organisiert'],
      translation: { en: 'to organize', hu: 'szervezni', ch: 'organisiere' },
      examples: [
        {
          de: 'Wir organisieren eine Veranstaltung.',
          hu: 'Rendezvényt szervezünk.',
          en: 'We organize an event.',
          ch: 'Mir organisiere en Event.',
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'organisieren' });
  await row.click();

  // Modify the Hungarian translation
  await page.getByLabel('Hungarian translation', { exact: true }).fill('megszervezni');

  // Select the first example and mark image as favorite
  await page.getByRole('radio').click();
  await page.getByRole('button', { name: 'Toggle favorite' }).click();

  // Click Mark as reviewed button
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  // Verify success message
  await expect(page.getByText('Card marked as reviewed successfully')).toBeVisible();

  // Verify both readiness and card data were updated in database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'organisieren-szervezni'");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('REVIEWED');

    const cardData = result.rows[0].data;
    expect(cardData.translation.hu).toBe('megszervezni');
  });
});

test('navigation back after mark as reviewed', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'koordinieren-koordinalni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 14,
    data: {
      word: 'koordinieren',
      type: 'VERB',
      forms: ['koordiniert', 'koordinierte', 'koordiniert'],
      translation: { en: 'to coordinate', hu: 'koordinálni', ch: 'koordiniere' },
      examples: [
        {
          de: 'Sie koordiniert die Termine.',
          hu: 'Koordinálja a találkozókat.',
          en: 'She coordinates the appointments.',
          ch: "Sie koordiniert d'Termine.",
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'koordinieren' });
  await row.click();

  // Select the first example and mark image as favorite
  await page.getByRole('radio').click();
  await page.getByRole('button', { name: 'Toggle favorite' }).click();

  // Click Mark as reviewed button
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  // Wait for success message to ensure action completed
  await expect(page.getByText('Card marked as reviewed successfully')).toBeVisible();

  // Click the back button
  await page.getByRole('link', { name: 'Back' }).click();

  // Verify we're back on the in-review-cards page
  await expect(page).toHaveURL('http://localhost:8180/in-review-cards');
  await expect(page.getByRole('heading', { name: 'Cards In Review', exact: true })).toBeVisible();

  await expect(page.getByRole('row').filter({ hasText: 'koordinieren' })).not.toBeVisible();
});

test('mark as reviewed button enabled after toggling favorite', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'bewerten-ertekelni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'bewerten',
      type: 'VERB',
      forms: ['bewertet', 'bewertete', 'bewertet'],
      translation: { en: 'to evaluate', hu: 'értékelni', ch: 'bewärte' },
      examples: [
        {
          de: 'Wir bewerten die Leistung.',
          hu: 'Értékeljük a teljesítményt.',
          en: 'We evaluate the performance.',
          ch: "Mir bewärted d'Leistig.",
          images: [{ id: image1 }],
          isSelected: true,
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  // Navigate to card page
  const row = page.getByRole('row').filter({ hasText: 'bewerten' });
  await row.click();

  // Verify the button is initially disabled (no favorite image)
  const markAsReviewedBtn = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedBtn).toBeDisabled();

  // Toggle the image to favorite
  await page.getByRole('button', { name: 'Toggle favorite' }).click();

  // Verify the button becomes enabled immediately after toggling favorite
  await expect(markAsReviewedBtn).toBeEnabled();

  // Toggle back to unfavorite
  await page.getByRole('button', { name: 'Toggle favorite' }).click();

  // Verify the button becomes disabled again
  await expect(markAsReviewedBtn).toBeDisabled();
});

test('displays speech cards in review with correct type', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'a1b2c3d4',
    sourceId: 'speech-a1',
    sourcePageNumber: 20,
    data: {
      sentence: 'Guten Morgen, wie geht es Ihnen?',
      translation: {
        hu: 'Jó reggelt, hogy van?',
        en: 'Good morning, how are you?',
      },
      examples: [
        {
          de: 'Guten Morgen, wie geht es Ihnen?',
          hu: 'Jó reggelt, hogy van?',
          en: 'Good morning, how are you?',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await expect(page.getByText('Guten Morgen, wie geht es Ihnen?', { exact: true })).toBeVisible();
  await expect(page.getByText('Sentence', { exact: true })).toBeVisible();
  await expect(page.getByText('HU: Jó reggelt, hogy van? • EN: Good morning, how are you?')).toBeVisible();
});

test('speech card navigation from in-review page', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'e5f6g7h8',
    sourceId: 'speech-a1',
    sourcePageNumber: 21,
    data: {
      sentence: 'Ich fahre mit dem Bus.',
      translation: {
        hu: 'Busszal megyek.',
        en: 'I take the bus.',
      },
      examples: [
        {
          de: 'Ich fahre mit dem Bus.',
          hu: 'Busszal megyek.',
          en: 'I take the bus.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  const row = page.getByRole('row').filter({ hasText: 'Ich fahre mit dem Bus.' });
  await row.click();

  await expect(page.getByLabel('German Sentence')).toHaveValue('Ich fahre mit dem Bus.');
  await expect(page.getByLabel('Hungarian translation', { exact: true })).toHaveValue('Busszal megyek.');
});
