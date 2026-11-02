import type { Page } from '@playwright/test';
import type { BankAccount } from '../../../src/api/services/bank';

export const bankAccount: BankAccount = {
  id: 'bank-1',
  user: 'instructor',
  name: 'Primary Bank',
  ifsc_code: 'BANK0001234',
  account_number: '001234567890',
  default: true,
  created_at: null,
  updated_at: null,
  deleted_at: null,
};

export async function mockBank(page: Page, initial = [bankAccount]) {
  const state = {
    accounts: initial.map((account) => ({ ...account })),
    requests: [] as {
      method: string;
      url: URL;
      body: Record<string, unknown> | null;
    }[],
    failList: false,
    failSave: false,
    failDelete: false,
  };
  await page.route('**/api/v1/bank/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = request.postDataJSON();
    state.requests.push({ method, url, body });
    const id = url.pathname.split('/')[4];
    if (method === 'GET' && !id) {
      if (state.failList)
        return route.fulfill({
          status: 500,
          json: { detail: 'Bank service unavailable' },
        });
      let results = state.accounts.filter((account) =>
        account.name
          .toLowerCase()
          .includes((url.searchParams.get('search') ?? '').toLowerCase()),
      );
      if (url.searchParams.has('default'))
        results = results.filter(
          (account) =>
            String(account.default) === url.searchParams.get('default'),
        );
      return route.fulfill({
        json: { count: results.length, next: null, previous: null, results },
      });
    }
    const account = state.accounts.find((item) => item.id === id);
    if (method === 'GET' && account) return route.fulfill({ json: account });
    if (['POST', 'PATCH'].includes(method)) {
      if (state.failSave)
        return route.fulfill({
          status: 400,
          json: { account_number: ['Account already exists'] },
        });
      if (method === 'POST') {
        const created = {
          ...bankAccount,
          ...body,
          id: `bank-${state.accounts.length + 1}`,
          default: state.accounts.length === 0,
        };
        state.accounts.push(created);
        return route.fulfill({ status: 201, json: created });
      }
      if (account) {
        if (body.default === true)
          state.accounts.forEach((item) => {
            item.default = false;
          });
        Object.assign(account, body);
        return route.fulfill({ json: account });
      }
    }
    if (method === 'DELETE' && account) {
      if (state.failDelete)
        return route.fulfill({
          status: 400,
          json: { detail: 'Deletion temporarily unavailable' },
        });
      state.accounts = state.accounts.filter((item) => item.id !== id);
      return route.fulfill({ status: 204 });
    }
    throw new Error(`Unhandled bank request: ${method} ${url.pathname}`);
  });
  return state;
}
