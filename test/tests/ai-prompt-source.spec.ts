import { test, expect } from '../fixtures';
import { Page } from '@playwright/test';
import {
  createCard,
  createSource,
  getSource,
  setupDefaultChatModelSettings,
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

test('create AI prompt source, generate, preview and create simple cards', async ({ page }) => {
  await setupDefaultChatModelSettings();

  await page.goto('/sources');
  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('CKAD Prep');
  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'AI Prompt' }).click();
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'A1' }).click();
  await page
    .getByLabel('Base prompt')
    .fill('Kubernetes Application Developer (CKAD) certification exam preparation');

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('CKAD Prep')).toBeVisible();

  const source = await getSource('ckad-prep');
  expect(source?.sourceType).toBe('AI_PROMPT');
  expect(source?.cardTypes).toEqual(['SIMPLE']);

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT prompt FROM learn_language.sources WHERE id = $1`,
      ['ckad-prep']
    );
    expect(result.rows[0].prompt).toContain('CKAD');
  });

  await page.getByRole('button', { name: 'Actions for CKAD Prep' }).click();
  await page.getByRole('menuitem', { name: 'Pages' }).click();

  await expect(page).toHaveURL(/\/sources\/ckad-prep\/prompt/);

  const coverageList = page.getByRole('list', { name: 'Topic coverage' });
  await expect(coverageList.getByText('Services & Networking')).toBeVisible();
  await expect(coverageList.getByText('Pods')).toBeVisible();

  await page.getByRole('button', { name: 'Generate' }).click();

  await expect(page.getByText(/What command creates a pod named/)).toBeVisible();

  await page.getByRole('button', { name: /Create 2 cards/ }).click();

  await expect.poll(async () =>
    withDbConnection(async (client) => {
      const result = await client.query(
        `SELECT data FROM learn_language.cards WHERE source_id = $1`,
        ['ckad-prep']
      );
      return result.rows.length;
    })
  ).toBe(2);

  await withDbConnection(async (client) => {
    const result = await client.query(
      `SELECT data, readiness FROM learn_language.cards WHERE source_id = $1`,
      ['ckad-prep']
    );
    for (const row of result.rows) {
      expect(row.data.frontText).toBeTruthy();
      expect(row.data.backText).toBeTruthy();
      expect(row.data.topic).toBe('Pods');
      expect(row.readiness).toBe('READY');
    }
  });

  const podsRow = coverageList.getByRole('listitem').filter({ hasText: 'Pods' });
  await expect(podsRow).toContainText('2');
});

test('simple card can be edited on the card editing page', async ({ page }) => {
  await createSource({
    id: 'ckad-edit',
    name: 'CKAD Edit',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'AI_PROMPT',
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
    },
  });

  await page.goto('/sources/ckad-edit/page/1/cards/ckad-pods-edit');

  await expect(page.getByRole('heading', { name: 'Simple' })).toBeVisible();
  await expect(page.getByLabel('Front text')).toHaveValue('What is a **Pod**?');
  await expect(page.getByLabel('Back text')).toHaveValue('The smallest deployable unit.');
  await expect(page.getByLabel('Topic')).toHaveValue('Pods');
  await expect(page.getByLabel('Front preview')).toContainText('What is a Pod?');

  await page.getByLabel('Back text').fill('A Pod is the smallest deployable unit in Kubernetes.');
  await page.getByLabel('Topic').fill('Core Concepts');
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
  });

  await page.getByLabel('Topic').clear();
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
});

test('simple card in review shows edit form and can be marked as reviewed', async ({ page }) => {
  await createSource({
    id: 'ckad-review',
    name: 'CKAD Review',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'AI_PROMPT',
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

test('study mode renders a simple card front and back as markdown', async ({ page }) => {
  await createSource({
    id: 'ckad-study',
    name: 'CKAD Study',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'AI_PROMPT',
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
    },
  });

  await page.goto('/sources/ckad-study/study');
  await page.getByRole('button', { name: 'Start study session' }).click();

  const flashcard = page.getByRole('article', { name: 'Flashcard' });
  await expect(flashcard.getByText(/What is a/)).toBeVisible();
  await expect(flashcard.getByText('holds containers')).not.toBeVisible();

  await pressRemoteKey(page, 'Enter');

  await expect(flashcard.getByText('holds containers')).toBeVisible();
  await expect(flashcard.getByText('shares network')).toBeVisible();
});

test('study mode syntax-highlights code blocks in simple cards', async ({ page }) => {
  await createSource({
    id: 'ckad-code',
    name: 'CKAD Code',
    startPage: 1,
    languageLevel: 'A1',
    cardTypes: ['SIMPLE'],
    formatType: 'FLOWING_TEXT',
    sourceType: 'AI_PROMPT',
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
