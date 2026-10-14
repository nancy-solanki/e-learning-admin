import { When, Then, expect } from '../fixtures/test';
import { curriculumKind } from '../pages/preview-pages';
When('I filter curriculum by the web development course', async ({ page }) => {
  await page
    .getByLabel('Filter by course')
    .selectOption('The complete modern web developer');
});
When('I start a new {word} entry', async ({ preview }, kind: string) => {
  await preview.openCurriculumEditor(curriculumKind(kind));
});
When('I submit the empty {word} entry', async ({ preview }, kind: string) => {
  await preview.dialog
    .getByRole('button', {
      name: `Add ${preview.noun(curriculumKind(kind))}`,
      exact: true,
    })
    .click();
});
Then('the curriculum title is required', async ({ preview }) => {
  await expect(preview.dialog).toBeVisible();
  const title = preview.dialog.getByLabel('Title');
  await expect(title).toHaveValue('');
  expect(
    await title.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    ),
  ).toBe(true);
});
When('I create the {word} entry', async ({ preview }, kind: string) => {
  await preview.createCurriculum(curriculumKind(kind));
});
When('I edit the {word} entry', async ({ preview }, kind: string) => {
  await preview.editCurriculum(curriculumKind(kind));
});
When(
  'I cancel another edit to the {word} entry',
  async ({ preview }, kind: string) => {
    await preview.cancelCurriculumEdit(curriculumKind(kind));
  },
);
Then(
  'the updated {word} entry is visible',
  async ({ page, preview }, kind: string) => {
    await expect(
      page.getByRole('heading', {
        name: `Updated ${preview.noun(curriculumKind(kind))}`,
      }),
    ).toBeVisible();
  },
);
Then(
  'the temporary {word} entry is gone',
  async ({ page, preview }, kind: string) => {
    await expect(
      page.getByRole('heading', {
        name: `Updated ${preview.noun(curriculumKind(kind))}`,
      }),
    ).toHaveCount(0);
  },
);
When('I explore {string}', async ({ page }, related: string) => {
  await page.getByRole('link', { name: `Explore ${related}` }).click();
});
Then(
  'the {string} lecture filter is selected',
  async ({ page }, status: string) => {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${status} \\d`) }),
    ).toHaveAttribute('aria-pressed', 'true');
  },
);
Then('there are {int} curriculum cards', async ({ page }, count: number) => {
  await expect(page.locator('article')).toHaveCount(count);
});
When('I show all lectures', async ({ page }) => {
  await page.getByRole('button', { name: /^All lectures/ }).click();
});
