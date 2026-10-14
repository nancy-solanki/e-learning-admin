import type { Page } from '@playwright/test';
import { admin } from '../fixtures/users';

export async function mockSignIn(page: Page) {
  let signedIn = false;
  await page.route('**/api/v1/auth/staff/sign-in/', (route) => {
    signedIn = true;
    return route.fulfill({ json: {} });
  });
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn ? admin : {},
    }),
  );
}
export async function mockAuthResponse(
  page: Page,
  endpoint: string,
  json: Record<string, unknown>,
  status = 200,
) {
  await page.route(`**/api/v1/auth/${endpoint}/`, (route) =>
    route.fulfill({ status, json }),
  );
}
