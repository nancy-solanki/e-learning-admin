import type { Page } from '@playwright/test';
import { admin, learner } from '../fixtures/users';

type SessionUser = { id: string; username: string; role: string[] };

export async function session(page: Page, user: SessionUser = admin) {
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: user }),
  );
}

export async function anonymousSession(page: Page) {
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
}

export async function sessionAs(page: Page, role: string) {
  if (role === 'anonymous') return anonymousSession(page);
  if (!['admin', 'instructor', 'learner'].includes(role)) {
    throw new Error(`Unsupported test role: ${role}`);
  }
  await session(page, role === 'admin' ? admin : { ...learner, role: [role] });
}
