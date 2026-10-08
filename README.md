# Learninfy E-learning Admin

## Setup

Use Node.js 22 and Yarn 1. Install with `yarn install --frozen-lockfile`.
Copy `.env.example` to `.env`. Set `VITE_API_ROOT_URL` to the API origin
(for example, `http://localhost:8000`), without `/api/v1/auth`.
`VITE_API_URL` is also supported as an origin-only alias and takes precedence.
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
security headers and SPA fallback in the deployment environment.

## Cookie sessions

JWTs are backend-set HttpOnly cookies. React never reads or persists JWTs.
The only browser storage operation removes the legacy `learninfy.auth` key
from localStorage and sessionStorage at startup; existing users sign in again.
The profile is held in memory and restored through `/api/v1/users/me/`.
All requests include credentials; mutations initialize an in-memory CSRF token
from `/api/v1/auth/csrf/` and send `X-CSRFToken`, including uploads.

Protected 401s share one refresh and retry once. Auth endpoints and 403s never
trigger refresh. Network/server errors remain visible with retry during startup.
Logout clears profile and protected caches only after server success, including
204 responses. Failed logout remains visible so the user can retry.
Web Locks serialize refresh and authentication changes across tabs; a profile
probe inside the refresh lock avoids rotating an already refreshed cookie.
Browsers without Web Locks only deduplicate within a tab; avoid simultaneous
multi-tab refresh there. BroadcastChannel tells other tabs to reload their
profile after sign-in/logout without storing credentials or profile data.

For local HTTP development, use `localhost` for frontend and backend (do not
mix with `127.0.0.1`). Backend settings under `config.settings.development`:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOW_CREDENTIALS=True
AUTH_COOKIE_SECURE=False
AUTH_COOKIE_SAMESITE=Lax
```

Run `python manage.py migrate` in the backend for JWT blacklist tables.
Production requires HTTPS, `AUTH_COOKIE_SECURE=True`, and exact frontend
origins including scheme and port, without paths. Prefer same-site hosts with
`Lax`; host-only cookies need no shared domain. Cross-site hosting requires
`SameSite=None; Secure` and may still be blocked by third-party-cookie rules;
use a same-site API/reverse proxy in that case. Configure lifetimes using
`JWT_ACCESS_TOKEN_MINUTES` and `JWT_REFRESH_TOKEN_DAYS` on the backend.

Verify in staging: staff login returns no JWT JSON and sets HttpOnly cookies;
reload restores the profile; removing only the access cookie refreshes and
rotates cookies; logout deletes both cookies even with expired access; missing
CSRF produces 403. Verify social login in the deployment that implements it
(this admin UI has no social login). Refresh rotates and blacklists old refresh
tokens; logout does not revoke copied access JWTs before their expiry.

The deployed static server must serve `index.html` for frontend deep links
such as `/profile` and `/users`. Requests under `/api/` must go to the backend,
not the SPA fallback. The Vite preview-based browser tests verify frontend
navigation and reloads; they do not configure the production web server.

## API and shared state

- `src/api/endpoints/`: endpoint paths and URL builders. Add new routes here.
- `src/api/services/`: typed HTTP functions grouped by domain (`auth`, `users`, `categories`). Pages never call Axios directly.
- `src/api/axios.ts`: Axios cookie credentials, CSRF initialization, coordinated refresh, and retry handling.
- `src/api/errors.ts`: shared API error parsing.
- `src/state/queryClient.ts`: application-wide TanStack Query client and cache keys, provided in `src/main.tsx`.
- `src/state/users.ts` and `src/state/categories.ts`: query and mutation hooks. Filters/pagination are part of query keys; successful writes invalidate the relevant lists.
- `src/state/profile.ts`: shared profile query and cache updates after profile/avatar writes.
- `src/state/session.ts`: in-memory session lifecycle and legacy key cleanup. Logout/account changes clear all cached server data; late responses cannot restore a previous profile.

Queries use a 30-second freshness window (the profile is cached until explicitly refreshed or updated). Automatic retries and window-focus refetching are disabled; existing retry buttons remain available. Form drafts, selection, and modal visibility remain local React state.
