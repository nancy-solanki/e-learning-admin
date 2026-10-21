# Learninfy E-learning Admin

## Setup

Use Node.js 22 and Yarn 1. Install with `yarn install --frozen-lockfile`.
Run `nvm use` to select the Node.js version in `.nvmrc`; `package.json`
declares the minimum Node.js version and pins Yarn to 1.22.22.
Editor indentation and line endings are defined in `.editorconfig`.
Copy `.env.example` to `.env`. Set `VITE_API_ROOT_URL` to the API origin
(for example, `http://localhost:8000`), without `/api/v1/auth`.
`VITE_API_URL` is also supported as an origin-only alias and takes precedence.
Leave it empty when the API is served on the same origin. Vite embeds this
setting at build time; production must use the appropriate HTTPS origin.
Endpoint paths live in `src/api/endpoints/index.ts`.

Run `yarn dev` for development. Build with `yarn build`; serve `dist/`
with a static host that falls back to `index.html` for frontend routes and
routes `/api/` to the backend when using a same-origin API.

## Docker and ECS production deployment

Build the image with the public HTTPS API origin (no path):

```sh
docker build --build-arg VITE_API_ROOT_URL=https://api.example.com -t e-learning-admin:production .
docker run --rm -p 8080:8080 e-learning-admin:production
```

Open `http://localhost:8080`. The image builds with Node.js 22 and serves only
the production bundle using non-root Nginx on port 8080. Local `.env` files
are excluded. Vite embeds the API URL in the JavaScript bundle: ECS runtime
environment variables cannot change it, so rebuild for a different API origin.
Build arguments must not contain secrets.

For a same-origin API, omit the build argument and configure the Application
Load Balancer to route `/api` and `/api/*` to the backend target group ahead
of the frontend default rule. Nginx intentionally returns 404 for API requests
that reach this container. Frontend routes such as `/users` fall back to
`index.html`; hashed assets are cached for a year and HTML requires revalidation.

To deploy on ECS:

1. Build for the task's CPU architecture (`--platform linux/amd64` for X86_64
   or `--platform linux/arm64` for ARM64), tag the image with a unique release
   tag, and push it to your Amazon ECR repository.
2. Reference that image in your ECS task definition with container port `8080`
   and TCP protocol. For Fargate, use `awsvpc` networking and an ALB target
   group with target type `ip`.
3. Terminate HTTPS at the ALB, forward HTTP traffic to container port `8080`,
   and set the target group's health check path to `/healthz` (HTTP 200).
   Allow inbound container traffic from the ALB security group.
4. Add the following container health check to the ECS task definition.
   [ECS requires health checks in the task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html)
   to monitor container health; the Dockerfile health check alone is insufficient.

```json
{
  "healthCheck": {
    "command": [
      "CMD-SHELL",
      "wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1"
    ],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 10
  }
}
```

Configure the task execution role for ECR pulls and CloudWatch logging, and
use the `awslogs` log driver to collect Nginx stdout/stderr. Nginx needs a
writable `/tmp`; mount writable storage there if using a read-only root
filesystem. The health endpoint checks the frontend server, not the API.
The CI/CD workflow can deploy to an existing ECS service after the setup below.
It does not provision AWS resources. Configure backend CORS, CSRF, and cookies
for the production frontend origin as described below.

## Checks

- `yarn type-check`: application, build/test configuration, unit tests, and E2E
  TypeScript checks. Unit tests use `tsconfig.test.json`; E2E tests use
  `tsconfig.e2e.json`.
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

## CI/CD with GitHub Actions

`.github/workflows/ci.yml` runs on pushes, pull requests, and manual dispatches.
The `test` job checks application and E2E types, lint, formatting, unit coverage,
and all desktop/mobile Playwright scenarios. Reports are retained for 14 days,
including on failure. The independent `Container smoke test` job builds the
Dockerfile and checks health, non-root execution, SPA deep links, API isolation,
and JavaScript delivery using `scripts/smoke-container.sh`.

The `Deploy production` job requires both jobs to pass, the `main` branch, and
the **repository-level** Actions variable `DEPLOY_ENABLED=true`. Pull requests
never deploy. Deployment uses GitHub OIDC, so no AWS access keys are stored.
The implementation follows the official [AWS credentials action](https://github.com/aws-actions/configure-aws-credentials)
and [ECS deployment action](https://github.com/aws-actions/amazon-ecs-deploy-task-definition).

One-time setup:

1. Create the ECR repository and an existing, healthy ECS service using the
   `ECS` rolling deployment controller and an X86_64 Linux task definition.
   Configure its frontend container, port 8080, health checks, ALB, logs, and
   roles as described above. ARM64 services are rejected by this workflow.
2. Create the GitHub environment `production`. Restrict its deployment branch
   to `main`; configure required reviewers if your release process needs them.
3. Configure AWS's GitHub OIDC provider with audience `sts.amazonaws.com` and
   an IAM role whose trust policy restricts `sub` to
   `repo:OWNER/REPOSITORY:environment:production`.
4. Grant that role ECR authorization and push permissions for the target
   repository, ECS service/task-definition read permissions,
   `ecs:RegisterTaskDefinition`, and `ecs:UpdateService` for the target service.
   Grant `iam:PassRole` only for the execution/task roles in that task definition.
   See the linked AWS action documentation for policy examples.
5. Add these GitHub variables to the `production` environment:

   | Variable             | Value                                                      |
   | -------------------- | ---------------------------------------------------------- |
   | `AWS_REGION`         | Region containing the service and ECR repository           |
   | `AWS_ROLE_ARN`       | OIDC deployment role ARN                                   |
   | `ECR_REPOSITORY`     | Existing repository name, without registry hostname        |
   | `ECS_CLUSTER`        | Existing cluster name                                      |
   | `ECS_SERVICE`        | Existing service name                                      |
   | `ECS_CONTAINER_NAME` | Frontend container name in the task definition             |
   | `VITE_API_ROOT_URL`  | Public HTTPS API origin; empty for ALB same-origin routing |

6. Set the repository Actions variable `DEPLOY_ENABLED` to `true` when ready.
   Push to `main` or manually run the workflow on `main` to test and deploy.
   Require the `test` and `Container smoke test` checks in branch protection.

The deployment reads the service's current task definition, preserves its
configuration, builds and smoke-tests the release image with the production
API origin, pushes a unique commit/run/attempt tag to ECR, and replaces only
that container's image. It waits for ECS service stability and records the
image in the run summary. Deployments are serialized and are not cancelled
mid-rollout. Enable ECS deployment circuit-breaker rollback on the service;
the workflow itself does not configure automatic rollback. To roll back
manually, update the service to its previous healthy task-definition revision.
Disable `DEPLOY_ENABLED` before doing so if new releases must be paused.

Local container verification:

```sh
docker build -t e-learning-admin:ci .
bash scripts/smoke-container.sh e-learning-admin:ci
```

## Supported features and release verification

Home is a static welcome page. The header account dropdown contains Profile
and Log out; administrators access Users from the sidebar. Future modules
are marked Coming soon. A shared React Router layout keeps the shell mounted
while nested pages change without document reloads.
User search, status, and ordering are sent to the backend. Listing follows
same-origin pagination links within those results. Role tabs currently filter
those results locally pending the backend role-filter contract.
Status and admin-privilege updates use PUT; confirm this contract in staging.
Production deployment is opt-in and runs only after all CI jobs pass on `main`.

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
