# Jamloom DJ Academy implementation checkpoint

2026-10-21 · Apple M5 / macOS 26.7.1 · **Overall PARTIAL, not a full-course release.**
The fifth feature is integrated into the existing repository. The original four
products remain; **AI musical quality is still FAIL and paid generation remains
disabled**. No live charges occurred. Hosted migration and owner-preview deployment are now complete; see the latest release checks.

## Latest release checks — 2026-10-21

[Current release evidence](academy-release-checks.md) supersedes the historical
no-deployment/no-provider statements below. Production migrations and owner-preview
deployment pass, full hosted CI passes, and the owner accepts the first lesson.
Owner-only validation replaces recruitment. Sales remain closed while the remaining
course, hardware and commercial evidence is incomplete.

## Previous local course expansion — 2026-10-21

[Completion increment](academy-completion.md) supersedes the two-lesson coverage
and missing-transport backlog below. Curriculum 2026.10.2 has 20 runnable lessons,
all six stages, real shared-clock course transport, beat loops/jumps, instrument
layering and bounded 2/5/30-minute set assessments. Earlier account history and
original source/audio evidence remain preserved. Corrected v2 teaching exports
remove the 32-second silent tails found in the first longer recording test.

**PASS so far:** 96 web tests, 12 Academy/database tests, 31 site tests, build and
TypeScript; Chromium full lesson-control run and mini-set; Chromium/WebKit original
recorder PCM/privacy/lifecycle regression. **PASS:** final two-browser control, offline and lifecycle checks; broad course run and both real two-minute mini-sets. Longer full-duration assessments remain NOT RUN. **NOT RUN:** independent novices,
physical audio/venue, full-duration 5/30/60-minute browser endurance, actual Stripe
transactions and deployment. No commercial or generative-quality gate changed.

The remainder is the preserved original checkpoint and its original evidence.

## Initial audit and preservation

Started on `main` after `35c0df0` (and prior `efa13be`), with only the owner's
untracked `apps/site/scripts/jamloom_dj_academy_addendum_v1.md`. Read that complete
addendum, the master specification, improvisation-learning addendum, AGENTS,
TODO and current product/status/handbook documentation. Neither master nor learning
specification was edited. Existing local recordings, private env files and the
four-product checkpoint remain. The supplied Academy addendum is retained intact.

Fresh baseline: 73 web tests, 64 site/database tests and 15 C++ tests passed.
Logs: `docs/evidence/academy/baseline-{web,site,core}.log`. C++/WASM source and the
original synthetic speech fixture were not changed or regenerated. No iPhone or
Linux runtime execution was performed in this Academy turn; prior results remain
historical, not new proof.

## Working implementation and exact source map

| Component | Sources / behavior |
|---|---|
| Shared real decks | `apps/web/dj.js`, `deck-bridge.js`: original handlers execute both learner and demo actions; schema/version/session/sequence/source tags distinguish provenance. Analyser RMS/peaks and AudioContext time come from the existing A/B mixer. No separate audio engine. |
| Rubrics/state | `apps/web/academy-evaluator.js`, `academy-manifest.js`: bounded versioned manifests, ordered tasks, actual signal and timing checks, gradual fade, sustained gain values, explicit demo exclusion, failed attempts, pause/retry, unlimited voluntary Free Jam. |
| Coach | `apps/web/academy-coach.js`, `academy.css`: numbered permission/load sequence, actual permission control, target highlighting/focus, optional spoken hints with visible text, deterministic remediation after repeated failures, checklist and learner-controlled Continue. |
| Curriculum | `apps/site/lib/academy-content.ts`: six stage outlines, two runnable exercises and the first no-demonstration challenge. Upper-stage descriptions explicitly say their assessments are unavailable. |
| Progress | `apps/site/lib/academy-store.ts`, `app/api/academy/[...path]/route.ts`: verified Better Auth identity; owner-scoped attempts; server rubric re-evaluation; asset/evaluator/version checks; task order and replay conflicts; expiration; prerequisite/access checks; export/delete. Latest 20 attempts plus latest completion per current lesson retained; 100 account-synced starts/day, with unlimited local practice. |
| Data | `apps/site/migrations/0010_academy.sql`: separate purchases, reversal holds, event digests, attempts, task summaries and one daily usage row per account. Applied only to disposable loopback tests and the dedicated local preview. |
| Commerce | `apps/site/lib/academy-payments.ts`, `academy-economics.ts`, `app/api/academy/{checkout,stripe}/route.ts`: fixed catalog $79.99 USD, one-time, tax exclusive; hosted Checkout; signed webhook then provider reread; transactionally idempotent separate entitlement; refund/dispute holds; repurchase. Test keys only. |
| Existing credits preserved | `app/api/payments/stripe/route.ts` ignores Academy product events for credit fulfillment/freeze. Ordinary lessons never grant, reserve or deduct generation credits. |
| Offline | `apps/site/scripts/prepare-academy-offline.ts`, `apps/web/academy-offline.js`: reuse bounded content-hashed worker from `scripts/service-worker.js`; public free lesson, licensed music and shared studio only, ≤40 MiB. No cached API/account/paid responses. Explicit save/remove. |
| Site integration | `app/academy/*`, `lib/academy-deck-page.ts`, `lib/product.ts`, home/layout/sitemap. Fifth feature plus existing four; same real deck HTML served by authenticated handlers, no iframe. Existing frame blocking preserved. A same-origin base is allowed only on Academy deck/offline paths. |
| Reproduction | `scripts/prepare_academy_audio.py`, `scripts/measure_academy_capture.py`, `apps/site/tests/academy*.{ts,mjs}`, `apps/web/tests/academy.test.js`. No new runtime dependency. Separate Academy Postgres/rubric CI job added; its hosted execution is NOT RUN. |

`academySalesReleased=false` is separate from `paidGenerationReleased=false`.
Even explicitly enabled Academy sandbox Checkout rejects live keys and events.
Production activation requires reviewed code/schema changes and owner approval.

## Routes and actual coverage

| Route | What works / boundary |
|---|---|
| `/academy` | SSR marketing, free-lesson link, stage previews, price/FAQ/rights/limitations; no invented testimonials or professional certification. |
| `/academy/learn` | Account/local history, distinct measured checks, first-transition badge, course map, practice/restart links. Local entries never unlock paid access. |
| `/academy/levels/{intro,beginner,elementary,intermediate,advanced,performance}` | Six stage overviews; only implemented exercises linked as runnable. |
| `/academy/lessons/first-crossfade` | Free permission → two real music loads → Play A → Play B → eight-beat gradual fade → Free Jam after every check. |
| `/academy/lessons/gain-staging` | Server-gated pass plus introduction prerequisite. Play A; lower Master to 50%; restore 75%; require sustained actual values with audible output. Local seeded-entitlement browser test passes; sales are closed. |
| `/academy/challenges/first-crossfade` | Same three measured tasks, without coach demonstration. An introductory challenge, not a beginner mini-set or venue qualification. Unknown challenges return 404. |
| `/academy/practice` | Real decks, supplied or optional user files, no timer or grading until coaching is explicitly resumed. File ends are natural; tracks can be replayed. Existing whole-file repeat can gap. |
| `/academy/checkout` | Clear $79.99 offer preview, separate credits, tax/refund boundaries. Purchase button closed unless explicit sandbox configuration. |
| `/academy/success` | Owned, unreversed database receipt required; redirect URL alone never grants access. |
| `/academy/progress` | Account history, version-aware checked skills, local history identified as unverified, JSON export and learning-progress deletion. Financial receipts/anti-abuse counter retained. |
| `/academy-offline/index.html` | Explicitly prepared free lesson survives origin loss; local checks only. A fresh signed-in online attempt is needed for verified account progress. |

The lesson compiler and evaluator support additional bounded task kinds, but that
is **not** completed curriculum. Phase alignment, bar/phrase recognition, beat
loops/jumps/rolls, multi-transition mini-sets, long-set recording and venue drills
are not implemented as reliable Academy assessments. The current shared A/B engine
is unsynchronized, active pitch changes pause briefly, whole-file repeat can gap,
and the mix recorder is capped at 30 seconds. No fake controls or competency
awards were added to mask those dependencies.

The addendum's priority is an audible, enjoyable, verified first lesson before
mass authoring. Owner preparation initially failed and was fixed; owner confirmed
being able to start music afterward. **Human fade completion and enjoyment remain
unconfirmed.** That does not satisfy the novice study or justify selling a full course.

## Audio assets, licensing and artifacts

Artist **Tricks & Traps** published Extended and Theories of Everything in the
[Free Rhythm Game Music Pack 2](https://opengameart.org/content/free-rhythm-game-music-pack-2)
under [CC0](https://creativecommons.org/publicdomain/zero/1.0/). The pinned original
WAV hashes, original URLs, source page, modifications, derived hashes and technical
measurements are in `apps/site/public/academy-audio/manifest.json` and
`docs/evidence/academy/audio.json`; attribution is in `CREDITS.txt`.

The authored public assets are two stereo, 48 kHz, 192 kb/s MP3 excerpts, 64 seconds
each (32–96 seconds of each source), with loudness normalization and 15 ms edge
fades. They are artist recordings, independent of Jamloom's generative composer.
The author labels both 120 BPM; absolute downbeats, keys and phrase alignment
have **not** been independently verified. The lesson explicitly measures fade
length, smoothness and signal, **not** phase-accurate beatmatching or artistic taste.

Playable files:

- `apps/site/public/academy-audio/extended.mp3`
- `apps/site/public/academy-audio/theories.mp3`
- `docs/evidence/academy/audio/chromium-first-crossfade.wav`
- `docs/evidence/academy/audio/webkit-first-crossfade.wav`

The two browser WAVs are actual post-limiter captures of the tested keyboard
crossfades. `captured-audio.json`, browser receipts and automation traces bind them
by SHA-256. Final copies, receipts and automation are committed under
`docs/evidence/academy/audio/`; reproduction writes fresh files under `build-academy/`.
`assessment-trace.json` retains the real task samples/actions and scores. They are roughly 4.1 seconds at 48 kHz stereo PCM16, with no full-scale
samples or exact-silence run. See the JSON for final measured LUFS/true peaks and
exact frame counts. **Both report one recorder timestamp discontinuity.** This is
retained as PARTIAL, not rounded away or declared glitch-free. A small attempted
startup probe captured no diagnostics and establishes no cause. Further recorder
clock investigation and actual listening/physical-output tests are required.

## Validation gates

| Gate | Status | Evidence / remaining boundary |
|---|---|---|
| G1 — Correct integration | **PASS** | Production build, TypeScript, 78 web tests, 75 site/DB tests, 15 baseline C++ tests, 17 existing product routes in Chromium/WebKit at 1440/390/320, bundle/private-secret audit and existing payment HTTP regression. No new iOS/Linux runtime result. |
| G2 — Real equipment | **PASS** | Keyboard operates original deck handlers, real licensed music decodes/plays, actual mixer capture and control automation exported. Master-level exercise uses the same graph. No claim of acoustic latency or MIDI hardware validation. |
| G3 — Guided crossfade | **PARTIAL** | Real-browser automated keyboard fade, wrong actions, demo exclusion and server check persistence pass. Owner now starts Deck A; human completion of the fade not confirmed. |
| G4 — Free Jam | **PASS** | Real playback advances after a check while task index stays unchanged; next step only on Continue. Paused coaching and practice mode do not grade or impose timers. |
| G5 — Curriculum | **PARTIAL** | Valid manifests for two exercises and introductory challenge; six-stage map. Upper-stage/mini-set/venue end assessments and required transport/recording support remain unfinished. |
| G6 — Audio | **PARTIAL** | Licensed playable assets, hash/loudness/peak checks and real captured WAVs; no measured clipping. Recorder reports one clock discontinuity in each browser; phase/phrase/key annotations and human enjoyment are unverified. |
| G7 — Accessibility | **PASS** | Keyboard-driven intro in Chromium/WebKit, zero automated WCAG A/AA violations on landing/lesson, visible focus, textual hints, reduced-motion setting and three viewport widths. Screen-reader/physical disability studies NOT RUN. |
| G8 — Identity/progress | **PASS** | Guest intro; actual Better Auth/local PG session; paid API checks; prerequisites; ownership, replay, expiration, reload, bounded history, export/delete and refund denial. Current audio is never falsely restored on reload. Client tampering cannot mint purchases, but hostile-client telemetry is not cryptographically trustworthy. |
| G9 — Commerce sandbox | **PARTIAL** | SDK HMAC + signed HTTP fixtures, isolated PG transactions, parallel duplicates, wrong price/mode/user, unpaid events, refund before grant, dispute status, repurchase and zero credit-lot mutation. Actual Stripe-hosted Checkout/provider transaction NOT RUN: credentials/catalog absent. |
| G10 — Human learning | **NOT RUN** | Required five novices and three beginner mini-set completers not recruited. Owner preparation initially FAIL; revised preparation/start PASS. No full-lesson or enjoyment judgment. |
| G11 — Business safety | **PARTIAL** | No AI/GPU calls in lessons; separate pass; bounded persistence; positive explicit reserve model ($40.29). Actual merchant/tax/support/hosting/lifetime contribution not validated. |
| G12 — Release | **NOT RUN** | Full course, physical reliability, genuine payment sandbox, production setup, public launch and owner approvals incomplete. Existing AI musical-quality **FAIL**, paid generation remains closed. |

Offline browser evidence is deliberately specific: Chromium passes actual
Playwright offline mode; WebKit fails that navigation with an internal error,
then passes cached lesson/audio after the **actual origin server is stopped**.
This matches the reported [Playwright WebKit offline-navigation issue](https://github.com/microsoft/playwright/issues/42775);
[Playwright documents service-worker testing support for Chromium](https://playwright.dev/docs/service-workers).
It is not a physical Safari/OS network-off claim. The failed run is preserved as
`webkit-offline-emulation-failure.log`.

## Exact checks and reproduction

Use Node 22 (tested 22.23.1), project dependencies, the pinned existing Emscripten
6.0.1 SDK and current FFmpeg for asset reproduction. Python 3.15.0 was used for
measurements. `toolchain.json` records host/browser versions. Existing project
environments were reused; `~/mlx-env` was not modified.

From the root:

```sh
npm run build
node --test apps/web/tests/*.test.js
ctest --test-dir build-product --output-on-failure
python3 scripts/prepare_academy_audio.py
python3 scripts/measure_academy_capture.py
```

From `apps/site`, use a **disposable loopback Postgres base URL** via
`JAMLOOM_TEST_DATABASE_URL`; tests assert `127.0.0.1` before creating databases.
Do not substitute hosted Neon. For the existing full site suite, set its documented
loopback `DATABASE_URL`, local `BETTER_AUTH_URL` and local email outbox as well.
No real email or provider API should be reachable in this test environment.

```sh
npm run typecheck
npm run test:academy
npm run test:academy-browser
node --import tsx --test tests/*.test.ts
npm run audit:bundle
node --import tsx tests/product-http.mjs
JAMLOOM_TEST_URL=http://127.0.0.1:4224 node tests/product-browser.mjs
```

The Academy browser test creates an isolated DB and production Next server on
4223, then shuts them down. It tests real Better Auth and real audio; Stripe
catalog/payment responses in unit tests are explicitly fixtures. Browser-generated
purchases are explicitly seeded local sandbox receipts, never live transactions.
The persistent owner preview is separate at **http://127.0.0.1:4224/academy**, using
loopback `jamloom_academy_preview`; it sends no real emails. Existing 4220 preview
was preserved. Browser tests retain audio in `build-academy/` and sanitized reports
under `docs/evidence/academy/`. Prior full-product evidence was preserved, with
new regression output copied under Academy evidence where it differed.

No Context7 tool was available in this session; library-specific documentation
was checked through official Stripe/Playwright sources instead. Stripe design
references: [fulfillment](https://docs.stripe.com/checkout/fulfillment),
[Checkout sessions](https://docs.stripe.com/api/checkout/sessions/create),
[refunds](https://docs.stripe.com/refunds).

## Remaining work / deterministic next steps

1. Reproduce `test:academy-browser`, inspect the retained clock discontinuity and
   compare timestamp diagnostics against PCM with a working dedicated probe.
   Measure physical-output latency and interruptions separately.
2. Collect first-fade/enjoyment feedback; run `ACADEMY_NOVICE_STUDY.md`. Preserve
   failures and re-test onboarding changes. Do not infer success from unit tests.
3. Obtain or annotate more cleared, enjoyable, phase/phrase/key-ground-truthed
   teaching music/stems. Implement shared-frame A/B transport and continuous pitch,
   beat loops/jumps and longer bounded recording before upper-level assessments.
4. Author/evaluate the remaining curriculum and beginner mini-set. Do not relabel
   the introductory fade as the requested multi-minute or venue assessment.
5. Follow the Academy section of `OWNER_HANDBOOK.md` for genuine sandbox catalog,
   webhook, tax/refund/purchaser policy and controlled provider tests. The backend
   can be exercised locally while those settings are absent.
6. Rehearse Neon migration, offline eviction/update recovery, full course and
   release monitoring; obtain explicit production approval before deployment or charges.

Implementation and retained evidence commit: **0162db9** (`feat(academy): add
real-deck introduction, progress and sandbox pass`). A subsequent documentation
checkpoint records this hash. No push or deployment was performed.

Final source whitespace check passes when excluding the unchanged owner addendum
and raw terminal logs. The unrestricted check reports existing Markdown hard-break
spaces in that supplied addendum and raw build/typecheck output whitespace; those
inputs are retained verbatim rather than rewriting the specification or test output.

This report does not claim that the entire Academy specification or professional
DJ course is complete.
