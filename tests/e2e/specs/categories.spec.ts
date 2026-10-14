import { test, expect } from '../fixtures/test';
import { session } from '../support/session';

test('category sort supports keyboard navigation and updates server ordering', async ({
  page,
}, testInfo) => {
  await session(page);
  await page.route('**/api/v1/category/**', (route) =>
    route.fulfill({
      json: {
        count: 3,
        next: null,
        previous: null,
        results: [
          'Design & creativity',
          'Development',
          'Business & growth',
        ].map((title, i) => ({
          id: String(i),
          title,
          slug: title.toLowerCase().split(' ')[0],
          description:
            'Explore fresh perspectives and build the skills to bring your ideas to life.',
          thumbnail: null,
          created_at: '2026-09-29T12:00:00Z',
        })),
      },
    }),
  );
  await page.goto('/categories');
  await expect(
    page.getByRole('heading', { name: 'Design & creativity' }),
  ).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Sort categories' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('End');
  const sorted = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get('ordering') === '-title',
  );
  await page.keyboard.press('Enter');
  await sorted;
  await expect(trigger).toHaveText('Title: Z–A');
  const freshSort = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get('ordering') === '-created_at',
  );
  await trigger.click();
  await page.getByRole('option', { name: 'Newest first' }).click();
  await freshSort;
  const searched = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get('search') === 'Design',
  );
  await page.getByLabel('Search categories').fill('Design');
  await searched;
  const cleared = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname === '/api/v1/category/' &&
      url.searchParams.get('search') === ''
    );
  });
  await page.getByLabel('Search categories').fill('');
  await cleared;
  await trigger.focus();

  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Design & creativity' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('categories.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath('category-editor.png') });
});
