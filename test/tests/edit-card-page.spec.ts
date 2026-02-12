import { test, expect } from '../fixtures';
import {
  createCard,
  downloadImage,
  getColorImageBytes,
  getImageContent,
  withDbConnection,
  yellowImage,
  redImage,
  blueImage,
  greenImage,
  navigateToCardEditing,
  uploadMockImage,
  setupDefaultChatModelSettings,
} from '../utils';
import { Page } from '@playwright/test';

async function prepareCard(page: Page) {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(redImage);
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
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
          images: [{ id: image1 }, { id: image2 }],
        },
      ],
    },
  });
  return await navigateToCardEditing(page);
}

test('carousel indicator initial', async ({ page }) => {
  await prepareCard(page);
  await expect(page.getByText('1 / 2')).toBeVisible();
});

test('prev button disabled on first image', async ({ page }) => {
  await prepareCard(page);
  const prevButton = page.getByRole('button', { name: 'Previous image' }).first();
  await expect(prevButton).toBeDisabled();
});

test('next button enabled on first image', async ({ page }) => {
  await prepareCard(page);
  const nextButton = page.getByRole('button', { name: 'Next image' }).first();
  await expect(nextButton).toBeEnabled();
});

test('next click updates indicator and disables next', async ({ page }) => {
  await prepareCard(page);
  const nextButton = page.getByRole('button', { name: 'Next image' }).first();
  await nextButton.click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await expect(nextButton).toBeDisabled();
});

test('prev click from last image', async ({ page }) => {
  await prepareCard(page);
  const nextButton = page.getByRole('button', { name: 'Next image' }).first();
  const prevButton = page.getByRole('button', { name: 'Previous image' }).first();
  await nextButton.click();
  await prevButton.click();
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(prevButton).toBeDisabled();
  await expect(nextButton).toBeEnabled();
});

test('image on first page', async ({ page }) => {
  await prepareCard(page);
  const imageContent = await getImageContent(page.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.' }));
  expect(imageContent.equals(getColorImageBytes('yellow'))).toBeTruthy();
});

test('image content changes on navigation', async ({ page }) => {
  await prepareCard(page);
  const nextButton = page.getByRole('button', { name: 'Next image' }).first();
  await nextButton.click();
  const image2 = await getImageContent(page.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.' }));
  expect(image2.equals(getColorImageBytes('red'))).toBeTruthy();
});

test('back button navigates to source page', async ({ page }) => {
  await prepareCard(page);
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByText('Seite 9')).toBeVisible();
  await expect(page.getByText('die Abfahrt')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Page' })).toHaveValue('9');
});

test('card editing page', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(redImage);
  await createCard({
    cardId: 'abfahren-elindulni',
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
          images: [{ id: image1 }],
        },
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          ch: 'Wänn fahrt dr',
          isSelected: true,
          images: [{ id: image2 }],
        },
      ],
    },
  });
  await navigateToCardEditing(page);

  // Word section
  await expect(page.getByRole('combobox', { name: 'Word type' })).toHaveText('Főnév');
  await expect(page.getByRole('combobox', { name: 'Gender' })).toHaveText('Feminine');
  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('abfahren');
  await expect(page.getByLabel('Hungarian translation', { exact: true })).toHaveValue('elindulni, elhagyni');
  await expect(page.getByLabel('Swiss German translation', { exact: true })).toHaveValue('abfahra, verlah');

  // Forms section
  await expect(page.getByLabel('Form', { exact: true }).nth(0)).toHaveValue('fährt ab');
  await expect(page.getByLabel('Form', { exact: true }).nth(1)).toHaveValue('fuhr ab');
  await expect(page.getByLabel('Form', { exact: true }).nth(2)).toHaveValue('abgefahren');

  // Examples section
  await expect(page.getByLabel('Example in German', { exact: true }).nth(0)).toHaveValue('Wir fahren um zwölf Uhr ab.');
  await expect(page.getByLabel('Example in Hungarian', { exact: true }).nth(0)).toHaveValue(
    'Tizenkét órakor indulunk.'
  );
  await expect(page.getByLabel('Example in Swiss German', { exact: true }).nth(0)).toHaveValue(
    'Mir fahred am zwöufi ab.'
  );

  // Images
  const imageContent1 = await getImageContent(page.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.' }));
  const imageContent2 = await getImageContent(page.getByRole('img', { name: 'Wann fährt der Zug ab?' }));
  expect(imageContent1.equals(getColorImageBytes('yellow'))).toBeTruthy();
  expect(imageContent2.equals(getColorImageBytes('red'))).toBeTruthy();
});

test('card editing in db', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(blueImage);
  const image2 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
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
          images: [{ id: image1 }],
          isSelected: true,
        },
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          ch: 'Wänn fahrt dr',
          images: [{ id: image2 }],
        },
      ],
    },
  });
  await navigateToCardEditing(page);
  await page.getByLabel('Hungarian translation').fill('elindulni, elutazni');

  await page.waitForLoadState('networkidle');

  const imageLocator = page.getByRole('img', {
    name: 'Wann fährt der Zug ab?',
  });
  await page.getByRole('button', { name: 'Add example image' }).nth(1).click();
  await expect(page.getByText('Gemini 3 Pro')).toBeVisible();

  const imageContent2 = await getImageContent(imageLocator);

  expect(imageContent2.equals(getColorImageBytes('green'))).toBeTruthy();

  await page.getByRole('radio').nth(1).click();
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Card updated successfully')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'abfahren-elindulni'");

    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    expect(cardData.translation.hu).toBe('elindulni, elutazni');
    expect(cardData.examples[0].isSelected).toBeUndefined();
    expect(cardData.examples[1].isSelected).toBe(true);
    expect(cardData.word).toBe('abfahren');
    expect(cardData.translation.ch).toBe('abfahra, verlah');
    expect(cardData.forms).toContain('fährt ab');

    const img1 = downloadImage(cardData.examples[1].images[0].id);
    const img2 = downloadImage(cardData.examples[1].images[1].id);
    const img3 = downloadImage(cardData.examples[1].images[2].id);
    expect(img1.equals(yellowImage)).toBeTruthy();
    expect(img2.equals(redImage)).toBeTruthy();
    expect(img3.equals(greenImage)).toBeTruthy();

    expect(cardData.examples[0].images).toHaveLength(1);
    expect(cardData.examples[1].images).toHaveLength(5);
    expect(cardData.examples[1].images[1].model).toBe('GPT Image 1.5');
    expect(cardData.examples[1].images[2].model).toBe('GPT Image 1.5');
    expect(cardData.examples[1].images[3].model).toBe('Gemini 3 Pro');
    expect(cardData.examples[1].images[4].model).toBe('Gemini 3 Pro');
  });
});

test('favorite image in db', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(redImage);
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
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
          images: [{ id: image1, isFavorite: true }],
        },
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          ch: 'Wänn fahrt dr',
          images: [{ id: image2 }],
        },
      ],
    },
  });

  await navigateToCardEditing(page);

  // Verify initial favorite state
  await expect(page.getByRole('button', { name: 'Toggle favorite' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Toggle favorite' }).last()).not.toHaveAttribute(
    'aria-pressed',
    'true'
  );

  // Toggle favorite state of second image
  await page.getByRole('button', { name: 'Toggle favorite' }).last().hover();
  await page.getByRole('button', { name: 'Toggle favorite' }).last().click();
  await expect(page.getByRole('button', { name: 'Toggle favorite' }).last()).toHaveAttribute('aria-pressed', 'true');

  // Toggle favorite state of first image
  await page.getByRole('button', { name: 'Toggle favorite' }).first().click();
  await expect(page.getByRole('button', { name: 'Toggle favorite' }).first()).not.toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await page.waitForTimeout(100);

  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Card updated successfully')).toBeVisible();

  // Verify database state
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'abfahren-elindulni'");
    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    // Verify the favorite states were updated correctly
    expect(cardData.examples[0].images[0].isFavorite).toBeUndefined();
    expect(cardData.examples[1].images[0].isFavorite).toBe(true);

    // Verify all other card data remained unchanged
    expect(cardData.word).toBe('abfahren');
    expect(cardData.translation.hu).toBe('elindulni, elhagyni');
    expect(cardData.forms).toContain('fährt ab');
  });
});

test('word type editing', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
      gender: 'NEUTER',
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
          images: [{ id: image1 }],
        },
      ],
    },
  });

  await navigateToCardEditing(page);

  // Verify initial word type
  await expect(page.getByRole('combobox', { name: 'Word type' })).toHaveText('Ige');

  // Change the word type from VERB to NOUN
  await page.getByRole('combobox', { name: 'Word type' }).click();
  await page.getByRole('option', { name: 'Főnév' }).click();
  await page.getByRole('combobox', { name: 'Gender' }).click();
  await page.getByRole('option', { name: 'Masculine' }).click();

  // Submit the changes
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Card updated successfully')).toBeVisible();

  // Verify the change was saved in the database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'abfahren-elindulni'");
    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;

    // Verify the word type was updated correctly
    expect(cardData.type).toBe('NOUN');
    expect(cardData.gender).toBe('MASCULINE');

    // Verify other card data remained unchanged
    expect(cardData.word).toBe('abfahren');
    expect(cardData.translation.hu).toBe('elindulni, elhagyni');
    expect(cardData.forms).toContain('fährt ab');
  });
});

test('example image addition', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(blueImage);
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
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
          images: [{ id: image1 }],
        },
      ],
    },
  });
  await navigateToCardEditing(page);

  const imageLocator = page.getByRole('img', {
    name: 'Wir fahren um zwölf Uhr ab.',
  });
  await imageLocator.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.getByRole('button', { name: 'Add example image' }).first().click();
  await expect(page.getByText('Gemini 3 Pro')).toBeVisible();

  const regeneratedImageContent = await getImageContent(page.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.' }));
  expect(regeneratedImageContent.equals(getColorImageBytes('yellow'))).toBeTruthy();

});

test('card deletion', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
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
        },
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          ch: 'Wänn fahrt dr',
          isSelected: true,
        },
      ],
    },
  });

  await navigateToCardEditing(page);
  await page.getByRole('button', { name: 'Delete card' }).click();
  await expect(page.getByText('Are you sure you want to delete this card?')).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByText('Card deleted successfully')).toBeVisible();

  // Verify navigation back to the source page
  await page.waitForURL(/\/sources\/goethe-a1\/page\/9/);
  expect(page.url()).toContain('/sources/goethe-a1/page/9');

  await withDbConnection(async (client) => {
    const result = await client.query("SELECT id FROM learn_language.cards WHERE id = 'abfahren-elindulni'");
    expect(result.rows.length).toBe(0);
  });
});

test('card edits stored locally until save', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'lernen-tanulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 5,
    data: {
      word: 'lernen',
      type: 'VERB',
      forms: ['lernt', 'lernte', 'gelernt'],
      translation: { en: 'to learn', hu: 'tanulni', ch: 'lärne' },
      examples: [
        {
          de: 'Ich lerne Deutsch.',
          hu: 'Németet tanulok.',
          en: 'I learn German.',
          ch: 'Ich lärn Tüütsch.',
          images: [{ id: image1 }],
          isSelected: true,
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  // Navigate to card via in-review cards page (inline editing)
  await page.goto('http://localhost:8180/in-review-cards');

  // Make an edit to the card inline
  await page.getByLabel('Hungarian translation', { exact: true }).fill('megtanulni');

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();
  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  // Verify both the edit and readiness were saved to database
  await withDbConnection(async (client) => {
    const result = await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'lernen-tanulni'");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('REVIEWED');

    const cardData = result.rows[0].data;
    expect(cardData.translation.hu).toBe('megtanulni'); // Updated value
  });
});

test('image model name displayed below image', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  const image2 = uploadMockImage(redImage);
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
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
          images: [
            { id: image1, model: 'GPT Image 1.5' },
            { id: image2, model: 'Gemini 3 Pro' },
          ],
        },
      ],
    },
  });

  await navigateToCardEditing(page);

  await expect(page.getByText('GPT Image 1.5')).toBeVisible();

  await page.getByRole('button', { name: 'Next image' }).first().click();
  await expect(page.getByText('Gemini 3 Pro')).toBeVisible();
});

test('speech card editing page displays sentence and translations', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'a1b2c3d4',
    sourceId: 'speech-a1',
    sourcePageNumber: 10,
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

  await page.goto('http://localhost:8180/sources/speech-a1/page/10/cards/a1b2c3d4');

  await expect(page.getByLabel('German Sentence')).toHaveValue('Guten Morgen, wie geht es Ihnen?');
  await expect(page.getByLabel('Hungarian translation', { exact: true })).toHaveValue('Jó reggelt, hogy van?');
  const imageContent = await getImageContent(page.getByRole('img', { name: 'Guten Morgen, wie geht es Ihnen?' }));
  expect(imageContent.equals(getColorImageBytes('yellow'))).toBeTruthy();
});

test('speech card editing updates sentence in database', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'e5f6g7h8',
    sourceId: 'speech-a1',
    sourcePageNumber: 11,
    data: {
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
  });

  await page.goto('http://localhost:8180/sources/speech-a1/page/11/cards/e5f6g7h8');

  await page.getByLabel('Hungarian translation', { exact: true }).fill('Busszal utazom.');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Card updated successfully')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'e5f6g7h8'");
    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;
    expect(cardData.examples[0].de).toBe('Ich fahre mit dem Bus.');
    expect(cardData.examples[0].hu).toBe('Busszal utazom.');
  });
});

test('speech card back navigation works', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'i9j0k1l2',
    sourceId: 'speech-a1',
    sourcePageNumber: 12,
    data: {
      examples: [
        {
          de: 'Das Wetter ist schön.',
          hu: 'Szép az idő.',
          en: 'The weather is nice.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
  });

  await page.goto('http://localhost:8180/sources/speech-a1/page/12/cards/i9j0k1l2');

  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Page' })).toHaveValue('12');
});

test('grammar card editing shows complete sentence and gaps', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'grammar-edit-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 1,
    data: {
      examples: [
        {
          de: 'Der Hund [läuft] schnell.',
          en: 'The dog runs fast.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await expect(page.getByLabel('German sentence', { exact: true })).toHaveValue('Der Hund [läuft] schnell.');
  await expect(page.locator('.sentence-preview')).toContainText('Der Hund _____ schnell.');
});

test('grammar card editing allows adding gaps from selection', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'grammar-add-gap-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 2,
    data: {
      examples: [
        {
          de: 'Sie trinkt Kaffee.',
          en: 'She drinks coffee.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  const sentenceInput = page.getByLabel('German sentence', { exact: true });
  await sentenceInput.focus();
  await sentenceInput.evaluate((el: HTMLTextAreaElement) => {
    el.setSelectionRange(4, 10);
  });

  await page.getByRole('button', { name: 'Add Gap from Selection' }).click();

  await expect(page.locator('.sentence-preview')).toContainText('Sie ______ Kaffee.');
});

test('grammar card editing allows removing gaps', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'grammar-remove-gap-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 3,
    data: {
      examples: [
        {
          de: 'Wir [gehen] ins Kino.',
          en: 'We go to the cinema.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  await expect(page.locator('.sentence-preview')).toContainText('Wir _____ ins Kino.');

  await page.getByRole('button', { name: 'Remove gap' }).click();

  await expect(page.locator('.sentence-preview')).toContainText('Wir gehen ins Kino.');
});

test('grammar card editing saves gaps to database', async ({ page }) => {
  await setupDefaultChatModelSettings();
  const image1 = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'grammar-save-card',
    sourceId: 'grammar-a1',
    sourcePageNumber: 4,
    data: {
      examples: [
        {
          de: 'Das Kind spielt im Garten.',
          en: 'The child plays in the garden.',
          isSelected: true,
          images: [{ id: image1, isFavorite: true }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('http://localhost:8180/in-review-cards');

  const sentenceInput = page.getByLabel('German sentence', { exact: true });
  await sentenceInput.focus();
  await sentenceInput.evaluate((el: HTMLTextAreaElement) => {
    el.setSelectionRange(9, 15);
  });

  await page.getByRole('button', { name: 'Add Gap from Selection' }).click();
  await page.getByRole('button', { name: 'Save card' }).click();

  await withDbConnection(async (client) => {
    const result = await client.query("SELECT data FROM learn_language.cards WHERE id = 'grammar-save-card'");
    expect(result.rows.length).toBe(1);
    const cardData = result.rows[0].data;
    expect(cardData.examples[0].de).toBe('Das Kind [spielt] im Garten.');
  });
});
