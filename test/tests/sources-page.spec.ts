import { test, expect } from '../fixtures';
import { createCard, selectTextRange, scrollElementToTop, setupDefaultChatModelSettings } from '../utils';

test('displays current page', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Page' })).toHaveValue('9');
});

test('displays page content', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await expect(page.getByText('die Abfahrt')).toBeVisible();
  await expect(page.getByText('Vor der Abfahrt rufe ich an.')).toBeVisible();
  await expect(page.getByText('Seite 9')).toBeVisible();
});

test('previous page', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'Previous page' }).click();
  await expect(page.getByText('Seite 8')).toBeVisible();
});

test('next page', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.getByText('Seite 10')).toBeVisible();
});

test('bookmarks last visited page', async ({ page }) => {
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.getByText('Seite 10')).toBeVisible();
  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page.getByText('Seite 11')).toBeVisible();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();
  await expect(page.getByText('Seite 11')).toBeVisible();
});

test('highlights existing cards', async ({ page }) => {
  await createCard({
    cardId: 'anfangen-elkezdeni',
    sourceId: 'goethe-a2',
    sourcePageNumber: 9,
    data: {
      word: 'anfangen',
      type: 'VERB',
      translation: { en: 'to start', hu: 'elkezdeni' },
    },
  });
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A2' }).click();
  await expect(page.getByText('anfangen,')).toHaveAccessibleDescription('Card exists');
});

test('drag to select words highlights matching words', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByText('aber').first()).toHaveAccessibleDescription('Card does not exist');
  await expect(page.getByText('abfahren').first()).toHaveAccessibleDescription('Card does not exist');
  await expect(page.getByText('die Abfahrt').first()).toHaveAccessibleDescription('Card does not exist');
});

test('drag to select multiple regions highlights matching words', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await page.goto('http://localhost:8180/sources');
  await page.getByRole('link', { name: 'Goethe A1' }).click();

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  await scrollElementToTop(page, 'A', true);

  // First region selection
  await selectTextRange(page, 'aber', 'Vor der Abfahrt rufe ich an.');

  await expect(page.getByText('aber').first()).toHaveAccessibleDescription('Card does not exist');

  // Second region selection
  await selectTextRange(page, 'der Absender', 'Können Sie mir seine Adresse sagen?');

  await page.getByRole('region', { name: 'Page content' }).waitFor();

  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Create 6 Cards')).toBeVisible();

  // Check that words from both regions are highlighted
  await expect(page.getByText('aber').first()).toHaveAccessibleDescription('Card does not exist');
  await expect(page.getByText('abfahren').first()).toHaveAccessibleDescription('Card does not exist');
  await expect(page.getByText('der Absender').first()).toHaveAccessibleDescription('Card does not exist');
  await expect(page.getByText('die Adresse').first()).toHaveAccessibleDescription('Card does not exist');
});

test('source selector routing works', async ({ page }) => {
  // Navigate to first source page
  await page.goto('http://localhost:8180/sources/goethe-a1/page/9');

  // Check initial content is visible
  await expect(page.getByText('die Abfahrt')).toBeVisible();

  // Open the source selector dropdown
  await page.getByRole('button', { name: 'Goethe A1' }).click();

  // Select the second source
  await page.getByRole('menuitem', { name: 'Goethe A2' }).click();

  // URL should change
  await expect(page).toHaveURL('http://localhost:8180/sources/goethe-a2/page/8');

  // Content should change to the page from the second source
  await expect(page.getByText('die Adresse')).toBeVisible();
});

test('source selector dropdown content', async ({ page }) => {
  // Navigate to sources page
  await page.goto('http://localhost:8180/sources/goethe-a1/page/9');

  // Open the source selector dropdown
  await page.getByRole('button', { name: 'Goethe A1' }).click();

  // Check all sources are available in the dropdown
  await expect(page.getByRole('menuitem', { name: 'Goethe A1' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Goethe A2' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Goethe B1' })).toBeVisible();
});
