import { test, expect } from '@playwright/test';
test('coupon drag import, create, partial edit, delete and restore', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learninfy.auth',
      JSON.stringify({ access: 'access', refresh: 'refresh' }),
    ),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: { id: '1', username: 'admin', role: ['admin'] } }),
  );
  let coupon = {
    id: 'coupon-id',
    code: 'LEARN20',
    course: '711e0b9f-3e61-4c8a-9cb4-a824ae2f47c3',
    course_title: 'Python Basics',
    coupon_type: 'percentage',
    value: 20,
    limit: 100,
    used: 5,
    is_unlimited: false,
    is_global: false,
    is_instructor_created: false,
    expired_at: '2099-12-31',
    deleted_at: null as string | null,
    created_at: null,
    updated_at: null,
  };
  await page.route('**/api/v1/course/**', (route) =>
    route.fulfill({
      json: {
        results: [{ id: coupon.course, title: coupon.course_title }],
        next: null,
      },
    }),
  );
  let exists = false;
  let deletes = 0;
  await page.route('**/api/v1/coupon/management/**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      expect(req.postDataJSON().is_instructor_created).toBe(false);
      coupon = { ...coupon, ...req.postDataJSON() };
      exists = true;
      return route.fulfill({ status: 201, json: coupon });
    }
    if (req.method() === 'PATCH') {
      expect(req.postDataJSON()).toEqual({ value: 25 });
      coupon = { ...coupon, ...req.postDataJSON() };
      return route.fulfill({ json: coupon });
    }
    if (req.method() === 'DELETE') {
      deletes++;
      coupon.deleted_at = coupon.deleted_at ? null : '2026-09-30';
      return route.fulfill({
        json: {
          message: coupon.deleted_at
            ? 'Coupon deleted successfully'
            : 'Coupon activated successfully',
        },
      });
    }
    if (new URL(req.url()).pathname.endsWith('/coupon-id/'))
      return route.fulfill({ json: coupon });
    const deleted = new URL(req.url()).searchParams.get('is_deleted');
    const results =
      exists && (deleted === null || String(!!coupon.deleted_at) === deleted)
        ? [coupon]
        : [];
    return route.fulfill({
      json: { count: results.length, next: null, previous: null, results },
    });
  });
  await page.goto('/coupons');
  await page
    .getByRole('button', { name: 'Create coupon', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Course', { exact: true })).toBeEnabled();
  await dialog.getByLabel('Course', { exact: true }).click();
  await page
    .getByRole('option', { name: 'Python Basics', exact: true })
    .click();
  await expect(dialog.getByLabel('Course', { exact: true })).toContainText(
    'Python Basics',
  );
  await dialog.getByLabel('Discount type', { exact: true }).click();
  await page.getByRole('option', { name: 'Fixed amount', exact: true }).click();
  await expect(
    dialog.getByLabel('Discount type', { exact: true }),
  ).toContainText('Fixed amount');
  await expect(dialog.locator('select')).toHaveCount(0);

  await dialog.getByLabel('Upload coupon draft').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[]'),
  });
  await expect(dialog.getByRole('alert')).toContainText('one coupon object');
  await dialog.locator('.category-dropzone').evaluate((element, data) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([JSON.stringify(data)], 'offer.json', {
        type: 'application/json',
      }),
    );
    element.dispatchEvent(
      new DragEvent('drop', { bubbles: true, dataTransfer: transfer }),
    );
  }, coupon);
  await expect(dialog.getByLabel('Coupon code')).toHaveValue('LEARN20');
  await dialog.getByLabel('Upload coupon draft').setInputFiles({
    name: 'old-example.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...coupon,
        course: '811e0b9f-3e61-4c8a-9cb4-a824ae2f47c3',
      }),
    ),
  });
  await expect(
    dialog.getByText(
      'The imported course is unavailable. Select a course from the list before saving.',
    ),
  ).toBeVisible();
  await expect(dialog.getByLabel('Course', { exact: true })).toContainText(
    'Select a course',
  );
  await dialog
    .getByRole('button', { name: 'Create coupon', exact: true })
    .click();
  await expect(
    dialog.getByText('Select an available course before saving.'),
  ).toBeVisible();
  expect(exists).toBe(false);
  await dialog
    .getByLabel('Upload coupon draft')
    .setInputFiles('public/templates/coupon.json');
  await expect(
    dialog.getByText('Your draft is imported. Select a course before saving.'),
  ).toBeVisible();
  await dialog.getByLabel('Course', { exact: true }).click();
  await page
    .getByRole('option', { name: 'Python Basics', exact: true })
    .click();

  await dialog
    .getByRole('button', { name: 'Create coupon', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'LEARN20', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit LEARN20' }).click();
  await dialog.getByLabel('Discount value').fill('25');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.coupon-value')).toContainText('25%');
  await page.getByRole('button', { name: 'Delete LEARN20' }).click();
  await dialog
    .getByRole('button', { name: 'Delete coupon', exact: true })
    .click();
  await expect(page.locator('.category-notice')).toContainText(
    'Coupon deleted successfully',
  );
  await page.getByRole('button', { name: 'Coupon visibility' }).click();
  await page.getByRole('option', { name: 'Deleted', exact: true }).click();
  await page.getByRole('button', { name: 'Restore LEARN20' }).click();
  await dialog
    .getByRole('button', { name: 'Restore coupon', exact: true })
    .click();
  await expect(page.locator('.category-notice')).toContainText(
    'Coupon activated successfully',
  );
  expect(deletes).toBe(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
