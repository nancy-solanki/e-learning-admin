import { Given, When } from '../fixtures/test';
import { mockCategories } from '../support/categories-api';
Given(
  'an empty category service will reject the first valid save',
  async ({ page }) => {
    await mockCategories(page);
  },
);
When('I start a Python category', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Create your first category' })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Category title').fill('Python');
  await dialog.getByLabel('Description').fill('Learn Python');
});
When('I submit the category', async ({ page }) => {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
});
When('I upload an invalid category thumbnail', async ({ page }) => {
  await page
    .getByRole('dialog')
    .getByLabel('Upload thumbnail')
    .setInputFiles({
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('bad'),
    });
});
When('I drop a Python thumbnail', async ({ controls }) => {
  await controls.dropFile(
    '.category-dropzone',
    'python.png',
    'image/png',
    [137, 80, 78, 71],
  );
});
When('I update the Python category description', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit python', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description').fill('Updated description');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
});
When('I delete the Python category', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Delete python', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete category', exact: true })
    .click();
});
