import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function mockLocalizations(page: Page) {
  let record: {
    id: string;
    language_name: string;
    country: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  } | null = null;
  await page.route('**/api/v1/localization/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'POST') {
      expect(request.headers()['content-type']).toContain('application/json');
      expect(JSON.parse(request.postData()!)).toEqual({
        language_name: 'English',
        country: 'India',
      });
      record = {
        id: '7b20815e-591d-4c08-914e-735321f44823',
        language_name: 'English',
        country: 'India',
        created_at: '2026-10-01T12:00:00Z',
        updated_at: '2026-10-01T12:00:00Z',
        deleted_at: null,
      };
      await route.fulfill({ status: 201, json: record });
    } else if (method === 'PUT') {
      expect(url.pathname).toContain(record?.id);
      expect(JSON.parse(request.postData()!)).toEqual({
        language_name: 'English',
        country: 'United Kingdom',
      });
      record!.country = 'United Kingdom';
      await route.fulfill({ json: record });
    } else if (method === 'DELETE') {
      expect(url.search).toBe('');
      expect(request.postData()).toBeNull();
      if (record?.deleted_at) {
        record.deleted_at = null;
        await route.fulfill({
          status: 200,
          json: { message: 'Activated successfully' },
        });
      } else {
        record!.deleted_at = '2026-10-01T13:00:00Z';
        await route.fulfill({ status: 204 });
      }
    } else if (method === 'GET' && url.pathname.endsWith(`/${record?.id}/`)) {
      await route.fulfill({ json: record });
    } else {
      const isDeleted = url.searchParams.get('is_deleted');
      const exactCountry = url.searchParams.get('country');
      const search = url.searchParams.get('search')?.toLowerCase();
      const visible =
        record &&
        (isDeleted === null ||
          (isDeleted === 'true') === Boolean(record.deleted_at)) &&
        (!exactCountry ||
          exactCountry.toLowerCase() === record.country.toLowerCase()) &&
        (!search ||
          `${record.language_name} ${record.country}`
            .toLowerCase()
            .includes(search));
      await route.fulfill({
        json: {
          count: visible ? 1 : 0,
          next: null,
          previous: null,
          results: visible ? [record] : [],
        },
      });
    }
  });
}
