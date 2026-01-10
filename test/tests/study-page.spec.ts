import { test, expect } from '../fixtures';
import {
  getColorImageBytes,
  getImageContent,
  yellowImage,
  greenImage,
  createCard,
  uploadMockImage,
  createCardsWithStates,
  withDbConnection,
} from '../utils';
import { v4 as uuidv4 } from 'uuid';

test('study page initial state', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'abfahren',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
      gender: 'NEUTER',
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      translation: { en: 'to leave', hu: 'elindulni, elhagyni', ch: 'abfahra, verlah' },
      examples: [
        {
          de: 'Wir fahren um zwölf Uhr ab.',
          hu: 'Tizenkét órakor indulunk.',
          en: "We leave at twelve o'clock.",
          ch: 'Mir fahred am zwöufi ab.',
          images: [{ id: image1, isFavorite: true }],
        },
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          ch: 'Wänn fahrt dr',
          isSelected: true,
          images: [{ id: image2, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { level: 2, name: 'elindulni, elhagyni' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'abfahren' })).not.toBeVisible();
  await expect(page.getByLabel('Word type')).toHaveText('Ige');
  await expect(page.getByLabel('State')).toHaveText('New');
  await expect(page.getByText('Gender: Neuter', { exact: true })).not.toBeVisible();
  await expect(page.getByText('fährt ab')).not.toBeVisible();
  await expect(page.getByText('fuhr ab')).not.toBeVisible();
  await expect(page.getByText('abgefahren')).not.toBeVisible();
  await expect(page.getByText('Tizenkét órakor indulunk.')).not.toBeVisible();
  await expect(page.getByText('Mikor indul a vonat?')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.' })).not.toBeVisible();
  await expect(page.getByRole('img', { name: 'Mikor indul a vonat?' })).toBeVisible();
  const imageContent = await getImageContent(page.getByRole('img', { name: 'Mikor indul a vonat?' }));
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
});

test('study page revealed state', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'abfahren',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
      gender: 'NEUTER',
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      translation: { en: 'to leave', hu: 'elindulni, elhagyni', ch: 'abfahra, verlah' },
      examples: [
        {
          de: 'Wir fahren um zwölf Uhr ab.',
          hu: 'Tizenkét órakor indulunk.',
          en: "We leave at twelve o'clock.",
          ch: 'Mir fahred am zwöufi ab.',
          images: [{ id: image1, isFavorite: true }],
        },
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          ch: 'Wänn fahrt dr',
          isSelected: true,
          images: [{ id: image2, isFavorite: true }],
        },
      ],
    },
    state: 'LEARNING',
  });

  // Navigate to study page
  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await page.getByText('elindulni, elhagyni', { exact: true }).click();

  await expect(page.getByText('abfahren', { exact: true })).toBeVisible();
  await expect(page.getByText('elindulni, elhagyni')).not.toBeVisible();
  await expect(page.getByText('abfahra, verlah')).not.toBeVisible();
  await expect(page.getByLabel('Word type')).toHaveText('Ige');
  await expect(page.getByLabel('State')).toHaveText('Learning');
  await expect(page.getByText('Gender: Neuter', { exact: true })).toBeVisible();
  await expect(page.getByText('fährt ab')).toBeVisible();
  await expect(page.getByText('fuhr ab')).toBeVisible();
  await expect(page.getByText('abgefahren')).toBeVisible();
  await expect(page.getByText('Wir fahren um zwölf Uhr ab.')).not.toBeVisible();
  await expect(page.getByText('Wann fährt der Zug ab?')).toBeVisible();
  await expect(page.getByText('Mikor indul a vonat?')).not.toBeVisible();

  const imageContent = await getImageContent(page.getByRole('img', { name: 'Wann fährt der Zug ab?' }));
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
});

test('source selector routing works', async ({ page }) => {
  // Create a card in one source
  await createCard({
    cardId: 'lernen',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'lernen',
      type: 'VERB',
      forms: ['lernt', 'lernte', 'gelernt'],
      translation: { en: 'to learn', hu: 'tanulni' },
      examples: [
        {
          de: 'Ich lerne Deutsch.',
          hu: 'Németül tanulok.',
          en: 'I learn German.',
          isSelected: true,
        },
      ],
    },
  });

  // Create a card in another source
  await createCard({
    cardId: 'schreiben',
    sourceId: 'goethe-a2',
    sourcePageNumber: 10,
    data: {
      word: 'schreiben',
      type: 'VERB',
      forms: ['schreibt', 'schrieb', 'geschrieben'],
      translation: { en: 'to write', hu: 'írni' },
      examples: [
        {
          de: 'Ich schreibe einen Brief.',
          hu: 'Levelet írok.',
          en: 'I am writing a letter.',
          isSelected: true,
        },
      ],
    },
  });

  // Start from the first source
  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await expect(page.getByRole('heading', { name: 'tanulni' })).toBeVisible();

  // Open the source selector dropdown
  await page.getByRole('button', { name: 'Goethe A1' }).click();

  // Select the second source
  await page.getByRole('menuitem', { name: 'Goethe A2' }).click();

  // URL should change
  await expect(page).toHaveURL('http://localhost:8180/sources/goethe-a2/study');

  // Content should change to the card from the second source
  await expect(page.getByRole('heading', { name: 'írni' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'tanulni' })).not.toBeVisible();
});

test('source selector shows proper stats', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  await createCardsWithStates('goethe-a1', [
    { state: 'NEW', count: 3, due_date: yesterday },
    { state: 'LEARNING', count: 2, due_date: yesterday },
  ]);

  // Navigate to the study page
  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('navigation').getByTitle('New', { exact: true })).toHaveText('3');
  await expect(page.getByRole('navigation').getByTitle('Learning', { exact: true })).toHaveText('2');
});

test('source selector stats update after changing source', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  // Create cards in two different sources with different states
  await createCardsWithStates('goethe-a1', [
    { state: 'NEW', count: 3, due_date: yesterday },
    { state: 'LEARNING', count: 2, due_date: yesterday },
  ]);

  await createCardsWithStates('goethe-a2', [
    { state: 'NEW', count: 1, due_date: yesterday },
    { state: 'LEARNING', count: 4, due_date: yesterday },
  ]);

  // Navigate to the first source
  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('navigation').getByTitle('New', { exact: true })).toHaveText('3');
  await expect(page.getByRole('navigation').getByTitle('Learning', { exact: true })).toHaveText('2');

  // Open the source selector dropdown
  await page.getByRole('button', { name: 'Goethe A1' }).click();

  // Select the second source
  await page.getByRole('menuitem', { name: 'Goethe A2' }).click();

  await expect(page.getByRole('navigation').getByTitle('New', { exact: true })).toHaveText('1');
  await expect(page.getByRole('navigation').getByTitle('Learning', { exact: true })).toHaveText('4');
});

test('source selector dropdown shows stats', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  await createCardsWithStates('goethe-a1', [
    { state: 'NEW', count: 2, due_date: yesterday },
    { state: 'LEARNING', count: 3, due_date: yesterday },
  ]);

  await createCardsWithStates('goethe-a2', [
    { state: 'NEW', count: 5, due_date: yesterday },
    { state: 'LEARNING', count: 1, due_date: yesterday },
  ]);

  // Navigate to the study page
  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Open the source selector dropdown
  await page.getByRole('button', { name: 'Goethe A1' }).click();

  // Check that stats are displayed in the dropdown menu items
  const goetheA1MenuItem = page.getByRole('menuitem', { name: 'Goethe A1' });
  const goetheA2MenuItem = page.getByRole('menuitem', { name: 'Goethe A2' });

  await expect(goetheA1MenuItem.getByTitle('New', { exact: true })).toHaveText('2');
  await expect(goetheA1MenuItem.getByTitle('Learning', { exact: true })).toHaveText('3');
  await expect(goetheA2MenuItem.getByTitle('New', { exact: true })).toHaveText('5');
  await expect(goetheA2MenuItem.getByTitle('Learning', { exact: true })).toHaveText('1');
});

test('cards with in review readiness not shown on study page', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  // Create a card that has IN_REVIEW readiness status
  await createCard({
    cardId: uuidv4(),
    sourceId: 'goethe-a1',
    data: {
      word: 'verstehen',
      type: 'VERB',
      translation: { en: 'to understand', hu: 'érteni', ch: 'verstah' },
    },
    due: yesterday,
    readiness: 'IN_REVIEW',
  });

  // Create a card that is ready for review
  await createCard({
    cardId: uuidv4(),
    sourceId: 'goethe-a1',
    data: {
      word: 'lernen',
      type: 'VERB',
      translation: { en: 'to learn', hu: 'tanulni', ch: 'lerne' },
    },
    state: 'REVIEW',
    due: yesterday,
  });

  // Navigate to the study page
  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('navigation').getByTitle('Review', { exact: true })).toHaveText('1');
  await expect(page.getByRole('navigation').getByTitle('New', { exact: true })).not.toBeVisible();
  await expect(page.getByLabel('State')).toHaveText('Review');
});

test('mark for review button visible on study page', async ({ page }) => {
  await createCard({
    cardId: 'testen',
    sourceId: 'goethe-a1',
    sourcePageNumber: 15,
    data: {
      word: 'testen',
      type: 'VERB',
      forms: ['testet', 'testete', 'getestet'],
      translation: { en: 'to test', hu: 'tesztelni', ch: 'teste' },
      examples: [
        {
          de: 'Wir testen das System.',
          hu: 'Teszteljük a rendszert.',
          en: 'We test the system.',
          ch: "Mir tested s'System.",
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify Mark for Review button is visible
  const markReviewButton = page.getByRole('button', { name: 'Mark for Review' });
  await expect(markReviewButton).toBeVisible();
  await expect(markReviewButton.getByText('flag')).toBeVisible();
});

test('edit card button visible on study page', async ({ page }) => {
  await createCard({
    cardId: 'bearbeiten',
    sourceId: 'goethe-a1',
    sourcePageNumber: 20,
    data: {
      word: 'bearbeiten',
      type: 'VERB',
      forms: ['bearbeitet', 'bearbeitete', 'bearbeitet'],
      translation: { en: 'to edit', hu: 'szerkeszteni', ch: 'bearbeite' },
      examples: [
        {
          de: 'Ich bearbeite das Dokument.',
          hu: 'Szerkesztem a dokumentumot.',
          en: 'I edit the document.',
          ch: "Ich bearbeite s'Dokument.",
          isSelected: true,
        },
      ],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify Edit Card button is visible
  const editButton = page.getByRole('link', { name: 'Edit Card' });
  await expect(editButton).toBeVisible();
  await expect(editButton.getByText('edit')).toBeVisible();
});

test('mark for review button functionality', async ({ page }) => {
  await createCard({
    cardId: 'markieren',
    sourceId: 'goethe-a1',
    sourcePageNumber: 25,
    data: {
      word: 'markieren',
      type: 'VERB',
      forms: ['markiert', 'markierte', 'markiert'],
      translation: { en: 'to mark', hu: 'megjelölni', ch: 'markiere' },
      examples: [
        {
          de: 'Ich markiere die wichtigen Stellen.',
          hu: 'Megjelölöm a fontos helyeket.',
          en: 'I mark the important places.',
          ch: "Ich markiere d'wichtige Stelle.",
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Click the Mark for Review button
  await page.getByRole('button', { name: 'Mark for Review' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  // Verify the card readiness was updated in the database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT readiness FROM learn_language.cards WHERE id = 'markieren'");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('IN_REVIEW');
  });
});

test('mark for review button loads next card', async ({ page }) => {
  // Create two cards
  await createCard({
    cardId: 'erste',
    sourceId: 'goethe-a1',
    sourcePageNumber: 30,
    data: {
      word: 'erste',
      type: 'ADJECTIVE',
      translation: { en: 'first', hu: 'első', ch: 'erschti' },
      examples: [
        {
          de: 'Das ist meine erste Karte.',
          hu: 'Ez az első kártyám.',
          en: 'This is my first card.',
          ch: 'Das isch mini erschti Charte.',
          isSelected: true,
        },
      ],
    },
    readiness: 'READY',
  });

  await createCard({
    cardId: 'zweite',
    sourceId: 'goethe-a1',
    sourcePageNumber: 31,
    data: {
      word: 'zweite',
      type: 'ADJECTIVE',
      translation: { en: 'second', hu: 'második', ch: 'zwöiti' },
      examples: [
        {
          de: 'Das ist meine zweite Karte.',
          hu: 'Ez a második kártyám.',
          en: 'This is my second card.',
          ch: 'Das isch mini zwöiti Charte.',
          isSelected: true,
        },
      ],
    },
    readiness: 'READY',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify first card is showing (due earlier)
  await expect(page.getByRole('heading', { name: 'első' })).toBeVisible();

  // Click Mark for Review button
  await page.getByRole('button', { name: 'Mark for Review' }).click();

  // Verify the second card is now showing
  await expect(page.getByRole('heading', { name: 'második' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'első' })).not.toBeVisible();
});

test('edit card button navigation', async ({ page }) => {
  await createCard({
    cardId: 'navigieren',
    sourceId: 'goethe-a1',
    sourcePageNumber: 35,
    data: {
      word: 'navigieren',
      type: 'VERB',
      forms: ['navigiert', 'navigierte', 'navigiert'],
      translation: { en: 'to navigate', hu: 'navigálni', ch: 'navigiere' },
      examples: [
        {
          de: 'Ich navigiere durch die Seiten.',
          hu: 'Navigálok az oldalakon.',
          en: 'I navigate through the pages.',
          ch: "Ich navigiere dur d'Site.",
          isSelected: true,
        },
      ],
    },
    state: 'LEARNING',
    learningSteps: 1,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Click the Edit Card button
  await page.getByRole('link', { name: 'Edit Card' }).click();

  // Verify we navigated to the correct card editing page
  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('navigieren');
});

test('grading buttons visibility after reveal', async ({ page }) => {
  await createCard({
    cardId: 'grading_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 40,
    data: {
      word: 'bewerten',
      type: 'VERB',
      forms: ['bewertet', 'bewertete', 'bewertet'],
      translation: { en: 'to grade', hu: 'értékelni', ch: 'bewerte' },
      examples: [
        {
          de: 'Ich bewerte die Karte.',
          hu: 'Értékelem a kártyát.',
          en: 'I grade the card.',
          ch: "Ich bewerte d'Charte.",
          isSelected: true,
        },
      ],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Initially grading buttons should not be visible
  await expect(page.getByRole('button', { name: 'Again' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).not.toBeVisible();

  // Click to reveal the card
  await page.getByRole('heading', { name: 'értékelni' }).click();

  // Now grading buttons should be visible
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
});

test('again button functionality', async ({ page }) => {
  // Create two cards for testing
  await createCard({
    cardId: 'again_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 42,
    data: {
      word: 'wiederholen',
      type: 'VERB',
      forms: ['wiederholt', 'wiederholte', 'wiederholt'],
      translation: { en: 'to repeat', hu: 'ismételni', ch: 'widerhole' },
      examples: [
        {
          de: 'Ich wiederhole das Wort.',
          hu: 'Ismételem a szót.',
          en: 'I repeat the word.',
          ch: "Ich widerhole s'Wort.",
          isSelected: true,
        },
      ],
    },
  });

  await createCard({
    cardId: 'next_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 43,
    data: {
      word: 'nächste',
      type: 'ADJECTIVE',
      translation: { en: 'next', hu: 'következő', ch: 'nöchsti' },
      examples: [
        {
          de: 'Die nächste Karte.',
          hu: 'A következő kártya.',
          en: 'The next card.',
          ch: 'Di nöchsti Charte.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify first card is showing
  await expect(page.getByRole('heading', { name: 'ismételni' })).toBeVisible();

  // Reveal the card
  await page.getByRole('heading', { name: 'ismételni' }).click();

  // Click Again button
  await page.getByRole('button', { name: 'Again' }).click();

  // Verify next card is loaded and card is no longer revealed
  await expect(page.getByRole('heading', { name: 'következő' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ismételni' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Again' })).not.toBeVisible();
});

test('hard button functionality', async ({ page }) => {
  await createCard({
    cardId: 'hard_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 44,
    data: {
      word: 'schwierig',
      type: 'ADJECTIVE',
      translation: { en: 'difficult', hu: 'nehéz', ch: 'schwierig' },
      examples: [
        {
          de: 'Das ist schwierig.',
          hu: 'Ez nehéz.',
          en: 'This is difficult.',
          ch: 'Das isch schwierig.',
          isSelected: true,
        },
      ],
    },
  });

  await createCard({
    cardId: 'second_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 45,
    data: {
      word: 'zweite',
      type: 'ADJECTIVE',
      translation: { en: 'second', hu: 'második', ch: 'zwöiti' },
      examples: [
        {
          de: 'Die zweite Karte.',
          hu: 'A második kártya.',
          en: 'The second card.',
          ch: 'Di zwöiti Charte.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify first card is showing
  await expect(page.getByRole('heading', { name: 'nehéz' })).toBeVisible();

  // Reveal the card
  await page.getByRole('heading', { name: 'nehéz' }).click();

  // Click Hard button
  await page.getByRole('button', { name: 'Hard' }).click();

  // Verify next card is loaded
  await expect(page.getByRole('heading', { name: 'második' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'nehéz' })).not.toBeVisible();
});

test('good button functionality', async ({ page }) => {
  await createCard({
    cardId: 'good_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 46,
    data: {
      word: 'gut',
      type: 'ADJECTIVE',
      translation: { en: 'good', hu: 'jó', ch: 'guet' },
      examples: [
        {
          de: 'Das ist gut.',
          hu: 'Ez jó.',
          en: 'This is good.',
          ch: 'Das isch guet.',
          isSelected: true,
        },
      ],
    },
  });

  await createCard({
    cardId: 'third_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 47,
    data: {
      word: 'dritte',
      type: 'ADJECTIVE',
      translation: { en: 'third', hu: 'harmadik', ch: 'dritti' },
      examples: [
        {
          de: 'Die dritte Karte.',
          hu: 'A harmadik kártya.',
          en: 'The third card.',
          ch: 'Di dritti Charte.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify first card is showing
  await expect(page.getByRole('heading', { name: 'jó' })).toBeVisible();

  // Reveal the card
  await page.getByRole('heading', { name: 'jó' }).click();

  // Click Good button
  await page.getByRole('button', { name: 'Good' }).click();

  // Verify next card is loaded
  await expect(page.getByRole('heading', { name: 'harmadik' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'jó' })).not.toBeVisible();
});

test('easy button functionality', async ({ page }) => {
  await createCard({
    cardId: 'easy_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 48,
    data: {
      word: 'einfach',
      type: 'ADJECTIVE',
      translation: { en: 'easy', hu: 'könnyű', ch: 'eifach' },
      examples: [
        {
          de: 'Das ist einfach.',
          hu: 'Ez könnyű.',
          en: 'This is easy.',
          ch: 'Das isch eifach.',
          isSelected: true,
        },
      ],
    },
  });

  await createCard({
    cardId: 'fourth_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 49,
    data: {
      word: 'vierte',
      type: 'ADJECTIVE',
      translation: { en: 'fourth', hu: 'negyedik', ch: 'vierti' },
      examples: [
        {
          de: 'Die vierte Karte.',
          hu: 'A negyedik kártya.',
          en: 'The fourth card.',
          ch: 'Di vierti Charte.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Verify first card is showing
  await expect(page.getByRole('heading', { name: 'könnyű' })).toBeVisible();

  // Reveal the card
  await page.getByRole('heading', { name: 'könnyű' }).click();

  // Click Easy button
  await page.getByRole('button', { name: 'Easy' }).click();

  // Verify next card is loaded
  await expect(page.getByRole('heading', { name: 'negyedik' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'könnyű' })).not.toBeVisible();
});

test('grading card updates database', async ({ page }) => {
  await createCard({
    cardId: 'database_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 50,
    data: {
      word: 'datenbank',
      type: 'NOUN',
      gender: 'FEMININE',
      translation: { en: 'database', hu: 'adatbázis', ch: 'Datebank' },
      examples: [
        {
          de: 'Die Datenbank wird aktualisiert.',
          hu: 'Az adatbázis frissül.',
          en: 'The database is updated.',
          ch: "D'Datebank wird aktualisiert.",
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  // Reveal the card
  await page.getByRole('heading', { name: 'adatbázis' }).click();

  // Click Good button
  await page.getByRole('button', { name: 'Good' }).click();

  // Wait a moment for the database update
  await page.waitForTimeout(500);

  // Verify the card's FSRS data was updated in the database
  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT state, reps, stability, difficulty
       FROM learn_language.cards
       WHERE id = 'database_test'`
    );
    expect(result.rows.length).toBe(1);
    const row = result.rows[0];

    // After first Good rating from NEW state, should move to LEARNING
    expect(row.state).toBe('LEARNING');
    expect(row.reps).toBe(1);
    expect(parseFloat(row.stability)).toBeGreaterThan(0.0);
    expect(parseFloat(row.difficulty)).toBeGreaterThan(0.0);
  });
});

test('grading card creates review log', async ({ page }) => {
  await createCard({
    cardId: 'review_log_test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 52,
    data: {
      word: 'protokoll',
      type: 'NOUN',
      gender: 'NEUTER',
      translation: { en: 'log', hu: 'napló', ch: 'Protokoll' },
      examples: [
        {
          de: 'Das Protokoll wird erstellt.',
          hu: 'A napló létrejön.',
          en: 'The log is created.',
          ch: "S'Protokoll wird erstellt.",
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await page.getByRole('heading', { name: 'napló' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await page.waitForTimeout(500);

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT card_id, rating, state, stability, difficulty, learning_partner_id
       FROM learn_language.review_logs
       WHERE card_id = 'review_log_test'`
    );
    expect(result.rows.length).toBe(1);
    const row = result.rows[0];

    expect(row.card_id).toBe('review_log_test');
    expect(row.rating).toBe(3);
    expect(row.state).toBe('LEARNING');
    expect(parseFloat(row.stability)).toBeGreaterThan(0.0);
    expect(parseFloat(row.difficulty)).toBeGreaterThan(0.0);
    expect(row.learning_partner_id).toBeNull();
  });
});

test('grading with no next card shows empty state', async ({ page }) => {
  await createCard({
    cardId: 'last_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 51,
    data: {
      word: 'letzte',
      type: 'ADJECTIVE',
      translation: { en: 'last', hu: 'utolsó', ch: 'letscht' },
      examples: [
        {
          de: 'Die letzte Karte.',
          hu: 'Az utolsó kártya.',
          en: 'The last card.',
          ch: 'Di letscht Charte.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');


  await expect(page.getByLabel('State')).toHaveText('New');
  await page.getByRole('heading', { name: 'utolsó' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByLabel('State')).toHaveText('Learning');
  await page.getByRole('heading', { name: 'utolsó' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  // Should show empty state
  await expect(page.getByText('All caught up!')).toBeVisible();
  await expect(page.getByText('No cards are due for review right now.')).toBeVisible();
  await expect(page.getByText('Great job keeping up with your studies! 🎉')).toBeVisible();
});

test('cards due more than 1 hour from now are removed from session', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  await createCard({
    cardId: 'due_now_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 60,
    data: {
      word: 'jetzt',
      type: 'ADVERB',
      translation: { en: 'now', hu: 'most', ch: 'jetzt' },
    },
    due: yesterday,
  });

  await createCard({
    cardId: 'due_later_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 61,
    data: {
      word: 'später',
      type: 'ADVERB',
      translation: { en: 'later', hu: 'később', ch: 'spöter' },
    },
    due: twoHoursFromNow,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { name: 'most' })).toBeVisible();

  await expect(page.getByLabel('State')).toHaveText('New');
  await page.getByRole('heading', { name: 'most' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByLabel('State')).toHaveText('Learning');
  await page.getByRole('heading', { name: 'most' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'később' })).not.toBeVisible();
});

test('most recently reviewed card moves to back of queue', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  await createCard({
    cardId: 'first_card_queue',
    sourceId: 'goethe-a1',
    sourcePageNumber: 62,
    data: {
      word: 'erste',
      type: 'ADJECTIVE',
      translation: { en: 'first', hu: 'első', ch: 'erschti' },
    },
    state: 'LEARNING',
    due: yesterday,
  });

  await createCard({
    cardId: 'second_card_queue',
    sourceId: 'goethe-a1',
    sourcePageNumber: 63,
    data: {
      word: 'zweite',
      type: 'ADJECTIVE',
      translation: { en: 'second', hu: 'második', ch: 'zwöiti' },
    },
    state: 'LEARNING',
    due: yesterday,
  });

  await createCard({
    cardId: 'third_card_queue',
    sourceId: 'goethe-a1',
    sourcePageNumber: 64,
    data: {
      word: 'dritte',
      type: 'ADJECTIVE',
      translation: { en: 'third', hu: 'harmadik', ch: 'dritti' },
    },
    state: 'LEARNING',
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { name: 'első' })).toBeVisible();

  await page.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(page.getByRole('heading', { name: 'második' })).toBeVisible();

  await page.getByRole('heading', { name: 'második' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(page.getByRole('heading', { name: 'harmadik' })).toBeVisible();

  await page.getByRole('heading', { name: 'harmadik' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(page.getByRole('heading', { name: 'első' })).toBeVisible();
});

test('card graded with Again reappears after other due cards', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  await createCard({
    cardId: 'reappear_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 65,
    data: {
      word: 'wiederkommen',
      type: 'VERB',
      translation: { en: 'to come back', hu: 'visszajönni', ch: 'zruggcho' },
    },
    due: yesterday,
  });

  await createCard({
    cardId: 'other_card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 66,
    data: {
      word: 'warten',
      type: 'VERB',
      translation: { en: 'to wait', hu: 'várni', ch: 'warte' },
    },
    due: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { name: 'visszajönni' })).toBeVisible();

  await page.getByRole('heading', { name: 'visszajönni' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(page.getByRole('heading', { name: 'várni' })).toBeVisible();

  await page.getByRole('heading', { name: 'várni' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByRole('heading', { name: 'visszajönni' })).toBeVisible();
});
