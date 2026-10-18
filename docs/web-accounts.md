# Web accounts foundation

Recorded 2026-10-18, America/New_York. Owner selected Vercel, Next.js, Better Auth,
Neon Free, R2, then **email/password sign-in and Resend**. Implementation is local;
no cloud provision, paid upgrade, production migration, deployment or real email.

Follow-up: [Private account audio](private-account-audio.md) implements local
save/play/download/remove and an opt-in R2 adapter. The original foundation
results below remain historical; live R2/Neon/Resend are still NOT RUN.

## Implemented

`apps/site` hosts the existing audited browser studio and adds registration,
verification, sign-in/out, resend-verification and password-reset screens. Better
Auth requires verified email and a 12–128 character password. Reset revokes
existing sessions. The app validates sessions on every private page/API, uses
database-backed rate limiting and exposes a bounded, owner-scoped library query.
The library's metadata schema is private-only until the review workflow exists.
It does not yet store or serve audio from R2.

Only the studio's built navigation link changes; its source files, engine and
local persistence remain untouched. Account CSS reuses the studio palette,
typography, buttons and responsive layout. Registration does not upload local
mixes. The shell and old studio run on separate origins (3000 and 4173), so older
browser libraries remain accessible on their original origin.

Auth SQL is generated from the pinned Better Auth configuration. App migrations
run in a locked transaction with checksum verification, explicit target selection
and no build-time migration. The Resend HTTP adapter has a timeout, idempotency
key and sanitized failure handling; local testing uses private captured messages.
Next.js retains email tasks after responding. Failed delivery can be retried from
the verification/reset UI; durable queueing and live deliverability remain open.

## Evidence

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Next.js production build and TypeScript | PASS | [Node 22 build](evidence/web-accounts/node22-build.txt); no build-time database mutation |
| Configuration, Resend request contract, streamed body limit | PASS | Three focused tests; Resend HTTP mocked, no real delivery |
| PostgreSQL account lifecycle and migration tests | PASS | Seven integration scenarios plus parent test; [Node 22 combined test log](evidence/web-accounts/node22-tests.txt) |
| Chromium browser flows | PASS | Eight workflow checks in [report](evidence/web-accounts/chromium-report.json) |
| WebKit browser flows | PASS | Eight workflow checks in [report](evidence/web-accounts/webkit-report.json); not physical Safari/iPhone |
| Responsive visual inspection | PASS | 1440×1000 and 390×844 screenshots inspected; labels, hierarchy, palette, control sizing and navigation fit checked |
| Studio preservation and browser secret audit | PASS | [Bundle report](evidence/web-accounts/bundle.json); studio bytes match except the Account link |
| Local database size | PASS | [Usage report](evidence/web-accounts/database-usage.json); measurement only, not capacity forecast |
| Free-plan capacity controls / environment isolation | PARTIAL | Small connection pool, bounded queries, size reporting and config checks; real Neon quotas, cleanup cadence, environment separation and workload budget unverified |
| Live Neon / Resend delivery | NOT RUN | No provider credentials configured; local Postgres/outbox are substitutes for development only |
| R2 saves, playback, deletion and reviewed catalogue | NOT RUN | Separate next implementation phases |
| Vercel hosted build / deployment | NOT RUN | WASM artifact handoff and provider/environment configuration remain |
| New event-frame / waveform comparison | NOT RUN | DSP/WASM unchanged; actual browser club generation and muted playback tested, without a new native PCM comparison |
| Human listening / musical quality | PARTIAL | Prior owner feedback unchanged; no new listening evidence or production-quality claim |

Browser checks exercise consent/import/real club rendering with the existing
synthetic fixture, advancing muted playback, registration/verification/sign-in,
private API and page ownership, forged cookies, oversized bodies, cross-origin
mutation denial, password reset/session revocation, sign-out and persistent local
mixes after navigation. No renderer API request or automatic audio upload occurs.
The test library metadata is synthetic and removed afterward; no catalogue data
or imaginary quality scores ship in the product.

Screenshots: [account desktop](evidence/web-accounts/account-desktop.png),
[account mobile](evidence/web-accounts/account-mobile.png),
[studio](evidence/web-accounts/studio.png). The studio was compared with its prior
[desktop evidence](evidence/web-instant-remix/desktop.png): intentional Account
navigation change; layout, colours, headline, recorder and musical controls retain
the same design. The password hint was moved out of its label so screen readers
and exact-label interactions identify the field as Password.

Initial checks found two harness/typing issues (a generated no-op migration is a
semicolon, and Next augments `ProcessEnv` with a required `NODE_ENV`) and a real
rate-limit bug. Postgres int8 timestamps arrived as strings; Better Auth's retry
calculation concatenated them, producing a huge retry delay. A pool-local bigint
parser preserves integer precision and lets Better Auth normalize the timestamp.
Regression tests require retry delays of 1–60 seconds and exactly three accepted
requests out of ten concurrent reset attempts from one IP. Final checks pass.

Better Auth's schema introspection still warns that its generated bigint
`rateLimit.lastRequest` column differs from abstract `number`. The generated schema
has no pending table/column/index changes; the runtime counter and retry tests pass.
Expected invalid-origin/password/reset-user warnings appear in negative tests.
Direct test requests without a client-IP header use Better Auth's conservative
shared bucket. Vercel's trusted IP-header behavior must still be checked live.

## Reproduction and versions

Follow [site run instructions](../apps/site/README.md). Tests use a separate
password-protected local Postgres cluster, with no modification of `~/mlx-env`
or other databases. Raw outbox messages, `.env.local`, generated site assets,
build outputs and private recordings stay ignored. Retained evidence contains no
tokens, credentials or owner audio.

Apple M5, macOS 26.7.1, local PostgreSQL 16.14. Application dependencies:
Next.js 16.4.2, React/React DOM 19.3.1, Better Auth 1.7.10, pg 8.23.1.
TypeScript 5.9.3 and Playwright 1.61.1. Initial npm commands selected Homebrew
Node 26.3.0/npm 11.16.0 despite the login shell selecting Node 22.23.1/npm 10.9.8.
Final evidence explicitly invokes the installed Node 22.23.1 executable, including
the running production server and both browser suites. Node 22.x is the app's
declared runtime. No global Node configuration was changed.

Official references used because Context7 and the browser connector were
unavailable: [Better Auth Next.js](https://better-auth.com/docs/integrations/next),
[PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql),
[email/password](https://better-auth.com/docs/authentication/email-password),
[rate limits](https://better-auth.com/docs/concepts/rate-limit),
[Resend email API](https://resend.com/docs/api-reference/emails/send-email),
[Neon pooling](https://neon.com/docs/connect/connection-pooling),
[Next CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[Vercel client headers](https://vercel.com/docs/headers/request-headers).
Browser verification used the project's Playwright Chromium/WebKit setup.
