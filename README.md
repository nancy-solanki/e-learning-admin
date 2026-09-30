# Learninfy E-learning Admin

## Setup

Use Node.js 22 and Yarn 1. Install with `yarn install --frozen-lockfile`.
Copy `.env.example` to `.env`. Set `VITE_API_ROOT_URL` to the API origin
(for example, `http://localhost:8000`), without `/api/v1/auth`.
Leave it empty when the API is served on the same origin. Vite embeds this
setting at build time; production must use the appropriate HTTPS origin.
Endpoint paths live in `src/api/endpoints/index.ts`.

Run `yarn dev` for development. Build with `yarn build`; serve `dist/`
with a static host that falls back to `index.html` for frontend routes and
routes `/api/` to the backend when using a same-origin API.

## Checks

- `yarn build`: TypeScript and production bundle.
- `yarn lint` and `yarn format:check`: static checks.
- `yarn test`: unit tests.
- `yarn test:coverage`: core library coverage with enforced thresholds
  (85% statements/lines/functions, 75% branches). HTML report: `coverage/`.
- `yarn playwright install chromium`: install the browser once.
- `yarn test:e2e`: desktop and mobile Chromium tests against a production build.

Browser tests mock API responses and do not modify real accounts. They cover
frontend workflows, not backend authorization or production infrastructure.
Both test runners fail when no tests are found. CI runs coverage, static
checks, and browser tests including a production build.

## Supported features and release verification

Home is a static welcome page. The header account dropdown contains Profile
and Log out; administrators access Users from the sidebar. Future modules
are marked Coming soon. A shared React Router layout keeps the shell mounted
while nested pages change without document reloads.
User search, status, and ordering are sent to the backend. Listing follows
same-origin pagination links within those results. Role tabs currently filter
those results locally pending the backend role-filter contract.
Status and admin-privilege updates use PUT; confirm this contract in staging.
CI validates changes but does not deploy them. Deployment configuration needs
a target hosting provider, environment, and credentials.

Before deploying, verify the API contract in staging, especially account
activation/reset, refresh rotation, user updates, and logout revocation.
The backend must authorize every user-management operation; the frontend
role guard is only a UI restriction. Configure HTTPS, CORS, static-host
security headers and SPA fallback in the deployment environment. Tokens
currently use localStorage; an HttpOnly-cookie session requires backend
support and should be evaluated for the production authentication design.

## Session and SPA behavior

Protected routes verify the saved session before rendering account pages.
After sign-in, users return to the requested profile or users page. API 401s
share one in-flight refresh request; delayed 401s reuse a newly issued access
token. Each request is retried at most once. Rotated refresh tokens are saved;
access-only refresh responses retain the existing refresh token.

Rejected refresh credentials (400/401/403), invalid refresh responses, or a
second 401 clear the session. Network errors and server outages retain the
session and show a retry action during session restoration. Logout clears
local state immediately, attempts server revocation, and prevents pending
refresh responses from restoring a logged-out session. Cross-tab logout and account replacement are
observed through storage events; account replacement resets mounted pages and
revalidates identity and administrator access. Refresh deduplication is per browser tab;
backend rotation/grace behavior across multiple tabs must be verified in staging.

The deployed static server must serve `index.html` for frontend deep links
such as `/profile` and `/users`. Requests under `/api/` must go to the backend,
not the SPA fallback. The Vite preview-based browser tests verify frontend
navigation and reloads; they do not configure the production web server.

## API and shared state

- `src/api/endpoints/`: endpoint paths and URL builders. Add new routes here.
- `src/api/services/`: typed HTTP functions grouped by domain (`auth`, `users`, `categories`). Pages never call Axios directly.
- `src/api/axios.ts`: Axios configuration, bearer-token interceptor, shared token refresh, and retry handling only.
- `src/api/errors.ts`: shared API error parsing.
- `src/state/queryClient.ts`: application-wide TanStack Query client and cache keys, provided in `src/main.tsx`.
- `src/state/users.ts` and `src/state/categories.ts`: query and mutation hooks. Filters/pagination are part of query keys; successful writes invalidate the relevant lists.
- `src/state/profile.ts`: shared profile query and cache updates after profile/avatar writes.
- `src/state/session.ts`: token storage and session lifecycle. Logout/account changes clear all cached server data; late responses cannot restore a previous profile.

Queries use a 30-second freshness window (the profile is cached until explicitly refreshed or updated). Automatic retries and window-focus refetching are disabled; existing retry buttons remain available. Form drafts, selection, and modal visibility remain local React state. Token-refresh behavior and the existing UI are unchanged.
