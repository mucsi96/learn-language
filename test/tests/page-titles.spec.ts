import { test, expect } from '../fixtures';
import { createCard, navigateToCardEditing, setupDefaultChatModelSettings } from '../utils';

test('home page title', async ({ page }) => {
  await page.goto('http://localhost:8180/');
  await expect(page).toHaveTitle('');
});

test('sources page title', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await expect(page).toHaveTitle('Sources');
});

test('source page title', async ({ page }) => {
  await page.goto('http://localhost:8180/sources/goethe-a1/page/9');
  await expect(page).toHaveTitle('9 / goethe-a1');
});

test('card page title', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createCard({
      cardId: 'abfahren',
      sourceId: 'goethe-a1',
      sourcePageNumber: 9,
      data: {
        word: 'abfahren',
        type: 'NOUN',
        gender: 'FEMININE',
        forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
        translation: {
          en: 'to leave',
          hu: 'elindulni, elhagyni',
          ch: 'abfahra, verlah',
        },
        examples: [
          {
            de: 'Wir fahren um zwölf Uhr ab.',
            hu: 'Tizenkét órakor indulunk.',
            en: "We leave at twelve o'clock.",
            ch: 'Mir fahred am zwöufi ab.',
            images: [],
          },
          {
            de: 'Wann fährt der Zug ab?',
            hu: 'Mikor indul a vonat?',
            en: 'When does the train leave?',
            ch: 'Wänn fahrt dr',
            isSelected: true,
            images: [],
          },
        ],
      },
    });
  await navigateToCardEditing(page);
  await expect(page).toHaveTitle('abfahren');
});
