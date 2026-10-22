# Jamloom owner handbook

**Meaning-first singer — 2026-10-22:** The owner makes audio reuse optional. The studio accepts short/long recordings, reads speech locally or uses a supplied idea, and may deliver the song without replaying the recording. Acoustic audition now omits the sample. [Current behavior, limits and evidence](meaning-singer.md).

**Sample quality update — 2026-10-22:** Owner likes the generated songs but reports that adding the source makes them worse. The replacement preserves the song and tries one whole phrase or pause-bounded excerpt in a vocal gap; if it cannot fit, the original song is returned with explicit status. All 23 styles remain. Six same-song comparisons and scoped technical/browser evidence are in the [replacement report](gentle-singer.md). New-arrangement listening remains open.

**AI singer implementation — 2026-10-22:** Four actual 30-second male/female reggae/hip-hop previews and separate user-phrase → singer assemblies are ready locally. The new local studio drafts contextual lyrics and generates singing; no spoken TTS or user-voice cloning. Technical render and review-player checks PASS; naturalness, voice accuracy, lyric fidelity and meaningful diversity still require listening. No new paid compute or production promotion. [Listen, run the studio and inspect evidence](singing-response.md).

**Voice-led audition ready:** Three private 30-second mixes now combine the authorized owner recording with the latest hip-hop, funk and Group 2 bass backings. Full phrases, spaced chops and ducking reuse the local arranger; six clearly labeled voice/music comparisons are matched to −22 LUFS. Actual render checks, eight regression tests and Chromium/WebKit playback/seek checks PASS. New-mix listening NOT RUN; no training, rental, upload or product promotion. [Player location and evidence](voice-led-review.md).

**Owner listening update:** Group 1: all versions sound weird. Groups 2–4: fine, but the owner hears no clear difference between versions. Informal listening is now PARTIAL; audible adapter improvement is NOT DEMONSTRATED and no checkpoint is selected. Human voice is requested; this comparison explicitly used instrumental mode and “No vocals” prompts. [Exact feedback](evidence/musician-training/owner-listening.json). Formal quality, physical checks and production promotion remain open.

## Musician training data — 2026-10-21

**Bounded GPU trial completed:** You approved the $10/two-hour trial for the
thirteen excerpts from `f.mp3`, `down.mp3`, `question.mp3` and `pipe.mp3`.
Six provisionally screened clips trained two experimental ACE-Step adapters
(60 optimizer steps). Results are local, and the rental and temporary keys are
deleted. Observed charge: $0.0945214, subject to provider billing settlement.
[Run report and private review location](musician-training-run.md).

No further approval or setup is needed to complete this trial. Listening and
physical checks remain deferred; production promotion has not occurred. The
recordings do not supply a reviewed general-musician action corpus. The
[48-exercise curriculum](musician-training-curriculum.md) describes the remaining
expert demonstrations and independent-session evaluation needed for that goal.

2026-10-20 · Local implementation checkpoint. **Paid release is closed.**
Never paste credentials into chat. Store secrets in ignored local env files and
the appropriate provider's scoped environment settings. Configure Preview and
Production separately. No owner setup task below means the integration has passed.

## Current order and local completion work — 2026-10-21

Finish non-iOS product work first, iOS second, launch operations last. This
increment has no deployment or paid-service step. [Current iOS report](ios-product-parity.md)
lists what works and what still requires evidence; it does not close the spec.
Listening and physical checks are explicitly deferred until the owner resumes them.

The local iOS app now offers extended-duration improvisation, Music DNA audio,
optional existing-account sign-in, explicit profile sync and server ledger balances.
Open `apps/ios/Jamloom.xcodeproj`. The catalogue uses the same cleared metadata as
web; profile titles do not authorize or trigger song downloads. Signing in never
uploads recordings. New backend routes require a later authorized GitHub deployment.

For Apple sandbox notifications, configure App Store Connect → Jamloom → App
Information → App Store Server Notifications → Sandbox Server URL to
`https://www.jamloom.com/api/payments/apple/notifications` **after deployment**.
Use the existing `APPLE_BUNDLE_ID=com.djayvo.app` and public Apple root certificates;
never paste signing keys into chat. A signed TEST delivery verifies transport only.
Use an actual consumable purchase/refund to validate account binding, ledger reversal
and non-expiry. `REFUND_REVERSED` remains retryable/manual reconciliation; do not
re-enable held balances automatically. Production verification and real net proceeds
remain separate gates. The local `.storekit` fixture cannot prove these gates.

Music DNA now creates free local instrumental previews with two-variation
comparison and downloads. Song notes are not analyzed as audio. The source-groove
listening packet is retained privately in `renders/q0-source-groove-20261021/listener/`.
Listen only when you resume the deferred human checks; there is no automatic playback.

Full A/B/C scenes and periodic recovery are optional, device-only and paused on
restore. Download unfinished recordings separately; delete saved sets through
the recovery panel. In **Record the studio mix**, optionally enable aligned stems
before recording. Download the master, stems, source details, mixer controls and
deck history for private review; removing permission deletes the tab copies.
Stems use extra memory and support up to 96 kHz. These exports do not authorize
training or replace reviewed expert demonstrations. Listening remains deferred.

For private developer replay, start the instrument take before the mix and stop it
last, within its 30-second cap. Musical-action downloads now include the context
clock and sequencer commands. Keep the original source files, controls, deck history
and source details. The [replay workflow](mix-action-replay.md#reproduce-a-private-recording)
checks WAV/MP3/FLAC source hashes and writes an offline reconstruction without upload
or playback. Historical decoder timing/effect tails may differ; retain the original
mix WAV or aligned stems when preserving the actual performance matters.

For developer rehearsal, use a loopback database, local private audio directory,
`JAMLOOM_GENERATION_SANDBOX=true` and the one-shot `generation:local` command.
Retain its working directory while a job is recovering. Quotes are modeled test
credits, not proof of real GPU economics. Hosted generation and sales remain held.

## Inline payments and Aurowall — 2026-10-21

The owner authorized the Aurowall partnership and use of their owned recordings.
The homepage player and online DJ selection now read the separate Aurowall bucket;
no objects or bucket policies are changed. Partner music is not CC0 and is not
added to offline packs. Longer than 20-minute tracks play on the homepage, outside
the existing DJ import limit.

Jamloom now lists 72 music tracks from reviewed genre folders. Religious, wellness,
nature and noise categories are excluded from listing and streaming; original R2
objects are untouched. New genre folders require review in `lib/aurowall.ts` before
listing. This is category-based curation, not a full listening audit.
[Deck design, curation and validation](deck-hardware-and-curation.md).

Academy Checkout stays inside Jamloom and confirms only signed-webhook access.
Keep test/live publishable keys alongside their matching secret keys in Vercel.
Existing sales holds remain; no new owner credential action is pending for this
integration. [Implementation, evidence and exact configuration names](inline-payments-aurowall.md).

## Live Source Mac companion — 2026-10-21

Build and open the local owner preview with `./script/build_and_run.sh` from the
repository root. The app is also at `dist/Jamloom Live.app`; it starts stopped.
Choose a permitted app currently playing audio and a stereo output, confirm
source permission, then Start Live Source. macOS requests audio-capture permission
on first use; manage it in System Settings → Privacy & Security → Screen & System
Audio Recording. Do not select personal calls or protected content for tests.

The native app handles EQ, filter, echo, roll and pulse-following percussion locally.
Stop / Panic releases the selected app’s original route; it cannot pause that app.
Device-format changes and sleep stop capture. Additional hardware input channels
or unsupported stereo formats are rejected rather than capturing a microphone.
For website control, choose **Copy pairing code and open website**, paste the code
into `/live-dj`, and Connect. Allow local-network access if asked. Native controls
remain available if a browser blocks loopback. Pairing is valid for 15 minutes;
a connected page must keep polling or capture stops within five seconds. Re-pairing
stops the previous paired capture. Codes stay out of URLs and are never server secrets.

**Owner/device checks deferred:** verify real permission-denied/granted capture,
no doubled playback, Stop/crash restoration, output unplug/rate change, physical
latency and a 60-minute set. These are not established by the silent tests. The app
is ad-hoc signed for local use; Developer ID signing/notarization and public download
are not complete. No microphone sampling or continual AI phrase integration is added
to the companion; the existing studio phrase recorder remains separate.
[Evidence, compatibility and commands](live-source-companion.md).

## Historical provider checklist

The dated setup table below preserves earlier owner tasks. Current capture work
and remaining gates are in the [latest report](r1-capture-completion.md). Later
Academy/Stripe/Neon/R2/companion reports supersede older missing-setup statements;
no new live provider status is inferred from this local increment.

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
| P0 — [OWNER ACTION REQUIRED] migration and rollback approval | Neon Console → existing Jamloom project → branch `production`. Rehearse migrations `0006_credit_ledger.sql` through `0009_generation_rentals.sql` on an isolated branch before an explicitly approved application. Use existing guarded migration script, never build-time migrations. | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JAMLOOM_MIGRATION_TARGET` | Local empty DB migration/replay and ledger concurrency tests pass. Save a restore point/branch and test restoration. Rollback app code first; do not delete financial records or edit applied SQL. | Production unchanged; schema passes local tests and is active in isolated local preview |
| P0 — [OWNER ACTION REQUIRED] legal/privacy approval | Review `/privacy`, `/terms`, `/licenses`, source ledger and model/sample licenses with counsel. Supply legal entity/contact/address/jurisdictions and refund/retention policy before sales. | None | Audit actual data flows and public assets. Confirm identifiable speaker, training, distribution and venue rights separately. | Draft disclosures; commercial review open |
| P1 — [OWNER ACTION REQUIRED] Vercel preview/release | Vercel project → Settings → Git (repository `sariserhan/jamloom`), Domains (`www.jamloom.com`, apex redirect), Environment Variables. Use `apps/site` root with existing build script. Approve a reviewable preview, then production separately. | Existing account/R2/mail names; `BETTER_AUTH_URL=https://www.jamloom.com` for production | Build, exact-origin auth, sitemap/canonical checks and actual public routes after deploy. No production deployment performed in this checkpoint. | Existing hosting retained; this code local |
| P1 — [OWNER ACTION REQUIRED] auth and email verification | Better Auth remains email/password; no OAuth provider added. Resend → Domains: owner previously reported verified `jamloom.com`. Confirm transactional sender and reply-to. | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Existing unit/mail-layout tests; real owner-controlled inbox verification/reset requires authorized delivery. Exact origins only, no wildcard. | Config names present; no new delivery test |
| P1 — [OWNER ACTION REQUIRED] R2 retention/CORS | Cloudflare → R2 → `jamloom-audio` → Settings → [CORS](https://developers.cloudflare.com/r2/buckets/cors/), lifecycle. Keep bucket private; retain approved www/apex origins. Decide source/job-output retention and deletion policy. | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `JAMLOOM_R2_ENABLED` | Existing adapter has signed owner-scoped URLs and bounded operations. Use isolated test prefix for upload/range/delete; verify deletion. Never expose private voice publicly. | Credentials names present; prior R2 evidence retained, no new provider mutation |
| P1 — [OWNER ACTION REQUIRED] GPU spending approval | Vast.ai → Billing and Instances/Templates. Select reviewed pinned model/template, hourly ceiling, total experiment cap and kill deadline before renting. [Instance management](https://docs.vast.ai/guides/instances/manage-instances). | Existing `VASTAI_KEY` in private research environment; future worker signing secret is separate | Record rental, startup/idle/retry/storage costs; destroy instance and confirm billing stop. A local timeout alone does not stop rented billing. No agent rental in this checkpoint. | Existing research trials retained; durable queue and Vast shutdown adapter/watchdog pass mocked tests; real termination, invoices and deployment NOT RUN |
| P1 — [OWNER ACTION REQUIRED] Apple IAP sandbox | App Store Connect → My Apps → Jamloom → Monetization/In-App Purchases → + → Consumable. Create 10/25/50-credit product identifiers, approved localizations/screenshots and sandbox users. [Apple setup](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases/). | `APPLE_BUNDLE_ID` and `APPLE_ROOT_CERTIFICATES_BASE64` (comma-separated base64 DER Apple root certificates from Apple PKI, public data) configure the sandbox verifier. Future server API/production work may additionally require `APPLE_APP_ID`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_PRIVATE_KEY`; not used today | StoreKit display prices, verified JWS server ingestion, account token binding, replay/refund tests and durable ledger ack before finish. No expiry for consumables. | PARTIAL: native account bridge and sandbox refund/recovery code implemented locally; independent real App Store sandbox receipts and notification delivery remain NOT RUN |
| P1 — [OWNER ACTION REQUIRED] native app release | Apple Developer → Identifiers/signing; App Store Connect → agreements/tax/banking, privacy, accessibility and TestFlight. Preserve existing `com.djayvo.app` storage/signing identity until migration reviewed. | Signing remains in ignored `Local.xcconfig` | Simulator build is separate from physical microphone, interruption, memory/battery, VoiceOver and App Review proof. Upload requires explicit approval. | Local composition/account parity advanced; physical qualification and cloud/StoreKit acceptance remain open |
| P1 — [OWNER ACTION REQUIRED] live capture permissions | macOS Settings → Privacy & Security → Screen & System Audio Recording for Jamloom Live when physical checks resume; browser source chooser for current preview. Select permitted test audio, never protected-stream bypass. | None for browser preview | Physical output isolation, no feedback, source-stop/recovery and latency measurements. Browser cannot guarantee external app suppression; monitoring requires explicit confirmation. | Native companion implemented and locally tested; physical gate explicitly deferred / NOT RUN |
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

Migrations 0006–0009 add sandbox-only financial tables, private taste profiles and
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

## Rental watchdog operator handoff

Read [generation-watchdog.md](generation-watchdog.md) before enabling the operator-only
command. `generation:watchdog` is database-only preview by default. The explicit
`--apply` mode requires `JAMLOOM_WATCHDOG_TARGET` matching database host/path and
`VASTAI_KEY`; it may permanently delete only rentals matching a prepared job identity.
This is not authorization to run it against production. No endpoint exposes these
operations to clients. Deploy an independent supervised scheduler only after approval;
Vercel request lifetime is not the watchdog. A sleeping/disconnected laptop cannot
enforce rental termination. Validate provider outages and actual invoices before sales.

The trusted future launcher must call `prepare` before any create request, reuse its
unique label, and never retry uncertain creation. Final cost evidence must come from
a trusted accounting reconciler, not worker/client assertions. There is no automatic
invoice feed yet. An unresolved creation or over-cap invoice stays held for operator
review; do not force settlement to zero or erase the financial record.

## DJ Academy — Owner Actions (2026-10-21)

Current evidence: [release checks](academy-release-checks.md). Owner explicitly
approved Aurowall (`acct_1TxA3vDlEXWDEeHO`) for test and future live payments.
Production migrations/deployment and full hosted CI now pass. Recruitment was
replaced by owner-only testing: first lesson accepted, mini-set unmeasured. Human
checks are deferred at the owner's request. All ten silent Chromium/WebKit
2/5/5/30/60-minute recording cases pass with decoded PCM, downloads and account
saves; both hour caps stop automatically. This establishes technical recording
behavior, not physical output or human learning. [Evidence](academy-release-checks.md).

Academy is the fifth product, independently gated from generation. The approved
list price is **$79.99 USD once, before applicable tax**. No Academy lesson calls
Vast.ai or an AI API. Complete Pass sales remain closed; paid generation remains
closed for its separate musical-quality FAIL. Never put secrets in chat or Git.

| Approval / configuration | Exact place, value and reason | Variables / verification | Status |
|---|---|---|---|
| [x] Create the **sandbox** catalog | [Stripe sandboxes](https://dashboard.stripe.com/sandboxes) → select sandbox → Product catalogue → Add product. Name **Jamloom DJ Academy Complete Pass**; metadata `jamloom_product=academy-complete`; active one-time **USD 79.99**, tax exclusive. No recurring interval, trial or discount. | `ACADEMY_STRIPE_PRODUCT_ID=prod_…`, `ACADEMY_STRIPE_PRICE_ID=price_…`, `STRIPE_SECRET_KEY=sk_test_…`. SDK rejects other amounts/currencies/products/live mode. `npm run test:academy` tests local fixtures; it does not contact Stripe. | PASS: Aurowall test product `prod_VTzQzUCZg1ycGm`, price `price_1UT1RrDlEXWDEeHO14x5otG7`. Permanent owner-supplied test key configured in Vercel; old expiring CLI credentials are no longer the deployed dependency |
| [x] Configure separate signed webhooks | Stripe Workbench → Webhooks → add endpoint `https://www.jamloom.com/api/academy/stripe?mode=test` and `?mode=live`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Keep the existing `/api/payments/stripe` credit endpoint. | `ACADEMY_STRIPE_WEBHOOK_SECRET=whsec_…`. Test endpoint signing secret must match its sandbox. `ACADEMY_STRIPE_SANDBOX_ENABLED=true` only in a reviewed test environment. Keep this test configuration separate from the live keys described in the Administration section below. Paid release remains blocked. | PASS: permanent test/live secrets and endpoints configured; actual deployed test purchase/refund and non-payment live provider delivery pass |
| [x] Perform genuine hosted sandbox purchases | Use [Stripe test cards](https://docs.stripe.com/testing), verified owner-controlled test accounts and the Academy checkout. Test successful and failed payment, duplicate notification, refund before/after grant, dispute loss/win, repurchase and returning as another account. Verify the success page only acknowledges the webhook-owned receipt. | Confirm one `academy_purchases` row per receipt, no generation `credit_lots` change, paid content blocked after reversal. Retain sanitized event/session IDs and actual provider outcomes. | PASS: actual hosted Stripe test Checkout and real callbacks into local production server; decline, purchase, replay, refund before/after grant, repurchase, owner isolation and dispute win/loss. Permanent deployed test purchase/refund also PASS against the owner account; refunded sandbox receipt retained, no generation credit change |
| [ ] Approve taxes, countries, merchant identity and refund terms | Stripe Settings → Business/Tax; legal review of `/academy/checkout`, Terms and Privacy. Price excludes tax; collected tax is not revenue. A refund of any size currently suspends that receipt; decide final partial-refund policy before sales. | `lib/academy-economics.ts`: assumed 3.5% + $0.50 processing, 8% refund reserve, $10 hosting and $20 support reserve → $40.29 modeled contribution. Replace assumptions with actual merchant fees, taxes, support/hosting observations. No unlimited cloud coaching is included. | PARTIAL: live tax settings active, course category configured, zero active registrations reported; obligations/terms/fees still require owner review, realized economics NOT RUN |
| [ ] Approve practice music and final course | Review `public/academy-audio/manifest.json` and `CREDITS.txt`: artist Tricks & Traps, Extended and Theories of Everything, [author CC0 publication](https://opengameart.org/content/free-rhythm-game-music-pack-2). Corrected v2 64-second normalized excerpts; original v1 exports had 32-second silent tails and remain preserved as historical evidence. Confirm intended redistribution and venue-use disclosures. | Source SHA-256 pinned; `python3 scripts/prepare_academy_audio.py` reproduces assets. Also review the ten full-length CC0 tracks in [the public practice library](practice-library-ten.md), with all six artists credited. Human enjoyment, exact downbeats, compatible keys and phrase alignment are not established by the meter checks. | PARTIAL: publisher license/provenance captured; owner/music review open |
| [ ] Owner-only course acceptance (revised scope) | Deployed `/academy/lessons/first-crossfade`; owner explicitly replaced cohort recruitment with testing alone, using Dia / MacBook Air / external speaker. | Record actual observations in `docs/ACADEMY_NOVICE_STUDY.md`. No general novice effectiveness claim. | PARTIAL: first lesson accepted as “good enough for now”; owner mini-set, timing and numeric scores not supplied; further human checks explicitly deferred |
| [ ] Approve curriculum/badges and design | Review `/academy/levels/*`, coach, keyboard flow, contrast and reduced motion. Curriculum 2026.10.2 has 20 runnable lessons across all six stages, with 2/5/30-minute recorded assessments. Software completion requires the full prerequisite chain; musical judgment and physical venue competence remain separate. See [completion implementation](academy-completion.md). No professional accreditation is claimed. Existing Jamloom logo/colors retained. | `npm run test:academy-browser`; actual screen-reader/physical-output checks still required. Do not enable Complete Pass sales for an incomplete course. | PARTIAL |
| [ ] Approve privacy, retention, help and purchaser access | Use `support@jamloom.com` for replies; decide refund/help wording and applicable policies. Progress stores summaries, not raw audio: 20 recent attempts plus latest completed result per current lesson, and one daily anti-abuse counter. Local practice recordings only exist when the learner explicitly records/downloads. | `/academy/progress` export/delete; financial receipts remain for reconciliation. Confirm account-deletion retention policy with the existing financial ledger. No lesson analytics added. | PARTIAL: functionality local; legal/commercial approval open |
| [x] Production migration and backup restore | Authorized Neon production branch: reviewed additive migrations 0006–0012 applied transactionally after private full backup. Never edit applied migrations. | All 12 hashes match. Actual backup restored into disposable private-socket PostgreSQL 18; owner/ACL restore and production rollback not exercised. | PASS: [migration and restore evidence](academy-release-checks.md) |
| [ ] Approve asset hosting, deployment and monitoring | Vercel root remains `apps/site`; current Academy teaching music is ~3 MB (historical v1 files remain separately preserved), plus ~30.2 MB of full-length CC0 practice tracks; studio offline bundle is ~58.6 MB and free Academy pack ~61.7 MB (64 MiB ceilings). R2 `jamloom-audio` remains private for user audio. Do not make it public to serve course music. The build generates a bounded free offline pack without cached account/paid responses. | Review bandwidth/cache behavior and browser eviction; owner authorized deployment. Real R2 course-asset delivery is not used or claimed. Monitor failed webhook reconciliation and access denials; restore app before deleting financial data. | PARTIAL: production owner-preview deployment READY; public coming-soon preserved. Error-log scan empty; longer monitoring remains open. No bucket changes |
| [ ] Future native purchases | Separate Apple storefront/StoreKit entitlement review before Academy purchases appear in iOS. | No native Academy purchase UI added; no assumption that web Checkout can be embedded in the app. | NOT RUN / future scope |

The pass covers the included Academy course and practice studio; it does **not**
include generation credits or unbounded AI requests. Production activation needs a
reviewed implementation change, real provider verification and release approval;
a sandbox flag alone cannot enable live billing.


## Administration, messages and owner account — 2026-10-21

Implementation: [admin report](admin-implementation.md). The owner login
`serhan.sari@yahoo.com` was created through the existing public Better Auth API.
The owner confirmed both setup emails arrived; a read-only database check confirmed
`emailVerified=true`. No password was retained or printed. Owner authorization is
server-side and requires that exact verified address; client role fields are ignored.

### Production activation and remaining checks

1. **PASS:** Additive migrations 0006–0012 applied on the authorized Neon production
   branch after a private backup; all twelve hashes match and a disposable restore
   passed. [Current evidence](academy-release-checks.md).
2. **PASS:** Production deployment `c74ad49` is READY behind coming-soon. Sign in
   as the verified owner to use `/admin` and the purchase-free course preview;
   lesson prerequisites still apply. Public paid launch has not happened.
3. **NOT RUN:** Hosted support/signup/reply mailbox observation. Local application
   tests pass; earlier account setup emails arrived, which does not establish the
   new notification flow. No new messages were sent in the scheduler check.
4. **PASS:** `apps/site/vercel.json` schedules `/api/notifications` every five minutes
   on the existing Pro project. Vercel supplies the generated private `CRON_SECRET`;
   missing/wrong authentication returns 401 and an authorized empty-queue call
   returns 200. A subsequent scheduled request was observed. Each call leases at
   most five messages, retries failures after five minutes, and stops after ten
   attempts. **Retry pending email** remains available in `/admin`.
   Delivery remains at least once across a crash after provider acceptance; the
   existing Resend idempotency key reduces duplicates within its retention window.
   Provider acceptance is distinct from mailbox delivery. To stop scheduling,
   disable this project's cron jobs or remove the cron entry and redeploy.

### What the controls do

- **Site controls:** maintenance returns HTTP 503 + Retry-After for public pages
  and normal APIs; verified owner, account recovery, contact/support and signed
  payment webhook paths remain usable. Signups pause. Other warm servers can take
  up to five seconds to observe a setting. Existing/offline DJ sessions are not
  forcibly stopped or erased; maintenance is not a remote audio kill switch.
- **Announcement:** escaped plain text, up to 500 characters, shown on the Next
  site and raw DJ/voice studios. Empty removes it. Already-open pages refresh the
  banner at most once a minute; offline sessions retain their prepared audio.
- **Users:** search, verified/unverified status, suspend/restore. Suspension
  revokes sessions, blocks login, cancels queued work and requests shutdown of
  active jobs. Restore does not restore old sessions. Owner cannot suspend itself.
  No user deletion, arbitrary credit minting or impersonation was added.
- **Credit exemption:** verified owner reservations consume no credits, but actual
  compute costs remain recorded; one active job, per-job/daily cost ceilings,
  frozen-wallet safeguards, worker shutdown and product release gates remain.
  This does not authorize cloud spending.
- **Inbox:** contact/support forms persist messages and queue owner email in one
  database transaction. Owner can reply with the shared branded template and
  close/reopen tickets. Concurrent stale replies are rejected. Form senders are
  not assumed to own their claimed email address. Direct email replies to
  `support@jamloom.com` still arrive in that mailbox: **inbound email ingestion is
  not configured**, so only website submissions and dashboard replies appear in
  the database inbox. Do not promise an email-only reply was ingested.
- **Billing:** selected mode, configuration readiness, last 50 Academy purchases
  and generation reservations/costs. Refunds are issued in Stripe; verified
  webhooks reconcile access. This dashboard does not fabricate refunds or charges.
  Audit records are append-only. Contact rate-limit keys expire after a day; ticket
  and audit retention/deletion policy needs owner/legal review before public scale.

### Test/live billing configuration

Test keeps `STRIPE_SECRET_KEY=sk_test_…`, `ACADEMY_STRIPE_PRICE_ID`,
`ACADEMY_STRIPE_PRODUCT_ID`, `ACADEMY_STRIPE_WEBHOOK_SECRET` and the existing
`ACADEMY_STRIPE_SANDBOX_ENABLED` switch. Live mode requires **all four separate**
variables: `STRIPE_LIVE_SECRET_KEY=sk_live_…`, `ACADEMY_STRIPE_LIVE_PRICE_ID`,
`ACADEMY_STRIPE_LIVE_PRODUCT_ID`, `ACADEMY_STRIPE_LIVE_WEBHOOK_SECRET`.
These are server-only. Configure the live Academy endpoint as
`https://www.jamloom.com/api/academy/stripe?mode=live`; the existing endpoint without
that query remains test-only. Each endpoint verifies its own secret and event
mode even if the selected checkout environment has subsequently changed, so
in-flight refunds/receipts remain reconcilable. Keep the existing credit webhook.

The live Academy price must be active, one-time, USD 79.99 before tax, exclusive tax,
with an active product carrying `jamloom_product=academy-complete`. Mode switching
checks that configuration is present; provider-side price checks happen before
checkout. **Mode selection does not approve commercial release.** Academy sales
remain held by `academySalesReleased=false`, and generation remains held by
`paidGenerationReleased=false`. Actual deployed Stripe test purchase/refund and a non-payment live webhook
probe pass. Real payment settlement/refund, merchant obligations, fees and
commercial activation still require their separate evidence and owner approval.
Sandbox purchases never become live entitlements when the mode changes.


## Homepage and public creations

The current homepage has a working mini DJ deck and a feed of the latest eight
reviewed public mixes. It refreshes every minute while visible and on tab return.
Existing private recordings are unchanged. No sample practice track is presented
as user-generated music, and an empty catalogue remains visibly empty.

Current deployment and remaining community checks:

1. **PASS:** Migrations **0011 and 0012** are applied on the authorized production
   branch, their hashes verified, and matching code deployed. The private backup
   restore passed. See [current release evidence](academy-release-checks.md).
2. Keep R2 `jamloom-audio` private and preserve its existing scoped upload/CORS
   configuration. Set `JAMLOOM_CATALOGUE_ENABLED=true` only when public-listening
   moderation is ready. This switch already exists; no new secret is required.
3. Sign in with the verified owner account and open **Admin → Review submitted
   music**. Listen and check sharing permissions before approval. A different
   configured reviewer must review your own submissions; self-approval is blocked.
   Configure additional verified reviewers with `JAMLOOM_REVIEWER_EMAILS` as needed.
4. On the deployed site, create a permitted mix, choose public, explicitly confirm
   sharing, save and approve from a different reviewer account. Confirm homepage
   playback. Repeat privately and verify it is absent; withdraw the public listing
   and verify it disappears. Hosted end-to-end verification is **NOT RUN** here.

The owner chose **25% extra credits for private cloud creation, rounded up**:
4 base credits → 5 total; 5 → 7. The local ledger reserves this premium and
captures it only on successful completion; zero-cost cancellation returns all
reserved credits, and failure releases the premium. Existing base-cost policy and
GPU caps remain. The verified owner stays credit-exempt but cost-controlled.
The generation quote/confirmation route must use the selected visibility and
show the total before paid generation is released. Its quality/release gate is
still closed; no live charges are enabled by this update.

Local previews, WAV downloads and saving these local mixes currently cost
**0 credits**, visibly stated before saving. Withdrawal is always free, even for
an originally public mix; downloaded copies cannot be recalled. Public listening
permission is not AI-training or commercial-reuse permission. Homepage public
saves require that separate permission and review rather than auto-publishing
microphone inputs. [Evidence and limits](visual-home-and-sharing.md).


## Public coming-soon mode

Coming-soon mode is **on by default** with this code. Keep
`JAMLOOM_COMING_SOON=true` (or leave it unset) in Vercel. After deploying the
matching code, visitors and ordinary signed-in accounts see the branded launch
page; product routes redirect there and product APIs/signup are closed.
Contact, support, legal pages, sign-in/reset/verification, admin routes and
existing signed payment/notification callbacks remain reachable under their
normal authorization checks.

Use **Admin sign in** with verified `serhan.sari@yahoo.com`, then open the Jamloom
home link or `/admin`. The bypass uses the real server session and suspension
check. It does not accept a query flag, client-side role or ordinary login.
Signing out closes the preview again. Admin preview responses are private/no-store.
No new migration is needed for this gate, but existing auth/admin setup and its
previously documented migration 0011 must be present for admin sign-in/bypass.

When ready to open the product, set `JAMLOOM_COMING_SOON=false` and redeploy.
This is separate from the dashboard maintenance toggle; the dashboard shows the
current launch state. Turning it off does not release paid generation or Academy
sales. Existing stored/cached offline assets are not remotely erased by a launch
page. Provider tracking delivery and public deployment were not verified here.
Local product browser tests intentionally start their servers with the flag false;
`npm run test:coming-soon-browser` tests the default-on behavior against a disposable
loopback database. [Evidence](coming-soon.md).


## Next.js recovery and search metadata

Loading/404/error/global-error screens need no new credentials or migration.
Deploy the matching commit to activate them. `/robots.txt` and `/sitemap.xml`
follow the existing `JAMLOOM_COMING_SOON` setting at request time. Public product
URLs are listed only when the setting is exactly `false`. Private account/API
routes stay excluded. Keep the existing authenticated admin and no-store
configuration; no cache purge or new cache service is required.

After deployment, check the coming-soon page, verified admin bypass, robots and
sitemap on www.jamloom.com. Test an unknown route from an admin preview (or after
public launch); anonymous requests are intentionally redirected by the launch
gate. Do not deliberately crash production to test error pages: use the isolated
`npm run test:framework-browser` fixture described in
[nextjs-foundations.md](nextjs-foundations.md). Hosted validation is NOT RUN.

## DJ DSP, saved scenes and Music DNA follow-through

For imported local tracks, pause the deck and choose **Enable beat controls**.
This enables signed platter scratch and optional key lock for 2-second–5-minute
tracks within 128 MB decoded. The deck effects panel adds reverb, phaser and
flanger. Reset flushes their tails; pause-all leaves playback stopped. These local
technical checks do not certify venue timing or musical quality.

**Recover this set after a reload** now optionally retains the source phrase,
prepared C and instrument settings as well as A/B, under the same 100 MB set cap.
There are three independently saved scene slots. Confirm both music and phrase
permissions before restoring voices. Restore is always paused; enable instruments
again before playing keys/patterns. Delete recovery and each scene explicitly to
remove saved source audio. Browser eviction can still remove local storage; keep
separate downloads. Online-only partner music and unfinished recordings are excluded.

The instrument rack includes a 16-step sequence of notes/rests at 40–240 BPM.
It uses the selected sound and velocity, starts independently of deck sync, and
stops on panic/focus loss. Edit then restart to apply changes. Record it through
the studio mix recorder; dry instrument-take recording stops/disallows sequencing
to preserve replayable take metadata.

Headphone setup requires two distinct supported outputs. Allow each output where
the browser provides a selector, configure while paused, play the quiet test, and
confirm it is heard only in headphones. This confirmation is never persisted.
Changing devices, losing permission or hiding the page mutes cue and requires
reconfiguration. Physical output/calibration checks remain deferred.

Music DNA can search the existing cleared catalogue and explain genre evidence
from title/artist/edition metadata and weighted ratings. It does not infer unknown
audio attributes. The optional preference-adaptation checkbox reapplies a preferred
Jamloom variation's actual controls and direction locally. It trains no model and
uploads no feedback. Delete saved profile clears this local feedback too.

Trusted worker recovery and read-only provider charge collection are described in
[non-ios-finish](non-ios-finish.md). They do not enable paid generation. Actual GPU,
R2, final billing, listening and physical capture/routing checks remain open. A local
secure-origin fixture verified Chromium with local-network permission; WebKit
blocked loopback access and requires native companion controls or a supported browser.


## Wider recordings and continual phrases — 2026-10-21

Voice studio's approximate-duration selector enables 1–15 second selections and
15–60 second outputs. The actual ending follows a whole bar. Original arrangements
retain their previous bounds. Longer recordings contribute a bounded hook and
source events; this does not certify word boundaries or musical quality.

For continual phrases, prepare A, confirm its grid/key, start it, confirm voice
permission and check headphone isolation. Start continual phrases captures one
2–5 second phrase, pauses capture while C is prepared and played, then listens
again. C enters on the next available bar; insufficient remaining A stops the
cycle. Stop, permission revocation, device changes, interrupted audio or hiding
the page closes the microphone. Headphone confirmation resets after stopping.
One minute without a completed phrase stops capture. Each new phrase replaces temporary phrase/C audio. Save C while it is ready or
use the mix recorder; saved library entries are unchanged.
This is an experimental energy endpoint: actual microphones, noise, word boundaries,
headphone leakage and latency still need the deferred physical checks.

Hosted rollout must apply migration `0013_audio_duration.sql` before exposing
extended online saves. It was tested only in disposable local PostgreSQL; no hosted
migration ran. Keep its wider constraints if rolling back code with extended
assets present. Do not delete user audio to restore old bounds. See the
[implementation, reproducible checks and remaining gates](duration-and-live-phrases.md).
