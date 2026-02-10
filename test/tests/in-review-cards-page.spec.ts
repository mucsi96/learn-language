import { test, expect } from '../fixtures';
import { createCard, uploadMockImage, yellowImage, redImage, withDbConnection } from '../utils';

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

  await expect(page.getByRole('heading', { name: 'No cards in review', exact: true })).toBeVisible();
});

test('page title', async ({ page }) => {
  await page.goto('http://localhost:8180/in-review-cards');
  await expect(page).toHaveTitle('Cards In Review');
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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

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

  await page.goto('http://localhost:8180/in-review-cards');

  const progressFab = page.locator('.progress-fab');
  await expect(progressFab).toContainText('2');

  await page.getByRole('button', { name: 'Toggle favorite' }).first().click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).first().click();

  await expect(progressFab).toContainText('1');
});

test('progress indicator shows green tick when all reviewed', async ({ page }) => {
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

  await page.goto('http://localhost:8180/in-review-cards');

  await page.getByRole('button', { name: 'Toggle favorite' }).click();
  await page.getByRole('button', { name: 'Mark as reviewed' }).click();

  await expect(page.getByText('Card marked as reviewed')).toBeVisible();

  const progressDone = page.locator('.progress-done');
  await expect(progressDone).toBeVisible();
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

  await page.goto('http://localhost:8180/in-review-cards');

  await expect(page.getByLabel('German translation', { exact: true })).toHaveValue('löschen');

  await page.getByRole('button', { name: 'Delete card' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('Card deleted')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No cards in review', exact: true })).toBeVisible();
});
