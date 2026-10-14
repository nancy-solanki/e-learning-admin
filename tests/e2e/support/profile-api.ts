import type { Page } from '@playwright/test';
import { admin } from '../fixtures/users';

export async function mockProfile(page: Page) {
  let saved: Record<string, unknown> = {};
  await page.route('**/api/v1/users/me/', (route) => {
    if (route.request().method() === 'PUT')
      saved = route.request().postDataJSON();
    return route.fulfill({
      json: { ...admin, first_name: undefined, last_name: undefined, ...saved },
    });
  });
  await page.route('**/api/v1/auth/change-password/', (route) =>
    route.fulfill({ json: {} }),
  );

  return {
    get saved() {
      return saved;
    },
  };
}
