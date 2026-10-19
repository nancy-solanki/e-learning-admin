import { Given, When, Then, expect } from '../fixtures/test';
import { mockCourses } from '../support/courses-api';

Given('the course service has 21 courses', async ({ page }) => {
  await mockCourses(page);
});
Then('the first course is {string}', async ({ page }, title: string) => {
  await expect(page.locator('article').first()).toContainText(title);
});
When('I view the first course', async ({ page }) => {
  await page.getByRole('button', { name: 'View course' }).first().click();
});
Then(
  'the course dialog describes {string}',
  async ({ page }, title: string) => {
    await expect(page.getByRole('dialog', { name: title })).toBeVisible();
  },
);
Then('the course pagination shows {string}', async ({ page }, text: string) => {
  await expect(
    page.getByRole('navigation', { name: 'Course pagination' }),
  ).toContainText(text);
});
When('I open the next course page', async ({ page }) => {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
});
When('I open course filters', async ({ page }) => {
  await page.getByRole('button', { name: /^Filters/ }).click();
});
When('I apply course filters', async ({ page }) => {
  await page.getByRole('button', { name: 'Apply filters' }).click();
});
