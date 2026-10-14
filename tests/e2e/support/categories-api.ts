import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function mockCategories(page: Page) {
  const category = {
    id: '1',
    title: 'python',
    slug: 'python',
    description: 'Learn Python',
    thumbnail: null,
    created_at: null,
    updated_at: null,
  };
  let exists = false;
  let failSave = true;
  await page.route('**/api/v1/category/**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST' || request.method() === 'PATCH') {
      expect(request.headers()['content-type']).toContain(
        'multipart/form-data; boundary=',
      );
      expect(request.headers().authorization).toBeUndefined();
      expect(request.headers()['x-csrftoken']).toBe('csrf');
      const body = request.postDataBuffer()!.toString();
      if (request.method() === 'POST') {
        expect(body).toContain('filename="python.png"');
        if (failSave) {
          failSave = false;
          await route.fulfill({
            status: 400,
            json: { title: ['This title already exists.'] },
          });
          return;
        }
        exists = true;
      } else {
        expect(body).not.toContain('name="thumbnail"');
        category.description = 'Updated description';
      }
      await route.fulfill({ json: category });
    } else if (request.method() === 'DELETE') {
      exists = false;
      await route.fulfill({ status: 204 });
    } else if (new URL(request.url()).pathname.endsWith('/python/'))
      await route.fulfill({ json: category });
    else
      await route.fulfill({
        json: {
          count: exists ? 1 : 0,
          next: null,
          previous: null,
          results: exists ? [category] : [],
        },
      });
  });
}
