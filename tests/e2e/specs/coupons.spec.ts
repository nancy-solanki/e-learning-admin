import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { mockCoupons } from '../support/coupons-api';

test('coupon list failure can recover to an empty list', async ({ page }) => {
  await session(page);
  let fail = true;
  await page.route('**/api/v1/coupon/management/**', (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { detail: 'Coupons temporarily unavailable' } }
        : { json: { count: 0, results: [], next: null, previous: null } },
    ),
  );
  await page.goto('/coupons');
  await expect(page.getByRole('alert')).toContainText(
    'Coupons temporarily unavailable',
  );
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your first offer starts here' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('coupon save failure preserves the draft and allows a successful retry', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockCoupons(page);
  let fail = true;
  await page.route('**/api/v1/coupon/management/**', async (route) => {
    if (fail && route.request().method() === 'POST') {
      return route.fulfill({
        status: 400,
        json: { code: ['This code already exists.'] },
      });
    }
    return route.fallback();
  });
  await page.goto('/coupons');
  await page
    .getByRole('button', { name: 'Create coupon', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  const formBody = dialog.locator('.coupon-form');
  const dimensions = await formBody.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  const expiryLayout = await dialog
    .locator('.coupon-expiry-grid')
    .evaluate((grid) => {
      const fields = grid.querySelectorAll('.ui-field');
      const usageInput = fields[0]?.querySelector('input');
      const expiryInput = fields[1]?.querySelector('input');
      if (!usageInput || !expiryInput)
        throw new Error('Coupon limit and expiry fields are missing.');
      return {
        usageInputTop: usageInput.getBoundingClientRect().top,
        expiryInputTop: expiryInput.getBoundingClientRect().top,
      };
    });
  expect(
    Math.abs(expiryLayout.usageInputTop - expiryLayout.expiryInputTop),
  ).toBeLessThanOrEqual(1);
  const alignment = await formBody.evaluate((element) => {
    const grid = element.querySelector('.coupon-form-grid');
    if (!grid) throw new Error('Coupon form grid is missing.');
    const formBounds = element.getBoundingClientRect();
    const gridBounds = grid.getBoundingClientRect();
    return {
      left: gridBounds.left - formBounds.left,
      right: formBounds.right - gridBounds.right,
    };
  });
  expect(Math.abs(alignment.left - alignment.right)).toBeLessThanOrEqual(2);
  const footer = dialog.locator('.coupon-dialog-footer');
  const footerPosition = await footer.boundingBox();
  expect(footerPosition).not.toBeNull();
  await formBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    dialog.getByRole('checkbox', { name: 'Instructor-managed' }),
  ).toBeInViewport();
  await expect(
    dialog.getByRole('button', { name: 'Create coupon', exact: true }),
  ).toBeInViewport();
  expect(await footer.boundingBox()).toEqual(footerPosition);
  await dialog.getByLabel('Coupon code').fill('RETRY20');
  await controls.choose('Course', 'Python Basics', dialog);
  await dialog
    .getByRole('button', { name: 'Create coupon', exact: true })
    .click();
  await expect(
    dialog.getByText('This code already exists.', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel('Coupon code')).toHaveValue('RETRY20');
  expect(state.exists).toBe(false);
  fail = false;
  await dialog
    .getByRole('button', { name: 'Create coupon', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'RETRY20' })).toBeVisible();
  expect(state.exists).toBe(true);
});
