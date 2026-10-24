import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  exportWalletTransactions,
  getWalletOverview,
  getWalletTransaction,
  listWalletTransactions,
} from '../../src/api/services/wallet';
import { clearSessionCache } from '../../src/state/session';

const originalAdapter = api.defaults.adapter;

function response(data: unknown, config: InternalAxiosRequestConfig) {
  return {
    data,
    config,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
  };
}

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  clearSessionCache();
  resetCsrf();
  authTransport.defaults.adapter = async (config) =>
    response({ csrfToken: 'csrf' }, config);
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearSessionCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('wallet API', () => {
  it('requests own-wallet overview with only the selected date range', async () => {
    const range = { start: '2026-10-03', end: '2026-10-10' };
    const result = { currency: 'INR' };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/wallet/overview/');
      expect(config.params).toEqual(range);
      return response(result, config);
    };
    await expect(getWalletOverview(range)).resolves.toEqual(result);
  });

  it('passes all history filters and cancellation without wallet identifiers', async () => {
    const filters = {
      start: '2026-10-03',
      end: '2026-10-10',
      page: 2,
      search: 'course ref',
      type: 'earning' as const,
      status: 'completed' as const,
    };
    const signal = new AbortController().signal;
    const result = { count: 0, next: null, previous: null, results: [] };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/wallet/transactions/');
      expect(config.params).toEqual(filters);
      expect(config.signal).toBe(signal);
      expect(config.url).not.toMatch(/wallet\/[^/]+\/transactions/);
      return response(result, config);
    };
    await expect(listWalletTransactions(filters, signal)).resolves.toEqual(
      result,
    );
  });

  it('fetches detail by encoded transaction UUID', async () => {
    const result = { id: 'uuid' };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/wallet/transactions/uuid%2Fpart/');
      return response(result, config);
    };
    await expect(getWalletTransaction('uuid/part')).resolves.toEqual(result);
  });

  it('exports all active filters without a page parameter as a Blob', async () => {
    const filters = {
      start: '2026-10-03',
      end: '2026-10-10',
      search: 'reference',
      type: 'withdrawal' as const,
      status: 'pending' as const,
    };
    const blob = new Blob(['reference,amount']);
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/wallet/transactions/export/');
      expect(config.params).toEqual(filters);
      expect(config.params).not.toHaveProperty('page');
      expect(config.responseType).toBe('blob');
      return response(blob, config);
    };
    await expect(exportWalletTransactions(filters)).resolves.toBe(blob);
  });
});
