# End-to-end tests

The suite uses Playwright and [playwright-bdd](https://vitalets.github.io/playwright-bdd/).
Gherkin acceptance scenarios are compiled by `bddgen`. Focused regression tests
cover additional errors, accessibility, session recovery, and API contracts.
Each scenario has one owner: migrating it to a feature means removing its old
spec implementation. Both suites run on desktop Chromium and a Pixel 7 viewport.

## Structure

```text
tests/e2e/
  features/    Business scenarios, backgrounds, and example tables
  steps/       Given/When/Then bindings, organized by domain
  pages/       Reusable browser actions and component interactions
  fixtures/    Isolated browser setup, test data, and scenario state
  support/     Session helpers and stateful API mocks
  specs/       Additional domain-specific regression scenarios
.features-gen/ Generated Playwright tests (ignored; never edit or commit)
```

`features` describes intent; `steps` connects intent to actions and assertions.
`pages` owns shared selectors and multi-control actions. `support` owns API
setup. Expected outcomes remain explicit in features and steps. The fixtures
are shared with native regression specs; all mutable state is test-scoped.

## Commands

```sh
yarn install --frozen-lockfile
yarn playwright install chromium
yarn test:e2e:check              # Strict TypeScript checks for tests and config
yarn test:e2e:generate           # Generate tests; undefined/ambiguous steps fail
yarn test:e2e:list               # Regenerate and list both suites
yarn test:e2e --workers=4        # Regenerate and run every desktop/mobile test
yarn test:e2e --grep @courses   # Run a tagged feature on both devices
yarn test:e2e --project=bdd-chromium
yarn test:e2e --project=regression-mobile
yarn test:e2e:report            # Open the HTML report
```

Always use `yarn test:e2e` after editing a feature or step so generated tests
cannot become stale. The four projects have separate test directories:
`bdd-chromium`, `bdd-mobile`, `regression-chromium`, and `regression-mobile`.
They share one production build and preview server. A scenario runs once per
device, never once in each suite.

## Coverage ownership

| Page / behavior                        | Acceptance feature      | Additional regression specs            |
| -------------------------------------- | ----------------------- | -------------------------------------- |
| Protected routes and unknown paths     | `access.feature`        | `session.spec.ts`                      |
| Sign-in, activation, password recovery | `auth.feature`          | `auth.spec.ts`, `session.spec.ts`      |
| Dashboard and responsive navigation    | `access.feature`        | `navigation.spec.ts`                   |
| Profile preferences and passwords      | `profile.feature`       | `profile.spec.ts`                      |
| Users and role filtering               | `users.feature`         | `users.spec.ts`, `invitations.spec.ts` |
| Categories                             | `categories.feature`    | `categories.spec.ts`                   |
| Coupons                                | `coupons.feature`       | `coupons.spec.ts`                      |
| Localizations                          | `localizations.feature` | `localizations.spec.ts`                |
| Courses                                | `courses.feature`       | `courses.spec.ts`                      |
| Ratings management                     | —                       | `ratings.spec.ts`                      |
| Sections and lecture status URLs       | `curriculum.feature`    | `curriculum.spec.ts`                   |
| Wallet transactions and CSV exports    | `records.feature`       | —                                      |
| Enrollment report                      | —                       | `enrollments.spec.ts`                  |

The four preview pages use sample data, including temporary drafts and edits.
Tests assert that changes reset on reload; they do not imply server persistence.
API-backed pages use mocks, not a live backend. Navigation labels without routes
(e.g. Orders) are not implemented pages.

## Adding or changing scenarios

- Reuse shared steps and page actions before adding selectors or setup.
- Use `Scenario Outline` and `Examples` for the same behavior across roles,
  routes, statuses, or page types. Do not copy the scenario for each value.
- Import `test`/`expect` or `Given`/`When`/`Then` from `fixtures/test.ts`.
- Put stateful API setup in `support`; do not use module-level mutable state,
  shared accounts, or dependencies on another scenario's results.
- Use role/label locators and Playwright's retrying assertions. Start request
  and download waits before the action that triggers them. Avoid fixed sleeps.
- Register a mock for every API request. The shared fixture intercepts requests
  to `/api/v1/`, supplies CSRF and anonymous-session defaults, and fails the test
  on any unhandled endpoint instead of contacting a real backend.
- Keep feature scenarios readable. Keep narrow failure/keyboard/protocol
  regressions in `specs`, without repeating an existing acceptance scenario.

CI checks E2E types, lint, formatting, unit coverage, then regenerates and runs
all E2E tests. HTML reports, JUnit XML, failure screenshots, and retained traces
are uploaded alongside unit coverage. CI limits workers to two, forbids
`test.only`, and retries failures twice; local runs do not retry by default.

Course coverage includes server pagination, search, sorting, URL filters, option IDs,
explicit boolean filters, retryable failures, detail dialogs, and admin-only access.
Coupon regressions cover list recovery and failed saves without losing the draft.

Wallet regressions cover overview, history, and detail retry recovery, plus invalid
date ranges disabling exports and resuming requests after correction.

Ratings regressions cover admin-only access, responsive navigation, pagination,
search, empty results, all filter parameters and sorting choices, draft reset,
detail and list recovery, comment/response edits and clearing, deletion and
last-page recovery, pending mutation locks, keyboard focus, and option retries.

Curriculum regressions cover section and lecture list/detail recovery, failed
moderation with draft retention and retry, deleted records, pagination, search
and empty results, filter request payloads, cancelled drafts, and clearing filters.
