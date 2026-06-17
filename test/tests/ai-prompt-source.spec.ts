import { test, expect } from '../fixtures';
import { Page } from '@playwright/test';
import {
  createCard,
  createChatModelSetting,
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

async function enableCardGenerationModel() {
  await setupDefaultChatModelSettings();
  await createChatModelSetting({
    modelName: 'gemini-3.1-pro-preview',
    operationType: 'CARD_GENERATION',
    isEnabled: true,
    isPrimary: true,
  });
}

test('create AI prompt source, generate, preview and create simple cards', async ({ page }) => {
  await enableCardGenerationModel();

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
  expect(source?.cardType).toBe('SIMPLE');

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
      expect(row.readiness).toBe('IN_REVIEW');
    }
  });

  const podsRow = coverageList.getByRole('listitem').filter({ hasText: 'Pods' });
  await expect(podsRow).toContainText('2');
});

test('study mode renders a simple card front and back as markdown', async ({ page }) => {
  await createSource({
    id: 'ckad-study',
    name: 'CKAD Study',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'SIMPLE',
    formatType: 'FLOWING_TEXT',
    sourceType: 'AI_PROMPT',
  });

  await createCard({
    cardId: 'ckad-pods-1',
    sourceId: 'ckad-study',
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
