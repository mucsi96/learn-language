import { readFile } from 'node:fs/promises';
import { test, expect } from '../fixtures';

[
  { purpose: 'Dictionary (e-book reader)', fileName: 'ai-dictionary.token' },
  { purpose: 'Known cards export', fileName: 'known-cards-export.token' },
].forEach(({ purpose, fileName }) => {
  test(`creates, copies and revokes a ${purpose} token`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/settings/api-tokens');
    await expect(page.getByText('No API tokens yet')).toBeVisible();
    await page.getByRole('textbox', { name: 'Token name' }).fill('My reader');
    await expect(page.getByRole('button', { name: 'Generate token' })).toBeDisabled();
    await page.getByRole('button', { name: /Purpose/ }).click();
    await page.getByRole('option', { name: purpose, exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate token' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(fileName);
    const token = await readFile((await download.path())!, 'utf8');
    expect(token.length).toBeGreaterThan(20);
    const dialog = page.getByRole('dialog', { name: 'API Token Created' });
    await expect(dialog.getByRole('textbox', { name: 'API token' })).toHaveValue(token);
    await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(token);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('list', { name: 'API tokens' })).toContainText(purpose);
    await expect(page.getByRole('textbox', { name: 'API token', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Delete My reader' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete My reader' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete My reader' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByText('No API tokens yet')).toBeVisible();
  });
});
