# End-to-end coverage

Run `yarn test:e2e` to build the app and run every scenario in desktop Chromium
and the Pixel 7 mobile configuration. API-backed pages use intercepted responses;
these tests do not verify a live backend.

| Routes                                                                   | Coverage file                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `/`, `/profile`, `/users`                                                | `workflows.spec.ts` (profile avatars also in `categories.spec.ts`) |
| `/auth/sign-in`, `/auth/forgot-password`                                 | `workflows.spec.ts`                                                |
| `/auth/activate-account/:uid/:token`, `/auth/reset-password/:uid/:token` | `workflows.spec.ts`                                                |
| `/categories`                                                            | `categories.spec.ts`                                               |
| `/coupons`                                                               | `coupons.spec.ts`                                                  |
| `/localizations`                                                         | `localizations.spec.ts`                                            |
| `/courses`, `/sections`, `/lectures`                                     | `preview-pages.spec.ts`                                            |
| `/wallets`, `/enrollments`                                               | `preview-pages.spec.ts`                                            |

`preview-pages.spec.ts` also checks all protected routes anonymously, instructor
and learner access to the new preview pages, every supported lecture status deep
link, and the unknown-route fallback. Preview workflows cover filtering, empty
states, dialog interactions, temporary creation/editing, reload behavior, and
filtered CSV contents where supported. The five preview pages currently use local
sample data, so their tests intentionally do not assert backend persistence.

Navigation labels without an implemented route (for example Ratings and Orders)
are not separate pages. Add coverage here when those routes are implemented.
Page coverage does not imply exhaustive coverage of every possible input or state.
