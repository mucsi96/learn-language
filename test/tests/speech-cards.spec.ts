import { test, expect } from '../fixtures';
import {
  createCard,
  uploadMockImage,
  yellowImage,
  greenImage,
  getImageContent,
  getColorImageBytes,
  withDbConnection,
  createSource,
} from '../utils';

async function createSpeechSource(): Promise<void> {
  await createSource({
    id: 'speech-a1',
    name: 'Speech A1',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'SPEECH',
    formatType: 'FLOWING_TEXT',
    sourceType: 'IMAGES',
  });
}

test.beforeEach(async () => {
  await createSpeechSource();
});

test('speech card displays Hungarian sentence on front side', async ({ page }) => {
  const imageId = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'a1b2c3d4e5f6g7h8',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
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
          images: [{ id: imageId, isFavorite: true }],
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
});

test('speech card displays German sentence on back side after reveal', async ({ page }) => {
  const imageId = uploadMockImage(greenImage);
  await createCard({
    cardId: 'b2c3d4e5f6g7h8i9',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich fahre jeden Tag mit dem Bus zur Arbeit.',
      translation: {
        hu: 'Minden nap busszal járok dolgozni.',
        en: 'I take the bus to work every day.',
      },
      examples: [
        {
          de: 'Ich fahre jeden Tag mit dem Bus zur Arbeit.',
          hu: 'Minden nap busszal járok dolgozni.',
          en: 'I take the bus to work every day.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByText('Minden nap busszal járok dolgozni.')).toBeVisible();
  await flashcard.getByText('Minden nap busszal járok dolgozni.').click();

  await expect(flashcard.getByText('Ich fahre jeden Tag mit dem Bus zur Arbeit.')).toBeVisible();
  await expect(flashcard.getByText('Minden nap busszal járok dolgozni.')).not.toBeVisible();
});

test('speech card shows image when available', async ({ page }) => {
  const imageId = uploadMockImage(greenImage);
  await createCard({
    cardId: 'c3d4e5f6g7h8i9j0',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Das Wetter ist heute sehr schön.',
      translation: {
        hu: 'Ma nagyon szép az idő.',
        en: 'The weather is very nice today.',
      },
      examples: [
        {
          de: 'Das Wetter ist heute sehr schön.',
          hu: 'Ma nagyon szép az idő.',
          en: 'The weather is very nice today.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  const image = flashcard.getByRole('img', { name: 'Ma nagyon szép az idő.' });
  await expect(image).toBeVisible();
  const imageContent = await getImageContent(image);
  expect(imageContent.equals(getColorImageBytes('green', 1200))).toBeTruthy();
});

test('speech card grading works correctly', async ({ page }) => {
  await createCard({
    cardId: 'd4e5f6g7h8i9j0k1',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Können Sie mir bitte helfen?',
      translation: {
        hu: 'Tudna segíteni?',
        en: 'Can you help me please?',
      },
      examples: [
        {
          de: 'Können Sie mir bitte helfen?',
          hu: 'Tudna segíteni?',
          en: 'Can you help me please?',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  await expect(flashcard.getByLabel('State: New')).toBeVisible();
  await flashcard.getByText('Tudna segíteni?').click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(flashcard.getByLabel('State: Learning')).toBeVisible();
  await flashcard.getByText('Tudna segíteni?').click();
  await page.getByRole('button', { name: 'Good' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
});

test('speech card mark for review works', async ({ page }) => {
  await createCard({
    cardId: 'e5f6g7h8i9j0k1l2',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Entschuldigung, wo ist der Bahnhof?',
      translation: {
        hu: 'Elnézést, hol van a pályaudvar?',
        en: 'Excuse me, where is the train station?',
      },
      examples: [
        {
          de: 'Entschuldigung, wo ist der Bahnhof?',
          hu: 'Elnézést, hol van a pályaudvar?',
          en: 'Excuse me, where is the train station?',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Mark for Review' }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      "SELECT readiness FROM learn_language.cards WHERE id = 'e5f6g7h8i9j0k1l2'"
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('IN_REVIEW');
  });
});

test('edit card navigation works for speech cards', async ({ page }) => {
  await createCard({
    cardId: 'f6g7h8i9j0k1l2m3',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich möchte einen Kaffee bestellen.',
      translation: {
        hu: 'Szeretnék egy kávét rendelni.',
        en: 'I would like to order a coffee.',
      },
      examples: [
        {
          de: 'Ich möchte einen Kaffee bestellen.',
          hu: 'Szeretnék egy kávét rendelni.',
          en: 'I would like to order a coffee.',
          isSelected: true,
        },
      ],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit Card' }).click();

  await expect(page.getByLabel('German Sentence')).toBeVisible();
  await expect(page.getByLabel('German Sentence')).toHaveValue(
    'Ich möchte einen Kaffee bestellen.'
  );
  await expect(page.getByLabel('Hungarian Translation')).toHaveValue(
    'Szeretnék egy kávét rendelni.'
  );
});

test('speech card edit page allows updating sentence', async ({ page }) => {
  await createCard({
    cardId: 'g7h8i9j0k1l2m3n4',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Das ist mein Bruder.',
      translation: {
        hu: 'Ez az én bátyám.',
        en: 'This is my brother.',
      },
      examples: [
        {
          de: 'Das ist mein Bruder.',
          hu: 'Ez az én bátyám.',
          en: 'This is my brother.',
          isSelected: true,
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto(
    'http://localhost:8180/sources/speech-a1/page/1/cards/g7h8i9j0k1l2m3n4'
  );

  await expect(page.getByRole('heading', { name: 'Sentence' })).toBeVisible();

  const germanInput = page.getByLabel('German Sentence');
  await expect(germanInput).toHaveValue('Das ist mein Bruder.');

  await germanInput.clear();
  await germanInput.fill('Das ist meine Schwester.');

  const hungarianInput = page.getByLabel('Hungarian Translation');
  await hungarianInput.clear();
  await hungarianInput.fill('Ez az én húgom.');

  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.getByText('Card updated successfully')).toBeVisible();
});

test('speech cards appear in in-review-cards page with correct type', async ({
  page,
}) => {
  await createCard({
    cardId: 'h8i9j0k1l2m3n4o5',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Wie spät ist es?',
      translation: {
        hu: 'Hány óra van?',
        en: 'What time is it?',
      },
      examples: [
        {
          de: 'Wie spät ist es?',
          hu: 'Hány óra van?',
          en: 'What time is it?',
          isSelected: true,
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await expect(page.getByText('Wie spät ist es?')).toBeVisible();
  await expect(page.getByText('Sentence')).toBeVisible();
  await expect(page.getByText('HU: Hány óra van?')).toBeVisible();
});

test('speech card study session persists after page refresh', async ({
  page,
}) => {
  await createCard({
    cardId: 'i9j0k1l2m3n4o5p6',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Ich verstehe das nicht.',
      translation: {
        hu: 'Ezt nem értem.',
        en: "I don't understand this.",
      },
      examples: [
        {
          de: 'Ich verstehe das nicht.',
          hu: 'Ezt nem értem.',
          en: "I don't understand this.",
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText('Ezt nem értem.')).toBeVisible();

  const url = page.url();
  expect(url).toContain('session=');

  await page.reload();

  await expect(flashcard.getByText('Ezt nem értem.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start study session' })
  ).not.toBeVisible();
});

test('speech card switches image after reveal', async ({ page }) => {
  const imageId = uploadMockImage(greenImage);
  await createCard({
    cardId: 'j0k1l2m3n4o5p6q7',
    sourceId: 'speech-a1',
    sourcePageNumber: 1,
    data: {
      sentence: 'Der Apfel ist rot.',
      translation: {
        hu: 'Az alma piros.',
        en: 'The apple is red.',
      },
      examples: [
        {
          de: 'Der Apfel ist rot.',
          hu: 'Az alma piros.',
          en: 'The apple is red.',
          isSelected: true,
          images: [{ id: imageId, isFavorite: true }],
        },
      ],
    },
    state: 'LEARNING',
  });

  await page.goto('http://localhost:8180/sources/speech-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });

  const frontImage = flashcard.getByRole('img', { name: 'Az alma piros.' });
  await expect(frontImage).toBeVisible();

  await flashcard.getByText('Az alma piros.').click();

  const backImage = flashcard.getByRole('img', {
    name: 'Der Apfel ist rot.',
  });
  await expect(backImage).toBeVisible();
});
