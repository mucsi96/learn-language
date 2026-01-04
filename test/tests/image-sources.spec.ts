import { test, expect } from '../fixtures';
import { createSource, getSource, getDocuments, yellowImage, STORAGE_DIR } from '../utils';
import * as fs from 'fs';
import * as path from 'path';

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

test('can upload multiple images using add button', async ({ page }) => {
  await createSource({
    id: 'multi-image-source',
    name: 'Multi Image Source',
    startPage: 1,
    languageLevel: 'A1',
    cardType: 'VOCABULARY',
    formatType: 'WORD_LIST_WITH_EXAMPLES',
    sourceType: 'IMAGES',
  });

  const sourcesDir = path.join(STORAGE_DIR, 'sources', 'multi-image-source');
  fs.mkdirSync(sourcesDir, { recursive: true });
  fs.writeFileSync(path.join(sourcesDir, 'image1.png'), yellowImage);

  await page.goto('http://localhost:8180/sources/multi-image-source/page/1');

  const dropzoneInput = page.locator('.image-dropzone input[type="file"]');
  await dropzoneInput.setInputFiles({
    name: 'image1.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await expect(page.locator('.page-layout')).toBeVisible({ timeout: 10000 });

  await expect(page.getByRole('button', { name: 'Add image' })).toBeVisible();

  const addImageInput = page.locator('.add-image-button input[type="file"]');
  await addImageInput.setInputFiles({
    name: 'image2.png',
    mimeType: 'image/png',
    buffer: yellowImage
  });

  await page.waitForTimeout(1000);

  const documents = await getDocuments('multi-image-source');
  expect(documents).toHaveLength(2);
  expect(documents[0].pageNumber).toBe(1);
  expect(documents[1].pageNumber).toBe(2);
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
