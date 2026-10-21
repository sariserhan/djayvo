# Full-product implementation checkpoint

2026-10-20/21, America/New_York. **Overall PARTIAL. Paid release FAIL / closed.**
This is a resumable implementation checkpoint, not completion of the entire
product specification. The master and learning addendum are unchanged. The
owner-supplied specification remains at
`apps/site/jamloom_full_product_implementation_spec_v1.md`.

## Delivered code

| Area | Implemented paths | Current capability |
|---|---|---|
| Public product | `apps/site/app/page.tsx`, `product.css`, `product-intro.tsx`, `lib/product.ts`, `lib/editorial.ts` | Responsive SSR home, four feature sections/routes, pricing/examples/help/legal/status/download pages and three authored guides. Existing palette, auth, library/player and VisitorPing retained. |
| Existing audio workflows | `/improvise`, `/dj-studio` | Explicit onboarding and links into working static/WASM remix and two-deck studios. These entry routes do not replace the shared engine. Existing bounds remain 2–5-second inputs and 20–40-second local outputs. |
| Live Source | `app/live-dj/`, `lib/live-source.ts` | Permissioned browser capture, measured peak, real tone/echo/level/bypass, mute-first monitoring, panic/track cleanup. No recording/upload, native loopback or external app transport control. |
| Music DNA | `app/music-dna/`, `lib/taste*.ts`, `app/api/taste/`, migration 0007 | Validated explicit preferences, three planning directions, local save/delete and optional private account copy. Monotonic revisions prevent stale-tab overwrite, including delete/recreate. No invented audio analysis from titles; no taste-to-song engine claimed. |
| Web finances | `lib/economics.ts`, `lib/wallet.ts`, migration 0006, `lib/stripe-payments.ts`, `app/api/payments/` | Nonexpiring purchase lots, append-only integer ledger, receipt identity, conservative reservations/settlement, duplicate/race guards, dispute freezes including refund-before-grant, official Stripe signatures. Public Checkout stays closed. |
| Job control | `lib/generation-budget.ts`, `lib/generation-queue.ts`, migrations 0008–0009, `lib/generation-watchdog.ts`, `lib/vast-provider.ts` | Atomic reservation + source/plan binding, signed permits, one active job per user/one global allocation, leases, cancellation, lost-lease shutdown state, no automatic re-rental, recoverable settlement. Real local-process time cap tested. Vast shutdown adapter and durable watchdog now tested with mocked provider responses; no real provider execution. |
| Private account | `app/account/{credits,purchases,generations}/` | Verified-owner wallet/purchase/reservation views and safe unconfigured states. |
| iOS | `MusicDNA.swift`, `CreditPurchases.swift`, `JamloomApp.swift`, `TasteTests.swift` | Two-experience tab shell, local preference storage/validation, StoreKit consumable verification and backend-ack-before-finish boundary. Purchases disabled; account bridge/notifications unfinished. Leaving remix tab suspends audio/cancels rendering. |
| Discovery | `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `learn/` | www canonicals, public-only sitemap, metadata/OG, truthful organization/local web-app schema, guide breadcrumbs, crawlable JS-disabled marketing pages. Private routes remain noindex. |
| Audio audit | `scripts/product_audio_baseline.py`, `scripts/q0_audit.py`, `tests/audio-variety-audit.mjs` | Ten authorized frozen inputs, event plans, sources, stems, masters, levels and structural repetition audit. No production DSP quality patch or major training. |

No new project, provider replacement, production migration/deployment, email send,
paid API, GPU rental or model training occurred. Existing source recordings and
plans remain intact. New migrations passed disposable local tests and were then applied to the existing
isolated loopback preview database (see `local-preview-migration.log`). Neon is unchanged.

## Validation matrix

Evidence folder: [`evidence/full-product/`](evidence/full-product/).

| Gate | Result | Exact evidence and boundary |
|---|---|---|
| Existing web unit baseline | PASS | `web-baseline.log`: 73/73. |
| Fresh C++ build/tests | PASS | `core-build.log`, `core-baseline.log`: 15/15, 30.33 seconds. Shared DSP unchanged. |
| Account/audio/payment/economics/queue tests | PASS | `all-tests-watchdog.log`: 64 tests, 0 failures, 0 skipped. Real disposable local Postgres; SDK verification fixtures are not provider purchases. |
| Full npm production build | PASS | `npm-build-watchdog.log`: `npm run build`, studio preparation + Next build, exit 0. |
| TypeScript | PASS | `typecheck-watchdog.log`: `tsc --noEmit`, exit 0 after fixing the new smoke test's process types. |
| Browser route/interaction | PASS | `browser.json`: Chromium 149.0.7827.55 and WebKit 26.5; 17 public routes, widths 1440/390/320, canonical/indexability, SSR, local preferences, audio decoding, no uncaught page errors. |
| Live Source signal | PARTIAL | Chromium synthetic permission chooser supplies actual oscillator PCM: mute, low-pass attenuation, bypass and track stop pass. Headless WebKit supplies zero audio tracks and is correctly rejected. Physical selection/output isolation NOT RUN. |
| DJ control regression | PASS | `dj-chromium.log`, `dj-webkit-rerun.log`: real deck/instrument PCM, effects, automation, recorder, cached offline behavior and cleanup. Browser automation is not venue certification. |
| Automated accessibility | PASS | `accessibility-performance.json`: zero axe WCAG A/AA violations across 13 routes; keyboard skip link checked. Manual assistive-technology review NOT RUN. |
| Performance/SEO release | PARTIAL | Local unthrottled mobile lab recorded max LCP 68 ms and CLS 0. These are not internet/mobile field CWV or INP. Public crawler/Rich Results/Search Console NOT RUN. |
| HTTP account/payment boundaries | PASS | `product-http.json`: three real local signup/verification/login flows; private taste CRUD/races, origin/auth/size checks, account views, signed webhook replay/conflict/live rejection, closed checkout. Local mail captured only. |
| Local worker vertical slice | PASS | `generation-render.json`: signed durable job → real C++ render → validated private disk store → owner playback → ledger settlement. 32-second WAV rendered in 1.086 s; exact frozen-baseline SHA replay. Other owner denied. |
| Expanded audio baseline | PASS | `audio-baseline.json`: ten inputs; 10 source WAVs + 56 rendered masters/stems = 66 WAVs. Zero full-scale decoded samples in the 56 rendered outputs; original claps source has 87 (see `source-clipping.json`). Master LUFS −25.40 to −22.84, highest measured true peak −5.48 dBTP. |
| Structural variety | PARTIAL | `audio-variety.json`: no whole-composition hash duplicates, but bass and drum structures repeat across every input sharing a style at the fixed seed; experimental piano repeats across four sources. Exact-structure comparison is not perceptual originality. |
| iOS local integration | PASS | `ios-final-summary.json`, `ios-final-tests.log`: 12 simulator tests (8 engine/profile + 4 UI), including consent/render/playback/save/relaunch, denial, large text and taste persistence/deletion; 0 failures. Xcode 27.1, iPhone 18 Pro/iOS 27.0 simulator. |
| Stripe/Apple actual sandbox transactions | NOT RUN | Credentials/products and full mobile account bridge missing. Signed local fixtures do not establish payment collection, refunds, tax, app-store delivery or real proceeds. |
| Vast/R2 complete hosted generation | NOT RUN | Local worker uses private disk, not rented GPU or R2. Existing providers retained. No external spend. |
| Musical improvement/release | FAIL | Prior Q0 owner rejection remains binding. No new controlled listening outcome, 20-input/10-listener panel or ≥70%/80%/85% release result. |
| Physical platforms/endurance | NOT RUN | New physical iPhone, macOS loopback/isolation, 60-minute venue set and Intel Linux execution not performed. Earlier evidence stays historical. |
| Production publication | NOT RUN | Local commits/builds do not establish deployment. |

The public `public/audio/instrument-study.mp3` is a real 11.6-second local engine
study using the existing licensed bank, with no user speech or reference song.
Its JSON records hashes/provenance. Dependency declarations for 50 newly added
site packages are inventoried in `dependencies.json` (MIT, Apache-2.0, BSD and
dev-only MPL-2.0); this is not a complete legal review. It is not advertised as a quality success.
Private baseline: `renders/full-product-baseline-20261020/index.html`.
Worker playback: `renders/full-product-worker-XDahQd/result.reggae.wav` with
stems, plan, source attribution and log. No private WAV is committed or published.

## Musical diagnosis and next experiment

The existing [Q0 final report](q0-final-report.md) remains the auditory evidence:
the owner found all tested arrangements inadequate, specifically creativity.
Some instrument changes were acceptable but did not recover the performance.
Night Current later received “okay it is not bad”; that is one standalone song,
not an improvisation comparison or permission to repeat its structure forever.

The new ten-input audit strengthens one technical finding: the overall novelty
hash can change while entire bass/drum parts remain identical. Velocities, precise
scheduling and lack of clipping are insufficient quality criteria. Do not call
seed changes, gain changes, a different source clip or more UI a creative fix.

Next audio work must test a source-dependent compositional hypothesis in an
isolated candidate: select a recognizable musical idea, coordinate its bass/drum
response, develop it intentionally and preserve meaningful silence. Compare it
at matched loudness against the frozen baseline, with source/plan/stem evidence.
Do not promote another rule edit until actual listeners prefer it. An authorized
musician-authored control/decision trace is still missing; the agent has not
claimed to hear reference MP3s merely by inspecting their waveforms.

## Worker safety follow-up

[Durable rental watchdog](generation-watchdog.md) adds migration 0009, ownership-bound
creation intent, complete paginated Vast inventory/account verification, separate
delete request/absence confirmation, and final cost-evidence checks. Lost creation
responses never trigger another rental; unknown state holds credits. Over-cap
settlement remains blocked. The default CLI is preview-only and contacted no provider.
64 site/DB tests and the full root build pass. Initial failures were a stale expected
migration count and a taste-profile test incorrectly assuming gapless sequence
values; fixed assertions preserve the one-writer/monotonic/stale-write requirements.
Failed logs are retained. No live Vast operation or watchdog deployment occurred.

## Economics and limitations

Amounts are integer USD microdollars. Lot valuation is actual per-purchase data
in the ledger, but sandbox adapters currently use an explicitly hypothetical
40% of pre-tax gross net allowance; no realized fee/tax reconciliation exists.
Reservations default to 50% contribution margin (minimum accepted floor 30%),
with a $5 per-job modeled cap, $10 rolling 24-hour per-user modeled cap and one
active job per user. Caps do not establish actual rental shutdown.

The local worker test reserved a $0.10 modeled ceiling and settled $0.010227
against one fixture credit valued at $0.40 net. Actual external spend: **$0**.
This is an accounting simulation with real local DSP, not measured Vast unit
cost or evidence that proposed retail packs are profitable.

Remaining financial implementation: actual fee/tax/FX/proceeds ingestion,
refund/chargeback entitlement reversal and policy, signed Apple notifications,
mobile account binding, real provider termination/invoice verification, deployment
of the locally tested watchdog and complete R2 output/retry reconciliation. Frozen disputed balances
require operator reconciliation. No public API currently starts a paid job.

## Reproduction and failures found

Hardware/toolchain capture: `environment.json` records Apple M5/16 GiB, macOS
26.7.1, Xcode 27.1, Clang 21, CMake 4.4.2, Python 3.14.6, FFmpeg 9.0.2 and
PostgreSQL 16.14. `~/mlx-env` was not modified.

Use Node 22.23.1; explicit Node path was used because the shell also has Node 26.
The private site env points at Neon; destructive tests must override it with
loopback Postgres, local outbox and local audio storage. Never print those values.
The test suites enforce local-only database targets and create/drop unique DBs.

```sh
npm run build
npm --prefix apps/site run typecheck
npm --prefix apps/site test
npm --prefix apps/site run test:integration
npm --prefix apps/site run test:wallet
npm --prefix apps/site run test:product-http
npm --prefix apps/site run test:generation-render
npm --prefix apps/site run audit:bundle
npm --prefix apps/web test
ctest --test-dir build-product --output-on-failure
.venv-q0/bin/python scripts/product_audio_baseline.py --output renders/full-product-baseline-replay
npm --prefix apps/site run test:audio-variety
```

`test:generation-render` requires `build-product/jamloom_remix`, the licensed
baseline cache and local DB variables. It keeps a fresh ignored render folder.
`test:audio-variety` reads the named frozen baseline; it does not rewrite plans.
For route checks run the production site on 127.0.0.1:4220, then
`test:product-browser` and `test:product-a11y`. These do not start a server.
`test:product-http` starts its own isolated server on 4221 and stops it afterward.

Failures retained in logs: missing SWC native binary repaired from the exact
lockfile-pinned archive after SHA512 verification; Node 26 engine warnings;
initial missing CMake path; first cohort license allowlist rejected an existing
PD-author recording (ledger inspected before explicit acceptance); screenshot
WebKit timeout followed by passing rerun; prefetch cancellations exposed by
rapid WebKit navigation fixed by disabling speculative links; new sequence SQL
quoting and smoke-test process typing failures corrected before final checks.
The WebKit no-audio-track result remains an honest NOT RUN signal check.
The expanded iOS UI run initially failed because tests tapped a nested switch
child; targeting the labeled consent switch restored both recording workflows.
The large-text inspection also exposed cramped capture buttons; they now stack
using [SwiftUI conditional layouts](https://developer.apple.com/documentation/swiftui/anylayout).
Music DNA and remix now share the existing debug test-library routing, so UI
preference tests cannot delete normal app preferences. Native Unicode reference
bounds match web UTF-16 limits. The final 12-test run passes; the first failure
log and diagnostic screenshot are retained. Existing Xcode identifiers/settings
were preserved; only three source-file references were added to the project.

## Resume order

1. Resolve the musical-composition experiment above; retain negative judgments.
2. Integrate approved rental creation and authoritative cost ingestion with the
   tested shutdown watchdog, then approved real Vast/R2 verification.
3. Finish native account/session sync and signed purchase-notification/refund
   reconciliation; run real Stripe/Apple sandbox flows when configured.
4. Implement the macOS capture companion with output exclusion/pairing, then
   obtain explicit OS permission and measure physical latency/isolation.
5. Finish taste-driven original audio, useful per-job quotes/calculator, public
   cleared before/after demos, cross-platform input/output duration expansion, manual accessibility, field performance and
   60-minute device endurance. These are unfinished agent work, not merely keys.
6. Only after quality/financial/legal/platform gates, prepare an approved preview
   and production migration/release. No sale or release is implied here.

[Owner handbook](OWNER_HANDBOOK.md) lists exact external actions; [STATUS](STATUS.md)
and [TODO](../TODO.md) retain this checkpoint and historical work. The commit
containing this report is identifiable with `git log -1 -- docs/full-product-implementation.md`.

Structured data follows the [Google software-app documentation](https://developers.google.com/search/docs/appearance/structured-data/software-app).
The local DJ app is correctly described as free. No review or aggregate rating
is fabricated; software-app rich-result eligibility is not claimed without a
qualifying real review/rating. Organization markup identifies the public brand,
not an asserted registered legal entity.
