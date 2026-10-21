# Jamloom owner handbook

2026-10-20 · Local implementation checkpoint. **Paid release is closed.**
Never paste credentials into chat. Store secrets in ignored local env files and
the appropriate provider's scoped environment settings. Configure Preview and
Production separately. No owner setup task below means the integration has passed.

## Read this first

The four-product specification is at
`apps/site/jamloom_full_product_implementation_spec_v1.md` (owner supplied;
location retained). [STATUS](STATUS.md) and [TODO](../TODO.md) distinguish code,
automated tests, real-provider tests and human evidence. Q0 was rejected. Night
Current's “not bad” response is one qualitative standalone-song observation,
not acceptance of an improviser or a fixed template for future songs.

Priority P0 blocks paid/public release; P1 blocks the relevant feature; P2 is later.
Agent work continues when any of these external steps is missing.

| Priority / owner action | Why and exact location | Non-secret variable names | Safe verification and dependent feature | Current state |
|---|---|---|---|---|
| P0 — [OWNER ACTION REQUIRED] approve musical study | Recruit at least 10 listeners, including musicians where practical; approve diverse source permissions and blinded rubric before scoring. Review `docs/full-product-implementation.md`. | None | 20 diverse utterances, matched old/stock baselines; ≥70% preference, ≥80% usable, ≥85% recognizable where words matter; zero severe signal failures. Keep raw judgments and uncertainty. Blocks paid music. | FAIL: earlier Q0 rejected; expanded baseline is not improvement evidence |
| P0 — [OWNER ACTION REQUIRED] Stripe sandbox | [Stripe Dashboard sandboxes](https://dashboard.stripe.com/sandboxes): create/select sandbox → Developers/API keys; Workbench/Webhooks → add endpoint `/api/payments/stripe`. Subscribe to completed/async-success Checkout sessions, charge refunded and dispute created. Use test credentials only. | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | SDK signature/unit tests already local; then real hosted Checkout with [test cards](https://docs.stripe.com/testing), replay, failed payment, refund/dispute and ledger checks. No live charges. | Missing from inspected site env; hosted sandbox NOT RUN |
| P0 — [OWNER ACTION REQUIRED] Stripe merchant/tax approval | Stripe Settings → Business, Tax, bank/payout details. Confirm merchant identity, countries, tax-inclusive/exclusive handling, fees and refund policy with an accountant. Proposed 10/25/50-credit packs are not final offers. | Future live keys must remain separate; do not add them now | Reconcile actual net proceeds and tax/fee/FX/refund allocations per purchase. Current 40% sandbox-net allowance is an explicit test assumption, not actual profitability. Blocks live checkout. | NOT RUN; checkout endpoint deliberately returns 503 |
| P0 — [OWNER ACTION REQUIRED] migration and rollback approval | Neon Console → existing Jamloom project → branch `production`. Rehearse migrations `0006_credit_ledger.sql` through `0008_generation_jobs.sql` on an isolated branch before an explicitly approved application. Use existing guarded migration script, never build-time migrations. | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JAMLOOM_MIGRATION_TARGET` | Local empty DB migration/replay and ledger concurrency tests pass. Save a restore point/branch and test restoration. Rollback app code first; do not delete financial records or edit applied SQL. | Production unchanged; schema passes local tests and is active in isolated local preview |
| P0 — [OWNER ACTION REQUIRED] legal/privacy approval | Review `/privacy`, `/terms`, `/licenses`, source ledger and model/sample licenses with counsel. Supply legal entity/contact/address/jurisdictions and refund/retention policy before sales. | None | Audit actual data flows and public assets. Confirm identifiable speaker, training, distribution and venue rights separately. | Draft disclosures; commercial review open |
| P1 — [OWNER ACTION REQUIRED] Vercel preview/release | Vercel project → Settings → Git (repository `sariserhan/jamloom`), Domains (`www.jamloom.com`, apex redirect), Environment Variables. Use `apps/site` root with existing build script. Approve a reviewable preview, then production separately. | Existing account/R2/mail names; `BETTER_AUTH_URL=https://www.jamloom.com` for production | Build, exact-origin auth, sitemap/canonical checks and actual public routes after deploy. No production deployment performed in this checkpoint. | Existing hosting retained; this code local |
| P1 — [OWNER ACTION REQUIRED] auth and email verification | Better Auth remains email/password; no OAuth provider added. Resend → Domains: owner previously reported verified `jamloom.com`. Confirm transactional sender and reply-to. | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Existing unit/mail-layout tests; real owner-controlled inbox verification/reset requires authorized delivery. Exact origins only, no wildcard. | Config names present; no new delivery test |
| P1 — [OWNER ACTION REQUIRED] R2 retention/CORS | Cloudflare → R2 → `jamloom-audio` → Settings → [CORS](https://developers.cloudflare.com/r2/buckets/cors/), lifecycle. Keep bucket private; retain approved www/apex origins. Decide source/job-output retention and deletion policy. | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `JAMLOOM_R2_ENABLED` | Existing adapter has signed owner-scoped URLs and bounded operations. Use isolated test prefix for upload/range/delete; verify deletion. Never expose private voice publicly. | Credentials names present; prior R2 evidence retained, no new provider mutation |
| P1 — [OWNER ACTION REQUIRED] GPU spending approval | Vast.ai → Billing and Instances/Templates. Select reviewed pinned model/template, hourly ceiling, total experiment cap and kill deadline before renting. [Instance management](https://docs.vast.ai/guides/instances/manage-instances). | Existing `VASTAI_KEY` in private research environment; future worker signing secret is separate | Record rental, startup/idle/retry/storage costs; destroy instance and confirm billing stop. A local timeout alone does not stop rented billing. No agent rental in this checkpoint. | Existing research trials retained; durable local queue tested; Vast provider termination adapter/invoice reconciliation not complete |
| P1 — [OWNER ACTION REQUIRED] Apple IAP sandbox | App Store Connect → My Apps → Jamloom → Monetization/In-App Purchases → + → Consumable. Create 10/25/50-credit product identifiers, approved localizations/screenshots and sandbox users. [Apple setup](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases/). | `APPLE_BUNDLE_ID` and `APPLE_ROOT_CERTIFICATES_BASE64` (comma-separated base64 DER Apple root certificates from Apple PKI, public data) configure the sandbox verifier. Future server API/production work may additionally require `APPLE_APP_ID`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_PRIVATE_KEY`; not used today | StoreKit display prices, verified JWS server ingestion, account token binding, replay/refund tests and durable ledger ack before finish. No expiry for consumables. | PARTIAL: official Apple SDK verification + gated StoreKit client compiled; real sandbox purchase/account bridge and notifications NOT RUN |
| P1 — [OWNER ACTION REQUIRED] native app release | Apple Developer → Identifiers/signing; App Store Connect → agreements/tax/banking, privacy, accessibility and TestFlight. Preserve existing `com.djayvo.app` storage/signing identity until migration reviewed. | Signing remains in ignored `Local.xcconfig` | Simulator build is separate from physical microphone, interruption, memory/battery, VoiceOver and App Review proof. Upload requires explicit approval. | Prior local prototype preserved; new full parity incomplete |
| P1 — [OWNER ACTION REQUIRED] live capture permissions | macOS Settings → Privacy & Security → Screen & System Audio Recording for a future reviewed companion; browser source chooser for current preview. Select permitted test audio, never protected-stream bypass. | None for browser preview | Physical output isolation, no feedback, source-stop/recovery and latency measurements. Browser cannot guarantee external app suppression; monitoring requires explicit confirmation. | Native companion not implemented; physical gate NOT RUN |
| P1 — [OWNER ACTION REQUIRED] indexing and analytics consent | Search Console → Add property `jamloom.com` → DNS verification; submit `https://www.jamloom.com/sitemap.xml` after publishing. VisitorPing site `vp_QBDH92AC`: complete required consent and verify two page visits in Live Radar. | Optional site-verification value; existing public VisitorPing key unchanged | [Rich Results Test](https://search.google.com/test/rich-results), URL inspection, public crawl, legitimate referrals and consent behavior. Script delivery is not collection proof. | Local SSR/metadata tests only; external dashboard actions NOT RUN |
| P2 — RevenueCat decision | Optional. Do not create a project solely to satisfy a checklist; consumable balance stays in Neon. If adopted, RevenueCat → Project → Apps → App Store integration and verified webhooks. | None configured/required today | [Consumable guidance](https://www.revenuecat.com/docs/platform-resources/non-subscriptions); event replays and account mapping tests | Not adopted |
| P2 — catalog metadata import | Pick a licensed metadata provider, approve exact permitted fields/uses and retention. No Spotify/YouTube scraping or training from streams. | Provider-specific names only after design approval | Terms review, unknown-field handling, opt-in import and deletion | Manual first-party notes only |

## How to resume local verification

Use Node 22. The site env presently points at hosted services; do not use it for
destructive database tests. Wallet tests require `JAMLOOM_TEST_DATABASE_URL` with
hostname `127.0.0.1` and create/drop a uniquely named temporary database.

```sh
npm test
npm --prefix apps/web test
cmake -S . -B build-product -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build build-product -j 4
ctest --test-dir build-product --output-on-failure
npm --prefix apps/site run test:wallet
npm --prefix apps/site run test:product-http
npm run build
```

For playback, keep the private baseline in `renders/`. Never copy the owner's
voice into public assets. The public instrument study contains no user speech.
Do not repeatedly rent GPUs or change the benchmark after hearing a bad result.

## Approval boundary

No live charges, production migrations, new rental, public deployment, App Store
upload or mass email is authorized by merely completing local tests. Before any
such action, assemble its reviewable build, migration/economic report and target.
The owner approves that concrete action; missing setup does not stop unrelated
local engineering.

## Local commercial safety and recovery

Migrations 0006–0008 add sandbox-only financial tables, private taste profiles and
a durable job queue. They passed disposable local tests and were also applied to the existing isolated
loopback preview database. No hosted database was migrated.
Never edit them after a real environment has recorded their checksums.

Queue reservations and immutable source/plan hashes are committed together. Only
one worker allocation runs globally initially, with one active reservation per
user. A lost heartbeat moves a job to `stopping`; it is never automatically
re-rented. The operator must confirm provider shutdown and authoritative costs
before calling reconciliation. An over-cap run stays held for investigation.
`runBudgeted` and signed permits are tested with a real local process; no claim
is made that these alone stop Vast billing. There is no public paid job endpoint.

Refund/dispute events hold the purchase even if it arrives before the grant.
Existing wallets freeze; no further credit spending is permitted. Automated
monetary refunds and consumed-credit entitlement reversal are still unfinished.
Do not enable sales until those paths and actual settlement fees pass sandbox
then staging checks. Existing financial records must be retained for audit under
a reviewed retention/deletion policy.

Music DNA account saves are explicit and owner scoped. The schema uses monotonic
revisions so stale tabs cannot overwrite deleted/recreated profiles. Account
profile data is not training consent. iPhone account sync is still unimplemented.

For an existing checkout with hosted `.env.local`, use a separate ignored test env
file containing only loopback `DATABASE_URL`, `JAMLOOM_TEST_DATABASE_URL`, local
`BETTER_AUTH_URL`, a test `BETTER_AUTH_SECRET` and `JAMLOOM_LOCAL_OUTBOX`.
Launch test processes with Node 22's `--env-file=/absolute/private/test.env`;
application env loading preserves already supplied process values. Do not run
`local-setup.mjs` over the existing site env: it intentionally refuses replacement.
This checkpoint reused the existing private local-cluster backup without changing
any hosted env file. `build-site/local-postgres.json` identifies that local cluster.
