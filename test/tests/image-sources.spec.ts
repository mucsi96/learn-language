import { test, expect } from '../fixtures';
import { createSource, getSource, getDocuments, yellowImage, getKnownWords, setupDefaultChatModelSettings } from '../utils';

test('can create an image source', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');

  await page.getByRole('button', { name: 'Add Source' }).click();

  await page.getByLabel('Source ID').fill('test-image-source');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Image Source');

  await page.getByLabel('Source Type').click();
  await page.getByRole('option', { name: 'Image Collection' }).click();

  await expect(page.getByText('Images will be added from the page view')).toBeVisible();

  await page.getByLabel('Start Page').fill('1');
  await page.getByLabel('Language Level').click();
  await page.getByRole('option', { name: 'A1' }).click();
  await page.getByLabel('Format Type').click();
  await page.getByRole('option', { name: 'Word list with examples' }).click();

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Source' })).not.toBeVisible();

  await expect(page.getByText('Test Image Source')).toBeVisible();

  const createdSource = await getSource('test-image-source');
  expect(createdSource).not.toBeNull();
  expect(createdSource?.name).toBe('Test Image Source');
  expect(createdSource?.sourceType).toBe('IMAGES');
  expect(createdSource?.fileName).toBeNull();
  expect(createdSource?.startPage).toBe(1);
});

test('image source shows empty dropzone initially', async ({ page }) => {
  await createSource({
    id: 'empty-image-source',
    name: 'Empty Image Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/empty-image-source/page/1');

  await expect(page.getByText('Drag and drop an image here')).toBeVisible();
  await expect(page.locator('.image-dropzone')).toBeVisible();
});

test('can upload image to image source from page view', async ({ page }) => {
  await createSource({
    id: 'upload-image-source',
    name: 'Upload Image Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/upload-image-source/page/1');

  await expect(page.getByText('Drag and drop an image here')).toBeVisible();

  const fileInput = page.locator('.image-dropzone input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-image.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await expect(page.locator('.page-layout')).toBeVisible({ timeout: 10000 });

  const documents = await getDocuments('upload-image-source');
  expect(documents).toHaveLength(1);
  expect(documents[0].fileName).toBe('test-image.png');
  expect(documents[0].pageNumber).toBe(1);
});

test('can delete image from image source', async ({ page }) => {
  await createSource({
    id: 'delete-image-source',
    name: 'Delete Image Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/delete-image-source/page/1');

  const dropzoneInput = page.locator('.image-dropzone input[type="file"]');
  await dropzoneInput.setInputFiles({
    name: 'test-image.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await expect(page.locator('.page-layout')).toBeVisible({ timeout: 10000 });

  let documents = await getDocuments('delete-image-source');
  expect(documents).toHaveLength(1);

  await expect(page.getByRole('button', { name: 'Delete image' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete image' }).click();

  await expect(page.locator('.image-dropzone')).toBeVisible({ timeout: 10000 });

  documents = await getDocuments('delete-image-source');
  expect(documents).toHaveLength(0);
});

test('image source shows source type in create dialog is disabled during edit', async ({ page }) => {
  await createSource({
    id: 'edit-image-source',
    name: 'Edit Image Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources');

  const sourceCard = page.locator('.card-wrapper', { has: page.getByText('Edit Image Source') });
  await sourceCard.hover();
  await sourceCard.getByRole('button', { name: 'Edit source' }).click();

  await expect(page.getByRole('heading', { name: 'Edit Source' })).toBeVisible();

  const sourceTypeSelect = page.getByLabel('Source Type');
  await expect(sourceTypeSelect).toBeDisabled();
});

test('extracted words appear as chips for image source after selection', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createSource({
    id: 'chips-image-source',
    name: 'Chips Image Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/chips-image-source/page/1');

  const dropzoneInput = page.locator('.image-dropzone input[type="file"]');
  await dropzoneInput.setInputFiles({
    name: 'test-image.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await expect(page.locator('.page-layout')).toBeVisible({ timeout: 10000 });

  const pageLayout = page.locator('.page-layout');
  const box = await pageLayout.boundingBox();

  if (box) {
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
    await page.mouse.up();
  }

  await expect(page.locator('.extracted-words-container')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('mat-chip')).toBeVisible();
});

test('can add word to known words from chip context menu', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createSource({
    id: 'known-words-source',
    name: 'Known Words Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/known-words-source/page/1');

  const dropzoneInput = page.locator('.image-dropzone input[type="file"]');
  await dropzoneInput.setInputFiles({
    name: 'test-image.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await expect(page.locator('.page-layout')).toBeVisible({ timeout: 10000 });

  const pageLayout = page.locator('.page-layout');
  const box = await pageLayout.boundingBox();

  if (box) {
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
    await page.mouse.up();
  }

  await expect(page.locator('.extracted-words-container')).toBeVisible({ timeout: 15000 });

  const firstChip = page.locator('mat-chip').first();
  const chipText = await firstChip.textContent();
  await firstChip.click();

  await expect(page.getByRole('menuitem', { name: 'Add to known words' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Add to known words' }).click();

  await expect(firstChip).not.toBeVisible({ timeout: 5000 });

  const knownWords = await getKnownWords();
  expect(knownWords).toContain(chipText?.trim());
});

test('can ignore word once from chip context menu', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createSource({
    id: 'ignore-word-source',
    name: 'Ignore Word Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  await page.goto('http://localhost:8180/sources/ignore-word-source/page/1');

  const dropzoneInput = page.locator('.image-dropzone input[type="file"]');
  await dropzoneInput.setInputFiles({
    name: 'test-image.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await expect(page.locator('.page-layout')).toBeVisible({ timeout: 10000 });

  const pageLayout = page.locator('.page-layout');
  const box = await pageLayout.boundingBox();

  if (box) {
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
    await page.mouse.up();
  }

  await expect(page.locator('.extracted-words-container')).toBeVisible({ timeout: 15000 });

  const initialChipCount = await page.locator('mat-chip').count();
  const firstChip = page.locator('mat-chip').first();
  const chipText = await firstChip.textContent();
  await firstChip.click();

  await expect(page.getByRole('menuitem', { name: 'Ignore once' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Ignore once' }).click();

  await expect(firstChip).not.toBeVisible({ timeout: 5000 });

  const knownWords = await getKnownWords();
  expect(knownWords).not.toContain(chipText?.trim());
});
