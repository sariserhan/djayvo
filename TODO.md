## Expanded Pro console and Academy acceptance — 2026-10-23

- [x] **PRO-009 — PASS, local implementation and software verification:** Basic retains its controls; the requested playback-permission prompt is removed from Basic/Pro/Academy. Pro gains a distinct digital console, stacked real waveforms, eight cues per deck, four pad modes, fractional loops/rolls/jumps, manual grids, loop editing, slip reverse, tempo-linked echo and channel meters. Saved sets retain the new settings and read older scenes without dropping hidden cues. Chromium/WebKit playback, recovery, accessibility, responsive/fullscreen and Academy smoke checks; 151 web unit tests, Mac app checks, TypeScript and bundle preparation pass. Two recording timestamp anomalies were correctly rejected; the final isolated Mac run passes, and both failures are retained in evidence; physical qualification and publication of this expansion are NOT RUN. [Report](docs/pro-deck-expansion.md).
- [x] **ACA-ACCEPT — PASS, owner product acceptance:** “I accept academy.” Recorded independently from unmeasured human learning, accessibility and physical-device checks. [Receipt](docs/evidence/academy-release/owner-product-acceptance.json).

## Public Performance Studio — 2026-10-23

- [x] **STUDIO-ACCESS — PASS, local:** Full console visible without purchase; free Basic accepts personal tracks, Pro demo uses verified practice music, paid Pro unlocks personal sources and partner music. Direct Open Studio navigation, persistent mode choice, safe switching, sample-pad/phrase demonstrations and offline demo fallback implemented. PASS: Chromium/WebKit desktop/mobile flows, accessibility, real Chromium offline Basic/demo, 21 focused unit/site/PostgreSQL checks, TypeScript and audited bundle. Paid browser state uses fixtures; fresh Stripe delivery, desktop repackaging and website deployment NOT RUN. [Report](docs/studio-access.md).

## Richer Music DNA sound profiles — 2026-10-23

- [x] **DNA-029 — PASS technical completion qualification:** Safer whole-playlist matching (86/182 exact matches; 95 explicit review entries, one repeat), large request/result limits, worker packaging and exact owner-reviewed jazz verdict are implemented. PASS: 59 site tests, TypeScript, 67 Python tests, desktop/mobile/browser checks, real local 140-second song/credits/privacy, published Linux worker and two real CUDA songs (140/100 seconds, different approved identities). Public R2 samples verified; one-worker trial shut down and cleaned up in 9m36s, conservative cost bound $0.62 against $3 approval (provider billing pending). Local voice pool enabled. Website/ongoing paid service, Spotify and paid SoundCloud deferred; owner listening PASS for “Rise from the Ashes” (heavy rock and natural throughout). Broader classifier calibration and listening for the two hosted samples remain explicit limitations. [Report](docs/music-dna-completion.md).

- [x] **DNA-028 — PASS, implementation/regressions/local model planning; NOT RUN, release/listening:** Every identified favorite gets a confidence-aware sound interpretation. Compatible groups guide composition and singer captions, with enforced tempo bounds and explicit unknown/failure handling. Saved owner-private descriptions are reused across local/hosted requests with model/version/genre binding; existing database storage is sufficient. Actual model: ten named songs described, twenty unknown controls preserved; two validated takes reused all 30 profiles and selected different sound groups. 57 Python tests, 30 site integration/process tests and TypeScript pass. No new audio, paid compute or publication. [Report](docs/music-dna-sound-profiles.md).

## Full public listening collection — 2026-10-23

- [x] **DNA-027 — PASS, local implementation/database; PARTIAL, catalogue coverage; NOT RUN, release/audio:** One-click whole YouTube playlist import follows every page, automatically matches songs, reports progress/provider waits/unmatched entries, and preserves favorites on cancellation/failure. Up to 5,000 favorites now persist and reach composition; genre totals and batched language evidence use the full matched list. Songwriting uses 12 bounded examples with full-list constraints. Real 182-entry scan: 77 unique matches, one repeat, 104 unmatched. Real 30-favorite local model plan passes; browser, API, PostgreSQL and worker tests pass. Reviewed production migration 0020 applied after backup/restore rehearsal. Publish the updated worker before website deployment; existing generation/credit switches remain disabled. No paid compute or new audio render. [Report](docs/whole-playlist-taste.md).

- [x] **DNA-026 — PASS, local:** Renamed the single Music DNA gallery to “Made with Music DNA.” Updated browser selectors; Chromium confirms exactly one gallery with the new heading and loaded songs. Website deployment NOT RUN.

- [x] **DNA-025 — PASS, local:** Removed the duplicate “Made with Music DNA” examples section from `/music-dna`; “Listen to all songs” remains the main listening collection. Updated affected browser checks. Chromium/WebKit verify the duplicate is absent, remaining R2 playback/seek/download checks pass, and layouts fit 1280/390/320px without page errors. No storage changes; website deployment NOT RUN. See `docs/progress.md`.

- [x] **DNA-024 — PASS, local:** Homepage Music DNA chapter now replaces its screenshot with four playable original songs in a 2×2 grid, labelled “Made with Music DNA.” Back/Next cycles the public Music DNA samples and stops the previous audio. Full DNA showcases and the DNA community list are removed from the homepage; full-collection links lead to `/music-dna#public-songs`. Other product sections stay intact. Chromium/WebKit checks pass for all 98 preview samples, back/next, real muted playback, single-player behavior, load-error recovery, full-collection navigation, accessibility and layouts down to 320px. TypeScript PASS. Website deployment NOT RUN. See `docs/progress.md`.

- [x] **DNA-023 — PASS, local:** Listening collection on homepage, Music DNA and `/listening` now uses six rows per page, with Previous/Next and page counts above and below the grid. Responsive columns give 18/12/6 songs at desktop/tablet/mobile test widths. Earlier examples use the same paging. Filters and column changes reset to page 1; all 154 song IDs are reachable exactly once. Chromium desktop/tablet and WebKit mobile traversal, filter/reset, boundary controls, accessibility, overflow, page-error and TypeScript checks PASS. Community/account server pagination stays unchanged. Website deployment NOT RUN. See `docs/progress.md`.

- [x] **DNA-022 — PASS, local:** Homepage and Music DNA expose all 154 approved listening samples, newest first, with filters and a visible count. Six-row pagination now supersedes the initial full-list rendering (see DNA-023). Removed the 12-card showcase limit; added “Listen to all songs” jump links and placed the full collection before the nine earlier examples. Anonymous Chromium desktop/WebKit mobile checks confirm exact ID parity with the listening API, filters/reset, jump links, real R2 playback, accessibility and no horizontal overflow/page errors. TypeScript PASS. Audio remains `preload="none"`. Website deployment NOT RUN; no storage or database changes. See `docs/progress.md`.

## Variable song lengths — 2026-10-23

- [x] **DNA-021 — PASS, implementation/local validation/storage/schema:** New Music DNA songs vary from 1:40–2:20 and Improvise from 30–45 seconds, chosen once per request and preserved on retries. Duration-aware lyric prompts, worker receipts, placement/separation and storage limits are connected. 67 Python tests, TypeScript, cloud/audio/PostgreSQL regressions and actual 140/45-second Mac renders pass. Both samples verified in R2/public gallery; desktop/mobile playback passes. Production migration 0019 applied after backup/restore verification. **Release NOT RUN:** updated worker must publish before the website deploys; new endings await listening. [Report](docs/song-duration.md).

## Public song filters — 2026-10-23

- [x] **DNA-020 — PASS, local:** Language and Genre selectors, combined filtering, Clear filters and empty states across homepage, Music DNA, Improvise and listening galleries. Community filters and options cover all eligible songs before pagination, excluding private/withdrawn/unsettled songs and other products/billing environments. Nine earlier examples now include genres from their saved plans. Real PostgreSQL/API regression tests, TypeScript, Chromium desktop (1280px), WebKit mobile (390px), filter accessibility and overflow checks pass. Browser community data uses a 27-song fixture; showcase/examples use actual manifests. No migration needed; website deployment remains owner-controlled. See `apps/site/tests/dna-commerce.test.ts` and `docs/progress.md`.

## Active five-item music follow-through — 2026-10-23

- [ ] **MUSIC-FOLLOW — PARTIAL musical qualification:** Five lyric failures repaired; live YouTube selection and owner-plan research training completed (held-out loss 1.381 → 0.659, unpromoted). The owner accepts the full-song sound and revised distinct/natural singer pairs. DNA-029 now passes actual local 140-second and CUDA 140/100-second song/credit/storage flows with portable approved identities. The exact owner-reviewed German jazz verdict is honored, and the owner approves “Rise from the Ashes” as heavy rock with natural singing throughout. General classifier calibration, maximum-size uncached inference timing and listening for the two hosted samples are not yet proven. Spotify and paid SoundCloud remain owner-deferred. [Current completion evidence](docs/music-dna-completion.md); [earlier evidence](docs/song-follow-through.md).

## Local music coverage and vocal variety — 2026-10-23

- [x] **DNA-015 — PASS, listening gallery/storage:** Completed test takes are verified in R2 and listed at `/listening`, including rejected takes with clear labels. Desktop/mobile Chromium and WebKit playback, seeking and downloads pass. Website deployment remains owner-controlled. [Report](docs/music-validation.md).
- [ ] **DNA-016 — PARTIAL, broad musical coverage:** Finished local 73-case baseline: 57 completed / 16 failed; 111 takes stored in R2. All 23 Improvise styles completed. DNA baseline: 34/50 completed, 11 style rejections, five lyric-plan failures. The five lyric failures now produce full audio (ten extra takes); 35/50 requests pass the automated style screen, 15 remain flagged. One jazz rejection is explicitly contradicted by owner listening. Not every language/genre combination or fluent-language acceptance. [Evidence and limits](docs/music-validation.md).
- [ ] **DNA-017 — PARTIAL, singer variety:** Caption-only casting failed owner listening. Owner accepts the two reference-guided City Lights auditions as different, natural singers. New local DNA/Improvise plans select these pinned synthetic references and preserve them across retries. Four further auditions failed distinctness (owner hears two repeated pairs); they remain excluded. Two isolated-vocal follow-ups also failed owner distinctness despite technical/style/R2 passes. Three direct vocal-identity conversions completed on MPS and are stored in R2/gallery. Owner accepts all three as natural, with voice 1 different and voices 2/3 alike: two perceived groups, not three accepted singers. Local normal-generation conversion is implemented behind an off-by-default flag; a 120-second CLI trial now passes technically, but the owner accepts full-song sound and continuity; the whole website deadline remains unqualified. Two further female conversions sound natural but like the same singer to the owner, at the earlier settings. The revised pair with shorter references and stronger guidance is owner-approved as different, natural singers. Their approved settings are wired into the gated local candidate pool; automatic conversion remains off. Wider identity and cross-genre/language quality remain open. Hosted reference packaging/release is not enabled. [Report](docs/music-validation.md).

- [x] **DNA-018 — PASS, public song collection:** Owner approved all 135 stored test songs for public presentation, including similar voices. The collection now contains 154 songs including subsequent research takes, whose listening judgments remain separate. Homepage and Music DNA include the full R2-backed collection, language/style filters, 12-song batches, playback and downloads. Chromium desktop/WebKit mobile and TypeScript/API checks pass; website deployment remains owner-controlled. [Report](docs/music-validation.md#public-song-collection).

- [x] **DNA-019 — PASS, public service recovery:** Saved-song and catalogue reads work locally without enabling generation. Homepage Aurowall uses 72 public CDN URLs with no partner API/Pro dependency; VisitorPing makes no local requests. Desktop Chromium/mobile WebKit show no console or HTTP errors across home → Music DNA; 77 unit tests, build and client-secret audit pass. [Report](docs/public-service-recovery.md).

## Hosted songs and credits — 2026-10-23

- [x] **HOSTED-007 — PASS, migration and release preparation:** Production migration 0018 applied after verified PostgreSQL 18 backup/restore; repeat no-op. Vercel production settings, separate disabled live song-credit webhook, R2 production origins and Pro cron capability verified. Purchases/generation remain disabled; website not deployed. Standing migration authorization recorded in AGENTS.md. [Report](docs/song-finish.md).
- [x] **HOSTED-008 — PASS, hosted feedback ingestion:** Owner-consented live song plans now feed the existing local research trainer through an operator-run synchronizer; receipt checks, sandbox exclusion, withdrawal and 20-second consent expiry pass. Real collector found zero eligible ratings; demonstrated learned improvement remains NOT RUN. [Report](docs/song-finish.md#hosted-feedback-to-research-training).
- [x] **HOSTED-009 — PASS, bounded first-try startup:** A new approved $1 trial accepted the first submission without manual reconciliation, prewarming or scaling changes after submission. Verified heavy-rock song, 67.570-second execution / 227.434-second queue; workers disabled, temporary objects removed and no held credits. This is one successful startup, not a capacity guarantee. [Receipt](docs/evidence/song-validation/startup-receipt.json).


- [x] **HOSTED-005 — PASS, reliability repairs and worker publication:** Singer captions retain essential controls below 512 characters across all 25 families / 50 languages; serial audio checking, one interruption retry on existing audio, safe persistent failure reasons and full refunds. 36 Python / 71 site / 12 provider-and-Postgres checks, typecheck and bounded cloud dry run PASS. [Report](docs/song-generation-repair.md). Updated Linux worker build and both real jazz requests PASS; website not deployed.
- [ ] **HOSTED-006 — PARTIAL, jazz/Spanish resolution:** Approved $2/one-worker/four-request retest completed: both jazz requests pass 3/4 style windows; Spanish 1 is a confirmed style rejection, Spanish 2 was cancelled at bounded shutdown without a musical result. Full refunds, zero held credits, disabled workers and temporary-object cleanup PASS. New-image startup needed verified reconciliation; harness now prewarms. The earlier two reported Latin experiments were duplicate audio, corrected in the new report. Two genuinely distinct follow-up seeds also failed the unchanged screen and were not promoted. Final hourly billing remains pending on both provider APIs. Human vocal-genre calibration/listening remain NOT RUN and deferred. [Report and receipts](docs/song-generation-repair.md).
- [x] **HOSTED-001 — PASS, implementation/local and provider integration:** Durable Music DNA / Improvise queue, verified R2 completion, account recovery, cancellation across lost responses/refresh, private/public playback and homepage feed. 71 site, 33 database, 21 Python tests, Chromium/WebKit, real R2 browser checks, typecheck, build/bundle PASS. Migration 0018 now PASS under HOSTED-007; website deployment NOT RUN. [Report](docs/hosted-songs.md).
- [x] **HOSTED-002 — PASS, Stripe TEST and ledger:** Real hosted credit Checkout, decline, signed/duplicate webhooks, owner isolation and refund holds; six real cloud completions settled once and two failures refunded fully. Owner selected tax category `txcd_10000000`; configured locally and in deployment reference. Live credit purchases remain disabled. [Evidence](docs/evidence/hosted-songs/stripe-test.json).
- [x] **HOSTED-003 — PASS, bounded load/cost evidence:** Approved $3/two-worker/20-minute trial finished; eight final requests, six successful, two failed, zero held credits, workers stopped and staging cleaned. Successful execution 45–70 seconds; burst queue delay 53–348 seconds. The final 06:00 provider bucket now reports $0.24520468 / 581.063 billed seconds including preparation; this is endpoint-hour cost, not a per-song bill. Broad production capacity remains unproven. [Latest billing receipt](docs/evidence/song-generation-repair/trial-result.json).
- [ ] **HOSTED-004 — PARTIAL, quality:** Rock/Turkish/Russian DNA and funk/reggae/jazz Improvise completed technically. Original jazz/Spanish DNA failed; the published repair passes both cloud jazz requests. Spanish reliability remains unresolved after one style rejection and one bounded cancellation. Improvise edits preserve the rest of the song; listening/native-language acceptance NOT RUN. Hosted feedback ingestion now passes; no eligible live ratings exist to demonstrate learning. An eleven-sample calibration/listening packet is prepared; listening remains deferred. [Quality and release boundaries](docs/hosted-songs.md).

- [x] **GENERATION-UI-001 — PASS, local:** Shared visual generation display for Music DNA and the existing Improvise web remix. Plain-language queue, preparation, creation, checking, saving, reconnection and terminal states; real queued status remains pending after refresh. Python phases and owner-only queued responses are connected. Chromium/WebKit at 1280/390/320, accessibility/reduced motion, real local remix, 70 site / 144 web / 12 Python tests, typecheck, build and bundle audit PASS. Hosted dispatch and deployment remain NOT RUN. [Verification](docs/runpod-setup.md#generation-progress-display--2026-10-23).

- [x] **RUNPOD-001 — PASS, technical setup:** Published pinned worker, authenticated endpoint, real Music DNA and Improvise inference, signed R2 delivery/checksums and shutdown verified. Endpoint remains disabled. Cold starts 3–5 minutes; successful execution 46–48 seconds. Jazz style-check failure remains unresolved; listening, broader genres, final cost/load validation and website dispatch/billing are still open. [Report](docs/runpod-setup.md).
- [x] **STORAGE-001 — PASS, implementation/local validation and real R2 examples:** Product/visibility object paths, backward-compatible library reads, Music DNA durable audio receipts before completion/charging, owner/public cloud playback and withdrawal. All nine curated songs uploaded to R2 and verified; Chromium/WebKit playback with the singer disabled, 66 unit tests and 31 database/library checks pass. [Report/evidence](docs/product-music-storage.md). Production migrations 0013, 0015, 0016 and 0017 PASS: 17 matching ledger entries, schema verified, repeat apply no-op. [Production receipt](docs/evidence/product-music-storage/migration-verification.json). Deployment and hosted generation remain NOT RUN.

- [x] **DNA-014 — PASS, local:** Simplified the Music DNA page itself with compact favorite rows, a visual song panel, genre tags, optional language, and examples before account/community collections. Preserved search, saved-list tools, feedback, playback and credit/privacy confirmation. Desktop/mobile Chromium/WebKit, accessibility, 62 tests and build/bundle pass. [Report/evidence](docs/music-dna-visual.md). No deployment or new generation/quality claim.

- [x] **VISUAL-001 — PASS, local:** Homepage opens with five clear actions and switching product previews, including a real favorites-to-song example. Shared descriptions are 64% shorter; optional detail preserves features and availability. Simplified all five product entry pages and coming-soon discovery. Chromium/WebKit at 1280/390/320, existing generation/search regressions, 62 tests, build/bundle pass. [Report/evidence](docs/visual-product-entry.md). Deployment and real visitor studies NOT RUN.

- [x] **DNA-013 — PASS, local:** Credit/public/private choices now open after Make my music, with explicit confirmation, safe cancellation and keyboard focus return. Homepage includes all nine examples plus a refreshed public DNA feed alongside the existing reviewed studio catalogue. Chromium/WebKit dialog/playback/privacy checks, 62 site tests, 13 catalogue tests and build/bundle pass. [Report](docs/music-dna-homepage.md). Hosted release remains DNA-012.

- [x] **DNA-011 — PASS, local:** Nine permanent listening examples, Your songs / Community songs, owner-approved starting prices of 1 public / 2 private credits, explicit sharing permission, atomic reservations, idempotent settlement, failure refunds, owner-only private playback and public withdrawal. Real Postgres and Chromium/WebKit checks pass; paid/hosted generation remains closed. [Report and evidence](docs/music-dna-sharing-credits.md).
- [ ] **DNA-012 — NOT RUN, release:** Deploy the authenticated hosted singer/job service, validate real provider costs and credit purchases, apply reviewed migrations and publish approved examples through the release process. Local credit rehearsal is not production billing. Broader musical acceptance remains DNA-007. [Boundaries](docs/music-dna-sharing-credits.md).

- [x] **DNA-010 — PASS, local:** One song per click; weighted favorite-language selection, gentle country boost only among languages already in mixed lists, explicit-language override, country-only retention and graceful lookup failure. English-only lists stay English regardless of country. 20 Python/62 site tests, build/bundle audit and real mixed/English-only planner checks pass. Browser evidence and limits: [report](docs/music-dna-expanded.md#one-song-weighted-language-and-approximate-country--2026-10-22). No new audio acceptance or deployment.
- [x] **DNA-009 — PASS, local implementation and technical evaluation:** 25 genre families, 50 language settings, musical traits/lyric repair, consented feedback/personalization and local research training pipeline. 61 site tests, 26 Python tests, build, 26 real plans, six multilingual renders and Chromium/WebKit checks pass. Actual feedback learning, broad listening and public release remain open under DNA-007. [Report/evidence](docs/music-dna-expanded.md).
- [x] **DNA-008 — PASS, local matching and regression checks:** Immutable favorite snapshots, shared musical direction, separate current/earlier/example songs, bound audio-style reports and one bounded performance retry. 59 site tests, 18 Python tests, build, real website generation, Chromium/WebKit playback/download and recovery pass. Owner approved the corrected example; audio screening calibration, broader listening and hosted release stay open. [Report/evidence](docs/music-dna-fit.md).
- [x] **DNA-006 — PASS, local technical workflow:** Favorites-only full vocal songs using the existing local singer and lyric planner; per-reference interpretation, developed lyrics, two-minute renders, private local job/recovery/cancellation and listening page. Two real songs, actual website generation, Chromium/WebKit and scoped tests pass. [Report/evidence](docs/music-dna-songs.md).
- [ ] **DNA-007 — PARTIAL, musical product acceptance:** Owner rejected instrumental quality and the mismatch between displayed rock/metal DNA and earlier soft vocal examples. Owner approved the corrected flow/example on 2026-10-22. Broader favorite-list listening, multilingual vocal/lyric quality and demonstrated improvement from real consented feedback remain open. The expanded training queue currently has no eligible user ratings. Hosted model/job release remains NOT RUN; local implementation is not production promotion. [Corrected sample and remaining gates](docs/music-dna-fit.md).

## Music DNA favorite-song workflow — 2026-10-22

- [x] **DNA-005 — PASS, local technical workflow:** Favorites-only input with automatic metadata-based composition settings; no manual musical questionnaire. Local/account metadata persistence, exact-name resolution, graceful unknowns and real WAV verification. [Evidence](docs/music-dna-favorites.md#automatic-favorites-only-composition--2026-10-22). Genre inference is not acoustic analysis or listening acceptance.

- [x] **DNA-004 — PASS, local live-provider and browser verification:** Live iTunes artist/song suggestions beyond the practice catalogue; debounced lookups, cached results, input/output validation, timeout/rate limits, accessible loading/error fallback and privacy disclosure. [Evidence](docs/music-dna-favorites.md#live-artist-and-song-search--2026-10-22). Deployment and scaled provider capacity are separate.

- [x] **DNA-003 — PASS, local:** Search-as-you-type dropdown replaces the blank text area, with ranked artist/track suggestions, typo/accent handling, keyboard selection, custom names and removal. Existing catalogue/saved favorites only; no global streaming search. [Evidence](docs/music-dna-favorites.md#searchable-favorite-picker--2026-10-22).

- [x] **DNA-001 — PASS, implementation and scoped technical checks:** User-confirmed favorite-song aspects and importance now apply to real composer controls; cleared catalogue previews, add-to-favorites and external listening-search links; local/account persistence and native profile compatibility. [Implementation, tests and limits](docs/music-dna-favorites.md).
- [ ] **DNA-002 — PARTIAL:** Musical acceptance and production generation remain open. Automatic external playlist imports/audio analysis are not implemented; provider and rights approval depend on the specific source and use. Current focus is Music DNA; Basic/Pro acceptance remains closed.

## Current product decision and remaining scope — 2026-10-22

- [x] **PRO-008 — PASS, owner product acceptance:** Owner says “okay lets consider this product finished and move on”. Basic / Live DJ and Pro v1 are complete for the accepted scope and tested setup. Existing release and Stripe test evidence stands; no new hardware result is inferred. PRO-006 and LIVE-DUAL-004 are deferred post-release qualification, not blockers to moving on. [Release and acceptance](docs/pro-v1-release.md).

This is the current roadmap; older dated checkpoints below retain historical results and may describe work completed by later entries. Overall Jamloom specification status remains **PARTIAL**.

| Order | Product / workstream | Current state and remaining work |
|---|---|---|
| 1 | Music DNA | **PARTIAL.** Favorites-driven vocal songs, weighted languages, feedback, nine examples, owner/community collections and local public/private credit reservations are implemented. Broader musical acceptance and hosted paid generation remain open. [Current implementation](docs/music-dna-sharing-credits.md) |
| 2 | AI Improvisation / musician | **PARTIAL.** Natural singers, 23 styles and variable same-song source edits exist locally; two A/B examples are accepted. Next: evaluate automatic phrase placement, meaningful sung responses and variety across recordings/styles, then fix observed failures. Broad quality, independent evaluation and production integration remain open. Research adapters have not demonstrated an audible benefit; expert action-training data remains missing. [Current arrangement evidence](docs/arrangement-variety.md) |
| 3 | DJ Academy | **PASS, owner product acceptance (2026-10-23).** Owner: “I accept academy.” All 20 lessons / six stages, progression, recording and sandbox billing are implemented. Manual accessibility and physical checks remain unmeasured; commercial activation belongs to launch operations. [Release evidence](docs/academy-release-checks.md) |
| 4 | iOS | **PARTIAL, deferred until other product work.** Local parity exists; finish actual-device and Apple purchase/distribution qualification. [Parity report](docs/ios-product-parity.md) |
| 5 | Remaining launch operations | **NOT RUN / PARTIAL, last.** Production AI/model and provider delivery, finalized costs and recovery, remaining storage/lifecycle operations, community publication/moderation, other product sales and release acceptance. Basic/Pro release is already complete. [Full product scope](apps/site/jamloom_full_product_implementation_spec_v1.md), [worker evidence](docs/non-ios-finish.md) |

This status decision does not spend on compute, promote production AI or perform a general launch. Deferred listening stays deferred; technical preparation can continue locally.

## Pro v1 completion — 2026-10-22

- [x] **PRO-007 — PASS, Stripe test recheck:** Owner-requested fresh hosted Checkout run: $49 test payment, decline, signed/duplicate callbacks, license access, full $49 refund and cached-access revocation. No live funds or production configuration changes. [Evidence](docs/evidence/pro-v1/stripe-retest-20261022.json).
- [x] **PRO-004 — PASS:** Approved $49 one-time Pro v1; verified checkout/refunds, signed Mac activation, web offline entitlement, sampler control replay and notarized 1.0.0 candidate. [Report](docs/pro-v1-release.md).
- [x] **PRO-005 — PASS, technical release checks:** Public signed 1.0.0 installer/feed, actual 0.1.0 upgrade, hosted CI/deployment, production access/catalogue, installed-app Aurowall PCM, owner LG listening and a 3603-second isolated endurance rerun. Approved $49 one-time production sales enabled; stable release and deployment confirmed in the [release report](docs/pro-v1-release.md).
- [ ] **PRO-006 — PARTIAL, deferred post-release qualification (not a v1 completion blocker):** No physical MIDI controller or separate headphone output available; cable-unplug recovery remains deferred. Native virtual MIDI passes. No real-money payment was made. Initial interrupted endurance attempt retained, cause unknown.

## Basic and Pro editions — 2026-10-22

- [x] **PRO-001 — PASS, local:** Existing companion stays Basic/free; shared web/Mac professional console, physical-style jogs/rotary controls/faders, eight sample pads/four banks, full existing Performance Studio, native Settings and isolated update integration. [Report](docs/jamloom-pro.md).
- [x] **PRO-002 — PASS, local validation:** 142 unit checks, full Chromium/WebKit DJ regressions, five-width/accessibility checks, real desktop playback/recording/relaunch, site build/download boundaries and Basic Swift checks. Real Aurowall catalogue/storage playback passes through the local backend with muted output. [Evidence](docs/evidence/jamloom-pro/).
- [x] **PRO-003 — PASS, superseded preview release:** The initial 0.1.0 packaging milestone is completed by Pro v1 above. Physical limits remain in PRO-006; [preview evidence](docs/jamloom-pro.md) is historical.

## Companion distribution — 2026-10-22

- [x] **LIVE-RELEASE-001 — PASS:** App icon, native Settings, signed Sparkle updates with audio-session protection; native/browser/site checks. [Report](docs/live-companion-release.md).
- [x] **LIVE-RELEASE-002 — PASS:** Apple notarization/stapling, published GitHub installer and signed feed, anonymous live website download, fresh-download Gatekeeper and actual in-app upgrade/relaunch verified. [Evidence](docs/live-companion-release.md). The app is installed in Applications. Physical unplug remains deferred; other product launch gates remain closed.

# Jamloom development tracker

## Live DJ completion work — 2026-10-22

- [x] **LIVE-DUAL-001 — PASS, local:** Two independent native sources and paired web decks, rotating/draggable platters, bounded reverse/scratch/loops, expanded FX, channel mute, master/crossfader and Return to live. C++/sanitizers, native model/protocol/HTTP, Chromium/WebKit gesture/control/responsive/axe, build/typecheck/audit and local app launch pass. [Report](docs/live-dual-decks.md).
- [x] **LIVE-DUAL-002 — PASS, tested setup and owner acceptance:** Real two-source routing to LG Ultra HD and four-second MacBook Air microphone sampling PASS in a 60-second controlled test. Version 0.3.0/protocol 2 and matching local website are ready. Owner accepted the louder CC0 music check as audible and clean; recovery checks pass. The real 60-minute two-source run also passes; release and owner product acceptance are now complete under LIVE-RELEASE-002 / PRO-008. [Historical test report](docs/live-dj-finish.md).
- [x] **LIVE-DUAL-003 — PASS, implementation and scoped hardware:** Integrated consented four-second microphone sampler; explicit A/B trigger, stop/retrigger/clear through native FX/mute/limiter/output, no live monitoring, disk recording or upload; revoked/late permission and concurrent clear/reload tests pass. Actual MacBook Air microphone capture and Deck B playback/clear pass. [Evidence](docs/live-dj-finish.md).
- [ ] **LIVE-DUAL-004 — PARTIAL, deferred post-release qualification (not a completion blocker):** Physical checks resumed with owner-authorized LG speakers, MacBook Air microphone and agent-selected generated sources. One-minute controls/sampling and 100-second CC0 music/recovery PASS; owner reports normal playback audible and clean. Independent restart, Panic, source exit, silent-source rejection and heartbeat-loss stop pass; actual capture-only wake assertions release on stop. Actual idle sleep stopped both routes without resuming capture; interrupted endurance is retained and the fresh 3,600.01-second run passed with zero reported timing faults and bounded memory. Physical cable unplug is explicitly deferred by the owner. Calibrated round-trip latency, rate-change qualification and broad accompaniment fit remain open. [Evidence](docs/live-dj-finish.md).
- [x] **LIVE-DUAL-005 — PASS, distribution superseded by LIVE-RELEASE-002:** Public 0.4.0 replaces the earlier 0.3.0 candidate; notarization, fresh-download Gatekeeper and actual signed update/relaunch pass. [Release evidence](docs/live-companion-release.md). Earlier hosted-pairing/physical qualification limits are not relabeled by distribution or owner acceptance.


## Live DJ deck and control repair — 2026-10-22

- [x] **LIVE-DECK-001 — PASS, local:** Native and paired-web deck layouts; direct native control application, visible bypass with effect-edit recovery, stale website status protection. Swift, per-effect generated PCM plus sanitizers, real native HTTP/Chromium/WebKit, responsive/axe, site build/typecheck/audit and packaged launch pass. [Report](docs/live-deck.md).
- [x] **LIVE-DECK-002 — PASS, scoped owner feedback:** “now they are working” accepts the previous native/web control repair in the owner’s setup. This does not certify other routes or the new dual-deck implementation. Public distribution/deployment NOT RUN for these updates.

## Visual hero — 2026-10-22

- [x] **MKT-HERO-001 — PASS, local:** Shorten the homepage and coming-soon hero, lead with the real deck preview, and keep five-product discovery compact. Preserve the playable deck in its product section. Typecheck, five metadata/launch tests, Chromium/WebKit at four widths, keyboard navigation, muted playback and accessibility pass. [Report](docs/hero-simplicity.md). Deployment NOT RUN.

## Academy CI migration expectations — 2026-10-22

- [x] **CI-MIGRATIONS-001 — PASS, local:** Reproduce `13 !== 12` and replace stale migration counts in admin, wallet and account tests with exact sorted SQL filenames. All 184 relevant tests, studio preparation and typecheck pass on Node 22/PostgreSQL 16. Migration idempotence, rollback/checksum protection and the duration upgrade regression remain covered. [Commands and results](docs/progress.md#academy-ci-migration-expectations--2026-10-22). GitHub Actions rerun NOT RUN; no push or deployment.

## Full product landing page — 2026-10-22

- [x] **MKT-PRODUCTS-001 — PASS, local:** Give DJ Academy, controller-free DJ Studio, AI Improvisation, Music DNA and Live DJ their own sections on the main and coming-soon pages. Add actual product screenshots to every section and keep the main-page DJ deck playable. Align navigation, metadata/social image, availability and Live DJ capture limits. Typecheck, five launch/metadata tests, Chromium/WebKit at 1440/820/390/320 px, section navigation, linked routes, image decoding, muted deck playback and accessibility pass. Coming-soon browser rendering uses the actual response HTML; gate behavior is covered by unit checks. Deployment NOT RUN. [Homepage](apps/site/app/page.tsx), [shared descriptions](apps/site/lib/home-products.ts).

## Headphones panel layout — 2026-10-22

- [x] **STUDIO-CSS-001 — PASS, local:** Group output selectors, test actions, routing confirmation, deck previews and level controls using existing studio styles. Fix long device-name overflow in WebKit. Chromium/WebKit checks pass at 1440/820/390/320 px, plus fullscreen, keyboard disclosure, refresh/test/disconnect feedback and zero scoped accessibility violations. Existing control IDs preserved; audited studio/offline bundle rebuilt. Physical routing and deployment NOT RUN. Sources: [markup](apps/web/dj.html), [styles](apps/web/dj.css).

## Same-song call edits — 2026-10-22

- [x] **CALL-001 — PASS, local implementation/evidence:** Two original-song candidates, intact short source crop, fixed singer timing, exact PCM outside 1.96 / 2.4-second changes, common-gain comparisons and passage-jump players. Nineteen scoped tests and Chromium/WebKit checks pass. Two regenerated repair trials failed the overlap check and are excluded. [Report](docs/local-call-edit.md).
- [x] **CALL-002 — PASS, scoped owner listening:** Owner says both A/B examples are acceptable. [Exact feedback and audio hashes](docs/evidence/local-call-edit/owner-listening.json). This accepts these two examples, not broad automatic quality.
- [x] **CALL-003 — PASS, local implementation:** Automatic A/B choices, varied pause-bounded source excerpts and entrances, bounded private recent-history penalties, no forced alternation, preserved original music outside the edit and honest no-fit fallback. [Report and checks](docs/arrangement-variety.md).
- [ ] **CALL-004 — PARTIAL:** Musical acceptance across automatically selected phrases, songs and styles, including estimated vocal-subtraction artifacts and semantic fit. The earlier source-led candidate remains FAIL; production model/quality gates stay open.

## Source-led conversation study — 2026-10-22

- [x] **SOURCE-001 — PASS, local prototype:** One new reggae performance starts from an actual user-audio guide, generates backing and singer locally, and schedules separate original-voice calls and estimated complete singer replies. Source PCM and zero scheduled overlap checks pass. First missing-answer pass is retained as FAIL; the second candidate was subsequently rejected by the owner for poor musical quality. Earlier comparisons are restored on the private listening page. [Report and evidence](docs/source-led-response.md).
- [ ] **SOURCE-002 — FAIL, owner listening:** “this new way musical is bad.” The source-led candidate is rejected as a musical improvement. [Exact feedback](docs/evidence/source-led-response/owner-listening.json). Complete lyric fidelity, reliable automatic phrase choice and broader styles remain unproven. This study does not change the 23-style studio default or close TRAIN-007.

## Musician training request — 2026-10-21

- [x] **MEANING-001 — PASS, local implementation:** Owner makes the original audio optional; meaning may inspire a song with no sample. Accept short/long/quiet recordings within explicit local resource limits, understand speech locally when no idea is supplied, preserve originals and completed songs, and omit audio creatively. Acoustic listening example is now sample-free. [Report and evidence](docs/meaning-singer.md). Musical acceptance and transcription accuracy remain open.

- [x] **STUDIO-INPUT-001 — PASS, local input repair:** Fixed the 5.001-second decode versus 5.000-second validation mismatch. Both retained failed recordings now pass after trimming edge quiet; originals preserved. Precise input errors and stage-specific generation failures replace the misleading catch-all. [Report and evidence](docs/studio-input-fix.md).

- [ ] **TRAIN-007 — PARTIAL:** Owner likes the generated singers but reports the repeated sample arrangement makes the music worse (**FAIL**, owner listening). Replaced it with one whole phrase or pause-bounded excerpt in a detected vocal gap, preserving the original song; explicit unchanged fallback if nothing fits. Nine tests, six actual comparisons and browser checks are recorded in the [replacement report](docs/gentle-singer.md). New-arrangement acceptance, formal quality, generalization and production promotion remain open.

- [x] **SAMPLE-001 — PASS, local implementation:** Conservative sample placement, byte-exact music preservation and truthful no-placement status. Same-song comparison: three whole phrases, one shorter excerpt and two unchanged fallbacks. [Report and evidence](docs/gentle-singer.md); musical acceptance NOT RUN.

- [x] **STYLE-001 — PASS, local catalogue (2026-10-22):** Added EDM, DJ, Lo-fi, Jazz, Blues, Rap, Chill, Indie, Techno, Synthwave and Country: 23 styles and 46 voice/style combinations. Genre prompts and sample rhythms are wired through the existing studio; rap requests rhythmic verses and a sung hook. [Report and checks](docs/singer-styles.md). New-style audio/listening NOT RUN.

- [x] **TRAIN-006 — PASS, local voice audition:** Three new mixes using the authorized owner voice and existing epoch-10 hip-hop/funk/bass-b audio; Group 1 excluded. Six voice/music comparisons at −22 LUFS, clean-source/stem checks, deterministic rerender, eight regression tests and both-browser playback/seek PASS. Musical acceptance remains open. [Report](docs/voice-led-review.md).

- [ ] **TRAIN-005 — PARTIAL, owner listening:** Group 1 rejected as weird; groups 2–4 fine, but no clear difference between versions. Audible training benefit NOT DEMONSTRATED; no winner selected. Owner requests human voice in musical performances; current benchmark forced instrumentals. [Feedback](docs/evidence/musician-training/owner-listening.json). Formal quality and production promotion remain open.

- [x] **TRAIN-001 — PASS, preparation:** Audit actual model/data paths; prepare 48 contextual exercises for rhythm, harmony, composition, improvisation, DJ transitions, deck performance, expression and evaluation. Rehash the 16 retained Blood Club clips and both adapters. [Curriculum and evidence](docs/musician-training-curriculum.md).
- [ ] **TRAIN-002 — NOT RUN:** Admit reviewed, training-authorized expert state/action/audio demonstrations and train/evaluate a candidate on independent sessions. Known R1 export has six automated evaluation-only rows; no eligible expert corpus identified. Four additional audio references are now authorized, but have no verified action labels. The separate audio-style trial below does not close this action-learning gate; listening stays deferred.
- [x] **TRAIN-003 — PASS, local preparation:** Owner authorized f/down/question/pipe for training. Prepared 13 headroom-safe candidates (390 seconds), review sheet and exact hash-bound archive; preserved four originals. 14 tests, real WAV checks and 62 cross-file waveform comparisons pass. [Report and bounded GPU proposal](docs/musician-training-preparation.md). Content readiness PARTIAL; the subsequently approved execution is recorded in TRAIN-004.
- [x] **TRAIN-004 — PASS, research execution:** Owner-approved GPU trial completed: thirteen excerpts screened, six provisional clips across four files, 60 optimizer steps, two verified ACE-Step adapters and thirteen retrieved WAVs. All 48 artifact hashes match; 19 regression tests and local signal/diagnostic checks pass. Rental and temporary keys deleted; zero active instances, observed debit $0.0945214 (billing settlement PARTIAL). Listening, general musician improvement and production promotion NOT RUN. [Run report and evidence](docs/musician-training-run.md).

- [x] **MKT-DJ-001 — PASS, local (2026-10-21):** “Become a DJ” / “Learn to DJ” positioning across the homepage, Academy, studio, guides, coming-soon copy and SEO/social metadata. Added a beginner DJ guide and lesson/practice links. Chromium/WebKit responsive, accessibility, metadata and navigation checks, typecheck and five launch/metadata tests PASS. [Report](docs/dj-learning-marketing.md). Not deployed; rankings NOT RUN.

- [x] **UI-001 — PASS, local (2026-10-21):** Simpler Performance studio with task navigation, three-step voice response, keys/pads first, grouped advanced tools and realistic vinyl platters shared with the homepage. All 178 controls retained; Chromium/WebKit usability, playback, Academy, fullscreen and accessibility checks PASS. 137 unit tests, typecheck and audited offline preparation PASS. [Report and screenshots](docs/studio-simplicity.md). Human usability/listening/physical acceptance NOT RUN; no deployment.

- [x] **FAV-001 — PASS, local (2026-10-21):** Existing lime waveform mark exported as SVG and 16/32/48-pixel ICO, linked from the site layout and coming-soon page. Typecheck, five existing metadata/launch tests and [HTTP/format checks](docs/evidence/favicon/local-http.json) PASS. No deployment.

## Remaining specification work — 2026-10-21

Owner requests all available specification work. Local iOS implementation and checks now follow
the completed non-iOS technical batches; launch operations remain last. Listening and physical checks are explicitly deferred by the
owner; keep automation muted.
No new paid compute, live charges or publication is implied.

| ID | Workstream | Status | Next evidence |
|---|---|---|---|
| FIN-001 | Source-responsive composition recovery | PARTIAL | Five isolated matched pairs, stems and exact replay PASS; human preference NOT RUN; earlier quality FAIL retained |
| FIN-002 | Music DNA original audio | PARTIAL | Local shared-engine synthesis, 30–180 seconds, A/B variations, cancellation, exports and native/WASM identity PASS; cleared-catalogue identity/rating/inference and opt-in output preference adaptation PASS; musical acceptance remains |
| FIN-003 | Quoted generation and worker completion | PARTIAL | Exact signed quote, local worker, private results, restart recovery, actual Stripe fee contract and refund-ledger tests PASS; remote-store output staging/recovery, cancellation, cleanup retry and charge-evidence collector PASS locally; actual provider bills/execution NOT RUN |
| FIN-004 | DJ/live control and transport completion | PARTIAL | Imported beat controls, slip rolls, bounded curves and opt-in paused A/B recovery PASS; scratch/key-lock, advanced FX, full A/B/C scenes and a sample-timed note sequencer implemented; continual phrase capture/response cycles implemented; physical cue/deadlines remain unqualified |
| FIN-005 | Native Live Source integration | PARTIAL | Secure-origin fixture: Chromium pairing PASS; WebKit blocks loopback and falls back. Actual hosted capture/routing remains deferred |
| FIN-006 | Academy acceptance | PASS, owner product acceptance | Owner accepts Academy on 2026-10-23; this supplies no new measured mini-set, accessibility or physical output results |
| FIN-007 | iOS, then launch operations | PARTIAL | Native shared-engine Music DNA, wider improvisation, catalogue, account/balance/profile sync and purchase recovery implemented. Local verification below; physical and real Apple/provider qualification remain. Launch last |

[Latest iOS product parity and remaining gates](docs/ios-product-parity.md).
[Previous action replay implementation](docs/mix-action-replay.md).
[Previous capture/data follow-through](docs/r1-capture-completion.md).
[Duration and continual-phrase implementation](docs/duration-and-live-phrases.md).
Previous DJ/recovery checkpoint: `6faebff`, [report](docs/non-ios-finish.md).
Prior [completion checkpoint](docs/non-ios-completion.md) is preserved.

- [x] **FIN-008 — PASS, local:** Sixteenth-note sequencer with validated notes, sample-clock scheduling, panic/blur stop and paused scene recall.
- [x] **FIN-009 — PASS, local implementation:** Opt-in 1–15 second source / 15–60 second output contract, versioned score replay, private-storage migration and continual phrase capture with bar-aligned responses. Physical/quality qualification remains under L01/L03 and M1; see the current report.
- [x] **FIN-010 — PASS, local (`8f3027f`):** WAV-linked deck history, optional aligned float stems, saved-plan/source identity and bounded cross-split near-duplicate rejection. Existing source inventories remain readable. [Capture report](docs/r1-capture-completion.md).
- [x] **FIN-011 — PASS, local (`144e45c`):** Source/action mix reconstruction through the shared deck DSP, instrument WASM and mixer; clocked instrument takes including sequencer commands; original-hash-verified WAV/MP3/FLAC inputs; private assembler/renderer and replay receipts. Historical decoder/DSP state cannot be reconstructed exactly. [Replay report](docs/mix-action-replay.md).
- [x] **FIN-012 — PASS, local implementation and checks:** Private iOS A/B composition, wider source/output durations, catalogue preferences, actual native account/profile/ledger sync, local StoreKit acknowledgment recovery and signed sandbox refund callback. Core/sanitizer, exact simulator/WASM WAV identity, iPhone/iPad scoped UI and unsigned Release audit PASS. Real Apple/provider/device acceptance remains under FIN-007; [report and evidence](docs/ios-product-parity.md).
No push or deployment in this increment. Human checks remain deferred; the specification is not marked complete.

## Live Audio DJ — 2026-10-21

Owner authorized live-audio implementation. Deployment must happen through GitHub pushes, never direct CLI deployment. Human checks remain deferred; automation must stay muted.

| Task | Status | Evidence / next action |
|---|---|---|
| Native Mac selected-process capture, output routing and panic | PARTIAL | Implemented and packaged; Mac launch/loopback binding PASS. OS permission, actual capture, source restoration and physical routing NOT RUN |
| Native EQ/filter/echo/roll, pulse confidence and optional percussion | PASS, technical | Portable fixed-buffer DSP, reused procedural voices; PCM and ASan/UBSan bounds/filter/bypass/pulse tests PASS. Listening and hardware deadlines NOT RUN |
| Paired browser controls and existing tab fallback | PASS, local | Real native HTTP + synthetic status fixture in Chromium/WebKit; origin/token/expiry, controls/panic, lost-connection handoff, responsive/axe PASS. HTTPS owner-site pairing NOT RUN |
| Build, browser/native validation, docs and GitHub delivery | PASS | Build/typecheck/35 site tests/bundle audit, 5 Swift tests and two browser suites PASS; full CI `39680630588` PASS; runtime `94e7084` READY via GitHub push to main. [Report](docs/live-source-companion.md) |


## Hardware deck design and music curation — 2026-10-21

| Task | Status | Evidence / next action |
|---|---|---|
| Original hardware-inspired homepage and full/Academy decks | PASS | Graphite chassis, machined platters, recessed displays; shared controls and responsive layouts preserved |
| Hover/focus frame feedback, keyboard/touch and reduced motion | PASS | Chromium/WebKit real play, cue, jog, faders, fullscreen, simulated touch and reduced motion; all output muted |
| Remove religious and unrelated Aurowall categories from Jamloom | PASS | 72 music tracks retained; 22 categories excluded, old direct URLs return 404; bucket untouched |
| Browser verification and deployment | PASS | Local production build, 35 site/102 web tests, responsive/axe PASS; runtime `c308eea` deployed READY, hosted exact assets/gates and full CI `39676250203` PASS. [Report](docs/deck-hardware-and-curation.md) |

## Inline payments and Aurowall music — 2026-10-21

Owner requests payment entirely inside Jamloom and authorizes playing owned Aurowall R2 music with a partnership link. Preserve the existing sales/quality holds and private user recordings.

| ID | Task | Status | Evidence / next action |
|---|---|---|---|
| PAY-UI-001 | Embedded web checkout and inline verified confirmation | PASS | Actual Stripe test purchase/decline/refund/repurchase/disputes; no navigation, same-session reopen, signed owner-scoped receipt |
| AURO-001 | Read-only Aurowall R2 music catalogue and playback | PASS | 72 curated tracks (original integration: 94); real range/seek/playback in Chromium/WebKit, no bucket writes or exposed secrets |
| AURO-002 | Homepage/player and DJ selection, partnership link | PASS | Responsive/axe, explicit Play, partner links including coming-soon; online rights separate from CC0; existing 20-minute DJ limit shown |
| AURO-003 | Verification, deployment and documentation | PASS | `a06151f` deployed READY; full CI 39673854024, hosted public gates and permanent embedded test purchase/refund PASS. Human/live-charge checks deferred; signed-in hosted music not rerun. [Report](docs/inline-payments-aurowall.md) |

## Next.js loading and recovery — 2026-10-21

| ID | Task | Status | Evidence / remaining action |
|---|---|---|---|
| NEXT-001 | Route and client-data skeletons | PASS | Shared loading.tsx states; actual homepage/Academy delayed fetches; reduced motion |
| NEXT-002 | Custom 404, server error and global-error recovery | PASS | Actual site 404s; copied-component production fault fixture and client/server/global retry |
| NEXT-003 | Safe cache boundaries, robots and sitemap | PASS | Static/dynamic manifest, request-only admin memoization, owner/member isolation and launch-mode metadata |
| NEXT-004 | Build and browser validation | PASS | 31 unit tests, build/typecheck/bundle audit, Chromium/WebKit, responsive/axe and launch regression |
| NEXT-005 | Hosted deployment/CDN and physical accessibility | PARTIAL | Production deployment READY; manual screen reader and broad physical device checks remain. [Release checks](docs/academy-release-checks.md) |

[Implementation, commands and limits](docs/nextjs-foundations.md).

## Public coming soon — 2026-10-21

| ID | Task | Status | Evidence / remaining action |
|---|---|---|---|
| LAUNCH-001 | Coming-soon page enabled by default | PASS | Responsive branded page, real contact/support links, one existing VisitorPing script |
| LAUNCH-002 | Verified admin bypass, public routes/signup closed | PASS | Real Better Auth sessions; ordinary, unverified, suspended and forged-cookie users denied; admin deck playback works |
| LAUNCH-003 | Cache isolation, recovery routes and launch rollback | PASS | Private/no-store admin responses; support/login allowed; regular homepage regression passes with flag false |
| LAUNCH-004 | Build, checks and rendered UI | PASS | 30 unit tests, production build/typecheck/bundle audit; Chromium/WebKit, 1440/390/320 and axe |
| LAUNCH-005 | Public deployment | PASS | Production `c74ad49` deployed; coming-soon remains enabled, earlier first-lesson preview accepted; all migrations verified. [Release checks](docs/academy-release-checks.md) |

[Implementation and activation](docs/coming-soon.md).


## Visual homepage and sharing — 2026-10-21

Evidence: [implementation and boundaries](docs/visual-home-and-sharing.md).

| ID | Task | Status | Evidence / remaining action |
|---|---|---|---|
| HOME-001 | Visual homepage with working mini DJ decks | PASS | Existing mixer, real CC0 track playback/crossfade/cue/master/waveform; no autoplay |
| HOME-002 | Automatically refreshed community music | PASS | Newest eight approved tracks, real player, truthful empty state, withdrawal refresh |
| HOME-003 | New public default / private option and direct local-mix saving | PASS | Separate sharing consent, verified IndexedDB handoff, actual WASM render and API save in both browsers; legacy saves remain private |
| HOME-004 | Private creation premium of 25%, rounded up | PARTIAL | Real local ledger reservation/capture/release passes; live generation remains closed, local previews/save free |
| HOME-005 | Tests, build, mobile layout and accessibility | PASS | 88 site/DB + 80 web tests; Chromium/WebKit at 1440/390/320; production build and bundle audit |
| HOME-006 | Hosted migration/deployment and real community catalogue | PARTIAL | Migrations 0011/0012 and production deployment PASS; review permissioned community submissions remains open; no real songs published by this work |
| HOME-007 | Paid generation musical quality | FAIL | Existing owner rejection unchanged; no release override |


## Owner administration — 2026-10-21

Evidence: [implementation report](docs/admin-implementation.md), [owner setup](docs/evidence/admin/owner-account.json).

| ID | Task | Status | Evidence / remaining action |
|---|---|---|---|
| ADM-001 | Create owner account and require verified email | PASS | Public signup/reset accepted, owner confirmed email arrival; database confirms verified |
| ADM-002 | Server-authorized dashboard and user suspension | PASS | Real Better Auth + DB + Chromium/WebKit; sessions revoked, self-lockout prevented |
| ADM-003 | Credit exemption with compute cost controls | PASS | Verified owner only, no debit, caps/costs/shutdown holds retained |
| ADM-004 | Maintenance and public announcements | PASS | HTTP recovery/gating, escaped site/raw-studio banner, audit and stale-save rejection |
| ADM-005 | Contact/support inbox, branded replies and signup notifications | PASS | Actual local form/DB/outbox flow, retries/leases and mobile templates |
| ADM-006 | Test/live billing mode, isolated entitlements | PASS | Separate keys and signed fixtures; selection cannot release paid products |
| ADM-007 | Tests, build, responsive UI and accessibility | PASS | 83 site/DB + 80 web tests; production build, bundle audit, Chromium/WebKit and axe |
| ADM-008 | Hosted migration, deployment, notification delivery and scheduler | PARTIAL | Reviewed 0011 applied, deployment and authenticated five-minute retry cadence PASS; actual new notification mailbox delivery NOT RUN |
| ADM-009 | Actual payment-provider and commercial release gates | NOT RUN | No live charges; Academy release held, existing musical-quality FAIL retained |


## Academy continuation — 2026-10-21

The verified owner preview is deployed at `c74ad49` behind coming-soon; full
hosted CI passes. Owner access preserves prerequisites and creates no payment
receipt. Chromium/WebKit access, account isolation, axe and delayed-network checks
pass. Assessment sampling now begins after server attempt creation.

Permanent Aurowall test/live keys, separate catalogs and enabled webhooks are
configured. Actual hosted test purchase/refund passes with access withdrawn and
no generation-credit change. A real live non-payment event reached production;
no live charge was created. Live tax settings are active; zero active registrations
were reported, leaving merchant obligations and real payment acceptance open.
The existing notification retry endpoint runs every five minutes; authentication
and scheduled invocation pass. The empty outbox does not prove mailbox delivery.

Silent recording endurance is now **PASS for all ten local browser cases**:
Chromium and WebKit each completed 2-minute, two 5-minute, 30-minute and 60-minute
recordings, downloads, assessments and account saves. Both hour recordings stop
automatically. All ten hashes match their receipts; decoded durations agree within 0.5 seconds,
with zero unresolved timestamp gaps, no clipping and no sustained silence. The
longest quiet interval is under 4.57 ms. Full-duration final receipts report zero clock stalls;
the short Chromium cue/restart regression separately exercises three classified
stalls. All 101 web tests and full hosted CI pass at `c74ad49`.

Earlier Chromium failures remain preserved. Direct diagnostics established a
single stale worklet timestamp followed by exact catch-up; the corrected detector
separates this bounded pattern from real or unresolved gaps, which still fail.
No encoded audio is repaired. Provenance identifies each capture's server/static
revision; these are local production-build checks, not physical listening or an
exact deployed full-stack endurance test. The same runtime commit is deployed
READY, with fresh coming-soon, closed-checkout and private/no-store HTTP checks.

Human checks are explicitly deferred by the owner. The earlier first-lesson
acceptance remains qualitative; mini-set, musical judgment, manual accessibility,
physical output/cue and venue checks are not passed. Sales remain closed.
[Current release evidence](docs/academy-release-checks.md).

## Academy completion work — 2026-10-21

Owner instruction: finish Academy and update this tracker at every increment.

Owner authorized the remaining Academy implementation, automated release work,
and Aurowall test/live configuration. The original audible 30/60-minute runs were
stopped after the owner reported nonstop music. Completed reruns were silent. Owner
replaced the recruited cohort with one-owner testing, then deferred human checks.
Production migrations, backup restore, hosted CI, deployment and permanent
provider checks now pass; commercial activation remains closed. Earlier release
receipts remain preserved in [the current report](docs/academy-release-checks.md).

| ID | Increment | Status | Evidence / next check |
|---|---|---|---|
| ACA-019 | Shared-clock course transport, continuous pitch, beat loops/jumps | PASS | Four transport tests; 96 web tests; Chromium/WebKit course controls, account sync and offline playback. Native imports retain their decoder; course pitch changes key. [Report](docs/academy-completion.md) |
| ACA-020 | Bounded 60-minute private set recording and continuity measurements | PASS, technical | Both browsers completed 2/5/5/30/60-minute captures, download/account save, automatic hour cap and PCM/hash checks. All ten final receipts have zero gaps and clock stalls; short recovery regression exercises three classified stalls. 60-minute/96-MiB guards, delete/revoke/retry and original 30-second WAV recording preserved. Physical output NOT RUN. [Results](docs/evidence/academy-endurance-silent/browser.json), [PCM](docs/evidence/academy-endurance-silent/decoded-audio.json) |
| ACA-021 | All six curriculum stages, measurable assessments and beginner mini-set | PASS | Local implementation: 20 runnable lessons, complete prerequisite graph, 2/5/30-minute rubrics and explicit knowledge checks. 96 web + 12 Academy/DB tests and broad/focused browser runs PASS. Human outcomes and full-duration long assessments remain separate gates. [Report](docs/academy-completion.md) |
| ACA-023 | Correct teaching-audio trim timestamps | PASS | Both historical 64-second excerpts contained 32 seconds of silence. Versioned v2 exports reset timestamps before fades; full-duration silence/peak checks pass. Original MP3s and v1 manifest retained. [Evidence](docs/evidence/academy-completion/audio.json) |
| ACA-022 | End-to-end progression, accessibility, offline and regression evidence | PARTIAL | Broad/final Chromium/WebKit, PCM/privacy/lifecycle/offline, responsive/axe, all ten 2/5/5/30/60-minute recording cases and actual Stripe provider checks PASS. First lesson accepted. Owner mini-set, manual accessibility and physical venue checks remain deferred. [Release evidence](docs/academy-release-checks.md) |

## DJ Academy — 2026-10-21

Owner addendum: [DJ Academy](apps/site/scripts/jamloom_dj_academy_addendum_v1.md).
Separate $79.99 one-time pass; generation credits and quality hold remain unchanged.

| ID | Task | Owner | Dependency | Status | Proof |
|---|---|---|---|---|---|
| ACA-001 | Preserve checkpoint and run existing baseline | Agent | efa13be / 35c0df0 | PASS | Baseline logs; master and prior evidence preserved |
| ACA-002 | Actual deck command/audio telemetry bridge | Agent | Existing browser mixer | PASS | Original handlers, measured signals, real keyboard browser checks |
| ACA-003 | Cleared practice music and measured fixtures | Agent + listeners | Redistribution rights / listening | PARTIAL | Two CC0 64-second tracks with hashes; independent tempo candidates measured but ambiguous. Enjoyment/phrase/key review deferred |
| ACA-004 | Verified first crossfade, coaching and unlimited Free Jam | Agent + novice testers | ACA-002/003 | PARTIAL | Automated fade and voluntary Continue pass; owner qualitatively accepts deployed lesson as good enough. Measured unaided completion not supplied |
| ACA-005 | Versioned curriculum, rubrics and assessments | Agent | First lesson evidence | PARTIAL | 20 runnable lessons, six-stage prerequisite graph and end assessments implemented; browser checks PASS; human rubric calibration remains open (ACA-021/022) |
| ACA-006 | Owner-scoped progress, prerequisites, export/delete | Agent | Local database tests | PASS | Real local Better Auth/PG, order/replay/ownership/rate bounds and deletion checks |
| ACA-007 | Separate Stripe pass, replay/refund/repurchase handling | Agent + owner | Sandbox product configuration | PARTIAL | Actual Stripe test purchase/refund through permanent deployed webhooks PASS; separate live catalog, keys and signed endpoint configured. Other provider scenarios PASS locally; real charges NOT RUN, sales closed |
| ACA-008 | Fifth feature, routes, dashboard and checkout | Agent | Existing site | PASS | Production build and Chromium/WebKit route checks; four prior features preserved |
| ACA-009 | Audio/browser/accessibility/regression checks | Agent | Runnable lesson | PARTIAL | Current 101 web tests and hosted Academy/admin/site checks pass; build and original recorder browser regressions pass. Broad/final course, responsive/axe and offline checks PASS; manual accessibility and physical reliability remain NOT RUN |
| ACA-010 | Owner-only first lesson and mini-set acceptance (revised scope) | Owner | Working course | PARTIAL | Owner accepts deployed first lesson: “yes it is good enough for now”; Dia / MacBook Air / external speaker. Mini-set and measured observations NOT RUN, explicitly deferred by owner. No independent novice or population claim. |
| ACA-011 | Handbook, economics, migration and release checklist | Agent + owner | Evidence | PARTIAL | Handbook and reserve model delivered; production migration/backup restore and owner-preview deployment PASS; actual merchant economics and commercial activation remain open |
| ACA-012 | Diagnose recorder clock discontinuity and physical audio reliability | Agent + owner | Actual captures | PARTIAL | Connected-block startup and bounded stale-timestamp recovery covered by unit/browser tests; all ten final duration cases and decoded PCM PASS. Earlier failures preserved. Physical reliability NOT RUN. [Diagnosis](docs/academy-clock-continuity.md) |
| ACA-013 | Shared-frame transport, beat loops/jumps, long recording | Agent | Existing deck engine | PARTIAL | ACA-019/020 implementation, controls and both-browser 2/5/5/30/60-minute recording/PCM/account-save checks PASS; physical endurance NOT RUN |
| ACA-014 | Remaining curriculum and beginner mini-set | Agent + learners | ACA-003/013 | PARTIAL | All six stages implemented; both-browser mini-sets and full-duration recording assessments PASS. Owner mini-set explicitly deferred; no human learning claim |
| ACA-015 | Hosted CI, payment sandbox, deployment and release | Agent + owner | Course / provider / human gates | PARTIAL | Full hosted CI, Neon migration/backup restore and production owner-preview deployment PASS. Actual deployed Stripe test purchase/refund and permanent test/live configuration PASS; real charges and commercial activation remain open. [Report](docs/academy-release-checks.md) |
| ACA-016 | Hardware-style deck presentation with real controls | Agent + owner | Existing console | PARTIAL | [Presentation](docs/deck-presentation.md): browser/build checks pass; owner visual and physical touch review NOT RUN |
| ACA-017 | Adaptive fullscreen studio and performance C layout | Agent + owner | Shared actual decks | PARTIAL | [Fullscreen report](docs/studio-fullscreen.md): native browser/layout/audio checks pass; physical monitor/device review NOT RUN |

| ACA-018 | Downloaded CC0 public practice library on actual decks | Agent + listeners | Explicit redistribution rights | PARTIAL | [Ten full-length tracks](docs/practice-library-ten.md), credits/hashes, 80 tests, browser/offline/fullscreen checks PASS; enjoyment and physical venue review NOT RUN |

Detailed gates, source map, audio and reproduction: [Academy implementation](docs/ACADEMY_IMPLEMENTATION.md).
Owner feedback: initial preparation FAIL; revised preparation/start PASS; deployed first lesson qualitatively accepted 2026-10-21. Numeric scores, unaided completion and mini-set outcome not supplied.



## Full product implementation — 2026-10-20

Authoritative scope: [full product specification](apps/site/jamloom_full_product_implementation_spec_v1.md).
Earlier pause/review statements below are historical. Owner now authorizes all feasible
local product work; paid expenditure and irreversible production actions remain prohibited.
Evidence and exact handoff: [STATUS](docs/STATUS.md), [owner handbook](docs/OWNER_HANDBOOK.md).
Every row expands an epic into the next acceptance task; historical completed work remains below.

| Epic / milestone / task | Acceptance criteria | Owner | Status | Evidence / dependency | Commit |
|---|---|---|---|---|---|
| Foundation / audit / baseline | Existing source preserved; reproducible current checks | Agent | PASS | Fresh C++ 15/15; original web 73/73; current site/DB 64/64; [report](docs/full-product-implementation.md) | Full-product checkpoint |
| Product / routes / four experiences | SSR home and distinct routes, truthful controls and CTAs | Agent | PARTIAL | 17 routes × Chromium/WebKit × 3 widths pass; native capture/taste audio/full cloud flows unfinished | Full-product checkpoint |
| Audio / baseline / ten inputs | Authorized sources, frozen plans/events, stems and master levels | Agent | PASS | [66 WAVs and measurements](docs/evidence/full-product/audio-baseline.json) | Full-product checkpoint |
| Audio / quality / rescue | 20 utterances/10 listeners; ≥70% preference, ≥80% usable, ≥85% recognizable | Agent + listeners | FAIL | Q0 owner rejection remains; Night Current mildly accepted standalone, not formal proof | 3f1cb0c, b252c65 |
| Audio / variety / composition | Source-dependent new ideas across seeds and sources, listening acceptance | Agent + listeners | PARTIAL | [Audit](docs/evidence/full-product/audio-variety.json) finds repeated bass/drum structures despite distinct overall hashes | Full-product checkpoint |
| Commerce / accounting / wallet | Atomic lot reservations, replay/race protection, costs and refund safety | Agent | PARTIAL | Local conservation/receipt/refund-order/cancellation tests pass; actual proceeds and entitlement reversal unfinished | Full-product checkpoint |
| Commerce / web / Stripe | Signed fulfillment and real sandbox purchase/refund reconciliation | Agent + owner | PARTIAL | SDK + HTTP signature/replay tests pass; live checkout closed; sandbox credentials missing | Full-product checkpoint |
| Commerce / mobile / StoreKit | Verified consumables, durable server ack, account sync/notifications | Agent + owner | PARTIAL | Official Apple SDK verifier and gated native client compile; real transactions NOT RUN | Full-product checkpoint |
| Compute / jobs / bounded worker | Durable lease, immutable job, cap, cancel, private outputs and settlement | Agent | PARTIAL | [Real local DSP/storage/ledger slice](docs/evidence/full-product/generation-render.json); Vast shutdown/watchdog mocked tests pass; actual creation/invoice/R2 recovery unfinished | Full-product checkpoint |
| Compute / watchdog / provider shutdown | Bound rental/account identity, complete inventory, stop/cost evidence, retry safety | Agent | PARTIAL | [Watchdog](docs/generation-watchdog.md); mocked failure/restart tests pass, provider execution and deployment NOT RUN | Watchdog follow-up |
| DJ / desktop / controls | Actual audio controls; physical 60-minute set | Agent + owner | PARTIAL | Chromium/WebKit PCM/control/offline regression pass; physical endurance/cue routing open | Full-product checkpoint |
| Live / browser / capture | Explicit capture, real local FX, panic and isolation | Agent + owner | PARTIAL | Chromium PCM filter/bypass/stop pass; WebKit no-track fallback passes; actual permissions/isolation NOT RUN | Full-product checkpoint |
| Live / companion / macOS | Paired native loopback, output exclusion, measured transport | Agent + owner | PARTIAL | Native Core Audio tap/output/effects and authenticated web controls implemented; build/launch/PCM/HTTP/browser PASS. Actual capture, physical latency/restoration/endurance NOT RUN. [Report](docs/live-source-companion.md) | Live Source checkpoint |
| Taste / web / explicit profile | Local/private account CRUD, transparent preferences, tenant/CAS safety | Agent | PASS | Three-user HTTP/auth tests, race/size/origin/deletion validation; no trained taste claim | Full-product checkpoint |
| Taste / composition / generation | Original enjoyable audio from preferences and lawful data | Agent + listeners | NOT RUN | Planning briefs only; quality gate failed | — |
| iOS / parity / two experiences | Local improvisation + taste, verified account/credit sync | Agent + owner | PARTIAL | Native composition and explicit account/balance/profile sync implemented; exact simulator/WASM PCM parity PASS; real Apple/payment/device qualification open | Full-product checkpoint |
| Release / discoverability / SEO | SSR/canonical/sitemap/OG, accessible routes, measured field performance | Agent + owner | PARTIAL | 13 axe scans pass; local lab only; public rich results, manual accessibility/CWV open | Full-product checkpoint |
| Release / legal + ops / handbook | Exact owner actions, rollback and reproducible handoff | Agent + owner | PARTIAL | [Handbook](docs/OWNER_HANDBOOK.md) delivered; legal/provider decisions remain | Full-product checkpoint |
| Release / acceptance / paid launch | Musical, financial, platform/security gates all pass | Owner | FAIL | Quality failed; sales closed; production publication NOT RUN | — |


**Historical standalone-song checkpoint — 2026-10-20:** Improvisation/Q0 was paused at the owner's request.
Standalone song [Night Current](docs/night-current.md) delivered locally: 2:01,
140 BPM, WAV/MP3 and player at 4212. Render/export/browser checks **PASS**;
human listening **NOT RUN**. No new training, spending or production integration.

- [x] Arrange and export the standalone instrumental with provenance and credits.
- [x] Verify audio files, Downloads copies and browser playback controls.
- [x] Owner replied “okay it is not bad”; one qualitative standalone-song observation, not Q0 acceptance.
- [ ] Demonstrate broader creative variety and successful controlled listening; do not template every song on Night Current.

**Q0 final review — 2026-10-20: musical recovery FAIL; requirement coverage PARTIAL.**
The owner rejected both latest owner-speech compositions at 4211: “Both still
bad.” This is a received negative judgment, not pending owner feedback.
[Final Q0 report](docs/q0-final-report.md) consolidates all seven requested
steps, source files, playable outputs, licenses, actual tests, failures and
remaining limitations. Final verification passes for 732 retained file hashes,
25 five-condition exports and five latest candidate exports. Technical results
do not satisfy the musical-quality criterion. No production promotion, training,
paid services or later milestone. Stop this experiment series for review.

[Latest exact feedback](docs/evidence/q0-final/owner-feedback.json).
Existing comparisons and plans remain frozen; the corrected reggae note remains
an unreviewed technical correction. The owner-speech pair is unchanged by it.
Independent scored listening, an accepted creative control and successful
musical recovery remain open. The following technical completions are not a
claim that Q0 passed.

- [x] **Q001 — PASS:** Freeze five authorized real inputs with plans, events,
  masters, instrument/vocal stems, hashes and loudness/clipping measurements.
- [ ] **Q002 — PARTIAL:** Audit completed; short drum-tail gating, limited
  recorded articulations and repeated component patterns measured. Human causal
  ranking of the robotic sound is not established.
- [ ] **Q003 — PARTIAL:** Fourteen unchanged instrument probes; eight local SFZ
  probes, exact replays and level-matched comparisons. Licensing reviewed for
  local testing; instrument realism judgments and production integration open.
  New guitar audit: 552 boundary pairs, six matched guitar probe pairs, eight
  exact replays. Isolated calibration reduces the maximum half-second boundary
  step to 0.54 dB; attack/decay and mix-balance judgments remain open.
  Full-mix follow-up: five candidates and 25 stems; guitar-only waveform change
  verified. No production promotion; attenuation changes existing mix balance.
  Single-layer alternative: positive ~0.15 dB boundary steps, exact existing
  mix preservation and one controlled accent pair. Forte timbre tradeoff
  requires listening; no production promotion.
  Owner subsequently answered “Neither is substantially better” for the guitar
  pair: improvement FAIL. Do not promote it as a quality fix.
- [ ] **Q004 — PARTIAL:** Deterministic offline expression transform and five
  A/C comparisons render and replay. V2 phrase arrival/release, coordinated
  bass/kick accents and genre-specific transition pickups now render in the
  full trial. Functional coverage PASS; musical acceptance remains open.
- [x] **Q005 — PASS:** GMD license/checksum and descriptive MIDI reference audit;
  official splits retained, no profile fitting or training.
- [ ] **Q006 — PARTIAL:** Five controlled A/B/C/D/E sets now render. B tests
  drum decay in an isolated source copy; E tests intact calls and rhythmic
  instrumental answers. Owner acceptance FAIL; no promotion.
  [Full trial](docs/q0-five-arm-trial.md).
  A subsequent original-score study tests acoustic/hybrid palettes and authored
  expression, with intact calls and a recurring motif; no quality promotion.
  The latest copied-plan study tests padded vocal boundaries and shorter call
  sections; instrumental notes and expression stay fixed.
  V2 full trial supplies 25 matched mixes with source/tempo controls and
  packet-bound result validation; owner musical acceptance FAIL.
- [x] **Q007 — PASS:** Phrase-form study: twelve Q0 tests, 4,292 exact
  control/candidate event rows, five exact replays and comparison level checks. Earlier
  native regression results are retained separately. Browser form/decode
  checks pass; physical playback and headless WebKit clock remain separate.
  Subsequent sampler diagnostic: three native regression groups, 552 boundary
  pairs, unchanged forte/muted/piano controls, and exact reconstruction of the
  owner's 1,560,000-frame vocal stem.
  Latest full-mix follow-up: 13 Q0 tests, five exact replays, 4,244 event rows
  and 20 unchanged non-guitar stems. Master delta matches guitar delta within
  one PCM16 unit.
  Latest single-layer study: 14 Q0 tests, three native test groups, five exact
  old-mix re-renders, eight probe replays and one accent replay. All 1,278
  accent event rows have zero frame error; non-guitar stems are unchanged.
  V2 performance: 16 tests, three native groups, 8,264 event rows, twenty exact
  replays, 112 masters/stems decoded; five E native/WASM WAVs byte-identical,
  with 1,432 exact event rows. Seven descriptive acoustic-attack measurements.
  Linux follow-up: fresh GCC build and three native groups, five byte-identical
  E WAVs and 1,432 exact event rows. Permission-filtered review preparation and
  17 Q0 regression tests pass.
  Final form correction: complete-candidate and note-only downloads verified in
  both browsers for private/licensed packets; incomplete scores blocked.
  All 54 WAV entries and both packet IDs preserved, no audio regenerated.
- [ ] **Q008 — FAIL:** Owner rejects baseline, A/C expression, native/SFZ and
  the new five-condition packet, calling the latter “very robotic and bad quality.”
  No numeric scores, relative preferences or causal ranking inferred; no promotion.
  [Reference reassessment](docs/q0-reference-reassessment.md): seven source
  hashes checked; f newly analyzed; direct listening/annotation remains NOT RUN.
  Independent comparative study and physical Intel Linux/iPhone/AudioWorklet
  execution remain **NOT RUN**; local Linux ARM64 and Node/WASM E rendering
  now **PASS**. Independent-review preparation PASS is not actual listening.
  [Original feedback](docs/evidence/q0/owner-feedback.json);
  [guitar-pair rejection](docs/evidence/q0-guitar-single/owner-feedback.json).
- [ ] **Q009 — FAIL:** Source-motif development and padded adjacent-word
  hooks render through the unchanged Q0 engine. Same instrument patches/gains,
  tempo, duration and mix; notes/form/voice placement change. Five corrected
  candidates had six intended motif notes; the final-score audit found one lost
  reggae note, now fixed and tested against actual performed events, with deterministic replay
  and actual native/Linux/WASM agreement. Prior full-packet creativity FAIL;
  latest owner-speech pair rejected as “Both still bad”; independent listening NOT RUN.
  [Report, files and reproduction](docs/q0-source-development.md).
- [x] **Q010 — PASS:** Final motif/rest conflict reproduced and corrected;
  intended/performed trace linkage, 18 regression tests, one corrected native
  render with exact replay/WASM/Linux parity, and four unchanged plans. Existing
  packet preserved; sample-seed coupling measured, no musical quality claim.
  [Correction and evidence](docs/q0-motif-completion.md).

- [x] **Q011 — PASS:** Final Q0 report, exact latest rejection and 732-file
  delivery verification recorded. Overall musical-recovery success **FAIL**;
  remaining requirements stay open and no later milestone is started.
  [Final report](docs/q0-final-report.md).

**Research continuation — 2026-10-20:** After R0 and storage cleanup, the owner
requested continuing model development. Local R1 offline demonstration tooling
is implemented; corpus/live capture remain **PARTIAL**. R2/R3 model experiments,
third-party ingestion and paid compute retain their separate gates.
[Current R1 studio mix evidence](docs/r1-mix-recording.md);
[phrase-response evidence](docs/r1-phrase-response.md);
[live instrument evidence](docs/r1-instrument-capture.md);
[offline demonstration workflow](docs/r1-demonstrations.md).

**Earlier product authorization — 2026-10-18:** The owner's “continue with the
spec, finish everything” supersedes the earlier console-only increment and
M0a review stop for remaining local implementation. Continue the browser musical
improviser and available specification work without per-step approval; preserve
local changes, recordings, evidence and the immutable master. The
[prepared A + C session](docs/prepared-session.md) connects the local phrase director to the mixer.
Human quality, actual hardware/venue evidence and M1 prerequisites for production
learned AI remain required. Phone and hosted-infrastructure work remain paused;
new paid compute, publication and monetization still need explicit authorization.


Last updated: 2026-10-20 (America/New_York). Latest validation: [Saved performances](docs/saved-mixes.md); [Clean website build](docs/vercel-clean-build.md); [Neon setup](docs/neon-setup.md).
Latest audio validation: [Bounded audio wake-up](docs/audio-resume.md).
Latest engine improvement: [Precomputed common interpolation coefficients](docs/interpolation-table.md).
Latest research: [R1 studio mix recording](docs/r1-mix-recording.md); [R1 private phrase-response pairs](docs/r1-phrase-response.md); [R1 live instrument capture](docs/r1-instrument-capture.md); [R1 offline action capture](docs/r1-demonstrations.md); [R0 intelligence foundation](docs/r0-report.md). Historical research: [Phrase articulation comparisons](docs/phrase-articulation.md); [adapter effect and split audit](docs/style-adapter-effect.md); [Blood Club GPU trial](docs/blood-training-run.md).
Current priority: musical intelligence and training quality; Spotify/YouTube integration deferred.

Use this file for past work, open issues and future development. Detailed test
results belong in [progress](docs/progress.md) and linked evidence reports.
The [specification completion ledger](docs/spec-status.md) lists unfinished code
as well as missing quality/device/release evidence. Overall specification: **PARTIAL**.
The [master specification](ai_improvisational_musician_master_spec_v1.md) remains
the source of truth and is not modified by this tracker.

## Product identity

- [x] BR01: Rename current app, packages, native/WASM engine, exports, scripts and active documentation to Jamloom; preserve saved data and historical evidence. [Validation](docs/jamloom-rename.md). [Public release and renamed GitHub connection](docs/brand-live.md).
- [ ] BR02 — PARTIAL: Owner reports purchasing `jamloom.com`; `jamloom-audio` confirmed live. Production origin prepared; private R2 access, CORS, lifecycle configuration and 10 provider gates PASS. Resend domain owner-confirmed Verified; hello sender/support Reply-To configured. Shared branded email templates pass 54 browser layout cases; real inbox clients/delivery remain NOT RUN. Canonical www origin, Vercel settings and live R2 CORS aligned; existing production release redeployed, live auth/redirect/origin checks PASS; [www validation](docs/www-origin.md). Hosted account/email workflow, actual lifecycle expiry and scheduled cleanup remain NOT RUN. Trademark clearance is unverified. [Setup](docs/production-domain.md), [R2 evidence](docs/r2-live.md), [email setup](docs/resend-setup.md), [templates](docs/email-templates.md).

## Deployment reliability

- [ ] **DEP01 — PARTIAL:** Repair partial Emscripten directories restored by Vercel build cache. Failure reproduced; fresh/partial/warm bootstrap and preservation checks, full local build and bundle audit PASS. Cached production deployment and live page/engine checks PASS. Release branch is pushed and hosted CI passes; remote main awaits draft PR #1. Fix `66031e3`; [evidence](docs/deploy-cache.md).

## Public interface

- [x] **UI01 — PASS (implementation/public validation):** Refine the voice studio, DJ workspace, account and catalogue layouts; 56 Chromium/WebKit layout cases, keyboard/form checks, 21 voice and 47 DJ regression checks pass. [Evidence](docs/public-ui.md). Scoped Vercel deployment and live desktop/mobile checks PASS; physical-device and owner visual acceptance remain NOT RUN.

## Website analytics

- [ ] **AN01 — PARTIAL:** Install VisitorPing site `vp_QBDH92AC` once in the Next.js
  shared layout; preserve untracked offline studio and security settings. Local
  build, 14 tests, typecheck, secret audit, production deploy and public browser
  deduplication **PASS**.
  Provider activated automatically; both page views received HTTP 204. Exact ingestion
  and realtime origins allowed after confirmed CSP blocks. [Follow-up](docs/brand-live.md).
  Confirm dashboard Test installation plus two-page Live Radar activity. [Evidence](docs/visitorping.md).

## At a glance

| Milestone | Status | What is complete / what remains |
| --- | --- | --- |
| M0a — offline foundation | PASS | Portable engine, instruments, timing, WAV and automated tests |
| M0b — own sound into music | PARTIAL | Consented voice renders; formal recognizability observations missing |
| M0c — three musical strategies | PARTIAL | Owner accepts the current prototype as a start; production quality and formal listening remain open |
| M0d — Apple M5 portability | PASS | Native Mac and actual Linux arm64 tests; exact plans/events and 45 matching hip-hop/fixture WAVs; voice and other styles preserved |
| M1 — musical quality baseline | NOT RUN | Licensed multi-source cohort and blind packet workflow prepared; formal human evaluation missing |
| M2 — AI director benchmarks | PARTIAL | Offline import/fallback prerequisite complete; model integration and benchmark remain NOT RUN behind M1; separately authorized pretrained and style-adapter feasibility trials measured |
| M3 — iPhone Instant Remix | PARTIAL | Release app launches; owner recording/generation/playback, six phone tests, metrics and simulator flow pass; XCTest UI initialization, routes/lifecycle and production acceptance remain |
| W0 — browser Instant Remix | PARTIAL | Local WebAssembly app and Chromium/WebKit/Firefox technical flows pass; physical browser microphone and owner web listening remain open |
| M4 — live improvisation | PARTIAL | Prepared A/C session and live instrument/MIDI input implemented locally; continual phrase cycles implemented; physical timing, endpoint calibration and venue evidence remain |
| M5 — production and monetization | PARTIAL | Privacy/rights controls, production owner-preview deployment, migration/restore, hosted CI and Academy Stripe test transactions pass; permanent live billing, human/device acceptance, beta/demand and public commercial release remain |

`PASS` means the named deliverable has evidence. `PARTIAL` means some required
work or evidence is missing. `FAIL` means a performed check did not meet its
criteria. `NOT RUN` means it has not been executed or assessed. A checked box
closes that task only; it does not automatically pass its parent milestone.

## DJ studio development

- [x] **DJ27 — PASS (bounded start ordering):** [Actual deck metadata readiness](docs/media-readiness.md).
  Manual Play waits for its own media metadata, starts once, preserves the existing
  ten-second deadline and cannot start a superseded track after cancellation.
  Three negative controls expose the old behavior; 44 unit checks pass per OS.
  Browser/build/PCM receipts and intermediate failures are retained in the report.
  Broader Linux WebKit reliability remains DJ14 **PARTIAL**, including a cue mismatch
  and two 2 GiB container OOM failures. R2/Resend, physical audio and listening stay deferred.

- [x] **DJ26 — PASS (local save/reuse implementation):** [Saved performances](docs/saved-mixes.md).
  Explicit Save C, shared ten-session browser library, load into paused A/B,
  revalidation on load, cancellation/permission guards, quota retry and Voice
  studio deletion. Offline fragment links and WebKit select clipping repaired.
  Mac Chromium/WebKit and Linux Chromium: 39 session checks each. Linux WebKit:
  38 PASS and 2 capture checks NOT RUN; all 10 save/reuse checks pass. Final Next
  integration passes both Mac browsers. 44 fixture WAVs remain byte-identical.
  Linux WebKit manual-deck reliability remains FAIL; receipts are in the report. Full session recall, cloud
  sync, musical quality and venue acceptance are not included. R2/Resend deferred.

- [x] **DJ25 — PASS (bounded recovery scope):** [Audio wake-up deadline](docs/audio-resume.md).
  All five resume sites time out and allow retry; late note failures cannot release
  a newer note. 41 unit tests per platform; Mac Chromium/WebKit and Linux Chromium
  pass 46 studio checks each. Linux WebKit passes the recovery cases but its full
  studio run **FAIL** on reload/crash; DJ14 remains open. Prepared sessions: 29
  checks per Mac browser and Linux Chromium; Linux WebKit **PARTIAL** (28 PASS,
  two capture checks NOT RUN). 44 unchanged offline WAVs; baseline event frames
  identical, fractional echo targets within 0.474 frame. Physical/listening/venue
  **NOT RUN**. Test setup failures and cleanup receipts retained.

- [x] **DJ24 — PASS (local-file host regression scope):** [Preload, routing and transport repair](docs/media-preload.md).
  Connect before loading, use metadata preload, coalesce active pitch changes
  after pause, and gate native decoder input on pause while preserving effect tails.
  All four Mac/Linux Chromium/WebKit runs pass 43 studio checks; 38 unit checks
  per platform, 29 prepared-session checks per Mac browser, 34 unchanged offline
  WAVs, exact echo frames and prepared timing. Failed shared-context setup runs
  retained; isolated capability checks pass. Strict Linux
  WebKit repeats pass 60 cycles; active-rate local-file diagnostics pass 45.
  HTTP active-rate control **FAIL**, precise native cause and earlier screenshot
  freezes **PARTIAL**; physical/listening/venue **NOT RUN**. M1/M4/release stay open.

- [x] **DJ23 — PASS (bounded manual-start recovery):** [Playback failure handling](docs/media-restart.md).
  Stuck and never-resolving native starts report an error and restore controls;
  cancellation/late results preserve newer playback while the other deck continues.
  34 unit tests on each platform; 42 studio checks each in Mac Chromium/WebKit
  and Linux Chromium; 24 unchanged WAVs and exact measured echo frames.
  At that checkpoint Linux WebKit startup/restart was **FAIL**, including a fresh-container
  reproduction without memory-limit events. Root cause **PARTIAL**; rejected
  native-loop/fresh-source workarounds retained. Physical/listening/venue **NOT RUN**.
  DJ24 subsequently passes the local-file regression; DJ14/DJ17, M1 and production remain open.

- [x] **DJ22 — PASS (instrument worklet validation scope):** [Actual browser instrument load](docs/worklet-load.md).
  Sixty-second runs in Mac/Linux Chromium and WebKit: exact native PCM and all
  1,920 command frames, no captured sample gaps. 30 Mac unit / 4 Linux probe
  tests pass; six captures and playable excerpts retained. Coarse timing screens
  **FAIL** (3–13 ms maxima versus 2.667 ms); precise deadline qualification and
  cause **PARTIAL**. Chromium underrun snapshots report zero; WebKit API **NOT RUN**.
  Physical latency, full-session/venue and musical quality **NOT RUN**.
  This does not close DJ14, DJ17 or DJ20. Production engine unchanged.
  Follow-up E15 validates the optimized engine with four new exact worklet
  captures; coarse timing screens still **FAIL**. E16 adds four captures after
  cold-note optimization; three timing screens **FAIL**, one **PASS** for that run.

- [x] **DJ21 — PASS (bounded native callback scope):** [Actual macOS output callback](docs/audio-callback.md).
  One minute on the M5's LG DisplayPort output route, 512 frames / 48 kHz:
  5,625 callbacks, exact offline PCM and command frames, no sample-time gaps,
  rejected notes or counted C++ allocations. Maximum 4.262 ms against 10.667 ms;
  speaker output muted. Calibration/self-tests, sanitizer and focused suite pass.
  Does not pass browser AudioWorklet, 128-frame deadlines, physical loopback,
  microphone round-trip, venue endurance or musical quality. DJ20 stays open.


- [ ] **DJ20 — PARTIAL:** [Live instrument load and deadlines](docs/live-deadline.md).
  600 virtual seconds per run, all 13 patches, 32 voices, 60 identical programs,
  exact Mac/Linux/WASM PCM and command frames, native allocation checks and
  focused tests **PASS**. Strict offline no-overrun check **FAIL**: initial Mac,
  first Linux and Node WASM have delays beyond 2.667 ms; reruns are retained,
  not substituted for failures. Cause **PARTIAL**. Native device scheduling is
  now covered by DJ21 at 512 frames; instrument AudioWorklet execution is covered
  by DJ22, with coarse timing screens **FAIL**. Physical round-trip latency and
  venue endurance **NOT RUN**. No engine or musical-quality change is implied.


- [x] **DJ19 — PASS (validation and fallback scope):** [Linux browser validation and recording fallback](docs/linux-browser.md).
  Linux Chromium session/manual suites pass 29/40 checks; 22 Mac/Linux WAVs
  match exactly. That Linux WebKit manual startup/repeat run was **FAIL** (DJ14); see DJ24 for the repair.
  Actual isolated Linux ARM64 browser execution; unavailable recording is visibly
  disabled in both studios and consented import remains usable. Native Mac
  capability controls pass. Linux WebKit's full session is **PARTIAL** because
  its build lacks MediaRecorder: two capture checks **NOT RUN**. Physical Intel
  Linux, microphone/MIDI, latency, formal listening and venue validation remain
  **NOT RUN**; this does not close DJ14/DJ17 or the full specification.

- [x] **DJ18 — PASS (technical):** [Cancellable prepared playback](docs/start-cancellation.md):
  pending A/C start state, working Stop during resume, guarded stale errors,
  explicit retry, and consent withdrawal during pending C preview. 26 unit and
  56 final session checks, integrated/offline controls and ten unchanged piano
  WAVs. Before-fix and test-harness failures retained. DJ14/DJ17 remain open.

- [x] **DJ16 — PASS (technical):** [Rhythmic C echoes](docs/beat-echo.md): eighth,
  dotted-eighth and triplet spacing from confirmed C tempo, retained manual value,
  disabled MIDI spacing while synced, and requested delay targets preserved when
  clearing mid-ramp across A/B/C/instruments. 26 unit, 80 DJ and 50 session checks;
  54 rhythmic tap peaks within half a frame, 24 exact post-clear peaks, six new
  WAVs and unchanged preceding output. Integrated/offline controls PASS.
- [ ] **DJ17 — PARTIAL:** [Startup repeatability and continuity diagnostics](docs/beat-echo.md).
  One Chromium prepared-A signal assertion failed after a 300 ms wait; cause
  unconfirmed, later runs pass unchanged threshold. Corrected the timestamp-only
  dropout detector using an independent PCM counter: focused stress reproduced
  stale timestamps with continuous samples. Final session PCM checks PASS;
  failed receipts retained, physical/venue validation NOT RUN. DJ18 fixes a
  separate reproducible pending-start control defect; it does not establish the
  cause of the earlier 300 ms failure. DJ23 adds bounded manual-start failure
  handling; it does not qualify latency or prepared-session startup.

- [x] **DJ15 — PASS (technical):** [Performance C tone and echo](docs/performance-effects.md):
  preview/bar-entry effects before C/Master gains, three MIDI Learn targets,
  cleared voice echoes on stop/deletion/consent and accurate preview-stop status.
  80 DJ, 46 session and 24 unit checks; integrated/offline browser audio, exact
  echo frames and playable comparisons PASS. Physical/listening/venue NOT RUN.

- [x] **DJ13 — PASS (technical):** [MIDI Learn](docs/midi-learn.md): 23 allowed
  absolute CC controls, channel-specific assignment, pickup/manual rearm,
  clear/cancel/input lifecycle and existing audio/permission paths. 80 final DJ,
  38 session, 24 unit checks and integrated/offline behavior pass. Physical MIDI
  and latency NOT RUN; native Web MIDI unavailable in tested WebKit.
- [ ] **DJ14 — PARTIAL (intermittent Linux WebKit failures remain):**
  [DJ27](docs/media-readiness.md) gates native Play on actual metadata readiness.
  Preserve the separate cue mismatch and 2 GiB test-capacity failures; later
  passing functional runs do not establish sustained transport reliability.
  [DJ25 evidence](docs/audio-resume.md) retains a valid reload rejection after
  rapid pitch changes and a fresh-container browser crash later in the suite.
  Fresh run reached its 2 GiB memory limit without OOM kills; cause unproven.
  Earlier passing suites remain valid receipts, not proof of reliable repetition.
  [DJ24 repair](docs/media-preload.md) passes full Mac/Linux studio checks and
  controlled local-file repeats. HTTP active-rate diagnostics still fail;
  precise native-code cause and venue reliability remain open. Historical
  failures below are retained, not reclassified as passing.
  [New minimal native-media probes](docs/media-restart.md) reproduce EOF failure
  outside Jamloom with Blob/File and HTTP sources; a fresh-container Blob/File
  reproduction has no memory-limit events. Three candidate workarounds still
  fail local-file paths. DJ23 handles stalled starts without closing this defect.
  [Linux browser validation](docs/linux-browser.md) reproduces an EOF restart
  stuck seeking at zero; full suite fails and focused repeats fail on iteration 2.
  Waiting for seek and decoder reload candidates also failed; neither shipped.
  A software-only audio sink removes missing-device errors but native media
  startup/repeat failures remain. Isolate Blob/range delivery and native media
  decoding before changing transport; later Linux WebKit manual checks NOT RUN.
  These traces extend, but do not establish the cause of, the prior Mac issue:
  investigate intermittent WebKit whole-track loop start:
  one timeout at paused 59.9 s before MIDI activation; final suite and 20 isolated
  repeats pass. Root cause unconfirmed; failure receipt and diagnostics retained
  in [MIDI Learn evidence](docs/midi-learn.md). Another 15 cue/jog/rate sequences
  and two full WebKit runs passed on 2026-10-19 ([evidence](docs/performance-effects.md));
  cause remains unconfirmed. Fifteen further integrated sequences pass in
  [startup-cancellation validation](docs/start-cancellation.md). Do not call venue looping validated.

- [x] **DJ12 — PASS (technical):** [Deck tone and echo](docs/deck-effects.md):
  independent A/B effects including prepared A, post-effect mute/crossfader,
  cleared delay buffers on reset/unload/permission withdrawal and Pause all.
  70 DJ and 38 prepared-session browser checks; 23 unit checks, offline/integrated
  site, exact echo frames and playable dry/echo WAVs. Listening/venue NOT RUN.

- [x] **DJ11 — PASS (technical):** [Major/minor context](docs/session-modes.md):
  all twelve tonics, seeded major progressions and scale-bound answers, validated
  version 1.7 plan import/export, explicit mode selection and C invalidation.
  288 native plans, eight Mac/Linux/WASM comparisons and browser/offline checks;
  historical minor output unchanged. Perceptual quality NOT RUN.

- [x] **DJ10 — PASS (technical):** [MIDI instrument input](docs/midi-input.md):
  explicit single-input permission/selection, note velocity, per-channel sustain,
  channel-10 drum/percussion mapping and safe disconnect/cancellation. Synthetic
  MIDI drives real C++ worklet audio in browser and disconnected-server tests;
  integrated desktop/mobile controls checked. Physical MIDI hardware NOT RUN.

- [x] **DJ08 — PASS (technical):** [Talk bass and extra percussion](docs/talk-bass.md):
  shared C++ original formant synth with OO/AH/EE control, low C2 register, clap,
  rimshot, low tom and shaker; twelve pads total. Local `pipe.mp3` measurements,
  native Mac/Linux/WASM checks, browser/offline coverage and three original demos.
  Reference rig identification PARTIAL; sound similarity/listening NOT RUN.

- [x] **DJ07 — PASS (technical):** [Instrument tone and echo](docs/instrument-effects.md):
  real low-pass tone, three fading echoes, manual spacing, dry reset and mute-safe
  routing for keys/pads. 46 DJ checks, 19 unit checks, 40 voice regressions and
  integrated site checks PASS; playable piano pairs and timing/waveform evidence
  retained. Human musical quality and physical latency remain NOT RUN.

- [x] **DJ05 — PASS (technical):** [Console and live instruments](docs/dj-console.md):
  rotating/joggable platters, cue/hot cues, ±16% pitch/key lock, manual tempo match,
  full-track loops, three-band EQ, 88-key piano, nine melodic patches and eight
  drum pads, sustain/velocity/level/panic. Actual Mac/Linux/WASM and browser audio
  evidence recorded: 42 DJ browser checks, 18 unit checks, 40 voice regressions,
  15/15 CTest suites per native platform, sanitizer and bit-identical PCM PASS.
  Professional/artist-reference quality remains NOT RUN.
- [ ] **DJ06 — PARTIAL:** Fixed MIDI input mapping is implemented by DJ10;
  instrument tone/echo is covered by DJ07, deck tone/echo by DJ12 and absolute CC
  MIDI Learn by DJ13 and C effects by DJ15. Physical controller validation, human audition, relative
  encoders/custom pad layouts, audible scratching, beat-sized loops and headphone
  cue routing remain open. Whole-track loop reliability is tracked in DJ14.

- [x] **DJ01 — PASS:** [Manual two-deck foundation](docs/dj-mixer.md): actual local
  playback, seek/levels/crossfader/master, stereo meter, permission and unload,
  failed-replacement preservation, interruption recovery and prepared offline
  reload. 16 unit checks, 26 DJ browser checks and 40 voice regressions PASS.
- [x] **DJ09 — PASS (technical):** [Prepared A + C session](docs/prepared-session.md):
  shared C++ absolute bar grid, context-aware phrase plan, real scheduled browser
  audio, capture/import, preview, C fader/stop, safe cancellation/failure and
  disconnected-server generation/playback. Native Mac/Linux/WASM agreement and
  short callback continuity checks recorded. No learned model or quality claim.
- [ ] **DJ02 — PARTIAL:** Prepared A/C now share the AudioContext clock using the
  shared C++ bar grid; tempo/triad estimates plus mandatory manual confirmation.
  Remaining: general beat tracking, modulating/chord-aware harmony, unified A/B/C
  transport, sample-frame live note/chop scheduling and tempo changes in flight.
- [ ] **DJ03 — PARTIAL:** Consented capture/import while A plays, source-driven C,
  manual preview/entry/level/stop, local fallback and failure isolation work in
  Chromium/WebKit. Physical microphone/session check and learned-director
  automation/quality remain NOT RUN; synthetic capture is not physical evidence.
- [ ] **DJ04 — PARTIAL:** Automated Apple M5 browser sessions, prepared offline
  playback, CPU block timing and repeated transport checks PASS. Actual Linux ARM64 browser coverage is recorded in DJ24/DJ25; physical Intel
  Linux, physical latency, long-session glitch checks, cue/device routing and
  human musical evaluation remain NOT RUN. Cached-page tests do not pass venue readiness.

## Existing product work — local specification work active; phone and hosted infrastructure paused

- [x] **C01 — PASS:** Ran the owner-authorized $10 pretrained music experiment
  on one Vast RTX 3090: ten successful 30-second hip-hop/club takes, pinned
  timing/memory/waveform evidence, verified retrieval and deletion. Observed
  debit about $0.09; final invoice reconciliation remains **PARTIAL**.
  [Trial report](docs/cloud-music-trial.md). No cloud voice upload, training,
  production integration or M1/M2 gate closure is implied.
- [ ] **C02 — PARTIAL:** [Owner audition of the cloud trial](renders/cloud-trial-20261018/review/index.html): owner says clips are
  “getting better” and requests occasional, context-dependent human voice.
  Formal realism, groove, variety, transitions and endings ratings remain missing.
  Stable Audio comparison requires gated model access and terms acceptance.
- [x] **C03 — PASS:** Six local selective-voice arrangements over retrieved club/hip-hop
  beds, six repeating-voice controls, stems and 18 matched audition files. Source
  fidelity, event/WAV repeatability, export safeguards and two-browser playback
  checked. [Evidence](docs/voice-research.md). Rule-based research; no cloud speech
  processing, new rental, training or production AI integration.
- [ ] **C04 — NOT RUN:** [Audition the selective-voice comparisons](renders/voice-research-20261018/review/index.html)
  for natural entrances, intelligibility, groove and enough instrumental space.
  Record timestamps; technical checks do not establish musical quality.
- [ ] **C05 — NOT RUN:** Learned contextual arrangement and perceptual novelty:
  verified phrase/beat placement, varied musical development and appropriate
  voice presence. Requires quality evidence before production AI integration;
  current energy/grid heuristics do not satisfy this gate.
- [ ] **C06 — PARTIAL:** [Source-led musical development](docs/reference-xyz-analysis.md):
  x/y/z are the owner's style/quality targets. Call & Response now preserves
  chronological phrase rhythm and energy accents across a two-bar answer, with
  a shifted/harmonized return and bass reinforcement. [Four owner comparisons](docs/source-motif.md)
  and Mac/Linux/browser agreement PASS. Owner says After feels “More connected”
  (informal listening PARTIAL). Formal listening, broader style coverage,
  adaptive form/voice roles, expressive pitch contours and reference-level quality
  remain open; reference measurements do not establish listening or training rights.

- [ ] **C07 — PARTIAL:** [Style-adapter trial](docs/style-training-retry.md):
  owner-authorized replacement completed actual RTX 3090 training (250 steps),
  verified adapter/checkpoint, exact base repeat, four changed matched pairs and
  two-browser review. Decode headroom corrected in fresh copies; 25 local checks
  PASS. Both rentals/key cleanup PASS; observed combined debit $0.193221, final
  invoice NOT RUN. Dataset is five provisional excerpts, not a verified corpus;
  formal quality and production advancement remain open.
- [ ] **C08 — NOT RUN:** Audition [four concealed adapter comparisons](http://127.0.0.1:4193/review/)
  for musicality, reference direction, voice artifacts, groove, development and
  endings. Record pair/version/timestamps; waveform differences are not quality.
- [ ] **C09 — PARTIAL:** [Local waveform diagnostics](docs/style-waveform-diagnostics.md)
  PASS: calibrated 40-pair training-excerpt scan, internal repetition and two-seed
  measurements, three tests and protected-file checks. No training-excerpt flags;
  repeated windows in both second-seed bass takes need listening review. Curate
  verified musical windows, captions and session groups; independently evaluate
  perceptual copying and generalization. Detailed automatic captions proved unstable. Source-to-response
  learning also needs appropriate paired examples; a style adapter does not
  implement that behavior. Further paid rentals need separate authorization.

- [ ] **C10 — PARTIAL:** Source-contour research completed with four matched
  comparisons; actual Mac/Linux 15/15 suites, 65 exact cross-OS WAVs and native/
  browser agreement PASS. Owner said **“No clear difference”**; audible benefit
  not established, promotion FAIL. Candidate retained as a patch and playable
  research artifacts; original studio engine restored. No new model training.
  Prioritize paired phrase/response examples, reviewed session splits and real
  preference evidence for C05/C09. [Evidence](docs/source-contour.md).

- [ ] **C11 — PARTIAL:** Approved Blood Club trial executed: 16 training clips,
  verified 80/160-step checkpoints, 13 retrieved WAVs, exact base repeat, 38 local
  regressions and rental/key cleanup PASS. Fixed decimal checkpoint-name loading.
  Four concealed A/B/C groups at `http://127.0.0.1:4195/review/`; no strong training
  waveform matches, but repetition flags remain. Paired annotations, independent
  generalization, human preference and production acceptance remain open; no
  checkpoint promoted. Observed debit about $0.12; final billing PARTIAL.
  [Execution evidence](docs/blood-training-run.md).
  [Local follow-up](docs/style-adapter-effect.md): bass/funk remain strongly
  waveform-correlated with base; independent source-group split **FAIL** and
  two cross-split windows flagged. Five diagnostic tests, repeated 64-pair audit,
  exact legacy-result agreement and four playable reference crops **PASS**.
  Do not treat greater waveform change or this same-source holdout as quality proof.

- [x] **C12 — PASS (technical):** [Offset-resistant phrase analysis](docs/analysis-offset.md).
  Correct attacks/pauses/pitch despite constant electrical offset without editing
  the recording. Old-library failure reproduced; Mac/Linux 15/15 suites, sanitizer
  and 12 WASM comparisons pass. 70 exact cross-platform WAVs; 65 original-input
  WAVs unchanged, six saved-score replays. New musical benefit and physical
  microphone/browser interaction **NOT RUN**; C05/C06/C11 and M1 stay open.

- [ ] **C13 — PARTIAL:** [Phrase articulation candidate](docs/phrase-articulation.md):
  four concealed A/B pairs at `http://127.0.0.1:4196/review/`. Piano answer note
  lengths follow phrase spacing; all other events remain intact. Five tests,
  eight actual Mac/Linux imports, 40 exact WAVs and 16 matched/HTTP-decoded review
  files **PASS**. Default engine preserved. Human benefit, generalization and
  promotion **NOT RUN**; this is rule-based research, not further model training.

- [x] **C14 — PASS (technical):** [Sustained-note period selection](docs/pitch-period.md).
  Stop later period multiples selecting the wrong pitch/key; 180 known-tone
  cases, Mac/Linux suites, sanitizer and 12 WASM comparisons pass. 74 exact
  cross-platform WAVs; 65 owner/fixture WAVs unchanged; six saved-score replays.
  Four of 20 licensed speech inputs change selected tonic and have fresh renders;
  their pitch accuracy/listening **NOT RUN**, frozen study preserved. No learned
  behavior or production-quality advancement is inferred.

- [x] **C15 — PASS (technical):** [Offset-resistant vocal pause detection](docs/chop-offset.md).
  Center crop energy so constant recording offsets do not hide pauses and force
  premature fallback slices; retain original PCM and edge selection. 48 controls,
  Mac/Linux 15/15 suites, sanitizer, 107 exact cross-OS WAVs, 17 WASM comparisons
  and 11 saved-score replays pass. All 65 owner/fixture WAVs preserved. One of
  20 licensed speech sources changes crops; human benefit **NOT RUN**. Frozen
  evaluation and prior reviews remain intact; no new training or paid compute.

Latest platform design: [ADR 0002](docs/decisions/0002-web-platform-auth-and-storage.md).
Owner selected Vercel, Better Auth, Neon PostgreSQL Free, R2 and the Next.js shell,
with private generation plus a reviewed public catalogue. Keep the database free;
no paid upgrade without owner approval. The owner chose email/password sign-in and
Resend for account email. [Local implementation/evidence](docs/web-accounts.md)
now exists; [Neon Postgres is configured and tested](docs/neon-setup.md) under the
owner's specific 2026-10-19 setup authorization. R2 provider checks now pass;
Resend sender/reply wiring is prepared with owner-confirmed domain verification.
Vercel deployment and live email delivery remain outstanding.

- [x] **W08 — PASS:** Document hosting/auth/database/object-storage boundaries, private save/public submission separation, logical model and upload/deletion lifecycle.
- [ ] **W09 — PARTIAL:** Next.js shell, Better Auth email/password, Resend adapter, generated auth schema, private metadata queries, migration safeguards and local Postgres/browser tests and bounded expired-auth cleanup implemented. Live Neon schema and localhost account/library end-to-end checks PASS; Resend delivery, hosted app execution, preview/production isolation, cleanup scheduling, database compute/transfer budgets and overload limits remain. [Neon evidence](docs/neon-setup.md). [Account evidence](docs/web-accounts.md); [cleanup evidence](docs/auth-cleanup.md).
- [ ] **W10 — PARTIAL:** Explicit private save, checksum/WAV validation, all seven strategies, atomic quotas, owner-scoped playback/download, retryable deletion and bounded cleanup implemented. Local Postgres/files, 20 unit/integration checks and ten workflows in each Chromium/WebKit pass. Live R2 adapter, browser CORS, signed-header enforcement, late-write master isolation and lifecycle configuration now PASS; actual age expiry/reconciliation, hosted account workflow, scheduling and cost/overload validation remain NOT RUN. [Local evidence](docs/private-account-audio.md), [live R2 evidence](docs/r2-live.md).
- [ ] **W11 — PARTIAL:** Local submission/revision review, filters/search, track pages, persistent player, private playlists, reports and withdrawal implemented; 28 unit/integration checks and 16 catalogue browser checks PASS. Withdrawal recovery, stale-review and displayed-report-batch safeguards also implemented and tested. Hosted publication, actual permission/quality review and moderation operations remain NOT RUN. [Initial evidence](docs/reviewed-catalogue.md); [recovery evidence](docs/catalogue-withdrawal.md).

The owner changed priority to “first lets make it web version of this” on
2026-10-18. **Phone work is paused by owner request.** Existing phone results and
unresolved device gates are preserved; this change does not mark them passed.
The current web deliverable and evidence are in [web Instant Remix](docs/web-instant-remix.md).

- [x] **W01 — PASS:** Compile the shared engine to WebAssembly in an isolated SDK; preserve the master, fixture and owner source. Seven browser styles match native Mac plans/events/WAVs exactly in Chromium and WebKit.
- [x] **W02 — PASS:** Consent, browser recording/import, waveform/2–5 s trim, three takes/club/funk/call-response/hybrid, regeneration, cancellation, playback, WAV downloads and responsive desktop/mobile layout implemented and automated flows checked.
- [x] **W03 — PASS:** Atomic local library, integrity verification, explicit scoped/all deletion, quota handling and ten-session limit. WebKit byte-buffer storage compatibility fixed. Original inputs are not persisted or uploaded.
- [x] **W04 — PASS:** Reproducible build, isolated local server, public-file/notice audit, native regression checks and committed browser/portability evidence.
- [ ] **W05 — NOT RUN:** Owner browser microphone and audible playback on the actual preferred browser; headphone/device switching and browser background behavior on real hardware. Fake microphone automation is not this gate.
- [ ] **W06 — NOT RUN:** Owner listening to web mixes, especially experimental/club/funk, and the already-required diverse blinded M1 cohort. No musical-quality inference from identical WAVs.
- [ ] **W07 — PARTIAL:** Firefox 151.0 full workflow and seven exact native/Firefox styles PASS; installed Safari and mobile browser hardware coverage remain NOT RUN; optional offline caching and installation support PASS; manifest/icons and Chromium installability diagnostics pass at root/site scopes; physical installed-app launch, public HTTPS hosting and release approval remain NOT RUN. No deployment is authorized or performed in this web pass. [Installation evidence](docs/web-installation.md); [offline evidence](docs/offline-studio.md); [Firefox/recovery evidence](docs/web-recovery.md).

[Native app and validation](docs/ios-instant-remix.md),
[release readiness](docs/release-readiness.md), and
[live research gate](docs/live-research-protocol.md) track the 2026-10-18 local
implementation authorized by “continue finish the spec all the way.” Missing
listening data, device observations, model prerequisites and release approval
are not supplied by this instruction. The master remains unchanged.

## Next: review the current music

Latest [Blood Club training comparisons](http://127.0.0.1:4195/review/): four
concealed A/B/C groups, matched to −22.2 LUFS. Choose a preferred version or no
clear winner, with awkward timestamps. **Technical PASS; listening NOT RUN.**
Both checkpoints remain research candidates. [Run evidence](docs/blood-training-run.md).

Previous [instrument and groove comparisons](renders/sustained-instruments-20261018/review/index.html):
eight matched before/after pairs, isolated instruments and vocals. **Listening NOT RUN.**

Previous [recorded guitar comparisons](renders/guitar-20261018/review/index.html):
eight matched before/after pairs, isolated guitar and unchanged voice stems.
Technical gates PASS; listening NOT RUN.


Latest [eight call-response/hybrid mixes](renders/creative-strategies-20261018/review/index.html)
are loudness matched with voice stems. Technical gates PASS; listening NOT RUN.


Latest [four Funk seeds](renders/funk-20261018/review/index.html): distinct note
structures, two preserved clean hooks each, loudness-matched mixes and isolated
voices. Technical checks PASS; human listening NOT RUN. Available in the web
studio as Funk. [Evidence](docs/funk.md).

Previous [hip-hop before/after pairs](renders/hiphop-diversity-20261018/review/index.html):
four seeds at matched loudness. Hip-hop now varies chord cycles, coordinated
bass/kick/chord rhythms and swing, with recurring phrases and developed returns.
**Technical variety: PASS; perceived variety and new listening: NOT RUN.**
This is a bounded rule bank; combinations can repeat. [Evidence](docs/hiphop-diversity.md).

Latest [voice and instrumental comparisons](renders/voice-research-20261018/review/index.html):
six 30-second club/hip-hop arrangements, matched repeating-voice controls and
instrumental-only options. Owner requests performer-level craft and selective
human voice; this is a quality target, not an artist-imitation or cloning task.
**Local technical checks: PASS; new voice-mix listening: NOT RUN.**
[Research evidence and limitations](docs/voice-research.md).

Latest [v7/v8 listening comparison](renders/voice-club-v8/review/index.html):
three before/after pairs plus bass/drum/voice pairs and the reference. The owner
requested all three improvement areas; that is not an acceptance rating. Bass
balance/harmonics, drum impact/decay, transitions and pause-ended vocal selection
are implemented. Stem exports now preserve the master's instrument takes.
**V8 listening: NOT RUN; production quality: PARTIAL.**
[Current evidence](docs/club-refinement.md).

New [club listening page](renders/voice-club-v7/review/index.html): three original
36-second electronic arrangements, matched reference/previous mix and isolated
instruments. Drops at 0:10 and 0:24. **Club listening: NOT RUN.** The latest
request is production-level quality in the direction of Blood Club; the new
palette/form are implemented, without claiming reference similarity or production
acceptance. [Evidence and limits](docs/club-direction.md).

Local [listening page](renders/voice-articulation-v4/review/index.html): v3/v4 pairs
and six alternate-seed mixes plus isolated piano/drum comparisons at matched
levels. Earlier reference auditions
remain linked. V4 piano/drum feedback: **PASS** (informal owner acceptance).
The [one-command recording session](renders/recording-workflow-v5/index.html)
provides three mixes and downloads; its new conversion has not received a
separate listening assessment.
Audio links work in this checkout; private recordings are intentionally absent
from Git and will not appear in a remote repository viewer.

Latest listening feedback (2026-10-17): “they are fine,” in response to the v4
piano/drum comparison question. Prior overall feedback: “for now they are okay
but we have to improve in a production quality but as a start they are fine.”
**Overall owner review: PARTIAL.**
This accepts the prototype as a starting point. It does not establish per-style,
per-seed or production-quality acceptance. The next quality priorities remain
instrument realism/articulation, coherent arrangements, clean vocal treatment
and evaluation across diverse consented inputs.

- [ ] **N01 — PARTIAL:** General prototype feedback received. Complete the review
  of all three new styles. Record timestamps and
  separate judgments for instrument sound, groove, coherence, ending and enjoyment.
  Owner supplies observations; development work records and acts on them.
- [x] **N02 — PASS:** The reported piano/drum concern has informal owner
  acceptance on v4: “they are fine.” Acoustic samples, three piano dynamics,
  alternate takes and room treatment are implemented. Production realism and
  diverse-input assessment remain open under E01/M1; no rating was invented.
- [ ] **N03 — PARTIAL:** Resolve experimental's awkward passages. Fewer melody
  notes, longer bass notes and better-spaced chops are implemented; listen for
  remaining problems before closing this issue.
- [ ] **N04 — PARTIAL:** Confirm the varied openings and new break/return structure
  feel intentional across seeds 4123–4125. Code coverage is not listening evidence.
- [ ] **N05 — NOT RUN:** Rate whether the original speech remains recognizable
  in each style. Waveform preservation passes, but intelligibility is unmeasured.
- [ ] **N06 — PARTIAL:** Club v8 adds bass harmonics, revised drum balance/decay,
  build/return accents, longer deduplicated voice fragments and matched comparisons.
  V4 piano/drums have prior owner acceptance; club listening/reference similarity,
  formal quality, recognizability and diverse-input listening remain open.
- [ ] **N07 — NOT RUN:** Audition v8 club bass balance, drum impact, texture, voice
  clarity and transitions at 0:10/0:17/0:24; record exact version/timestamp and
  desired change before claiming this meets the requested production direction.

Record against [club v8](docs/club-refinement.md) or the relevant prior revision, with the exact
filename/seed, timestamp, observation, desired change and eventual evidence.
Do not close N02–N05 merely because another implementation is committed.

## Completed development

- [x] **2026-10-23 — Runpod technical setup:** Both products generated real cloud audio with verified R2 receipts; fixed driver placement, storage URL shape, terminal failure handling and repeat provisioning. All workers disabled after testing. [Evidence and remaining hosted gates](docs/runpod-setup.md).

- [x] **2026-10-22 — Live DJ sampler and release preparation:** Native consented four-second microphone capture, selected-deck playback/stop/clear and paired-web sampler controls; fixed-memory audio publication and cancellation; 0.3.0 Developer ID release candidate and truthful website download/setup section. Portable/native/browser/site checks, actual two-source routing and scoped owner listening/recovery pass. The real 60-minute run and capture-only wake lifecycle also pass; external release and deferred hardware gates remain tracked above. [Report and evidence](docs/live-dj-finish.md).

- [x] **2026-10-21 — Private action replay:** Clocked, backwards-compatible instrument traces; captured sequencer commands without per-note callback allocation; bounded local source decoding and A/B/C/instrument reconstruction. Browser capture/CLI replay and regression evidence: [report](docs/mix-action-replay.md).

- [x] **2026-10-21 — Live Source local implementation:** Mac companion selects one audio process and stereo output; private tap suppresses original output while read, with stop/error/sleep/paired-disconnect cleanup. Fixed-buffer native EQ/filter/echo/roll and confidence-gated percussion; authenticated loopback control with exact origins, 15-minute tokens and 5-second heartbeat timeout. Packaged app launch, portable DSP/sanitizers, Swift security tests, real HTTP/browser controls and muted browser fallback PASS. Native capture/hardware/listening, hosted HTTPS pairing and public signed distribution NOT RUN. GitHub-only delivery. [Report](docs/live-source-companion.md).

- [x] **2026-10-21 — Hardware deck design and music curation:** Original raised platters, graphite chassis, recessed displays and stable hover/focus outlines across homepage, studio and Academy. Read-only Aurowall catalogue reduced from 94 to 72 music tracks; excluded categories cannot stream by old IDs. Muted Chromium/WebKit transport, responsive/axe, simulated touch and reduced-motion checks PASS; build, typecheck, bundle audit, 35 site and 102 web tests PASS. Runtime `c308eea` deployed READY with exact hosted assets/gates and full CI `39676250203` PASS; human checks deferred. [Report](docs/deck-hardware-and-curation.md).

- [x] **2026-10-21 — Inline payments and Aurowall music:** Implementation `5587563`, disclosure/runtime `a06151f` deployed READY with full CI PASS. Embedded Stripe purchase/decline/retry/refund/repurchase/disputes and permanent production webhook fixture PASS. Read-only 94-track Aurowall catalogue, explicit homepage playback, online DJ selection and linked partnership; real R2 Chromium/WebKit seeking/playback, responsive/axe and muted output PASS. TODO, progress, rights/privacy and owner configuration updated. Existing release holds remain; authenticated hosted music UI and human/live-charge acceptance are not claimed. [Report](docs/inline-payments-aurowall.md).

- [x] **2026-10-21 — Academy automated release completion:** Runtime `c74ad49` deployed READY with full hosted CI PASS. All ten silent Chromium/WebKit 2/5/5/30/60-minute recording, download, assessment/account-save and decoded PCM/hash checks PASS. Fixed bounded stale worklet timestamps without changing audio; original failures retained. Permanent Aurowall test/live configuration, actual hosted test purchase/refund, non-payment live delivery, production schema/backup restore and scheduled retries verified. Human checks deferred; merchant/live-charge/mailbox acceptance and public sales remain open. [Release report](docs/academy-release-checks.md), [recording evidence](docs/evidence/academy-endurance-silent/browser.json).

- [x] **2026-10-21 — Academy release checks:** Full hosted CI passes after `b4e03e5` / `19ae151`; reviewed production migrations and private backup restore pass; owner-preview deployment READY and first lesson accepted. Actual Aurowall Stripe test purchase/decline/refund/repurchase/dispute and signed callback checks pass. Both browsers pass two/five-minute assessments and decoded recording checks. 30/60-minute runs stopped after owner reported unwanted speaker playback; audible runner now requires an explicit opt-in. Public sales, full human/hardware evidence and permanent hosted billing remain open. [Report and receipts](docs/academy-release-checks.md).

- [x] **2026-10-21 — Academy local course expansion:** 20 runnable lessons across six stages, shared-clock course transport, live instrument layering, bounded private set recording, explicit knowledge checks, prerequisite-complete badge and corrected v2 audio. 96 web + 12 Academy/DB + 31 site tests, build/typecheck/audit and broad/focused Chromium/WebKit evidence pass. Human learning, long endurance, providers and release remain open. [Implementation and exact limits](docs/academy-completion.md).


Entries follow implementation order. Historical results apply to their revision;
current platform results are in [the refinement report](docs/evidence/club-refinement/report.json).
The [evaluation preparation report](docs/evidence/evaluation-preparation/report.json)
adds an eighth passing suite and confirms the unchanged renderer/audio.

| Done | ID | Status | Development | Commit / evidence |
| --- | --- | --- | --- | --- |
| [x] | WEB-BUILD | PASS | Build the studio from tracked sources before site preparation; isolated SDK/Python/CMake bootstrap, clean Mac/Amazon Linux builds, seven unit tests each, exact seven-style browser audio and CI regression job. Actual Vercel/remote CI NOT RUN. | [Evidence](docs/vercel-clean-build.md) |
| [x] | DJ13 | PASS | MIDI Learn with channel-specific pickup, bounded controls and real audio/offline checks | [Evidence](docs/midi-learn.md) |
| [x] | DJ12 | PASS | Independent deck tone/echo, safe buffer clearing, browser timing/PCM and offline checks | [Evidence](docs/deck-effects.md) |
| [x] | DJ08 | PASS | Original Talk bass, four percussion voices, local reference analysis and portable/browser audio checks | [Evidence](docs/talk-bass.md) |
| [x] | DJ07 | PASS | Local instrument tone/echo, measured browser timing, stereo sweep fix and playable piano pairs | [Effects evidence](docs/instrument-effects.md) |
| [x] | P01 | PASS | C++17 foundation, sample-frame scheduling, polyphony, WAV output, validation and deterministic tests | `02d0e18` · [M0a](docs/m0a-report.md) |
| [x] | P02 | PASS | Input decoding/resampling, onset analysis, three rule-based styles, clean hooks, stems, score exports and C ABI | `5837dfa` · [architecture](docs/remix-architecture.md) |
| [x] | P03 | PASS | Transfer archive, supplied speech fixture and reviewed-branch handoff packaging | `5837dfa`, `1cb2e92` · [handoff](docs/mac-agent-handoff.md) |
| [x] | P04 | PASS | Actual M5 release/sanitizer execution, original cross-OS comparison and isolated build interpreter | `64e4185` · [portability](docs/mac-portability.md) |
| [x] | P05 | PASS | Import and technically validate the owner's consented voice; preserve original M4A and PCM conversion | `bac1bf4` · [voice trial](docs/voice-trial.md) |
| [x] | P06 | PASS | Prevent duplicate chop starts and chops masking complete speech hooks | `b29fb74` · [spacing evidence](docs/evidence/vocal-spacing/report.json) |
| [x] | P07 | PASS | Fourteen pinned CC0 instrument samples, provenance/license ledger and integrity verification | `176b9b9` · [acoustic revision](docs/acoustic-review.md) |
| [x] | P08 | PASS | Seeded clean-speech, instrumental and fragment openings; reduced high-note density | `176b9b9` · [acoustic revision](docs/acoustic-review.md) |
| [x] | P09 | PASS | Full local signal analysis of Down, Question and Blood Club; selected matched-level excerpts | `48342ca`, `2260689` · [reference analysis](docs/reference-analysis.md) |
| [x] | P10 | PASS | Actual rhythm-section breaks, varied returns, nearby chord inversions and shorter melodic responses | `2260689` · [v2 changes](docs/arrangement-review.md) |
| [x] | P11 | PASS | Velocity-dependent tone, instrumental early reflections and 80 ms vocal breathing room | `2260689` · [v2 changes](docs/arrangement-review.md) |
| [x] | P12 | PASS | Fresh M5 release/sanitizer and Linux arm64 release: seven suites each; exact plans/events and 15 identical WAVs | `2260689` · [comparison](docs/evidence/arrangement-review/portability-report.json) |
| [x] | P13 | PASS | Nine new owner-voice mixes, twelve stems, a baseline, 15-file review page and browser playback checks | `2260689` · [audio/browser evidence](docs/arrangement-review.md) |
| [x] | P14 | PASS | Shuffled baseline comparison tools, blank ratings and preregistered evaluation protocol | [Protocol](docs/evaluation-protocol.md) · [pilot preparation](docs/evidence/arrangement-review/listening-preparation.log) |
| [x] | P15 | PASS | Smoke-test overwrite protection and comparison of mix settings | `2260689` · [verification](docs/evidence/arrangement-review/report.json) |
| [x] | P16 | PASS | Pause-aware vocal crop endings and attack pre-roll, four-rate regression, fresh M5/Linux validation and nine voice mixes | [v3 evidence](docs/vocal-boundaries.md) |
| [x] | P17 | PASS | Three recorded piano dynamics, two piano/drum takes, 53 pinned samples, release-test identity fix, fresh M5/Linux checks and matched comparison | [v4 evidence](docs/instrument-articulation.md) |
| [x] | P18 | PASS | Exclusive staged exports, completion hashes, C ABI/CLI cancellation, collision/interrupt tests and extensible WAV decoding | [Workflow evidence](docs/workflow-hardening.md) |
| [x] | P19 | PASS | Actual consented M4A conversion, three-style/stem workflow, browser playback and separate-prefix blind pilot | [Workflow evidence](docs/evidence/workflow-hardening/report.json) |
| [x] | P20 | PASS | 33 offline timing/RSS trials; current M5/Linux release and M5 sanitizers; 18 identical cross-OS WAVs | [Benchmark](docs/evidence/workflow-hardening/benchmark.json) |
| [x] | P21 | PASS | Pinned Linux/macOS CI matrix and cross-OS comparison recipe prepared and locally checked; hosted execution remains open | [Workflow](.github/workflows/core.yml) |
| [x] | P22 | PASS | Frozen consent/hash/rubric batch, three seeds, retained failure counts, distinct answer codes, actual owner pilot and eighth M5/Linux test suite | [Evaluation preparation](docs/evaluation-batch.md) |
| [x] | P23 | PASS | Original 14-sample electronic bank, club form and source-driven bass, stem-consistent kick ducking, CLI/C ABI/import/schema/CI support; nine M5/Linux suites, exact WAVs and eight-player comparison | [Club evidence](docs/club-direction.md) |
| [x] | P24 | PASS | Club v8 bass/drum revision, transition accents, pause-ended deduplicated crops; corrected stem take identity; nine M5/Linux suites, current portability and 13-player comparison | [Refinement evidence](docs/club-refinement.md) |
| [x] | P25 | PASS | Native Instant Remix app: consent, record/import, waveform/trim, worker C ABI, three styles/club, replay/regeneration, saved sessions, WAV sharing/deletion and verified recovery | [iOS evidence](docs/ios-instant-remix.md) |
| [x] | P26 | PASS | Fix mobile worker stack overflow by allocating the fixed voice pool at construction; retain allocation-free processing and unchanged PCM/events | `394743f` · [iOS evidence](docs/ios-instant-remix.md) |
| [x] | P27 | PASS | Release bundle audit, privacy manifest/notices, policy draft, release checklist and live feasibility protocol prepared; implementation does not close launch gates | [Readiness](docs/release-readiness.md) |
| [x] | P28 | PASS | Bounded RTX 3090 pretrained music trial: ten clips, timings/memory, retrieval and verified rental deletion | `f0e95d0` · [Trial](docs/cloud-music-trial.md) |
| [x] | P29 | PASS | Local selective-voice research: six arrangements, controls/stems, matched review page, six tests and Chromium/WebKit playback | [Evidence](docs/voice-research.md) |
| [x] | P30 | PASS | Strict offline JSON plan replay, explicit deterministic fallback, completion receipts, adversarial tests and actual M5/Linux/WASM comparisons | [Evidence](docs/plan-import.md) |
| [x] | P31 | PASS | Independent voice pitch/duration controls, bounded 1.1 import/export, preserved clean hooks, owner comparisons and fixed 32-bit resampling overflow | [Evidence](docs/voice-transforms.md) |
| [x] | P32 | PASS | Bounded tempo echo with clean-hook clearance, stereo decay, 1.2 plan import/export, private owner comparisons and actual M5/Linux/WASM checks | [Evidence](docs/vocal-echo.md) |
| [x] | P33 | PASS | Hip-hop harmonic/rhythmic seed variety, recurring phrases and developed returns; 64-seed structural audit, four owner comparisons, exact M5/Linux/WASM agreement | [Evidence](docs/hiphop-diversity.md) |
| [x] | P34 | PASS | Shared tempo maps and gain/pan automation; native/import/schema/echo/stem contracts, 40 exact M5/Linux WAVs, four private comparisons | [Evidence](docs/timeline.md) |
| [x] | P35 | PASS | Funk grammar with seed/input variation; CLI/C ABI/schemas/export and web generate/save/play/download; 50 exact M5/Linux WAVs, five WASM styles and four owner comparisons | [Evidence](docs/funk.md) |
| [x] | P36 | PASS | Call-response/hybrid, recent-structure rejection, native/browser contracts and private review; commit `a09220e` | [Evidence](docs/creative-strategies.md) |
| [x] | P37 | PASS | Recorded CC0 guitar, alternating strum/staccato, versioned import/stems and notices; commit `8fbdfbb` | [Evidence](docs/guitar.md) |
| [x] | P38 | PASS | Organ/pad/lead, wider harmony/groove, eight-attempt history checks, 93 exact cross-OS WAVs and 42 old-score replay WAVs | [Evidence](docs/sustained-instruments.md) |
| [x] | P39 | PASS | Bounded opt-in instrument feedback reverb; 91 exact M5/Linux WAVs, native/import/stem tests; commit `ceaf0b9` | [Evidence](docs/feedback-reverb.md) |
| [x] | P40 | PASS | Optional local CPU word-time/crop tools and schema-preserving voice transforms; commit `ceaf0b9`; accuracy/listening remain open | [Evidence](docs/word-timing.md) |
| [x] | P41 | PASS | Preserve licensed evaluation credits and add anonymous listening pages; commit `0a078b3` | [Evidence](docs/licensed-evaluation.md) |
| [x] | P42 | PASS | Accept short energetic transients with bounded context; commit `6912218`; M5/Linux regression checks | [Evidence](docs/licensed-evaluation.md) |
| [x] | P43 | PASS | Licensed 23-source technical cohort, 276 mixes, 69 blank review packets, 92 exact cross-OS WAVs; listener summary tool commit `e798f8b` | [Evidence](docs/licensed-evaluation.md) |
| [x] | P44 | PASS | Preserve healthy mixes when a stored session is malformed; explicit browser selection, fresh artifacts, 56 browser checks and seven exact Firefox/native WAVs | [Evidence](docs/web-recovery.md) |
| [x] | P45 | PASS | Opt-in offline studio with verified bounded caches, safe waiting updates/removal, root/site integration and player cleanup before URL revocation | [Evidence](docs/offline-studio.md) |
| [x] | P46 | PASS | Optional install prompt/guidance, scope-safe manifest and original app icons; 38 offline/manifest checks, 20 Chromium workflow checks and 14 unit tests; physical installation NOT RUN | [Evidence](docs/web-installation.md) |
| [x] | P47 | PASS | Reject constant-offset input without changing accepted music; M5/Linux 13/13, 16 exact before/after and cross-OS renders, 23 frozen source checks, seven exact browser/native renders and 59 browser flow checks | [Evidence](docs/dc-input-validation.md) |
| [x] | P48 | PASS | Reject constant offsets and empty decoded speech in optional research tools; 11 unit tests plus crop integration, 42 unchanged comparison WAVs, six exact event plans and unchanged M5 model estimates; accuracy/listening remain open | [Evidence](docs/research-input-validation.md) |
| [x] | P49 | PASS | Local private account audio: explicit voice-storage consent, verified save/play/seek/download/remove, PostgreSQL quota/crash/retry tests and 20 browser checks; live R2 remains NOT RUN | [Evidence](docs/private-account-audio.md) |
| [x] | P50 | PASS | Local reviewed catalogue and private playlists: explicit public consent, distinct reviewer, privacy/revocation tests, responsive persistent player and two-browser account regressions | [Evidence](docs/reviewed-catalogue.md) |
| [x] | P51 | PASS | Bounded expired-auth cleanup: expiry indexes, target guard, active-account preservation, locked-row/concurrent retry tests and local usage counts | [Evidence](docs/auth-cleanup.md) |
| [x] | P52 | PASS | Recover unavailable playlist slots, keep withdrawn reports out of the actionable queue, reject stale decisions and retain unseen concerns; database/concurrency and two-browser checks | [Evidence](docs/catalogue-withdrawal.md) |
| [x] | P53 | PASS | Local blinded rating form, frozen-packet/hash/scope protection, compatible CSV exports and two-browser checks; original 483 rows remain blank, human listening NOT RUN | [Evidence](docs/listening-review.md) |
| [x] | P54 | PASS | Full-file x/y/z signal measurements, plots, unchanged source hashes and seven CLI/repeatability checks; direct listening NOT RUN | [Evidence](docs/reference-xyz-analysis.md) |
| [x] | P55 | PASS | Two-bar source-derived Call & Response answers, accent response and developed returns; 65 exact cross-OS WAVs, 21 WASM comparisons, old-score replay and four private matched pairs | [Evidence](docs/source-motif.md) |
| [x] | P56 | PASS | Bounded RTX 3090 adapter pilot: corrected decode headroom, five provisional clips, 250 training steps, verified checkpoint, exact base repeat, four changed matched pairs, two-browser playback and rental/key cleanup; musical quality NOT RUN | [Evidence](docs/style-training-retry.md) |
| [x] | P57 | PASS | Local calibrated waveform diagnostics: 40 training-excerpt pairs, internal repetition, same-brief seed comparison, three tests and preserved artifacts; perceptual novelty and musical quality NOT RUN | [Evidence](docs/style-waveform-diagnostics.md) |
| [x] | P58 | PASS | Document revised improviser/DJ-studio direction separately, preserve M0a scope and master, verify existing playable demo and stop later implementation pending review | [Addendum](docs/web-studio-addendum.md) · [Receipt](docs/evidence/web-studio-direction/review.json) |
| [x] | P59 | PASS | Two local DJ decks and real manual mixing, stereo metering, consent/failure handling and disconnected-server playback; 16 unit, 26 DJ browser and 40 voice regression checks | [Evidence](docs/dj-mixer.md) |
| [x] | P60 | PASS | Complete source-contour experiment and cross-platform evidence; record inconclusive owner listening and restore unchanged production engine. Musical benefit not established; candidate not promoted | [Evidence](docs/source-contour.md) |
| [x] | P61 | PASS | Execute bounded Blood Club training, fix checkpoint loader, verify both adapters and 13 WAVs, prepare four matched groups, scan waveform reuse, preserve originals and delete rental/keys; musical-quality gate stays open | [Evidence](docs/blood-training-run.md) |
| [x] | P62 | PASS | Measure adapter effect after gain/DC fitting, merge overlapping detection coverage, audit train/holdout similarity and export four exact reference crops; independent split fails and human-quality gate remains open | [Evidence](docs/style-adapter-effect.md) |
| [x] | P63 | PASS | Fix electrical offset masking source attacks/pauses and inventing noise pitch; validate Mac/Linux/WASM, preserve 65 existing renders and saved-score replay | [Evidence](docs/analysis-offset.md) |
| [x] | P64 | PASS | Prepare controlled phrase-articulation research, verify score isolation and 40 Mac/Linux WAVs, deliver 16 matched private A/B listening files; human benefit and default promotion remain open | [Evidence](docs/phrase-articulation.md) |
| [x] | P65 | PASS | Correct sustained-tone period/key selection; calibrate 180 cases, verify native/WASM output and saved-score compatibility, characterize four changed speech keys | [Evidence](docs/pitch-period.md) |
| [x] | P66 | PASS | Fix recording-offset energy masking vocal pauses; preserve edge selection and 65 existing WAVs, verify Mac/Linux/WASM and saved scores, audit 20 licensed speech sources | [Evidence](docs/chop-offset.md) |
| [x] | P67 | PASS | Bound active vocal processing, preserve all comparison audio and event frames, validate dense/echo schedules and measure actual Mac/Linux offline timing | [Evidence](docs/active-vocals.md) |
| [x] | P68 | PASS | Add reproducible 32-voice native/WASM stress diagnostics, playable output and exact frame/PCM comparison; record timing overruns without closing live gates | [Evidence](docs/live-deadline.md) |
| [x] | P69 | PASS | Run shared engine in actual M5 default-output callback for 60 seconds, retain exact PCM/events, calibrated timing/continuity checks and bounded native result | [Evidence](docs/audio-callback.md) |
| [x] | P70 | PASS | Validate production instrument AudioWorklet in Mac/Linux Chromium and WebKit, retain six exact captures and command-frame evidence without hiding timing-screen failures | [Evidence](docs/worklet-load.md) |
| [x] | P71 | PASS | Reuse identical per-voice interpolation coefficients, validate exact before/after audio on Mac/Linux/WASM, measure note setup and retain failing browser timing screens | [Evidence](docs/interpolation-cache.md) |
| [x] | P72 | PASS | Precompute common cold-note filter coefficients; preserve exact Mac/Linux/WASM audio and retain failing browser timing evidence | [Evidence](docs/interpolation-table.md) |
| [x] | P73 | PASS | Bound manual playback-start failures, verify cancellation and uninterrupted other-deck audio, isolate Linux WebKit restart failures and retain exact PCM/frame evidence | [Evidence](docs/media-restart.md) |
| [x] | P74 | PASS | Repair local-file preload/routing, serialize pitch transitions, gate paused native input, pass four complete browser suites and preserve exact offline audio while retaining failed controls | [Evidence](docs/media-preload.md) |
| [x] | P76 | PASS | Wire existing Neon production database, rehearse/apply migrations and verify browser account/library flow; retain external provider gates | [Evidence](docs/neon-setup.md) |
| [x] | P75 | PASS | Bound browser audio wake-up, protect newer notes from stale failures, verify 44 unchanged WAVs and preserve Linux WebKit failure gates | [Evidence](docs/audio-resume.md) |

## Engineering backlog

These are known gaps or candidate improvements, not promises that every feature
is needed. Prioritize by recorded listening defects and product requirements.

- [ ] **E01 — PARTIAL:** V4 implements three recorded piano dynamics and two
  seeded piano/drum takes from the pinned cleared libraries. Evaluate realism,
  layer transitions and repeated hits. Bass layers and longer acoustic tails
  remain candidates. The new electronic club palette needs listening assessment.
- [ ] **E02 — PARTIAL:** Improve phrase/chop selection if N03/N05 show cut words.
  V3 adds sustained low-energy endings and attack pre-roll. Club v8 extends
  the pause search, deduplicates overlapping candidates and prefers pause-ended crops;
  optional offline word-time estimates/crop proposals are implemented. [Offset-resistant pause detection](docs/chop-offset.md) now retains known endings under constant recording offsets; reliable word boundaries, semantic selection and listening acceptance remain open.
- [ ] **E03 — PARTIAL:** Independent pitch/time DSP, bounded 1.1 plans, cached
  preparation and four owner comparisons implemented. Four-rate technical checks,
  exact M5/Linux PCM, preserved clean hooks and a three-pulse probe pass. Formant
  preservation, diverse transient/word clarity and human acceptance remain open;
  default generated chops still use original speed. [Evidence](docs/voice-transforms.md).
- [ ] **E04 — PARTIAL:** Expand expressive mixing/effects when justified by
  listening. Early reflections, hook/kick ducking and opt-in three-repeat tempo
  echoes and track gain/pan automation exist. Clean-hook clearance, bounded tails,
  exact cross-OS PCM and local comparisons checked. Bounded instrument feedback reverb is now implemented; human acceptance remains open. [Echo evidence](docs/vocal-echo.md);
  [automation evidence](docs/timeline.md).
- [x] **E05 — PASS:** CLI/C ABI exports stage files, preserve existing paths,
  publish a verified completion marker last and support cancellation. Actual
  SIGINT/SIGKILL and collision tests pass. Abrupt kills may leave incomplete
  files/`.partial`; consumers must verify completion. Power-loss durability and
  automatic recovery are not claimed. [Contract](docs/workflow-hardening.md).
- [x] **E06 — PASS:** Native extensible WAV works without repacking; a local
  consented M4A/WAV script converts, renders and builds a listening page. Actual
  owner M4A and integration tests pass. Optional installed FFmpeg is required;
  this is a desktop developer workflow, not the future iPhone UI.
- [ ] **E07 — NOT RUN:** Validate this revision on the original physical Intel
  Linux machine when available. Current cross-OS PASS covers Linux arm64 on M5.
- [ ] **E08 — PARTIAL:** Linux/macOS release/sanitizer matrix, asset/C ABI tests
  and procedural-control comparison are committed and locally verified. Hosted
  execution is **NOT RUN**; no push or runner result is claimed.
- [x] **E09 — PASS:** Measure representative offline time/memory: 11 source/style/
  rate/stem cases × 3 trials, each export verified. [Results](docs/evidence/workflow-hardening/benchmark.json).
  Worst-case/live/iPhone performance remains separately open under I04/L01/L03.

- [x] **E10 — PASS:** Fix solo-export renumbering that changed sample takes/gains.
  Filter compiled events with original IDs, retaining kick ducking. New float
  reconstruction regression and real four-style PCM checks pass; old masters
  remain unchanged, and earlier stems are preserved as historical files.
- [x] **E11 — PASS:** Read bounded `1.0-remix` plans in the offline CLI, verify
  caller/source/permission and native constraints, replay exact events, and record
  explicitly requested deterministic fallback. Five-style round trips, 50 rejected
  candidates and preserved actual owner audio verified. [Evidence](docs/plan-import.md).
- [ ] **E12 — PARTIAL:** Tempo maps and track gain/pan automation implemented,
  with opt-in native/CLI plans and cross-platform tests. Recorded guitar with up/down strums, normal/staccato attacks, two dynamics and
  alternate takes is implemented across plans/stems/web. Organ, dedicated pad/lead
  voices, versioned import and optional stems are now implemented. Their audible
  quality remains unassessed. [Instrument evidence](docs/sustained-instruments.md). Independent pitch/time and
  expanded effects remain under E03/E04. [Timeline evidence](docs/timeline.md).
  Do not call the engine feature-complete.

- [ ] **E13 — PARTIAL:** All six named Stage A rule directions now exist, plus
  club and the baseline. Hip-hop/funk seed variety, standalone call-response and
  hybrid with phrase-boundary rhythm changes are implemented. The local web
  worker rejects exact recent instrumental structures with at most eight candidate
  renders, ignoring instrument swaps as a source of novelty, preserving actual selected seeds and previous saved mixes. Native,
  Linux, browser and input-response checks pass. Reggae/experimental/club now vary
  harmony and groove, with seed-selected later breaks in reggae/experimental; perceived variety, broader
  listening and learned contextual direction remain open. Finite rules can still
  sound similar. [Evidence](docs/creative-strategies.md).

- [x] **E14 — PASS (technical):** [Bounded active vocal processing](docs/active-vocals.md).
  Retire ended vocal triggers instead of scanning the entire history per sample;
  preserve summation order and exact end/start slot reuse. Mac/Linux suites,
  sanitizer, 75 unchanged cross-platform WAVs and 11 WASM comparisons pass.
  Dense/echo imports and allocation-free processing validated; interleaved
  offline dense/echo speedups of 2.16–2.39× M5 and 1.90–2.14× Linux; ordinary
  medians slightly slower, so no general speedup claimed. Physical/live latency and new musical quality
  **NOT RUN**; this does not advance M1 or certify venue performance.

- [x] **E15 — PASS (technical):** [Reuse identical interpolation coefficients](docs/interpolation-cache.md).
  Cache one cutoff per sampled voice; reset all note state and recompute when
  the cutoff changes. Native Mac/Linux 15/15 suites, sanitizer, 756 regression
  cases, exact before/after voice probes, 75 unchanged WAVs per platform,
  11 remix WASM comparisons and four real-time browser captures pass.
  Repeated note-start work is reduced; cold starts and cache misses still compute
  the table. Browser timing screens remain **FAIL** (3–8 ms readings); full live
  qualification **PARTIAL**, physical latency and musical quality **NOT RUN**.

- [x] **E16 — PASS (technical):** [Precomputed common interpolation coefficients](docs/interpolation-table.md).
  Empty-cache notes copy constant data for cutoff 0.94; other cutoffs retain the
  original calculation. Mac/Linux 15/15 suites, sanitizer, exact coefficient/
  waveform/event comparisons, 75 unchanged WAVs per platform, 1,170 WASM note
  cases, 11 remix comparisons and four browser captures pass. Cold-note setup
  improves; total stress throughput is similar. Three browser timing screens
  still **FAIL** (3–10 ms); complete live/production readiness **PARTIAL**,
  physical latency, venue and musical quality **NOT RUN**.

## M1: formal musical-quality evaluation

Prerequisites: a reviewable revision, an eligible consented dataset and real
listeners. Preparation does not pass this milestone. Follow the
[evaluation protocol](docs/evaluation-protocol.md); retain per-style failures.

- [ ] **Q01 — PARTIAL:** Engine/source/binary/preparation/rubric hashes, technical
  rules and seed schedule frozen for the licensed cohort. Actual reviewer
  assignment remains missing. [Cohort](docs/licensed-evaluation.md).
- [ ] **Q02 — PARTIAL:** Twenty public-license speech sources from distinct speaker
  IDs, three public-domain non-speech recordings and one synthetic silence control
  acquired with attribution and hashes. Recorded quiet-input coverage and human
  category verification remain. The owner recording keeps its owner-only scope.
- [x] **Q03 — PASS:** Corrected 23-recorded-source, three-seed technical cohort:
  69/69 exports per style, 276 mix WAVs and 69 blank blinded packets; three expected
  synthetic-silence rejections. Before-fix failures remain in the record. This
  closes technical preparation only. [Evidence](docs/licensed-evaluation.md).
- [ ] **Q04 — NOT RUN:** Run randomized, blinded comparisons with the fixed-loop
  baseline and at least three independent reviewers per eligible block.
- [ ] **Q05 — NOT RUN:** Assess the provisional targets: >=85% technically usable,
  >=90% speech recognition, >=70% enjoyment ratings >=4/5, >=30% share intention,
  audible strategy variety, zero critical glitches and preference over baseline.
- [ ] **Q06 — PARTIAL:** Bounded response validator and per-clip summaries with
  uncertainty, style-specific failures and reviewer-ID coverage implemented.
  A verified local browser questionnaire now exports compatible CSVs without
  modifying frozen packets or supplying answers. [Form evidence](docs/listening-review.md).
  [Workflow](docs/evaluation-batch.md). Real submissions and M1 evidence review
  remain **NOT RUN**; no ratings are generated.

## Later milestones

The master specification places M1–M5 behind evidence gates. Continuing without
per-step pauses does not supply missing listener/device evidence or authorize
paid infrastructure, training on reference tracks, publishing or charging users.

### M2: constrained AI direction — PARTIAL (offline prerequisite only; quality hold remains)

- [ ] **A01 — NOT RUN:** After the quality baseline, review candidate model/code
  licenses and benchmark actual M5 latency, memory, GPU use and CPU fallback in a
  separate environment; keep `~/mlx-env` unchanged.
- [ ] **A02 — PARTIAL:** Typed offline plan ingestion, strict validation and explicit
  deterministic fallback now pass. No model is called; provider integration,
  timeout/cost/retry policy and measured model schema-valid rate remain NOT RUN.
  The importer makes one bounded attempt with zero retries. [Contract](docs/plan-import.md).
- [ ] **A03 — NOT RUN:** Compare model-directed arrangements with the rule engine
  in a blinded trial. Advance only with measured benefit and bounded cost.
- [ ] **A04 — NOT RUN:** Consider learned action ranking only with cleared,
  opt-in data and speaker/phrase/session holdouts. The owner subsequently confirmed
  x/y/z training permission; C07 records the completed research-only adapter
  trial. It does not advance production M1/M2 or establish distribution rights.

### M3: iPhone Instant Remix — PARTIAL

- [x] **I01 — PASS:** Build the SwiftUI consent → record/import → waveform/trim
  → three mixes/club → replay/remix again → save/share flow. No account or cloud.
  [Implementation and tests](docs/ios-instant-remix.md).
- [x] **I02 — PASS:** Existing C ABI runs on a worker with honest indeterminate
  progress, errors/cancellation, hash-verified recovery and scoped local deletion.
  Fix the oversized inline voice pool exposed by the mobile worker stack.
- [ ] **I03 — PARTIAL:** Final simulator consent, denied microphone fallback, playback,
  persistence, sharing/deletion and large-text checks pass. Physical UI automation
  failed to enable twice; owner sees no prompt/switch despite enabled Developer Mode.
  Follow-up Release launch and owner recording/generation/playback pass; three
  styles completed in 1.830 s. Complete interruption, route, headphone/speaker,
  save/share/relaunch and lifecycle validation on hardware.
- [ ] **I04 — PARTIAL:** Six physical iPhone integration tests and three optimized timing/CPU/memory trials pass;
  [current device results](docs/ios-instant-remix.md) distinguish real execution
  from simulator checks. Sustained CPU, memory, battery/thermal and codec assessment remain.

### M4: live improvisation — PARTIAL

- [ ] **L01 — PARTIAL:** [Provisional latency/glitch budgets and measurement protocol](docs/live-research-protocol.md) defined; bounded [native callback](docs/audio-callback.md) and [browser worklet](docs/worklet-load.md) execution measured. Timing-screen failures, physical round-trip and full-session feasibility remain open.
- [x] **L02 — PASS, local implementation:** Explicit opt-in bounded worklet capture, energy endpoint, off-callback resampling/director and bar-boundary responses. Capture pauses during C; one reusable buffer, cancellation/route/interruption cleanup. Browser runtime messaging is not a hard real-time guarantee. [Evidence and limits](docs/duration-and-live-phrases.md).
- [ ] **L03 — PARTIAL:** Synthetic-browser continual cycles, route-change/consent cleanup and unit interruption recovery PASS. Actual feedback isolation, calibrated endpoints, end-to-end latency and sustained physical sessions remain NOT RUN. [Evidence](docs/duration-and-live-phrases.md).

### M5: production and monetization — PARTIAL

- [ ] **R01 — PARTIAL:** Existing instrument provenance, bundled notices, local privacy/deletion controls, manifest and [policy draft](docs/privacy-policy-draft.md) prepared. Public entity/contact/URL, rights review and sharing-policy acceptance remain.
- [ ] **R02 — PARTIAL:** [Release preparation](docs/release-readiness.md) and local app checks exist. Complete device/beta/App Store readiness checks, collect
  opt-in crash/performance evidence and measure replay, save/share and retention.
- [ ] **R03 — NOT RUN:** If paid/cloud generation is pursued, establish explicit
  budgets, timeouts, retries, cost accounting and entitlement limits first.
- [ ] **R04 — NOT RUN:** Review demand and quality evidence, obtain the required
  release authorization, and only then publish or enable monetization.

Still deferred by the master: Android, multiuser sessions, creator marketplace,
manual DAW, personalized generative singing and artist/voice imitation. These
are not silently included in the active backlog.

## Keeping this useful

Update the relevant task whenever code, listening feedback or gate evidence
changes. Keep its ID stable, attach the commit/report, and check it only when
its stated completion criterion is met. Reopen failed or regressed work with
`FAIL` or `PARTIAL` and the concrete observation. Preserve completed history.
New tasks use the matching prefix and next unused number. Update the milestone
table and [progress](docs/progress.md) together; do not invent scores or dates.

- 2026-10-18: Added call-response and hybrid across native/CLI/C ABI/web contracts;
  local recent-composition rejection, 80 exact cross-OS WAVs and seven-style
  browser agreement. [Evidence](docs/creative-strategies.md).

- 2026-10-18: Added recorded CC0 guitar, strum/staccato planning, versioned
  import/export/stems and bundled notices. [Evidence](docs/guitar.md).

- 2026-10-18: Added original organ/pad/lead, richer reggae/experimental/club variation,
  eight-candidate recent-body rejection, complete stems/import/version contracts
  and corrected instrument-bank reports. 93 exact cross-OS WAVs and 42 exact
  old-score replay WAVs; eight matched owner pairs. [Evidence](docs/sustained-instruments.md).

- 2026-10-18: Joined the browser phrase director to prepared A/C playback, with
  confirmed tempo/minor key, shared native/WASM bar timing, capture/import, preview,
  manual mixing and offline generation. Four Mac/Linux/WASM WAVs and event streams
  identical; 34 session checks, 48 DJ regressions, 40 voice regressions, 22 unit
  checks and 15/15 native suites per OS PASS. [Evidence](docs/prepared-session.md).

## R0 — improvisation intelligence foundation (2026-10-20)

R0 stopped for review as requested. The later continuation starts local R1 tooling;
it does not waive the remaining quality, rights or training gates.
[Full report and reproducible evidence](docs/r0-report.md).

- [x] **IR01 — PASS:** 35-technique taxonomy and analyzer/director/shared-engine architecture.
- [x] **IR02 — PASS:** Versioned plan envelope, native validation/replay, inspector/diff, invalid-plan tests.
- [x] **IR03 — PASS:** Fail-closed provenance ledger and five synthetic/original evaluation records; training disabled.
- [x] **IR04 — PASS:** Three structurally distinct plans, actual WAVs/stems/control, exact block-size replay and timing checks.
- [x] **IR05 — PASS:** M5 native 15/15 suites and current-build comparison; R0 11-test suite.
- [ ] **IR06 — PARTIAL:** Current Mac/Linux-VM/Chromium/WebKit three-arrangement plan/event/WAV parity PASS (exact bytes); 15/15 native groups per OS and 11 R0 tests pass. Historical M0 comparison remains FAIL (different arrangements). Physical Intel workstation/iPhone and independent quality study NOT RUN. [Follow-up](docs/r0-validation-followup.md).
- [ ] **IR07 — FAIL:** Owner rejects all four original R0 candidates as awkward/robotic in voice and instruments (one qualitative reviewer; no numeric ratings inferred). Independent human musical-quality/recognition/preferences remain NOT RUN. Separate unchanged-engine natural-voice diagnostic prepared for private audition, quality NOT RUN. [Feedback and diagnosis](docs/r0-validation-followup.md).
- [ ] **IR08 — PARTIAL:** R1 offline capture tooling now implemented under the owner's continuation; expert corpus and live capture remain open. Model training NOT RUN.

## R1 — first-party demonstration workflow (2026-10-20)

- [x] **IR09 — PASS:** Versioned offline edit trace, six native musical action kinds, exclusive private writes and actual native validation before accepting edits.
- [x] **IR10 — PASS:** Rights declarations/evidence hashes, speaker opt-in boundaries, withdrawal/expiry and cross-ledger source/session/speaker/performer/phrase/arrangement split guards.
- [x] **IR11 — PASS:** Six evaluation-only state/action/next-state examples, current-consent revalidation, one playable WAV, exact 512/113-block replay and 304 independently checked instrument events.
- [x] **IR12 — PASS:** 14 new capture tests and 11 unchanged R0 tests on M5. [Report/logs](docs/r1-demonstrations.md).
- [ ] **IR13 — PARTIAL:** Browser instrument actions/dry PCM, source-phrase pairs and post-limiter full-mix WAV capture now implemented. Gain/EQ/effect/reset schedules, observed deck history, source/plan fingerprints and aligned post-fader stems link to the WAV. Plan source hashes are checked; native/dry replay and captured-stem reconstruction pass. Observed-action reconstruction now renders A/B/C/instruments with bounded WAV/MP3/FLAC inputs and clocked sequencer/manual/MIDI traces. Exact historical master replay, verified rights and human supervision alignment remain. [Current evidence](docs/mix-action-replay.md).
- [ ] **IR14 — PARTIAL:** Bounded near-duplicate waveform detection now rejects suspected cross-split reuse at ledger ingestion and export, with calibrated synthetic controls. Permissioned expert demonstrations, verified human review and a diverse stratified corpus remain NOT RUN. [Evidence](docs/r1-capture-completion.md).
- [ ] **IR15 — NOT RUN:** R2 human comparison / R3 training. No training-authorized examples exported, no new model or paid compute; require their gates and authorization.
- [x] **IR16 — PASS:** Opt-in local instrument take, playback/WAV/action download/delete, bounded capture, cancellation on lost focus/audio/engine failure, exact shared-engine replay.
- [x] **IR17 — PASS:** 50 web unit tests; Chromium/WebKit capture flows at desktop/mobile sizes; 47 Chromium DJ regressions; audited offline bundle. Physical MIDI/latency and human quality NOT RUN.
- [x] **IR18 — PASS:** Optional private source/response pairs; four hash-linked downloads, separate consent, stale-result suppression and frozen confirmed musical context. Existing take format and offline exporter unchanged.
- [x] **IR19 — PASS:** 54 web unit tests, seven pairing flow checks each in Chromium/WebKit, 39 Chromium prepared-session regressions and localhost flow; exact response replay and desktop/mobile screenshots. Source decoding parity PARTIAL (max 4 PCM16 units); human quality/training NOT RUN. [Report](docs/r1-phrase-response.md).
- [x] **IR20 — PASS:** Separate opt-in stereo studio mix recording after effects/faders/limiter; bounded 30-second capture, local WAV/receipt/playback/delete, permission/interruption cleanup and unchanged playback routing.
- [x] **IR21 — PASS:** 59 unit tests, six full-mix checks each in Chromium/WebKit, seven existing instrument/pairing checks and 48 DJ regressions including actual disconnected capture; destination/capture PCM exact within each browser; actual 30-second stops and localhost flow. Cross-browser mixer identity PARTIAL; human quality/training NOT RUN. [Report](docs/r1-mix-recording.md).

- [x] **IR22 — PASS:** Private versioned WAV-linked gain/EQ schedules, initial target snapshot, strict validation, 4096-action bound and consent/deletion cleanup; overflow keeps WAV and reports discarded trace.
- [x] **IR23 — PASS:** 63 unit tests, eight capture checks each in Chromium/WebKit and 48 offline-inclusive DJ regressions; exact within-browser capture PCM, scheduled mute verified against WAV, mobile/desktop inspection and served-asset audit. Full replay and R1 remain PARTIAL. [Report](docs/r1-mix-automation.md).

- [x] **IR24 — PASS:** Versioned gain/EQ/effect/reset trace across A/B/C/instruments, backward validation of v1 downloads, frozen requested effect state, shared action cap and fail-closed partial-effect handling while retaining WAV.
- [x] **IR25 — PASS:** 67 unit tests; ten recorder checks each in Chromium/WebKit; 48 offline-inclusive DJ and 39 prepared-session checks; 75 echo positions within one sample frame; exact per-browser capture/destination PCM. Historical/cross-browser PCM identity PARTIAL; model training NOT RUN. [Report](docs/r1-effect-capture.md).

- [x] **IR26 — PASS:** Private versioned source inventory links exact A/B/C/normalized phrase/native bank bytes to a mix WAV, retaining loaded/unloaded history without filenames or inferred rights. Bounded deferred hashing; cancellation, read failure and timeout preserve WAV/control availability.
- [x] **IR27 — PASS:** 73 unit tests; 12 capture checks each in Chromium/WebKit; 48 offline-inclusive DJ and 40 prepared-session checks; exact source hash checks, 42-file public audit and localhost source equality. Initial Chromium timed capture had two clock discontinuities; isolated repeat had zero. Clock/PCM parity and R1 remain PARTIAL; human quality/training NOT RUN. [Report](docs/r1-source-inventory.md).

## Storage maintenance — 2026-10-20

- [x] **ST01 — PASS:** Removed 42 disposable cache directories (2.96 GiB inventoried),
  consolidated 1,557 identical audio files using independent APFS copy-on-write
  copies (8.36 GiB duplicate content), and stopped seven obsolete review servers.
  No audio files deleted; source, worktrees, credentials, databases and environments
  retained. Current studio HTTP 200; fixture, pinned R0 implementation/binary and
  26 export artifacts unchanged. Free disk space approximately 8.8 → 19 GiB.
  [Cleanup receipt](docs/evidence/storage-cleanup/report.json).

- [x] **ST02 — PASS:** Owner-authorized retirement of 6,789 older generated WAVs
  (40.66 GiB logical file data). Kept original inputs, instrument assets, M0
  smoke-test references and current R0 final examples. Project reports ~10 GiB
  (down from ~51 GiB); disk free ~66 GiB. Retained per-file hashes and renamed
  1,202 historical completion records to `.retired-export.json`. Historical
  audition pages may no longer have audio. [Receipt](docs/evidence/storage-cleanup/audio-retirement.json).
