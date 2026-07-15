import { test, expect } from '../fixtures';
import { Page } from '@playwright/test';
import {
  createCard,
  createSource,
  getSource,
  withDbConnection,
} from '../utils';

async function pressRemoteKey(page: Page, key: string) {
  await page.evaluate(
    (k) =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, bubbles: true })
      ),
    key
  );
}

test('create JSON source restricted to simple cards', async ({ page }) => {
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('CKAD Prep');
  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'JSON' }).click();
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'A1' }).click();

  await expect(
    page.getByText('Cards are added by importing a JSON array after creating the source.')
  ).toBeVisible();

  await page.getByRole('checkbox', { name: 'Practice typing the answer' }).check();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('CKAD Prep')).toBeVisible();

  const source = await getSource('ckad-prep');
  expect(source?.sourceType).toBe('JSON');
  expect(source?.cardTypes).toEqual(['SIMPLE']);
  expect(source?.typingPractice).toBe(true);

  await page.getByRole('button', { name: 'Actions for CKAD Prep' }).click();
  await page.getByRole('menuitem', { name: 'Pages' }).click();

  await expect(page).toHaveURL(/\/sources\/ckad-prep\/json/);
  await expect(page.getByRole('button', { name: 'Import JSON' })).toBeVisible();
});

test('bulk JSON import creates simple cards in draft state', async ({ page }) => {
  await createSource({
    id: 'ckad-import',
    name: 'CKAD Import',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await page.goto('/sources/ckad-import/json');
  await page.getByRole('button', { name: 'Import JSON' }).click();

  const dialog = page.getByRole('dialog', { name: 'Import cards from JSON' });
  const jsonStructure = dialog.getByLabel('Expected JSON structure');
  await expect(jsonStructure).toContainText('id');
  await expect(jsonStructure).toContainText('frontText');
  await expect(jsonStructure).toContainText('backText');
  await expect(jsonStructure).toContainText('topic');
  await expect(jsonStructure).toContainText('category');

  const importButton = dialog.getByRole('button', { name: 'Import' });
  await expect(importButton).toBeDisabled();

  await dialog.getByLabel('Cards JSON').fill('not valid json');
  await expect(dialog.getByText(/Invalid JSON/)).toBeVisible();
  await expect(importButton).toBeDisabled();

  await dialog.getByLabel('Cards JSON').fill(
    JSON.stringify([
      {
        id: 'ckad-import-pod',
        frontText: 'What is a **Pod**?',
        backText: 'The smallest deployable unit.',
        topic: 'Pods',
        category: 'Workloads',
      },
      {
        id: 'ckad-import-service',
        frontText: 'What is a Service?',
        backText: 'A stable endpoint for a set of pods.',
      },
    ])
  );

  await dialog.getByRole('button', { name: 'Import 2 cards' }).click();
  await expect(dialog).not.toBeVisible();

  await expect(page.getByText('Imported 2 cards as drafts')).toBeVisible();

  await expect.poll(async () =>
    withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT id FROM learn_language.cards WHERE source_id = $1`,
        ['ckad-import']
      );
      return result.rows.length;
    })
  ).toBe(2);

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, data, readiness, type FROM learn_language.cards WHERE source_id = $1`,
      ['ckad-import']
    );
    const podCard = result.rows.find(
      (row) => row.data.frontText === 'What is a **Pod**?'
    );
    const serviceCard = result.rows.find(
      (row) => row.data.frontText === 'What is a Service?'
    );

    expect(podCard.id).toBe('ckad-import-pod');
    expect(podCard.readiness).toBe('DRAFT');
    expect(podCard.type).toBe('SIMPLE');
    expect(podCard.data.backText).toBe('The smallest deployable unit.');
    expect(podCard.data.topic).toBe('Pods');
    expect(podCard.data.category).toBe('Workloads');

    expect(serviceCard.id).toBe('ckad-import-service');
    expect(serviceCard.readiness).toBe('DRAFT');
    expect(serviceCard.type).toBe('SIMPLE');
    expect(serviceCard.data.backText).toBe('A stable endpoint for a set of pods.');
    expect(serviceCard.data.topic).toBeUndefined();
    expect(serviceCard.data.category).toBeUndefined();
  });
});

test('bulk JSON import rejects cards with missing required fields', async ({ page }) => {
  await createSource({
    id: 'ckad-import-invalid',
    name: 'CKAD Import Invalid',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await page.goto('/sources/ckad-import-invalid/json');
  await page.getByRole('button', { name: 'Import JSON' }).click();

  const dialog = page.getByRole('dialog', { name: 'Import cards from JSON' });

  await dialog.getByLabel('Cards JSON').fill('{"frontText": "not an array"}');
  await expect(dialog.getByText('Expected a JSON array of cards.')).toBeVisible();

  await dialog.getByLabel('Cards JSON').fill('[]');
  await expect(dialog.getByText('The array contains no cards.')).toBeVisible();

  await dialog.getByLabel('Cards JSON').fill(
    JSON.stringify([
      { id: 'card-1', frontText: 'Question', backText: 'Answer', category: 123 },
    ])
  );
  await expect(
    dialog.getByText('Card 1: "category" must be a string.')
  ).toBeVisible();

  await dialog.getByLabel('Cards JSON').fill(
    JSON.stringify([{ frontText: 'Question', backText: 'Answer' }])
  );
  await expect(
    dialog.getByText('Card 1: "id" must be a non-empty string.')
  ).toBeVisible();

  await dialog.getByLabel('Cards JSON').fill(
    JSON.stringify([
      { id: 'card-1', frontText: 'Question without an answer' },
      { id: 'card-2', backText: 'Answer without a question' },
    ])
  );

  const errorMessage = dialog.getByRole('alert');
  await expect(errorMessage).toContainText(
    'Card 1: "backText" must be a non-empty string.'
  );
  await expect(errorMessage).toContainText(
    'Card 2: "frontText" must be a non-empty string.'
  );
  await expect(dialog.getByRole('button', { name: 'Import' })).toBeDisabled();
});

test('bulk JSON import reports cards that failed to create', async ({ page }) => {
  await createSource({
    id: 'ckad-import-fail',
    name: 'CKAD Import Fail',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  let aborted = false;
  await page.route('**/api/card', async (route) => {
    if (route.request().method() === 'POST' && !aborted) {
      aborted = true;
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('/sources/ckad-import-fail/json');
  await page.getByRole('button', { name: 'Import JSON' }).click();

  const dialog = page.getByRole('dialog', { name: 'Import cards from JSON' });
  await dialog.getByLabel('Cards JSON').fill(
    JSON.stringify([
      { id: 'ckad-fail-pod', frontText: 'What is a Pod?', backText: 'The smallest deployable unit.' },
      { id: 'ckad-fail-service', frontText: 'What is a Service?', backText: 'A stable endpoint for pods.' },
    ])
  );
  await dialog.getByRole('button', { name: 'Import 2 cards' }).click();

  await expect(page.getByText('Failed to import 1 of 2 cards')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT readiness FROM learn_language.cards WHERE source_id = $1`,
      ['ckad-import-fail']
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].readiness).toBe('DRAFT');
  });
});

test('simple card can be edited on the card editing page', async ({ page }) => {
  await createSource({
    id: 'ckad-edit',
    name: 'CKAD Edit',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await createCard({
    cardId: 'ckad-pods-edit',
    sourceId: 'ckad-edit',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'What is a **Pod**?',
      backText: 'The smallest deployable unit.',
      topic: 'Pods',
      category: 'Workloads',
    },
  });

  await page.goto('/sources/ckad-edit/page/1/cards/ckad-pods-edit');

  await expect(page.getByRole('heading', { name: 'Simple' })).toBeVisible();
  await expect(page.getByLabel('Front text')).toHaveValue('What is a **Pod**?');
  await expect(page.getByLabel('Back text')).toHaveValue('The smallest deployable unit.');
  await expect(page.getByLabel('Topic')).toHaveValue('Pods');
  await expect(page.getByLabel('Category')).toHaveValue('Workloads');
  await expect(page.getByLabel('Front preview')).toContainText('What is a Pod?');

  await page.getByLabel('Back text').fill('A Pod is the smallest deployable unit in Kubernetes.');
  await page.getByLabel('Topic').fill('Core Concepts');
  await page.getByLabel('Category').fill('Kubernetes Basics');
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.getByText('Card updated successfully')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT data FROM learn_language.cards WHERE id = $1`,
      ['ckad-pods-edit']
    );
    expect(result.rows[0].data.frontText).toBe('What is a **Pod**?');
    expect(result.rows[0].data.backText).toBe(
      'A Pod is the smallest deployable unit in Kubernetes.'
    );
    expect(result.rows[0].data.topic).toBe('Core Concepts');
    expect(result.rows[0].data.category).toBe('Kubernetes Basics');
  });

  await page.getByLabel('Topic').clear();
  await page.getByLabel('Category').clear();
  await page.getByRole('button', { name: 'Update' }).click();

  await expect.poll(async () =>
    withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT data FROM learn_language.cards WHERE id = $1`,
        ['ckad-pods-edit']
      );
      return result.rows[0].data.topic;
    })
  ).toBeUndefined();

  await expect.poll(async () =>
    withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT data FROM learn_language.cards WHERE id = $1`,
        ['ckad-pods-edit']
      );
      return result.rows[0].data.category;
    })
  ).toBeUndefined();
});

test('simple card in review shows edit form and can be marked as reviewed', async ({ page }) => {
  await createSource({
    id: 'ckad-review',
    name: 'CKAD Review',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await createCard({
    cardId: 'ckad-pods-review',
    sourceId: 'ckad-review',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'What does `kubectl get pods` do?',
      backText: 'Lists pods in the current namespace.',
      topic: 'Pods',
    },
    readiness: 'IN_REVIEW',
  });

  await page.goto('/in-review-cards');

  await expect(page.getByLabel('Front text')).toHaveValue('What does `kubectl get pods` do?');
  await expect(page.getByLabel('Back text')).toHaveValue('Lists pods in the current namespace.');

  const markAsReviewedButton = page.getByRole('button', { name: 'Mark as reviewed' });
  await expect(markAsReviewedButton).toBeEnabled();
  await markAsReviewedButton.click();

  await expect.poll(async () =>
    withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT readiness FROM learn_language.cards WHERE id = $1`,
        ['ckad-pods-review']
      );
      return result.rows[0].readiness;
    })
  ).toBe('REVIEWED');
});

test('bulk completion moves simple draft cards straight to ready state', async ({ page }) => {
  await createSource({
    id: 'ckad-complete',
    name: 'CKAD Complete',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await createCard({
    cardId: 'ckad-complete-pod',
    sourceId: 'ckad-complete',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'What is a Pod?',
      backText: 'The smallest deployable unit.',
    },
    readiness: 'DRAFT',
  });

  await createCard({
    cardId: 'ckad-complete-service',
    sourceId: 'ckad-complete',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'What is a Service?',
      backText: 'A stable endpoint for a set of pods.',
    },
    readiness: 'DRAFT',
  });

  await page.goto('/sources/ckad-complete/cards?filter=draft');

  await page
    .getByRole('columnheader', { name: /Select all 2 cards/ })
    .getByRole('checkbox')
    .click();

  await page.getByRole('button').filter({ hasText: 'Complete 2 cards' }).click();

  await expect(page.getByText('2 card(s) completed')).toBeVisible();

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT id, readiness, data FROM learn_language.cards WHERE source_id = $1 ORDER BY id`,
      ['ckad-complete']
    );
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].id).toBe('ckad-complete-pod');
    expect(result.rows[0].readiness).toBe('READY');
    expect(result.rows[0].data.frontText).toBe('What is a Pod?');
    expect(result.rows[1].id).toBe('ckad-complete-service');
    expect(result.rows[1].readiness).toBe('READY');
    expect(result.rows[1].data.backText).toBe('A stable endpoint for a set of pods.');
  });
});

test('study mode renders a simple card front and back as markdown', async ({ page }) => {
  await createSource({
    id: 'ckad-study',
    name: 'CKAD Study',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await createCard({
    cardId: 'ckad-pods-1',
    sourceId: 'ckad-study',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'What is a **Pod**?',
      backText: 'A Pod is the smallest deployable unit.\n\n- holds containers\n- shares network',
      topic: 'Pods',
      category: 'Workloads',
    },
  });

  await page.goto('/sources/ckad-study/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText(/What is a/)).toBeVisible();
  await expect(flashcard.getByLabel('Topic')).toHaveText('Pods');
  await expect(flashcard.getByLabel('Category')).toHaveText('Workloads');
  await expect(flashcard.getByText('holds containers')).not.toBeVisible();
  await expect(flashcard.getByRole('textbox', { name: 'Your answer' })).toHaveCount(0);

  await pressRemoteKey(page, 'Enter');

  await expect(flashcard.getByText('holds containers')).toBeVisible();
  await expect(flashcard.getByText('shares network')).toBeVisible();
});

test('study mode lets the user type the answer before revealing when typing practice is enabled', async ({ page }) => {
  await createSource({
    id: 'ckad-typing',
    name: 'CKAD Typing',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
    typingPractice: true,
  });

  await createCard({
    cardId: 'ckad-typing-pod',
    sourceId: 'ckad-typing',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'What is a **Pod**?',
      backText: 'The smallest deployable unit.',
    },
  });

  await page.goto('/sources/ckad-typing/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText(/What is a/)).toBeVisible();
  await expect(flashcard.getByText('The smallest deployable unit.')).not.toBeVisible();

  const answerInput = flashcard.getByRole('textbox', { name: 'Your answer' });
  await answerInput.click();
  await expect(flashcard.getByText('The smallest deployable unit.')).not.toBeVisible();

  await answerInput.fill('The smallest unit in Kubernetes');
  await answerInput.press('Enter');

  await expect(flashcard.getByText('The smallest deployable unit.')).toBeVisible();
  await expect(flashcard.getByLabel('Your answer')).toContainText(
    'The smallest unit in Kubernetes'
  );
  await expect(answerInput).toHaveCount(0);

  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expect(page.getByText('All caught up!')).toBeVisible();
});

test('study mode syntax-highlights code blocks in simple cards', async ({ page }) => {
  await createSource({
    id: 'ckad-code',
    name: 'CKAD Code',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'JSON',
  });

  await createCard({
    cardId: 'ckad-code-1',
    sourceId: 'ckad-code',
    cardType: 'SIMPLE',
    sourcePageNumber: 1,
    data: {
      frontText: 'How do you read a pod name in TypeScript?',
      backText:
        'Like this:\n\n```typescript\nconst podName: string = pod.metadata.name;\n```',
      topic: 'Pods',
    },
  });

  await page.goto('/sources/ckad-code/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText(/read a pod name/)).toBeVisible();

  await pressRemoteKey(page, 'Enter');

  const codeBlock = flashcard.getByRole('code');
  await expect(codeBlock).toContainText('pod.metadata.name');
  await expect(codeBlock).toHaveClass(/language-typescript/);
  await expect(codeBlock.getByText('const', { exact: true })).toHaveClass(
    /hljs-keyword/
  );
});
