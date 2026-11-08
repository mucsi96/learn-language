import { test, expect } from '../fixtures';
import { createCard, uploadMockImage, yellowImage, redImage, withDbConnection } from '../utils';

test('refreshes a cached review list without discarding edits', async ({ page }) => {
  await Promise.all(['retained', 'removed'].map(word => createCard({
    cardId: word,
    sourceId: 'goethe-a1',
    readiness: 'IN_REVIEW',
    data: { word, type: 'VERB', translation: { en: word } },
  })));
  await page.goto('/in-review-cards');
  await expect(page.getByRole('article', { name: 'Review removed', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Learn Language', exact: true }).click();
  await expect(page).toHaveURL('/');
  await withDbConnection(client => client.query("UPDATE learn_language.cards SET readiness = 'READY' WHERE id = 'removed'"));
  await createCard({
    cardId: 'added', sourceId: 'goethe-a1', readiness: 'IN_REVIEW',
    data: { word: 'added', type: 'VERB', translation: { en: 'added' } },
  });
  const requested = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();
  await page.route('**/api/cards/readiness/IN_REVIEW', async route => {
    requested.resolve();
    await released.promise;
    await route.fallback();
  });
  await page.goBack();
  await requested.promise;
  const retained = page.getByRole('article', { name: 'Review retained', exact: true });
  try {
    await expect(page.getByRole('article', { name: 'Review removed', exact: true })).toBeVisible();
    await retained.getByLabel('German translation', { exact: true }).fill('unsaved edit');
  } finally {
    released.resolve();
  }
  await expect(page.getByRole('article', { name: 'Review added', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Review removed', exact: true })).toHaveCount(0);
  await expect(retained.getByLabel('German translation', { exact: true })).toHaveValue('unsaved edit');
});

test('displays in review cards inline with edit forms', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

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

  await page.goto('/in-review-cards');

  await expect(page.getByRole('heading', { name: 'Cards In Review', exact: true })).toBeVisible();

  await expect(page.getByLabel('German translation', { exact: true }).first()).toHaveValue('verstehen');
  await expect(page.getByLabel('German translation', { exact: true }).nth(1)).toHaveValue('sprechen');

  await expect(page.getByLabel('German translation', { exact: true })).toHaveCount(2);
});

test('displays empty state when no cards in review', async ({ page }) => {
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

  await page.goto('/in-review-cards');

  await expect(page.getByRole('heading', { name: 'No cards in review', exact: true })).toBeVisible();
});

test('page title', async ({ page }) => {
  await page.goto('/in-review-cards');
  await expect(page).toHaveTitle('Cards In Review | Learn language');
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
          isSelected: true,
          images: [{ id: image1 }, { id: image2 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  const markAsReviewedBtn = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedBtn).toBeVisible();
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
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await page.getByRole('button', { name: 'Toggle favorite' }).click();

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
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

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
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await page.getByLabel('Hungarian translation', { exact: true }).fill('megszervezni');
  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'organisieren-szervezni'");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('REVIEWED');

    const cardData = result.rows[0].data;
    expect(cardData.translation.hu).toBe('megszervezni');
  });
});

test('reviewed card is visually highlighted and stays on page', async ({ page }) => {
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
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  await expect(page.getByLabel('Reviewed')).toBeVisible();
  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('koordinieren');
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

  await page.goto('/in-review-cards');

  const markAsReviewedBtn = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedBtn).toBeDisabled();

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await expect(markAsReviewedBtn).toBeEnabled();

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await expect(markAsReviewedBtn).toBeDisabled();
});

test('displays speech cards in review with inline form', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'a1b2c3d4',
    sourceId: 'speech-a1',
    cardType: 'SPEECH',
    sourcePageNumber: 20,
    data: {
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

  await page.goto('/in-review-cards');

  await expect(page.getByLabel('German sentence')).toHaveValue('Guten Morgen, wie geht es Ihnen?');
  await expect(page.getByLabel('Hungarian translation', { exact: true })).toHaveValue('Jó reggelt, hogy van?');
});

test('progress indicator shows remaining count', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'card-one',
    sourceId: 'goethe-a1',
    sourcePageNumber: 1,
    data: {
      word: 'eins',
      type: 'NOUN',
      gender: 'NEUTER',
      translation: { en: 'one', hu: 'egy' },
      examples: [
        {
          de: 'Eins plus eins.',
          hu: 'Egy meg egy.',
          en: 'One plus one.',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await createCard({
    cardId: 'card-two',
    sourceId: 'goethe-a1',
    sourcePageNumber: 2,
    data: {
      word: 'zwei',
      type: 'NOUN',
      gender: 'FEMININE',
      translation: { en: 'two', hu: 'kettő' },
      examples: [
        {
          de: 'Zwei Tage.',
          hu: 'Két nap.',
          en: 'Two days.',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await expect(page.getByLabel('Remaining cards: 2', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Toggle favorite' }).first().click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).first().click();

  await expect(page.getByLabel('Remaining cards: 1', { exact: true })).toBeVisible();
});

test('progress indicator hidden when all reviewed', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'single-card',
    sourceId: 'goethe-a1',
    sourcePageNumber: 1,
    data: {
      word: 'fertig',
      type: 'ADJECTIVE',
      translation: { en: 'done', hu: 'kész' },
      examples: [
        {
          de: 'Ich bin fertig.',
          hu: 'Kész vagyok.',
          en: 'I am done.',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  await expect(page.getByLabel(/^Remaining cards:/)).not.toBeVisible();
});

test('audio fab appears after reviewing all cards', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'review-then-audio',
    sourceId: 'goethe-a1',
    sourcePageNumber: 1,
    data: {
      word: 'hören',
      type: 'VERB',
      translation: { en: 'to hear', hu: 'hallani' },
      examples: [
        {
          de: 'Ich höre Musik.',
          hu: 'Zenét hallgatok.',
          en: 'I listen to music.',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await expect(
    page.getByRole('button', { name: 'Generate audio for cards' })
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Generate audio for cards' })
  ).toBeVisible();
});

test('delete card removes it from the page', async ({ page }) => {
  const image1 = uploadMockImage(yellowImage);

  await createCard({
    cardId: 'to-delete',
    sourceId: 'goethe-a1',
    sourcePageNumber: 1,
    data: {
      word: 'löschen',
      type: 'VERB',
      translation: { en: 'to delete', hu: 'törölni' },
      examples: [
        {
          de: 'Bitte löschen Sie die Datei.',
          hu: 'Kérem törölje a fájlt.',
          en: 'Please delete the file.',
          isSelected: true,
          images: [{ id: image1 }],
        },
      ],
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('löschen');

  await page.getByRole('button', { name: 'Delete card' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('Card deleted')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No cards in review', exact: true })).toBeVisible();
});

test('scrolling past a reviewable card saves edits and marks it reviewed', async ({ page }) => {
  const image = uploadMockImage(yellowImage);
  await createCard({
    cardId: 'scroll-review-first', sourceId: 'goethe-a1', sourcePageNumber: 1,
    readiness: 'IN_REVIEW',
    data: {
      word: 'erster', type: 'ADJECTIVE', translation: { hu: 'első' },
      examples: [{ de: 'Der erste Tag.', hu: 'Az első nap.', isSelected: true, images: [{ id: image, isFavorite: true }] }],
    },
  });
  await createCard({
    cardId: 'scroll-review-second', sourceId: 'goethe-a1', sourcePageNumber: 2,
    readiness: 'IN_REVIEW',
    data: {
      word: 'zweiter', type: 'ADJECTIVE', translation: { hu: 'második' },
      examples: [{ de: 'Der zweite Tag.', hu: 'A második nap.', isSelected: true, images: [{ id: image }] }],
    },
  });
  await page.goto('/in-review-cards');
  const first = page.getByRole('article', { name: 'Review erster', exact: true });
  await first.getByLabel('Hungarian translation', { exact: true }).fill('legelső');
  await page.getByRole('article', { name: 'Review zweiter', exact: true }).getByRole('button', { name: 'Toggle favorite' }).scrollIntoViewIfNeeded();
  await expect(page.getByText('Card marked as reviewed')).toBeVisible();
  await withDbConnection(async client => {
    const result = await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'scroll-review-first'");
    expect(result.rows[0].readiness).toBe('REVIEWED');
    expect(result.rows[0].data.translation.hu).toBe('legelső');
  });
});

test('saving a simple review card removes cleared optional fields and preserves model metadata', async ({ page }) => {
  await createCard({
    cardId: 'review-clear-simple-fields',
    sourceId: 'goethe-a1',
    cardType: 'SIMPLE',
    readiness: 'IN_REVIEW',
    data: {
      frontText: 'What is the capital of Germany?',
      backText: 'Berlin',
      topic: 'Geography',
      category: 'Cities',
      extractionModel: 'original-extraction-model',
    },
  });

  await page.goto('/in-review-cards');
  await page.getByRole('textbox', { name: 'Topic', exact: true }).fill('');
  await page.getByRole('textbox', { name: 'Category', exact: true }).fill('   ');
  const saved = page.waitForResponse(response =>
    response.url().endsWith('/api/card/review-clear-simple-fields') && response.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  expect((await saved).ok()).toBe(true);

  await withDbConnection(async client => {
    const result = await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'review-clear-simple-fields'");
    expect(result.rows[0].readiness).toBe('IN_REVIEW');
    expect(result.rows[0].data).toEqual(expect.objectContaining({
      frontText: 'What is the capital of Germany?',
      backText: 'Berlin',
      extractionModel: 'original-extraction-model',
    }));
    expect(result.rows[0].data).not.toHaveProperty('topic');
    expect(result.rows[0].data).not.toHaveProperty('category');
  });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Topic', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Category', exact: true })).toHaveValue('');
});

test('reviewing a grammar card removes its cleared hint and preserves model metadata', async ({ page }) => {
  const example = { de: 'Ich [bin] hier.', hu: 'Itt vagyok.', isSelected: true };
  await createCard({
    cardId: 'review-clear-grammar-hint',
    sourceId: 'goethe-a1',
    cardType: 'GRAMMAR',
    readiness: 'IN_REVIEW',
    data: {
      grammarTopic: 'Present tense',
      hint: 'Use the verb sein',
      examples: [example],
      translationModel: 'original-translation-model',
    },
  });

  await page.goto('/in-review-cards');
  await page.getByRole('textbox', { name: 'Hint', exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Mark as reviewed', exact: true }).click();
  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  await withDbConnection(async client => {
    const result = await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'review-clear-grammar-hint'");
    expect(result.rows[0].readiness).toBe('REVIEWED');
    expect(result.rows[0].data).toEqual(expect.objectContaining({
      grammarTopic: 'Present tense',
      examples: [expect.objectContaining(example)],
      translationModel: 'original-translation-model',
    }));
    expect(result.rows[0].data).not.toHaveProperty('hint');
  });
});

test('review updates preserve unknown API card and example fields while clearing optional data', async ({ page, apiHeaders }) => {
  const metadata = { importedFrom: 'future-format', revision: 7, labels: ['keep'] };
  const exampleMetadata = { origin: 'future-example-format' };
  await createCard({
    cardId: 'review-unknown-api-fields',
    sourceId: 'goethe-a1',
    cardType: 'GRAMMAR',
    readiness: 'IN_REVIEW',
    data: {
      grammarTopic: 'Present tense',
      hint: 'Use sein',
      examples: [{ de: 'Ich [bin] hier.', hu: 'Itt vagyok.', isSelected: true }],
    },
  });
  await page.route('**/api/cards/readiness/IN_REVIEW', async route => {
    const response = await route.fetch({ headers: { ...route.request().headers(), ...apiHeaders } });
    expect(response.ok()).toBe(true);
    const cards = await response.json();
    await route.fulfill({ response, json: cards.map((card: { data: { examples: Record<string, unknown>[] } }) => ({
      ...card,
      data: {
        ...card.data,
        customMetadata: metadata,
        examples: card.data.examples.map(example => ({ ...example, customExampleMetadata: exampleMetadata })),
      },
    })) });
  });
  await page.route('**/api/card/review-unknown-api-fields', async route => {
    if (route.request().method() === 'PUT') await route.fulfill({ status: 204 });
    else await route.fallback();
  });
  await page.goto('/in-review-cards');
  await page.getByRole('textbox', { name: 'Hint', exact: true }).fill('   ');
  const update = page.waitForRequest(request => request.url().endsWith('/api/card/review-unknown-api-fields') && request.method() === 'PUT');
  await page.getByRole('button', { name: 'Mark as reviewed', exact: true }).click();
  const body = (await update).postDataJSON();
  expect(body.readiness).toBe('REVIEWED');
  expect(body.data).not.toHaveProperty('hint');
  expect(body.data.customMetadata).toEqual(metadata);
  expect(body.data.examples[0]).toEqual(expect.objectContaining({
    de: 'Ich [bin] hier.',
    hu: 'Itt vagyok.',
    isSelected: true,
    customExampleMetadata: exampleMetadata,
  }));
  await expect(page.getByText('Card marked as reviewed')).toBeVisible();
});
