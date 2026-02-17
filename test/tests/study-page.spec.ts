import { test, expect } from '../fixtures';
import {
  getColorImageBytes,
  getImageContent,
  yellowImage,
  greenImage,
  createCard,
  uploadMockImage,
  createCardsWithStates,
  getReviewLogsByCardId,
  getCardFromDb,
  getReviewLogs,
  setupDefaultChatModelSettings,
  setupDefaultImageModelSettings,
} from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { Page } from '@playwright/test';

async function pressRemoteKey(page: Page, key: string) {
  await page.evaluate(
    (k) =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, bubbles: true })
      ),
    key
  );
}

test('study page shows start button initially', async ({ page }) => {
  await page.goto('http://localhost:8180/sources/goethe-a1/study');

  await expect(page.getByRole('heading', { name: 'Ready to study?' })).toBeVisible();
  await expect(page.getByText('Click start to begin your study session.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start study session' })).toBeVisible();
});

test('study session shows continue button when returning same day', async ({ page }) => {
  await createCard({
    cardId: 'bleiben-maradni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 5,
    data: {
      word: 'bleiben',
      type: 'VERB',
      translation: { en: 'to stay', hu: 'maradni', ch: 'bliibe' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'maradni' })).toBeVisible();

  expect(page.url()).not.toContain('session=');

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue study session' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start study session' })).not.toBeVisible();

  await page.getByRole('button', { name: 'Continue study session' }).click();

  await expect(flashcard.getByRole('heading', { name: 'maradni' })).toBeVisible();
});

test('study page initial state', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'abfahren-elindulni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByRole('heading', { level: 2, name: 'elindulni, elhagyni' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { level: 2, name: 'abfahren' })).not.toBeVisible();
  await expect(flashcard.getByLabel('Word type')).toHaveText('Ige');
  await expect(flashcard.getByLabel('State: New')).toBeVisible();
  await expect(flashcard.getByText('Gender: Neuter', { exact: true })).not.toBeVisible();
  await expect(flashcard.getByText('fährt ab')).not.toBeVisible();
  await expect(flashcard.getByText('fuhr ab')).not.toBeVisible();
  await expect(flashcard.getByText('abgefahren')).not.toBeVisible();
  await expect(flashcard.getByText('Tizenkét órakor indulunk.')).not.toBeVisible();
  await expect(flashcard.getByText('Mikor indul a vonat?')).toBeVisible();
  await expect(flashcard.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.' })).not.toBeVisible();
  await expect(flashcard.getByRole('img', { name: 'Mikor indul a vonat?' })).toBeVisible();
  const imageContent = await getImageContent(flashcard.getByRole('img', { name: 'Mikor indul a vonat?' }));
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
});

test('study page revealed state', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'abfahren-elindulni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.getByText('elindulni, elhagyni', { exact: true }).click();

  await expect(flashcard.getByText('abfahren', { exact: true })).toBeVisible();
  await expect(flashcard.getByText('elindulni, elhagyni')).not.toBeVisible();
  await expect(flashcard.getByText('abfahra, verlah')).not.toBeVisible();
  await expect(flashcard.getByLabel('Word type')).toHaveText('Ige');
  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  await expect(flashcard.getByText('Gender: Neuter', { exact: true })).toBeVisible();
  await expect(flashcard.getByText('fährt ab')).toBeVisible();
  await expect(flashcard.getByText('fuhr ab')).toBeVisible();
  await expect(flashcard.getByText('abgefahren')).toBeVisible();
  await expect(flashcard.getByText('Wir fahren um zwölf Uhr ab.')).not.toBeVisible();
  await expect(flashcard.getByText('Wann fährt der Zug ab?')).toBeVisible();
  await expect(flashcard.getByText('Mikor indul a vonat?')).not.toBeVisible();

  const imageContent = await getImageContent(flashcard.getByRole('img', { name: 'Wann fährt der Zug ab?' }));
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
});

test('source selector routing works', async ({ page }) => {
  await createCard({
    cardId: 'lernen-tanulni',
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

  await createCard({
    cardId: 'schreiben-irni',
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

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'tanulni' })).toBeVisible();

  await page.getByRole('button', { name: 'Goethe A1' }).click();
  await page.getByRole('menuitem', { name: 'Goethe A2' }).click();

  await expect(page).toHaveURL('http://localhost:8180/sources/goethe-a2/study');

  await page.getByRole('button', { name: 'Start study session' }).click();

  await expect(flashcard.getByRole('heading', { name: 'írni' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'tanulni' })).not.toBeVisible();
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
  await page.getByRole('button', { name: 'Start study session' }).click();

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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await expect(page.getByRole('navigation').getByTitle('New', { exact: true })).toHaveText('3');
  await expect(page.getByRole('navigation').getByTitle('Learning', { exact: true })).toHaveText('2');

  // Open the source selector dropdown
  await page.getByRole('button', { name: 'Goethe A1' }).click();

  // Select the second source
  await page.getByRole('menuitem', { name: 'Goethe A2' }).click();

  // Click start button for new source
  await page.getByRole('button', { name: 'Start study session' }).click();

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
  await page.getByRole('button', { name: 'Start study session' }).click();

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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(page.getByRole('navigation').getByTitle('Review', { exact: true })).toHaveText('1');
  await expect(page.getByRole('navigation').getByTitle('New', { exact: true })).not.toBeVisible();
  await expect(flashcard.getByLabel('State: Review')).toBeVisible();
});

test('mark for review menu item visible in context menu', async ({ page }) => {
  await createCard({
    cardId: 'testen-tesztelni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Mark for Review' })).toBeVisible();
});

test('edit card menu item visible in context menu', async ({ page }) => {
  await createCard({
    cardId: 'bearbeiten-szerkeszteni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Edit Card' })).toBeVisible();
});

test('mark for review button functionality', async ({ page }) => {
  await createCard({
    cardId: 'markieren-megjelolni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Mark for Review' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  const card = await getCardFromDb('markieren-megjelolni');
  expect(card.readiness).toBe('IN_REVIEW');
});

test('mark for review button loads next card', async ({ page }) => {
  // Create two cards
  await createCard({
    cardId: 'erste-elso',
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
    cardId: 'zweite-masodik',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Verify first card is showing (due earlier)
  await expect(flashcard.getByRole('heading', { name: 'első' })).toBeVisible();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Mark for Review' }).click();

  // Verify the second card is now showing
  await expect(flashcard.getByRole('heading', { name: 'második' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'első' })).not.toBeVisible();
});

test('edit card button navigation', async ({ page }) => {
  await createCard({
    cardId: 'navigieren-navigalni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit Card' }).click();

  // Verify we navigated to the correct card editing page
  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('navigieren');
});

test('grading buttons visibility after reveal', async ({ page }) => {
  await createCard({
    cardId: 'bewerten-ertekelni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Initially grading buttons should not be visible
  await expect(page.getByRole('button', { name: 'Again' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).not.toBeVisible();

  // Click to reveal the card
  await flashcard.getByRole('heading', { name: 'értékelni' }).click();

  // Now grading buttons should be visible
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
});

test('again button functionality', async ({ page }) => {
  // Create two cards for testing
  await createCard({
    cardId: 'wiederholen-ismetelni',
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
    cardId: 'nachste-kovetkezo',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Verify first card is showing
  await expect(flashcard.getByRole('heading', { name: 'ismételni' })).toBeVisible();

  // Reveal the card
  await flashcard.getByRole('heading', { name: 'ismételni' }).click();

  // Click Again button
  await page.getByRole('button', { name: 'Again' }).click();

  // Verify next card is loaded and card is no longer revealed
  await expect(flashcard.getByRole('heading', { name: 'következő' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'ismételni' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Again' })).not.toBeVisible();

  const reviewLogs = await getReviewLogsByCardId('wiederholen-ismetelni');
  expect(reviewLogs).toEqual([
    expect.objectContaining({ cardId: 'wiederholen-ismetelni', rating: 1 }),
  ]);
});

test('hard button functionality', async ({ page }) => {
  await createCard({
    cardId: 'schwierig-nehez',
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
    cardId: 'zweite-masodik2',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Verify first card is showing
  await expect(flashcard.getByRole('heading', { name: 'nehéz' })).toBeVisible();

  // Reveal the card
  await flashcard.getByRole('heading', { name: 'nehéz' }).click();

  // Click Hard button
  await page.getByRole('button', { name: 'Hard' }).click();

  // Verify next card is loaded
  await expect(flashcard.getByRole('heading', { name: 'második' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'nehéz' })).not.toBeVisible();

  const reviewLogs = await getReviewLogsByCardId('schwierig-nehez');
  expect(reviewLogs).toEqual([
    expect.objectContaining({ cardId: 'schwierig-nehez', rating: 2 }),
  ]);
});

test('good button functionality', async ({ page }) => {
  await createCard({
    cardId: 'gut-jo',
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
    cardId: 'dritte-harmadik',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Verify first card is showing
  await expect(flashcard.getByRole('heading', { name: 'jó' })).toBeVisible();

  // Reveal the card
  await flashcard.getByRole('heading', { name: 'jó' }).click();

  // Click Good button
  await page.getByRole('button', { name: 'Good' }).click();

  // Verify next card is loaded
  await expect(flashcard.getByRole('heading', { name: 'harmadik' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'jó' })).not.toBeVisible();

  const reviewLogs = await getReviewLogsByCardId('gut-jo');
  expect(reviewLogs).toEqual([
    expect.objectContaining({ cardId: 'gut-jo', rating: 3 }),
  ]);
});

test('easy button functionality', async ({ page }) => {
  await createCard({
    cardId: 'einfach-konnyu',
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
    cardId: 'vierte-negyedik',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Verify first card is showing
  await expect(flashcard.getByRole('heading', { name: 'könnyű' })).toBeVisible();

  // Reveal the card
  await flashcard.getByRole('heading', { name: 'könnyű' }).click();

  // Click Easy button
  await page.getByRole('button', { name: 'Easy' }).click();

  // Verify next card is loaded
  await expect(flashcard.getByRole('heading', { name: 'negyedik' })).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'könnyű' })).not.toBeVisible();

  const reviewLogs = await getReviewLogsByCardId('einfach-konnyu');
  expect(reviewLogs).toEqual([
    expect.objectContaining({ cardId: 'einfach-konnyu', rating: 4 }),
  ]);
});

test('grading card updates database', async ({ page }) => {
  await createCard({
    cardId: 'datenbank-adatbazis',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  // Reveal the card
  await flashcard.getByRole('heading', { name: 'adatbázis' }).click();

  // Click Good button
  await page.getByRole('button', { name: 'Good' }).click();

  // Wait a moment for the database update
  await page.waitForTimeout(500);

  const card = await getCardFromDb('datenbank-adatbazis');
  expect(card.state).toBe('LEARNING');
  expect(card.reps).toBe(1);
  expect(card.stability).toBeGreaterThan(0.0);
  expect(card.difficulty).toBeGreaterThan(0.0);
});

test('grading card creates review log', async ({ page }) => {
  await createCard({
    cardId: 'protokoll-naplo',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await flashcard.getByRole('heading', { name: 'napló' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await page.waitForTimeout(500);

  const reviewLogs = await getReviewLogsByCardId('protokoll-naplo');
  expect(reviewLogs).toHaveLength(1);
  expect(reviewLogs[0].cardId).toBe('protokoll-naplo');
  expect(reviewLogs[0].rating).toBe(3);
  expect(reviewLogs[0].state).toBe('LEARNING');
  expect(reviewLogs[0].stability).toBeGreaterThan(0.0);
  expect(reviewLogs[0].difficulty).toBeGreaterThan(0.0);
  expect(reviewLogs[0].learningPartnerId).toBeNull();
});

test('grading with no next card shows empty state', async ({ page }) => {
  await createCard({
    cardId: 'letzte-utolso',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByLabel('State: New')).toBeVisible();
  await flashcard.getByRole('heading', { name: 'utolsó' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  await flashcard.getByRole('heading', { name: 'utolsó' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  // Should show empty state
  await expect(page.getByText('All caught up!')).toBeVisible();
  await expect(page.getByText('No cards are due for review right now.')).toBeVisible();
  await expect(page.getByText('Great job keeping up with your studies! 🎉')).toBeVisible();
});

test('confetti celebration appears when all cards are caught up', async ({ page }) => {
  await createCard({
    cardId: 'confetti-test-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 51,
    data: {
      word: 'feiern',
      type: 'VERB',
      translation: { en: 'to celebrate', hu: 'ünnepelni', ch: 'fiire' },
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await flashcard.getByRole('heading', { name: 'ünnepelni' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await flashcard.getByRole('heading', { name: 'ünnepelni' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
  await expect(page.locator('app-confetti canvas')).toBeVisible();
});

test('cards due more than 1 hour from now are removed from session', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  await createCard({
    cardId: 'jetzt-most',
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
    cardId: 'spater-kesobb',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByRole('heading', { name: 'most' })).toBeVisible();

  await expect(flashcard.getByLabel('State: New')).toBeVisible();
  await flashcard.getByRole('heading', { name: 'most' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  await flashcard.getByRole('heading', { name: 'most' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
  await expect(flashcard.getByRole('heading', { name: 'később' })).not.toBeVisible();
});

test('most recently reviewed card moves to back of queue', async ({ page }) => {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
  const yesterday = new Date(now.getTime() - 86400000);

  await createCard({
    cardId: 'erste-elso2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 62,
    data: {
      word: 'erste',
      type: 'ADJECTIVE',
      translation: { en: 'first', hu: 'első', ch: 'erschti' },
    },
    state: 'LEARNING',
    due: threeDaysAgo,
    stability: 0.4,
    difficulty: 5.0,
    learningSteps: 1,
    lastReview: threeDaysAgo,
  });

  await createCard({
    cardId: 'zweite-masodik3',
    sourceId: 'goethe-a1',
    sourcePageNumber: 63,
    data: {
      word: 'zweite',
      type: 'ADJECTIVE',
      translation: { en: 'second', hu: 'második', ch: 'zwöiti' },
    },
    state: 'LEARNING',
    due: twoDaysAgo,
    stability: 0.4,
    difficulty: 5.0,
    learningSteps: 1,
    lastReview: twoDaysAgo,
  });

  await createCard({
    cardId: 'dritte-harmadik2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 64,
    data: {
      word: 'dritte',
      type: 'ADJECTIVE',
      translation: { en: 'third', hu: 'harmadik', ch: 'dritti' },
    },
    state: 'LEARNING',
    due: yesterday,
    stability: 0.4,
    difficulty: 5.0,
    learningSteps: 1,
    lastReview: yesterday,
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByRole('heading', { name: 'első' })).toBeVisible();

  await flashcard.getByRole('heading', { name: 'első' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(flashcard.getByRole('heading', { name: 'második' })).toBeVisible();

  await flashcard.getByRole('heading', { name: 'második' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(flashcard.getByRole('heading', { name: 'harmadik' })).toBeVisible();

  await flashcard.getByRole('heading', { name: 'harmadik' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(flashcard.getByRole('heading', { name: 'első' })).toBeVisible();
});

test('card graded with Again reappears after other due cards', async ({ page }) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  await createCard({
    cardId: 'wiederkommen-visszajonni',
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
    cardId: 'warten-varni',
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
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByRole('heading', { name: 'visszajönni' })).toBeVisible();

  await flashcard.getByRole('heading', { name: 'visszajönni' }).click();
  await page.getByRole('button', { name: 'Again' }).click();

  await expect(flashcard.getByRole('heading', { name: 'várni' })).toBeVisible();

  await flashcard.getByRole('heading', { name: 'várni' }).click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByRole('heading', { name: 'visszajönni' })).toBeVisible();
});

test('speech card study page initial state shows Hungarian translation', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'a1b2c3d4',
    sourceId: 'speech-a1',
    sourcePageNumber: 5,
    data: {
      examples: [
        {
          de: 'Guten Morgen, wie geht es Ihnen?',
          hu: 'Jó reggelt, hogy van?',
          en: 'Good morning, how are you?',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText('Jó reggelt, hogy van?')).toBeVisible();
  await expect(flashcard.getByText('Guten Morgen, wie geht es Ihnen?')).not.toBeVisible();
  await expect(flashcard.getByLabel('State: New')).toBeVisible();
  const imageContent = await getImageContent(flashcard.getByRole('img', { name: 'Jó reggelt, hogy van?' }));
  expect(imageContent.equals(getColorImageBytes('yellow', 1200))).toBeTruthy();
});

test('speech card study page revealed state shows German sentence', async ({ page }) => {
  const image1 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'e5f6g7h8',
    sourceId: 'speech-a1',
    sourcePageNumber: 6,
    state: 'LEARNING',
    data: {
      examples: [
        {
          de: 'Ich fahre jeden Tag mit dem Bus zur Arbeit.',
          hu: 'Minden nap busszal járok dolgozni.',
          en: 'I take the bus to work every day.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await flashcard.click();

  await expect(flashcard.getByText('Ich fahre jeden Tag mit dem Bus zur Arbeit.')).toBeVisible();
  await expect(flashcard.getByText('Minden nap busszal járok dolgozni.')).not.toBeVisible();
  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  const imageContent = await getImageContent(flashcard.getByRole('img', { name: 'Ich fahre jeden Tag mit dem Bus zur Arbeit.' }));
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
});

test('speech card grading functionality', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'i9j0k1l2',
    sourceId: 'speech-a1',
    sourcePageNumber: 7,
    data: {
      examples: [
        {
          de: 'Das Wetter ist heute sehr schön.',
          hu: 'Ma nagyon szép az idő.',
          en: 'The weather is very nice today.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText('Ma nagyon szép az idő.')).toBeVisible();

  await flashcard.click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
});

test('grammar card study shows sentence with gaps on front, full sentence on reveal', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'grammar-test-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      examples: [
        {
          de: 'Ich gehe [jeden] Tag in die Schule.',
          en: 'I go to school every day.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
      audio: [{ id: 'test-audio', text: 'Ich gehe jeden Tag in die Schule.', language: 'de' }],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.locator('.gap-word.masked')).toBeVisible();
  await expect(flashcard.locator('.gap-word.masked')).toHaveText('jeden');

  await flashcard.click();

  await expect(flashcard.locator('.gap-word.highlighted')).toBeVisible();
  await expect(flashcard.locator('.gap-word.highlighted')).toHaveText('jeden');
});

test('grammar card grading functionality', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
  const image1 = uploadMockImage(greenImage);
  await createCard({
    cardId: 'grammar-grade-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 2,
    data: {
      examples: [
        {
          de: 'Er [trinkt] jeden Morgen Kaffee.',
          en: 'He drinks coffee every morning.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/grammar-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.locator('.gap-word.masked')).toHaveText('trinkt');

  await flashcard.click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  await flashcard.click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
});

test('Enter key reveals and unreveals card', async ({ page }) => {
  await createCard({
    cardId: 'keyboard-reveal-test',
    sourceId: 'goethe-a1',
    sourcePageNumber: 70,
    data: {
      word: 'Tastatur',
      type: 'NOUN',
      gender: 'FEMININE',
      translation: { en: 'keyboard', hu: 'billentyűzet', ch: 'Tastatur' },
      examples: [
        {
          de: 'Ich benutze eine Tastatur.',
          hu: 'Billentyűzetet használok.',
          en: 'I use a keyboard.',
          isSelected: true,
        },
      ],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'billentyűzet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).not.toBeVisible();

  await page.keyboard.press('Enter');

  await expect(flashcard.getByText('Tastatur', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();

  await page.keyboard.press('Enter');

  await expect(flashcard.getByRole('heading', { name: 'billentyűzet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).not.toBeVisible();
});

test('Green color key grades card as Good when revealed', async ({ page }) => {
  await createCard({
    cardId: 'green-key-test-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 71,
    data: {
      word: 'Fernbedienung',
      type: 'NOUN',
      gender: 'FEMININE',
      translation: { en: 'remote control', hu: 'távirányító', ch: 'Fernbediänig' },
      examples: [
        {
          de: 'Wo ist die Fernbedienung?',
          hu: 'Hol van a távirányító?',
          en: 'Where is the remote control?',
          isSelected: true,
        },
      ],
    },
  });

  await createCard({
    cardId: 'green-key-test-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 72,
    data: {
      word: 'Fernseher',
      type: 'NOUN',
      gender: 'MASCULINE',
      translation: { en: 'television', hu: 'televízió', ch: 'Fernseh' },
      examples: [
        {
          de: 'Der Fernseher ist an.',
          hu: 'A televízió be van kapcsolva.',
          en: 'The television is on.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'távirányító' })).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();

  await pressRemoteKey(page, 'Green');

  await expect(flashcard.getByRole('heading', { name: 'televízió' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).not.toBeVisible();
});

test('all color keys map to correct grades', async ({ page }) => {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

  const learningCardDefaults = {
    state: 'LEARNING' as const,
    stability: 0.4,
    difficulty: 5.0,
    lastReview: twoDaysAgo,
    reps: 1,
    learningSteps: 1,
  };

  await createCard({
    cardId: 'color-keys-card-1',
    sourceId: 'goethe-a1',
    sourcePageNumber: 73,
    data: {
      word: 'rot',
      type: 'ADJECTIVE',
      translation: { en: 'red', hu: 'piros', ch: 'rot' },
    },
    ...learningCardDefaults,
    due: new Date(now.getTime() - 4 * 3600000),
  });

  await createCard({
    cardId: 'color-keys-card-2',
    sourceId: 'goethe-a1',
    sourcePageNumber: 74,
    data: {
      word: 'gelb',
      type: 'ADJECTIVE',
      translation: { en: 'yellow', hu: 'sárga', ch: 'gäub' },
    },
    ...learningCardDefaults,
    due: new Date(now.getTime() - 3 * 3600000),
  });

  await createCard({
    cardId: 'color-keys-card-3',
    sourceId: 'goethe-a1',
    sourcePageNumber: 75,
    data: {
      word: 'grün',
      type: 'ADJECTIVE',
      translation: { en: 'green', hu: 'zöld', ch: 'grüen' },
    },
    ...learningCardDefaults,
    due: new Date(now.getTime() - 2 * 3600000),
  });

  await createCard({
    cardId: 'color-keys-card-4',
    sourceId: 'goethe-a1',
    sourcePageNumber: 76,
    data: {
      word: 'blau',
      type: 'ADJECTIVE',
      translation: { en: 'blue', hu: 'kék', ch: 'blau' },
    },
    ...learningCardDefaults,
    due: new Date(now.getTime() - 1 * 3600000),
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  const gradeButtons = page.getByRole('button', { name: 'Again' });

  for (const key of ['Red', 'Yellow', 'Green', 'Blue']) {
    await expect(flashcard.getByRole('heading')).toBeVisible();
    await flashcard.click();
    await expect(gradeButtons).toBeVisible();
    await pressRemoteKey(page, key);
  }

  await expect(flashcard).toBeVisible();

  const reviewLogs = await getReviewLogs();
  const ratings = reviewLogs.map((log) => log.rating).sort();
  expect(ratings).toEqual([1, 2, 3, 4]);
});

test('color keys do not grade when card is not revealed', async ({ page }) => {
  await createCard({
    cardId: 'no-grade-unrevealed',
    sourceId: 'goethe-a1',
    sourcePageNumber: 77,
    data: {
      word: 'Schutz',
      type: 'NOUN',
      gender: 'MASCULINE',
      translation: { en: 'protection', hu: 'védelem', ch: 'Schutz' },
      examples: [
        {
          de: 'Der Schutz ist wichtig.',
          hu: 'A védelem fontos.',
          en: 'Protection is important.',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'védelem' })).toBeVisible();

  await pressRemoteKey(page, 'Green');
  await pressRemoteKey(page, 'Red');
  await pressRemoteKey(page, 'Yellow');
  await pressRemoteKey(page, 'Blue');

  await expect(flashcard.getByRole('heading', { name: 'védelem' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).not.toBeVisible();
});
