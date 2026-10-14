import { readFile } from 'node:fs/promises';
import { When, Then, expect } from '../fixtures/test';
import { recordConfig } from '../pages/preview-pages';
When(
  'I apply the record filters for {string}',
  async ({ preview }, kind: string) => {
    await preview.filterRecords(kind);
  },
);
Then(
  'only the matching {string} record is shown',
  async ({ page }, kind: string) => {
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText(recordConfig(kind).id);
  },
);
When('I view the matching {string} record', async ({ page }, kind: string) => {
  const config = recordConfig(kind);
  await page
    .getByRole('button', { name: `View ${config.detail} ${config.id}` })
    .click();
});
Then('the {string} details are correct', async ({ preview }, kind: string) => {
  await expect(preview.dialog).toContainText(recordConfig(kind).id);
  if (kind === 'wallets')
    await expect(preview.dialog).toContainText('-$250.00');
  else
    await expect(preview.dialog.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
});
When('I export {string}', async ({ preview, downloads }, kind: string) => {
  downloads.latest = await preview.exportRecords(kind);
});
Then(
  'the {string} CSV contains only the filtered record',
  async ({ downloads }, kind: string) => {
    const config = recordConfig(kind);
    const download = downloads.latest;
    if (!download)
      throw new Error('Export the records before checking the download');
    expect(download.suggestedFilename()).toBe(config.filename);
    const path = await download.path();
    if (!path) throw new Error('The CSV download has no local path');
    const csv = await readFile(path, 'utf8');
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain(config.id);
    expect(csv).not.toContain(config.excludedId);
  },
);
Then('all {string} records are shown', async ({ page }, kind: string) => {
  await expect(page.locator('tbody tr')).toHaveCount(recordConfig(kind).total);
});
