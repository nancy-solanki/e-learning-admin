import type { Page } from '@playwright/test';
import type {
  WalletOverview,
  WalletTransaction,
} from '../../../src/api/services/wallet';

const transactions: WalletTransaction[] = [
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1008',
    reference: 'REF-EARNING-1008',
    description: 'UI/UX Design course earning',
    date: '2026-10-10T12:00:00Z',
    completed_at: '2026-10-10T12:05:00Z',
    type: 'earning',
    status: 'completed',
    amount: '89.00',
    account_last4: '',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1007',
    reference: 'REF-WITHDRAWAL-1007',
    description: 'Payout to bank account',
    date: '2026-10-09T12:00:00Z',
    completed_at: null,
    type: 'withdrawal',
    status: 'pending',
    amount: '-250.00',
    account_last4: '4821',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1006',
    reference: 'REF-EARNING-1006',
    description: 'Modern web developer course earning',
    date: '2026-10-08T12:00:00Z',
    completed_at: '2026-10-08T12:05:00Z',
    type: 'earning',
    status: 'completed',
    amount: '129.00',
    account_last4: '',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1005',
    reference: 'REF-EARNING-1005',
    description: 'Python course earning',
    date: '2026-10-07T12:00:00Z',
    completed_at: '2026-10-07T12:05:00Z',
    type: 'earning',
    status: 'completed',
    amount: '99.00',
    account_last4: '',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1004',
    reference: 'REF-REFUND-1004',
    description: 'Course purchase refund',
    date: '2026-10-06T12:00:00Z',
    completed_at: '2026-10-06T12:05:00Z',
    type: 'refund',
    status: 'completed',
    amount: '-89.00',
    account_last4: '',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1003',
    reference: 'REF-WITHDRAWAL-1003',
    description: 'Payout to bank account',
    date: '2026-10-05T12:00:00Z',
    completed_at: '2026-10-05T12:05:00Z',
    type: 'withdrawal',
    status: 'completed',
    amount: '-500.00',
    account_last4: '4821',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1002',
    reference: 'REF-EARNING-1002',
    description: 'Brand identity course earning',
    date: '2026-10-04T12:00:00Z',
    completed_at: '2026-10-04T12:05:00Z',
    type: 'earning',
    status: 'completed',
    amount: '69.00',
    account_last4: '',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1001',
    reference: 'REF-ADJUSTMENT-1001',
    description: 'Opening balance adjustment',
    date: '2026-10-03T12:00:00Z',
    completed_at: '2026-10-03T12:05:00Z',
    type: 'adjustment',
    status: 'failed',
    amount: '109.00',
    account_last4: '',
  },
  {
    id: 'b1f2b72a-d2e3-4ff0-8a5b-b71b3c3a1000',
    reference: 'REF-ADJUSTMENT-1000',
    description: 'Cancelled balance adjustment',
    date: '2026-10-03T11:00:00Z',
    completed_at: null,
    type: 'adjustment',
    status: 'cancelled',
    amount: '0.00',
    account_last4: '',
  },
];

export const walletOverview: WalletOverview = {
  currency: 'INR',
  as_of: '2026-10-23T12:00:00Z',
  history_started_at: '2026-10-03T00:00:00Z',
  history_complete: true,
  opening_balance: '2800.00',
  period: { start: '2026-10-03', end: '2026-10-10', timezone: 'UTC' },
  summary: {
    available_balance: '2347.00',
    period_earnings: '386.00',
    completed_payouts: '500.00',
    refunds: '89.00',
    earning_count: 4,
    completed_payout_count: 1,
    refund_count: 1,
    pending_payout_amount: '250.00',
    pending_payout_count: 1,
    latest_pending_payout_at: '2026-10-09T12:00:00Z',
  },
  payout_account: {
    type: 'bank_transfer' as const,
    bank_name: 'Example Bank',
    account_last4: '4821',
  },
};

export async function mockWallet(
  page: Page,
  options: {
    overview?: WalletOverview;
    rows?: WalletTransaction[];
    pageSize?: number;
    overviewStatus?: number;
    historyStatus?: number;
    exportStatus?: number;
  } = {},
) {
  const rows = options.rows ?? transactions;
  const historyPageSize = options.pageSize ?? 20;
  const state: {
    listQueries: URLSearchParams[];
    exportQueries: URLSearchParams[];
  } = {
    listQueries: [],
    exportQueries: [],
  };
  await page.route('**/api/v1/wallet/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    if (path === '/api/v1/wallet/overview/') {
      return options.overviewStatus
        ? route.fulfill({
            status: options.overviewStatus,
            json: { detail: 'Wallet overview unavailable' },
          })
        : route.fulfill({ json: options.overview ?? walletOverview });
    }
    if (path === '/api/v1/wallet/transactions/export/') {
      state.exportQueries.push(requestUrl.searchParams);
      if (options.exportStatus)
        return route.fulfill({
          status: options.exportStatus,
          json: { detail: 'Export unavailable' },
        });
      return route.fulfill({
        contentType: 'text/csv',
        body: 'reference,amount\r\nREF-WITHDRAWAL-1007,-250.00\r\n',
      });
    }
    if (path === '/api/v1/wallet/transactions/') {
      state.listQueries.push(requestUrl.searchParams);
      if (options.historyStatus)
        return route.fulfill({
          status: options.historyStatus,
          json: { detail: 'History unavailable' },
        });
      const search = requestUrl.searchParams.get('search')?.toLowerCase() ?? '';
      const type = requestUrl.searchParams.get('type');
      const status = requestUrl.searchParams.get('status');
      const filtered = rows.filter(
        (entry) =>
          (!search ||
            `${entry.description} ${entry.reference}`
              .toLowerCase()
              .includes(search)) &&
          (!type || entry.type === type) &&
          (!status || entry.status === status),
      );
      const page = Number(requestUrl.searchParams.get('page') ?? 1);
      const results = filtered.slice(
        (page - 1) * historyPageSize,
        page * historyPageSize,
      );
      return route.fulfill({
        json: {
          count: filtered.length,
          next: page * historyPageSize < filtered.length ? 'next-page' : null,
          previous: page > 1 ? 'previous-page' : null,
          results,
        },
      });
    }
    const detail = path.match(/^\/api\/v1\/wallet\/transactions\/([^/]+)\/$/);
    if (detail) {
      const transaction = rows.find((entry) => entry.id === detail[1]);
      return transaction
        ? route.fulfill({ json: transaction })
        : route.fulfill({ status: 404, json: { detail: 'Not found' } });
    }
    return route.fulfill({ status: 404, json: { detail: 'Not found' } });
  });
  return state;
}

export const walletTransactions = transactions;
