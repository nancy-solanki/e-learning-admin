import { Given, When, Then, expect } from '../fixtures/test';
import { mockCoupons } from '../support/coupons-api';

Given(
  'an empty coupon service with Python Basics available',
  async ({ page, apiState }) => {
    apiState.coupon = await mockCoupons(page);
  },
);
When('I open the coupon editor', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Create coupon', exact: true })
    .first()
    .click();
});
Then('the course selector is enabled', async ({ page }) => {
  await expect(
    page.getByRole('dialog').getByLabel('Course', { exact: true }),
  ).toBeEnabled();
});
Then(
  'the coupon selectors show the chosen course and discount type',
  async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Course', { exact: true })).toContainText(
      'Python Basics',
    );
    await expect(
      dialog.getByLabel('Discount type', { exact: true }),
    ).toContainText('Fixed amount');
    await expect(dialog.locator('select')).toHaveCount(0);
  },
);
When('I upload a malformed coupon draft', async ({ page }) => {
  await page
    .getByRole('dialog')
    .getByLabel('Upload coupon draft')
    .setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('[]'),
    });
});
Then(
  'the coupon editor reports that one object is required',
  async ({ page }) => {
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
      'one coupon object',
    );
  },
);
When('I drop a valid coupon draft', async ({ controls, apiState }) => {
  if (!apiState.coupon) throw new Error('Set up the coupon service first');
  await controls.dropFile(
    '.category-dropzone',
    'offer.json',
    'application/json',
    [...Buffer.from(JSON.stringify(apiState.coupon.coupon))],
  );
});
Then('the coupon code is {string}', async ({ page }, code: string) => {
  await expect(page.getByRole('dialog').getByLabel('Coupon code')).toHaveValue(
    code,
  );
});
When(
  'I import a coupon for an unavailable course',
  async ({ page, apiState }) => {
    if (!apiState.coupon) throw new Error('Set up the coupon service first');
    await page
      .getByRole('dialog')
      .getByLabel('Upload coupon draft')
      .setInputFiles({
        name: 'old-example.json',
        mimeType: 'application/json',
        buffer: Buffer.from(
          JSON.stringify({
            ...apiState.coupon.coupon,
            course: '811e0b9f-3e61-4c8a-9cb4-a824ae2f47c3',
          }),
        ),
      });
  },
);
Then('the editor requires an available course', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText(
      'The imported course is unavailable. Select a course from the list before saving.',
    ),
  ).toBeVisible();
  await expect(dialog.getByLabel('Course', { exact: true })).toContainText(
    'Select a course',
  );
});
When('I submit the coupon', async ({ page }) => {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create coupon', exact: true })
    .click();
});
Then('no coupon has been created', async ({ apiState }) => {
  expect(apiState.coupon?.exists).toBe(false);
});
When('I import the bundled coupon template', async ({ page }) => {
  await page
    .getByRole('dialog')
    .getByLabel('Upload coupon draft')
    .setInputFiles('public/templates/coupon.json');
});
When('I change the coupon discount to 25', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit LEARN20' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Discount value').fill('25');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
});
Then('the coupon discount is 25 percent', async ({ page }) => {
  await expect(page.locator('.coupon-value')).toContainText('25%');
});
When('I delete the coupon', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete LEARN20' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete coupon', exact: true })
    .click();
});
When('I restore the coupon', async ({ page }) => {
  await page.getByRole('button', { name: 'Restore LEARN20' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Restore coupon', exact: true })
    .click();
});
Then('the coupon notice says {string}', async ({ page }, message: string) => {
  await expect(page.locator('.category-notice')).toContainText(message);
});
Then(
  'the coupon service received two visibility changes',
  async ({ apiState }) => {
    expect(apiState.coupon?.deletes).toBe(2);
  },
);
