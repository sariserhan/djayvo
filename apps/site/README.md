# Djayvo website and accounts

Next.js shell around the existing browser studio, with Better Auth email/password
accounts and a PostgreSQL private-library foundation. Neon **Free** and Resend are
the selected hosted providers. No hosted resources have been provisioned.

The studio at `/studio/index.html` keeps the existing WebAssembly engine and
IndexedDB library. Only its built navigation link changes to **Account**. Sign-in
never imports, uploads or publishes local music. Private account saving, playback
and removal have a local implementation and an opt-in R2 adapter. The reviewed
public catalogue and private playlists are also implemented locally.

## Run locally

Use Node **22.x**. Dependencies are isolated to this application. If your shell
and npm select different Node installations, activate Node 22 for both before
running these commands; the evidence includes an explicit Node 22 build and tests.
Keep `~/mlx-env` unchanged.

From the repository root, ensure the existing WASM bundle is current:

```sh
sh scripts/web_build.sh
cd apps/site
npm ci
```

For an isolated local account database, with PostgreSQL tools already installed:

```sh
node scripts/local-setup.mjs
DJAYVO_MIGRATION_TARGET=127.0.0.1:55439/djayvo_local npm run db:migrate -- --apply
npm run dev
```

Setup refuses to replace `.env.local`, creates a separate password-protected
loopback cluster on port 55439 under ignored `build-site/`, and captures mail in
its private outbox. **Do not rerun setup when that environment already exists.**
The current checkout already has this environment. Open **http://localhost:3000**.
For an optimized local run, use `npm run build` then `npm start`.

Local verification/reset messages are JSON files in the directory named by
`DJAYVO_LOCAL_OUTBOX` in `.env.local`. Open the link from your own test message.
This is development-only, not inbox delivery. Outbox content must never be served
or committed. Cluster paths are in `build-site/local-postgres.json`; stop/start
with `pg_ctl -D <data> stop` / `pg_ctl -D <data> -l <run>/postgres.log start`.

Browser storage belongs to an origin. The old `localhost:4173` library is unchanged
but is separate from `localhost:3000`; no automatic transfer is attempted. Keep
using 4173 to download older mixes. Neither sign-in nor sign-out deletes local music.

## Hosted configuration — NOT RUN

### Private audio: local development

Apply reviewed migration `0003_private_audio.sql` using the same explicit local
target command above. Set `DJAYVO_LOCAL_AUDIO_DIR` to an absolute private directory
outside `public/`, such as `<repository>/build-site/private-audio`. This checkout
has that local directory configured. Restart the app after changing configuration.
The library explains that development account files stay on this Mac. Hosted
configuration rejects the local adapter.

Download a finished studio WAV, open **Cloud library**, select that file, provide
a title/direction and check the separate permission to store recognizable voices
online. Saving never includes the original 2–5 second recording. Only metadata-free
20–40 second stereo 48 kHz PCM16 mixes are accepted. Explicit removal hides a mix
immediately and queues file cleanup. Run this bounded job regularly in development:

```sh
DJAYVO_CLEANUP_TARGET=127.0.0.1:55439/djayvo_local npm run audio:cleanup -- --apply
```

Without the exact target and `--apply`, it only prints the target. Cleanup processes
up to 50 due records, retaining failures for retry. It waits until the five-minute
upload grant plus a one-minute margin has elapsed. Scheduling, live lifecycle
verification and production deletion recovery remain release prerequisites.

### Reviewed catalogue and private playlists

Migration `0004_catalogue.sql` adds separate submissions, revision-bound reviews,
reports and private playlists. The catalogue is available locally; hosted use
requires explicit `DJAYVO_CATALOGUE_ENABLED=true` after provider and rights checks.
Set server-only `DJAYVO_REVIEWER_EMAILS` to verified reviewer emails only when
assigning that role. It is empty by default. Reviewers cannot approve their own
mixes. No real reviewer is assigned in this checkout.

Save a finished mix privately first. Open its **Submit this mix for catalogue
review** form, choose public credit/description/mood and separately confirm public
listening permission. A reviewer uses `/review`, listens, checks permission and
records a decision/note. `/catalogue` shows only approved, available mixes.
Owners can withdraw without losing the private original. Editing a submission
requires a new review. Signed-in listeners can report concerns and keep private
playlists (20 lists, 100 tracks each). Reports enter the local review queue; no
notification or moderation response-time guarantee is configured.

The player survives client navigation between site pages, including filters and
playlists. Entering the standalone studio or reloading the page resets it. Public
listening exposes the complete finished WAV; listeners can save it. It grants no
commercial reuse or model-training permission. Previously downloaded copies and
issued short-lived links cannot be recalled.

Local browser validation uses synthetic reviewer accounts only. On an isolated
local test server, temporarily set `DJAYVO_REVIEWER_EMAILS` to
`catalogue-review-chromium@example.com,catalogue-review-webkit@example.com`, then
run `npm run test:catalogue-browser` and
`DJAYVO_BROWSER=webkit npm run test:catalogue-browser` sequentially. Remove that
temporary allowlist and restart afterward. Never use those accounts in a shared
or hosted environment. Evidence: [reviewed catalogue](../../docs/reviewed-catalogue.md).

### R2: disabled until live validation

The server-only AWS SDK adapter is pinned in the lockfile. To prepare a separate
private test bucket later, use `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY` and explicit `DJAYVO_R2_ENABLED=true`; unset the local audio
directory. Never expose these credentials through `NEXT_PUBLIC_*`. Keep bucket
public access off; credentials must be scoped to the intended bucket/environment.
Configure exact app-origin CORS for PUT/GET/HEAD, the `Content-Type` request header,
range playback and exposed range/length headers. Before release, verify the signed
Content-Length/Content-Type contract against R2, separate preview/production
credentials, lifecycle expiry for `uploads/` and a reliable cleanup schedule.

Signed upload links can be reused until expiry. Only validated checksum-bound
bytes enter a separate `masters/` key; a late staging rewrite cannot change the
published mix. An in-flight PUT can outlive link expiry: an `uploads/` lifecycle
rule and reconciliation are required for eventual removal of late orphan writes.
No live R2 request or lifecycle/retention guarantee is claimed by local tests.
Playback grants last 60 seconds and cannot revoke already downloaded copies.
Limits reserve both staging and final sizes: ten active/pending tracks, 100 MiB
per account, 1 GiB globally, 20 new reservations/account/day and 500 globally/day.
These are application admission bounds, not a provider billing cap or a promise
of free Vercel/R2/Neon service. Provider compute/operation budgets remain open.

Evidence: [private audio validation](../../docs/private-account-audio.md).

### Account providers

Use `.env.example` as the names reference, never put secrets into Git or browser
variables. Configure separate Vercel environments with separate Neon branches and
auth secrets; do not branch production user data into previews. Use the selected
Neon Free plan, with no paid upgrade or add-on without owner approval.

- `DATABASE_URL`: Neon pooled Postgres connection for application requests.
- `DATABASE_MIGRATION_URL`: direct connection, used only by the explicit migration command.
- `BETTER_AUTH_URL`: exact HTTPS app origin, without paths or wildcard preview hosts.
- `BETTER_AUTH_SECRET`: unique cryptographically random secret of at least 32 characters.
- `RESEND_API_KEY`, `EMAIL_FROM`: server-side sending key and verified sender.
- Unset `DJAYVO_LOCAL_OUTBOX` on hosted environments. Configuration rejects it there.

The Resend adapter uses the HTTPS API directly, with a timeout and idempotency
key. Next.js `after` retains background email work after the response; failures
log a generic operational error without addresses, tokens or provider response
bodies. Users can request another verification/reset link. This is not a durable
mail queue or proof of delivery. Provider domain setup and real inbox delivery
must be tested before enabling public registration.

Do not run migrations automatically during a Next.js/Vercel build. First review
the committed SQL; run `npm run db:migrate` to display the non-secret target.
Then provide that exact `host[:port]/database` in `DJAYVO_MIGRATION_TARGET` and
pass `--apply` against the intended isolated environment. Migrations are hashed,
serialized by a transaction lock and rolled back together on failure. An applied
file cannot be silently edited. `0001_auth.sql` was generated using Better Auth
1.7.10 `getMigrations(authOptions(...)).compileMigrations()` on an empty database.

Vercel must receive the audited WASM bundle before `npm run build`. The local
prepare step deliberately fails if `dist/web` is absent/stale; it never downloads
an unverified binary. A clean hosted build pipeline for that artifact, production
environment setup and deployment are still open. Do not claim Git-import deployment
works yet. For any deployment, select Node 22 and validate the proxy-provided
client IP used by the rate limiter.

## Checks

```sh
npm test
npm run test:integration
npm run typecheck
npm run build
npm run audit:bundle
npm run db:usage
# With the app running at the configured localhost:3000 origin:
npm run test:browser
DJAYVO_BROWSER=webkit npm run test:browser
```

Integration tests require the local outbox and loopback Postgres. They create a
random `djayvo_test_*` database, test real Better Auth and SQL, then drop only that
database. Browser tests use disposable contexts and synthetic account fixtures,
delete their account records afterward, and import the supplied synthetic speech
fixture without regenerating it. They never send real email. Do not target a
shared or hosted database with the tests.

`db:usage` reports actual database bytes and row counts, not a monthly compute or
transfer forecast. Monitor Neon separately for those limits. A bounded expired-auth cleanup command is available; scheduling, signup/storage
budgets and overload behavior remain release work. Free
database operation is a bounded-use target; R2, Vercel and Resend budgets are separate.

Security checks cover unverified/expired/forged/revoked sessions, other-owner
denial, parameterized queries, stable cursor pagination, cross-origin rejection,
16 KB auth bodies, password reset replay, concurrent database-backed rate limits,
and migration retry/rollback. Private responses use `no-store`; account pages use
nonce-based script CSP. TLS certificate checks remain enabled for Neon.
Public submissions require separate consent and approval by a distinct, verified
reviewer. Hosted publication remains disabled until its release checks pass.

Evidence and exact limits: [web accounts report](../../docs/web-accounts.md).


### Expired account records

Migration `0005_auth_expiry.sql` indexes expiry scans. The following guarded job
removes at most 500 expired sessions and 500 expired verification/reset records
per invocation, skipping locked rows. Active sessions, account identities,
password credentials, tracks and recordings are retained. A failed run is safe
to retry; counts contain no tokens or email addresses.

```sh
npm run auth:cleanup  # target preview; no deletion
DJAYVO_CLEANUP_TARGET=127.0.0.1:55439/djayvo_local npm run auth:cleanup -- --apply
npm run db:usage
```

Use the exact intended target for each environment. Run additional bounded jobs
if expired counts remain; scheduling/alerts are not configured. Better Auth owns
its rate-limit row pruning; this job does not alter active limiter counters or
remove unverified accounts. Ordinary Postgres deletion permits space reuse and
does not guarantee a smaller database file, provider bill or backup erasure.
See [cleanup evidence](../../docs/auth-cleanup.md).
