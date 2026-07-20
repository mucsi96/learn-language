import { test, expect } from '../fixtures';
import { createSourceGroup, getSourceGroups } from '../utils';

test('navigates to source groups settings from settings page', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Source Groups' })).toBeVisible();
  await page.getByRole('link', { name: 'Source Groups' }).click();
  await expect(page.getByRole('heading', { name: 'Source Groups' })).toBeVisible();
});

test('source groups settings page displays empty state', async ({ page }) => {
  await page.goto('/settings/source-groups');

  await expect(page.getByRole('heading', { name: 'Source Groups' })).toBeVisible();
  await expect(page.getByText('No source groups yet')).toBeVisible();
});

test('can add a source group', async ({ page }) => {
  await page.goto('/settings/source-groups');

  await page.getByLabel('Group name').fill('Goethe');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('Goethe')).toBeVisible();

  const groups = await getSourceGroups();
  expect(groups.length).toBe(1);
  expect(groups[0].name).toBe('Goethe');
});

test('can add multiple source groups', async ({ page }) => {
  await page.goto('/settings/source-groups');

  await page.getByLabel('Group name').fill('Goethe');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Goethe')).toBeVisible();

  await page.getByLabel('Group name').fill('Menschen');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Menschen')).toBeVisible();

  const groups = await getSourceGroups();
  expect(groups.length).toBe(2);
});

test('does not overwrite an existing group when a new name slugifies to the same id', async ({ page }) => {
  await page.goto('/settings/source-groups');

  await page.getByLabel('Group name').fill('Goethe A1');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Goethe A1')).toBeVisible();

  await page.getByLabel('Group name').fill('Goethe A1!');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(async () => {
    const groups = await getSourceGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].id).toBe('goethe-a1');
    expect(groups[0].name).toBe('Goethe A1');
  }).toPass();
});

test('can delete a source group', async ({ page }) => {
  await createSourceGroup({ name: 'Goethe' });

  await page.goto('/settings/source-groups');

  await expect(page.getByText('Goethe')).toBeVisible();

  await page.getByRole('button', { name: 'Delete Goethe' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByText('No source groups yet')).toBeVisible();
  await expect(page.getByText('Goethe')).not.toBeVisible();

  const groups = await getSourceGroups();
  expect(groups.length).toBe(0);
});

test('add button is disabled when group name is empty', async ({ page }) => {
  await page.goto('/settings/source-groups');

  const addButton = page.getByRole('button', { name: 'Add group' });
  await expect(addButton).toBeDisabled();

  await page.getByLabel('Group name').fill('Goethe');
  await expect(addButton).toBeEnabled();
});
