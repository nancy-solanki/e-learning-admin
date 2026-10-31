import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccount,
  listBankAccounts,
  setDefaultBankAccount,
  updateBankAccount,
} from '../../src/api/services/bank';
import { apiErrorMessage, apiFieldErrors } from '../../src/api/errors';
import { clearSessionCache } from '../../src/state/session';
const adapter = api.defaults.adapter;
const authAdapter = authTransport.defaults.adapter;
const response = (
  data: unknown,
  config: InternalAxiosRequestConfig,
  status = 200,
) => ({ data, config, status, statusText: 'OK', headers: new AxiosHeaders() });
beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  clearSessionCache();
  resetCsrf();
  authTransport.defaults.adapter = async (config) =>
    response({ csrfToken: 'csrf' }, config);
});
afterEach(() => {
  api.defaults.adapter = adapter;
  authTransport.defaults.adapter = authAdapter;
  clearSessionCache();
  vi.unstubAllGlobals();
});
it('lists paginated accounts with filters and cancellation', async () => {
  const filters = {
    page: 2,
    search: 'HDFC',
    default: false,
    ordering: 'name' as const,
  };
  const signal = new AbortController().signal;
  const result = { count: 21, next: null, previous: '?page=1', results: [] };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/bank/');
    expect(config.params).toEqual(filters);
    expect(config.signal).toBe(signal);
    return response(result, config);
  };
  await expect(listBankAccounts(filters, signal)).resolves.toEqual(result);
});
it('preserves leading zeros and uses cookie credentials and CSRF for creation', async () => {
  const draft = {
    name: 'Bank',
    ifsc_code: 'HDFC0001234',
    account_number: '001234567890',
  };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/bank/');
    expect(config.method).toBe('post');
    expect(JSON.parse(config.data)).toEqual(draft);
    expect(config.withCredentials).toBe(true);
    expect(config.headers.get('X-CSRFToken')).toBe('csrf');
    return response({ ...draft, id: 'uuid', default: true }, config, 201);
  };
  expect((await createBankAccount(draft)).account_number).toBe(
    draft.account_number,
  );
});
it('keeps partial edits separate from the default message response and handles 204', async () => {
  const requests: unknown[] = [];
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/bank/uuid/');
    requests.push([
      config.method,
      config.data ? JSON.parse(config.data) : undefined,
    ]);
    return response(
      config.method === 'delete' ? '' : { message: 'Account set successfully' },
      config,
      config.method === 'delete' ? 204 : 200,
    );
  };
  await getBankAccount('uuid');
  await updateBankAccount('uuid', { name: 'Updated' });
  await expect(setDefaultBankAccount('uuid')).resolves.toEqual({
    message: 'Account set successfully',
  });
  await expect(deleteBankAccount('uuid')).resolves.toBeUndefined();
  expect(requests).toEqual([
    ['get', undefined],
    ['patch', { name: 'Updated' }],
    ['patch', { default: true }],
    ['delete', undefined],
  ]);
});
it('normalizes arrays, nested detail and wrapped authentication errors', () => {
  const error = (data: unknown) => ({ isAxiosError: true, response: { data } });
  expect(apiErrorMessage(error(["Primary Account can't be deleted"]))).toBe(
    "Primary Account can't be deleted",
  );
  expect(apiErrorMessage(error({ detail: { message: 'Not found' } }))).toBe(
    'Not found',
  );
  expect(
    apiErrorMessage(error({ errors: { detail: ['Authentication required'] } })),
  ).toBe('Authentication required');
  expect(apiFieldErrors(error({ name: ['Required'] }))).toEqual({
    name: 'Required',
  });
  expect(
    apiFieldErrors(error({ errors: { account_number: ['Already exists'] } })),
  ).toEqual({ account_number: 'Already exists' });
});
