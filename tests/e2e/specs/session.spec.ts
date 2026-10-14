import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { admin, learner } from '../fixtures/users';

test('non-admin direct access never requests the user list', async ({
  page,
}) => {
  await session(page, learner);
  let requested = false;
  await page.route('**/api/v1/users/', (route) => {
    requested = true;
    return route.fulfill({ json: [] });
  });
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Users', exact: true }),
  ).toHaveCount(0);
  expect(requested).toBe(false);
});

test('expired session redirects immediately after refresh failure', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.route('**/api/v1/auth/refresh/', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto('/profile');
  await expect(page).toHaveURL(/auth\/sign-in/);
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
});

test('cross-tab logout removes the protected view', async ({ page }) => {
  await session(page);
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toBeVisible();
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.evaluate(() => {
    const channel = new BroadcastChannel('learninfy-session');
    channel.postMessage('changed');
    channel.close();
  });
  await expect(page).toHaveURL(/auth\/sign-in/);
});

test('expired access refreshes and restores a deep link', async ({ page }) => {
  await session(page);
  let refreshed = false;
  let refreshes = 0;
  await page.route('**/api/v1/users/me/', (route) =>
    refreshed
      ? route.fulfill({ json: admin })
      : route.fulfill({ status: 401, json: {} }),
  );
  await page.route('**/api/v1/auth/refresh/', (route) => {
    refreshes++;
    refreshed = true;
    return route.fulfill({ json: {} });
  });
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(refreshes).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
});

test('temporary refresh outage preserves the session and supports retry', async ({
  page,
}) => {
  await session(page);
  let refreshed = false;
  await page.route('**/api/v1/users/me/', (route) =>
    refreshed
      ? route.fulfill({ json: admin })
      : route.fulfill({ status: 401, json: {} }),
  );
  await page.route('**/api/v1/auth/refresh/', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
  await page.route('**/api/v1/auth/refresh/', (route) => {
    refreshed = true;
    return route.fulfill({ json: {} });
  });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Full name')).toBeVisible();
});

for (const path of ['/users', '/profile']) {
  test(`cross-tab account replacement revalidates ${path}`, async ({
    page,
    context,
  }) => {
    await session(page);
    let replacementRequests = 0;
    let replacement = false;
    await page.route('**/api/v1/users/me/', (route) => {
      if (replacement) replacementRequests++;
      return route.fulfill({ json: replacement ? learner : admin });
    });
    await page.route('**/api/v1/users/', (route) =>
      route.fulfill({ json: [admin, learner] }),
    );
    await page.goto(path);
    if (path === '/users') {
      await expect(
        page.getByRole('heading', { name: 'Users Management' }),
      ).toBeVisible();
    } else {
      await expect(page.getByLabel('Full name')).toHaveValue('Ada Lovelace');
    }
    const otherTab = await context.newPage();
    await otherTab.goto('/auth/reset-password/uid/token');
    replacement = true;
    await otherTab.evaluate(() => {
      const channel = new BroadcastChannel('learninfy-session');
      channel.postMessage('changed');
      channel.close();
    });
    if (path === '/users') {
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole('heading', { name: 'Users Management' }),
      ).toHaveCount(0);
    } else {
      await expect(page.getByLabel('Full name')).toHaveValue('Grace Hopper');
    }
    await expect(
      page.getByRole('link', { name: 'Users', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Account menu' }),
    ).toContainText('grace');
    expect(replacementRequests).toBeGreaterThan(0);
    await otherTab.close();
  });
}
