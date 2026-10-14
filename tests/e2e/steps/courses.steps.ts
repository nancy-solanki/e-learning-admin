import { When, Then, expect } from '../fixtures/test';
When('I filter courses to drafts', async ({ page }) => {
  await page.getByRole('button', { name: /^Draft/ }).click();
});
Then('the first course is {string}', async ({ page }, title: string) => {
  await expect(page.locator('article').first()).toContainText(title);
});
When('I view the first course', async ({ page }) => {
  await page.getByRole('button', { name: 'View course' }).first().click();
});
Then(
  'the course dialog describes {string}',
  async ({ preview }, title: string) => {
    await expect(preview.dialog).toContainText(title);
  },
);
When('I return to courses', async ({ page }) => {
  await page.getByRole('button', { name: 'Back to courses' }).click();
});
When('I start a course draft', async ({ page }) => {
  await page.getByRole('button', { name: 'Add course' }).click();
});
When('I submit an empty course draft', async ({ preview }) => {
  await preview.dialog.getByRole('button', { name: 'Create draft' }).click();
});
Then('the course title is required', async ({ preview }) => {
  const title = preview.dialog.getByLabel('Course title');
  await expect(title).toHaveValue('');
  expect(
    await title.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    ),
  ).toBe(true);
});
When('I create a course draft with a price of 42.50', async ({ preview }) => {
  await preview.createCourse();
});
Then('the new course is a draft', async ({ preview }) => {
  await expect(preview.card('E2E course')).toContainText('Draft');
});
When('I view the new course', async ({ preview }) => {
  await preview
    .card('E2E course')
    .getByRole('button', { name: 'View course' })
    .click();
});
Then('the course dialog shows the draft price', async ({ preview }) => {
  await expect(preview.dialog).toContainText('$42.5');
});
Then('the temporary course is gone', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'E2E course' })).toHaveCount(
    0,
  );
});
