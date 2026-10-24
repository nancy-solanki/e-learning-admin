import { test, expect } from '../fixtures/test';
import { admin, learner } from '../fixtures/users';
import { session } from '../support/session';
import {
  mockWallet,
  walletOverview,
  walletTransactions,
} from '../support/wallet-api';

test('wallet filters, UTC date range, transaction details and CSV export', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockWallet(page);
  await page.goto('/wallets');

  await expect(page.getByRole('heading', { name: 'Wallet.' })).toBeVisible();
  await expect(page.getByText('₹2,347.00', { exact: true })).toBeVisible();
  await expect(page.getByText('₹386.00', { exact: true })).toBeVisible();
  await expect(page.getByText('4 earning transactions')).toBeVisible();
  await expect(page.getByText('Sample wallet')).toHaveCount(0);
  await expect(page.locator('.wallet-status-failed')).toHaveText('Failed');
  await expect(page.locator('.wallet-status-cancelled')).toHaveText(
    'Cancelled',
  );

  await page.getByLabel('Start date').fill('2026-10-03');
  await page.getByLabel('End date').fill('2026-10-10');
  await controls.choose('Transaction type', 'Withdrawal');
  await controls.choose('Transaction status', 'Pending');
  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/v1/wallet/transactions/' &&
      url.searchParams.get('search') === 'REF-WITHDRAWAL-1007'
    );
  });
  await page.getByLabel('Search transactions').fill('REF-WITHDRAWAL-1007');
  await searchResponse;
  await expect(
    page.getByRole('button', { name: 'View transaction REF-WITHDRAWAL-1007' }),
  ).toBeVisible();
  const listQuery = state.listQueries.at(-1);
  expect(listQuery?.get('start')).toBe('2026-10-03');
  expect(listQuery?.get('end')).toBe('2026-10-10');
  expect(listQuery?.get('search')).toBe('REF-WITHDRAWAL-1007');
  expect(listQuery?.get('type')).toBe('withdrawal');
  expect(listQuery?.get('status')).toBe('pending');

  await page
    .getByRole('button', { name: 'View transaction REF-WITHDRAWAL-1007' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Transaction details' });
  await expect(dialog).toContainText('REF-WITHDRAWAL-1007');
  await expect(dialog).toContainText('−₹250.00');
  await expect(dialog).toContainText('Ending in 4821');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export transactions' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('wallet-transactions.csv');
  const exportQuery = state.exportQueries.at(-1);
  expect(exportQuery?.get('search')).toBe('REF-WITHDRAWAL-1007');
  expect(exportQuery?.get('type')).toBe('withdrawal');
  expect(exportQuery?.get('status')).toBe('pending');
  expect(exportQuery?.has('page')).toBe(false);

  await page.getByLabel('Search transactions').fill('missing transaction');
  await expect(
    page.getByRole('heading', { name: 'No matching transactions found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Search transactions')).toHaveValue('');
});

test('wallet supports empty history, missing account and incomplete history', async ({
  page,
}) => {
  await session(page);
  const overview = {
    ...walletOverview,
    history_complete: false,
    opening_balance: null,
    payout_account: null,
  };
  await mockWallet(page, { overview, rows: [] });
  await page.goto('/wallets');

  await expect(page.getByText('No payout account configured')).toBeVisible();
  await expect(page.getByText('Opening balance unavailable')).toBeVisible();
  await expect(page.getByText(/History available from/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No transactions found' }),
  ).toBeVisible();
});

test('wallet paginates server results and resets to page one on filter change', async ({
  page,
  controls,
}) => {
  await session(page);
  const rows = Array.from({ length: 21 }, (_, index) => ({
    ...walletTransactions[index % walletTransactions.length],
    id: `b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a${String(index).padStart(4, '0')}`,
    reference: `REF-${String(index).padStart(3, '0')}`,
  }));
  const state = await mockWallet(page, { rows, pageSize: 20 });
  await page.goto('/wallets');
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  expect(state.listQueries.at(-1)?.get('page')).toBe('2');
  await controls.choose('Transaction type', 'Earning');
  await expect(page.getByText('Showing 10 of 10 transactions')).toBeVisible();
  expect(state.listQueries.at(-1)?.get('page')).toBe('1');
});

test('instructors can access their own wallet and learners are redirected', async ({
  page,
}) => {
  await session(page, { ...admin, id: 'instructor-id', role: ['instructor'] });
  await mockWallet(page);
  await page.goto('/wallets');
  await expect(page.getByRole('heading', { name: 'Wallet.' })).toBeVisible();

  await session(page, learner);
  await page.goto('/wallets');
  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Wallets' }),
  ).toHaveCount(0);
});

test('wallet reports an unconfigured wallet without sample values', async ({
  page,
}) => {
  await session(page);
  await mockWallet(page, { overviewStatus: 404 });
  await page.goto('/wallets');
  await expect(
    page.getByRole('heading', { name: 'Wallet not configured' }),
  ).toBeVisible();
  await expect(page.getByText('Sample wallet')).toHaveCount(0);
});

test('wallet reports forbidden API access', async ({ page }) => {
  await session(page);
  await mockWallet(page, { overviewStatus: 403 });
  await page.goto('/wallets');
  await expect(
    page.getByRole('heading', { name: 'Access denied' }),
  ).toBeVisible();
});

test('wallet surfaces date validation and history errors', async ({ page }) => {
  await session(page);
  await mockWallet(page, { overviewStatus: 400, historyStatus: 500 });
  await page.goto('/wallets');
  await expect(
    page.getByRole('heading', { name: 'Unable to load wallet' }),
  ).toBeVisible();
  await expect(page.getByText('Wallet overview unavailable')).toBeVisible();
  await expect(page.getByText('History unavailable')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Try again' }).first(),
  ).toBeEnabled();
});

test('export errors are reported without starting a download', async ({
  page,
}) => {
  await session(page);
  await mockWallet(page, { exportStatus: 500 });
  await page.goto('/wallets');
  const download = page.waitForEvent('download', { timeout: 1500 });
  await page.getByRole('button', { name: 'Export transactions' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Unable to export wallet transactions.',
  );
  await expect(download).rejects.toThrow();
});
