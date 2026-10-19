# Neon setup — 2026-10-19

**PASS: requested Postgres setup and localhost-to-Neon app flow.** The owner
explicitly authorized CLI initialization/deployment on project
`misty-cherry-32516479`, organization `org-long-cherry-88226165`, branch
`production`. This supersedes the infrastructure pause for this database setup.
It does not publish the website or authorize other paid services.

The existing project is named `djayvo-db`; its selected database is `neondb`.
We retained that existing database rather than creating or renaming a second one.
Region: `aws-us-east-2`; production branch ID: `br-rapid-pond-b471tuva`.

## What changed

- Ran `npm i -g neon@latest` (CLI 8.8.0), the owner's exact `neon init` command,
  and `neon deploy`. Existing login refreshed successfully; no browser login was
  required. The configuration declares Postgres only, with managed auth disabled.
- Added generated `neon.ts`, pinned `@neon/config` and root npm commands forwarding
  to `apps/site`. Removed the unused generated `@neon/env` dependency.
- Neon writes root `.env.local`; `npm run neon:env` also pulls its variables into
  `apps/site/.env.local`, which Next and the existing scripts actually read.
  Both env files and `.neon` are ignored. Environment files have mode 0600.
- Kept `pg`, verified TLS, the two-client pool, query/connect timeouts and the
  existing Better Auth configuration. Application queries use `DATABASE_URL`
  (pooled); migrations accept `DATABASE_URL_UNPOOLED` (direct), with the existing
  explicit target guard. `DATABASE_MIGRATION_URL`, when nonempty, remains a legacy
  override. Removed the obsolete local migration override from this checkout.
- Added `attachDatabasePool` from pinned `@vercel/functions` for Vercel's pool
  suspension lifecycle. This hook is conditional on Vercel; deployment execution
  is **NOT RUN**. [Neon's driver guidance](https://neon.com/docs/connect/choose-connection)
  and [Vercel's pool guidance](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#attachdatabasepool)
  support this choice. Context7 tools were unavailable, so official docs and the
  installed Neon/Neon Postgres skills were used.
- Split local app detection from entirely local database detection. A localhost
  app can connect to Neon and capture verification emails locally. Hosted apps
  still require HTTPS and Resend; local database integration tests, local audio
  storage and automatic development catalogue access remain disallowed with Neon.
- Applied the five unchanged existing SQL migrations, first on a disposable Neon
  branch, then on the empty production database. Both repeated applications were
  no-ops. The rehearsal branch was deleted; its credential file was removed.
- Added a guarded browser smoke test that uses unique synthetic accounts and
  metadata, asserts isolation and removes its own records. No source audio or
  finished mix was uploaded.

Original site settings are preserved in ignored, mode-0600
`build-neon/site-env-before`. The old local database and private audio directory
are untouched. This checkout's Neon configuration disables local account audio;
R2 and public catalogue remain disabled. Existing local recordings remain local.

## Gates and evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| CLI install / project link | PASS | CLI 8.8.0; requested project and branch linked |
| Neon deployment | PASS | [deploy.log](evidence/neon-setup/deploy.log): Postgres, policy already matched; three env variables pulled |
| Rehearsal migrations | PASS | [migration-rehearsal.log](evidence/neon-setup/migration-rehearsal.log): five migrations, idempotence, auth schema agreement |
| Production migrations | PASS | [migration-production.log](evidence/neon-setup/migration-production.log): five applied, then `applied: []` |
| Root `npm run build` | PASS | [build.log](evidence/neon-setup/build.log): compiled successfully, TypeScript and all pages completed |
| Unit checks | PASS | [unit.log](evidence/neon-setup/unit.log): 7 passed, 0 failed |
| Typecheck / public bundle audit | PASS | [checks.json](evidence/neon-setup/checks.json): 16 client files; secrets absent; bundled studio unchanged |
| Started optimized app | PASS | [server.log](evidence/neon-setup/server.log): Next ready on port 3000 |
| Browser → Next → Neon | PASS | [browser.log](evidence/neon-setup/browser.log): 9 checks including cleanup |
| Initial cleanup audit | FAIL | Four rate-limit rows remained; see explanation below |
| Corrected cleanup / temporary branch removal | PASS | [database-usage.json](evidence/neon-setup/database-usage.json): all 12 application tables empty afterward |
| Resend inbox delivery | NOT RUN | Verification used the local outbox, not Resend |
| R2, Vercel deployment and Fluid suspension | NOT RUN | No hosted frontend or audio storage deployed |
| Production readiness | PARTIAL | Provider delivery/storage, preview isolation, budgets and existing quality/release gates remain |

The browser flow was studio → consent control → account creation → locally
captured verification link → password sign-in → private library → sign-out.
The database assertions prove real Neon persistence, verification state and
session creation/deletion. Two owners' synthetic track metadata proved isolation
in both server-rendered HTML and the API. Checks include no-store responses,
rejection of an owner override, desktop/mobile rendering (1440×1000, 390×844),
and no browser runtime/console errors. Actual account audio storage is explicitly
shown as unavailable, not represented by a fake working control.

In-app Browser execution tools were unavailable after discovery. The requested
end-to-end validation used the existing Playwright 1.61.1 Chromium installation.
Screenshots are outside the repo; their exact paths are in the browser logs.
Both desktop and mobile captures were visually inspected. No layout changes were
made. Other browsers were not rerun for this database increment.

## Issues retained

The first browser run passed the product flow but its cleanup check did not
assert rate-limit deletion. A subsequent database audit found four synthetic
rows: Better Auth canonicalizes IPv6 to a /64 before forming keys. The test now
uses the same normalization and asserts those keys are gone. The four exact old
keys were removed, the browser test reran successfully and all application-table
counts were independently checked as zero. The initial log's cleanup PASS is
superseded by this **FAIL**, then corrected **PASS**, not silently accepted.

The rehearsal schema comparison warns that `rateLimit.lastRequest` is `int8`
while its generic expected type is `number`. Better Auth planned no changes;
the existing driver parses this column as bigint for correct retry arithmetic.
The warning is retained, not hidden. No schema alteration was needed.

The initial app dependency install invoked the system npm under Node 26 and
reported the app's Node 22 engine warning. All builds, typechecks and browser
tests used Node 22.23.1 explicitly. No vulnerabilities were reported by install.
The database reports PostgreSQL 18.6, ARM64. Its final measured size is in the
usage receipt (~8.2 MiB); compute hours and transfer allowance were **NOT RUN**.
No plan upgrade or billing change was requested or performed.

The requested `neon init -y` also installed global agent plugins/skills/MCP
configuration and minted an account-scoped MCP key (ID 3446712). Its secret was
not printed or committed. Those CLI-created integrations remain installed.

## Run and reproduce

Use Node 22 for both `node` and `npm`. From the repository root:

```sh
npm ci
npm --prefix apps/site ci
# Refresh the app's Neon variables after neon deploy or a deliberate branch switch:
npm run neon:env
npm test
npm run build
npm start
```

Open **http://localhost:3000**. The running app uses Neon; it is still hosted
locally. Verification links for local testing are captured in the private folder
configured by `DJAYVO_LOCAL_OUTBOX`. No inbox email will arrive yet.

Database commands:

```sh
npm run db:migrate  # prints the direct host/database, makes no changes
DJAYVO_MIGRATION_TARGET=ep-flat-hill-b4q0lix4.c-6.us-east-2.aws.neon.tech/neondb npm run db:migrate -- --apply
npm run db:usage
DJAYVO_NEON_TEST_TARGET=ep-flat-hill-b4q0lix4-pooler.c-6.us-east-2.aws.neon.tech/neondb npm run test:neon
```

The smoke command requires localhost, a local email outbox, the explicit pooled
target and audio upload disabled. It intentionally writes/removes synthetic
records. Do not point ordinary local integration tests at Neon: their existing
loopback-only guards remain in force. Future development/preview work should use
separate Neon branches rather than ordinary experiments on production.

For future Vercel deployment, configure the server-only pooled `DATABASE_URL`,
auth origin/secret and Resend settings in Vercel; do not copy localhost outbox or
local audio settings. Set the Vercel root to `apps/site`. R2 and public catalogue
need their separate existing validation gates before enabling. Live pool
suspension, external mail delivery and deployment remain to be demonstrated.

Master specification SHA-256 remains
`389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`.
Audio/DSP, recordings and `~/mlx-env` are unchanged. This database setup supplies
no new musical-quality, waveform, event-frame or physical timing evidence.
