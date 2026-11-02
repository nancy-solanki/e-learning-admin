import { test, expect } from '../fixtures/test';
import { bankAccount, mockBank } from '../support/bank-api';
import { sessionAs } from '../support/session';

const secondary = {
  ...bankAccount,
  id: 'bank-2',
  name: 'Second Bank',
  default: false,
};

test('creates the first account with trimmed values and preserves leading zeros', async ({
  page,
  controls,
}) => {
  await sessionAs(page, 'instructor');
  const state = await mockBank(page, []);
  await page.goto('/bank-accounts');
  await expect(page.getByText('No bank accounts yet')).toBeVisible();
  await page.getByRole('button', { name: 'Add bank account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Bank name').fill('  New Bank  ');
  await dialog.getByLabel('IFSC').fill('  BANK0001234  ');
  await dialog.getByLabel('Account number').fill('  001234567890  ');
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'New Bank' })).toBeVisible();
  expect(state.requests.find((r) => r.method === 'POST')?.body).toEqual({
    name: 'New Bank',
    ifsc_code: 'BANK0001234',
    account_number: '001234567890',
  });
  await expect(page.getByText('•••• 7890', { exact: true })).toBeVisible();
  await expect(page.getByText('001234567890', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeDisabled();
  await controls.expectResponsive();
});

test('retains a failed edit and retries only changed fields; unchanged saves do not patch', async ({
  page,
}) => {
  await sessionAs(page, 'instructor');
  const state = await mockBank(page);
  await page.goto('/bank-accounts');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Account number')).toHaveValue(
    bankAccount.account_number,
  );
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.requests.filter((r) => r.method === 'PATCH')).toHaveLength(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Account number').fill('000987654321');
  state.failSave = true;
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(dialog.getByText('Account already exists')).toBeVisible();
  await expect(dialog.getByLabel('Account number')).toHaveValue('000987654321');
  state.failSave = false;
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('•••• 4321', { exact: true })).toBeVisible();
  expect(
    state.requests.filter((r) => r.method === 'PATCH').map((r) => r.body),
  ).toEqual([
    { account_number: '000987654321' },
    { account_number: '000987654321' },
  ]);
});

test('changes default before deletion, supports cancellation and retries failed deletion', async ({
  page,
}) => {
  await sessionAs(page, 'instructor');
  const state = await mockBank(page, [bankAccount, secondary]);
  await page.goto('/bank-accounts');
  const primary = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Primary Bank' }) });
  const second = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Second Bank' }) });
  await expect(
    primary.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeDisabled();
  await second.getByRole('button', { name: 'Make Default' }).click();
  await expect(
    second.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeDisabled();
  expect(state.requests.find((r) => r.method === 'PATCH')?.body).toEqual({
    default: true,
  });
  await primary.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(state.requests.filter((r) => r.method === 'DELETE')).toHaveLength(0);
  await primary.getByRole('button', { name: 'Delete', exact: true }).click();
  state.failDelete = true;
  await dialog
    .getByRole('button', { name: 'Delete account', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Deletion temporarily unavailable',
  );
  state.failDelete = false;
  await dialog
    .getByRole('button', { name: 'Delete account', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(primary).toHaveCount(0);
  await expect(second).toBeVisible();
});

test('recovers list failures and sends explicit false filters, sorting and trimmed searches', async ({
  page,
  controls,
}) => {
  await sessionAs(page, 'instructor');
  const state = await mockBank(page, [bankAccount, secondary]);
  state.failList = true;
  await page.goto('/bank-accounts');
  await expect(page.getByRole('alert')).toContainText(
    'Bank service unavailable',
  );
  state.failList = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'Primary Bank' }),
  ).toBeVisible();
  await controls.choose('Default account filter', 'Non-default accounts');
  await expect(page.getByRole('heading', { name: 'Primary Bank' })).toHaveCount(
    0,
  );
  await controls.choose('Sort bank accounts', 'Bank name: A–Z');
  await page
    .getByRole('textbox', { name: 'Search bank accounts' })
    .fill('  missing  ');
  await expect(
    page.getByText('No matching accounts', { exact: true }),
  ).toBeVisible();
  const params = state.requests.at(-1)!.url.searchParams;
  expect(Object.fromEntries(params)).toEqual({
    page: '1',
    search: 'missing',
    default: 'false',
    ordering: 'name',
  });
  await page.getByRole('button', { name: 'Reset filters' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Primary Bank' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Search bank accounts' }),
  ).toHaveValue('');
});

for (const role of ['learner', 'anonymous']) {
  test(`${role} cannot request bank data`, async ({ page }) => {
    await sessionAs(page, role);
    const state = await mockBank(page);
    await page.goto('/bank-accounts');
    await expect(page).toHaveURL(/auth\/sign-in/);
    await expect(page.getByLabel('Email')).toBeVisible();
    expect(state.requests).toHaveLength(0);
  });
}
