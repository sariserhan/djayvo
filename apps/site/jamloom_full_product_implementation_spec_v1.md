# JAMLOOM — Complete Product, Engineering, Launch and Agent Execution Specification

**Version:** 1.0 | **Date:** 2026-10-20 | **Status:** Implementation directive / proposed commercial defaults

## 0. Agent mandate and precedence

You are implementing **Jamloom**, an existing project, not creating an unrelated greenfield prototype. Inspect the actual repository and its existing specs, architecture, migrations, work logs, tests, outputs and TODO files **before modifying anything**. Preserve functioning code and established conventions. The product name is **Jamloom** everywhere users see it; fix remaining legacy product names gradually without breaking APIs, authentication or existing data. This specification **adds to** the preexisting master specification, musical quality/improvisation addenda and web-studio documents; do not overwrite those documents. Where prior documents conflict with this product's **four-feature scope, billing safety or platform matrix**, this specification takes precedence. Otherwise reuse their technical detail.

**Execution:** Continue autonomously through discovery, implementation, integration, testing, refinement and deployment preparation across all feasible workstreams; do not stop simply after an initial milestone, after writing a plan or after encountering a missing account credential. Keep an honest, durable status in existing TODO artifacts and append owner actions to `docs/OWNER_HANDBOOK.md`; proceed on independent tasks using mocks/sandbox adapters if third-party configuration is missing. **Do not fabricate success, claim a passed test without running it, bypass payment controls, or pretend a production integration works when credentials are missing.** Stop only if the execution environment ends, a necessary destructive/security-sensitive action demands owner permission, no safe productive work remains, or the full acceptance matrix is satisfied. Do not bypass an existing prohibition against paid expenditure or irreversible production actions. An agent's ability to run continuously is limited by its real execution session—maintain resumable checkpoints.

**Known stack (inspect/retain):** Next.js, Better Auth, Neon Postgres, Vercel hosting, Cloudflare R2 for audio, Vast.ai rented GPU, Apple M5 MacBook Air (16 GB, MLX GPU verified) for iOS/MLX; CPU-only Linux box with ~32 GB for core DSP/testing. Use Stripe for web purchases and StoreKit/App Store in-app purchases for iOS digital credits; integrate RevenueCat if/when useful for IAP state or recurring plans. Do not replace providers without an evidence-backed architectural decision. Never print or commit secrets.

## 1. Product definition: four primary user experiences

| Feature | Public landing section | Product route | Platforms | Primary value |
|---|---|---|---|---|
| **1. AI Improvisation** | `#improvise` | `/improvise` | Web + iOS | Microphone/upload a short sound; create original expressive 15–60s musical performance with recognizable voice and live-looping techniques. |
| **2. Standalone DJ Studio** | `#dj-studio` | `/dj-studio` | Desktop web only | Mix personally owned or otherwise authorized files with functioning professional decks and virtual mixer; no controller required. |
| **3. Live Audio DJ** | `#live-dj` | `/live-dj` | Desktop web, optional native desktop companion | Listen to permitted local playback audio from browser/apps, route it through a live DJ effects/accompaniment signal chain without extracting/downloading platform streams. |
| **4. My Music DNA** | `#music-dna` | `/music-dna` | Web + iOS | User selects favorites; infer supported taste attributes and generate *original* enjoyable music, not sound-alike copies. |

Landing page at `/` introduces all four with strong demos, deep links and transparent compatibility limits. Every feature route has its own onboarding, help, pricing/credit explanation, auth gating only when needed, and meaningful zero-data/failed-device states. The website must not present inactive/decorative features as functional; mark unreleased capabilities clearly and prevent paid purchases for them.

**Core product promise:** An original AI musician + serious laptop DJ performance workstation. Avoid claiming any individual's likeness or identifiable musical signature. Skilled live-looping improvisers, including Mr. Wobbles, are inspiration for techniques, not models to clone. Reference performances for training require confirmed appropriate rights; public availability is not evidence of permission.

## 2. Non-negotiable quality bars

- **Audible quality first.** No 'completed' generation milestone without playable WAV/FLAC artifacts, separate stems where feasible, real listening tests and a baseline comparison. The current user complaint is 'robotic music'; do not solve it with more UI.
- **Novel melodic and rhythmic content.** Avoid repetitive 4-bar loops, lifeless uniform velocities, clockwork microtiming, generic backing tracks, forced genre shifts, harsh chops and poor sample/voice intelligibility.
- **Financial positive unit economics, per user and per purchase, after taxes, Apple/Stripe/RevenueCat fees, discounts, GPU, orchestration, storage, bandwidth, retries, refunds/chargebacks risk, support allowance and shared infrastructure allocation.** Reserve and enforce spending budgets server-side *before* any paid operation. Never offer unlimited costly generation or allow negative contribution margins even to power users.
- **Portability:** Shared C++/DSP/MIDI/event schema with native macOS/iOS and WebAssembly adapters. Python research code may not be required at live audio-thread execution.
- **Privacy:** explicit microphone/screen/system-audio prompts and recording indicator, scoped source selection, deletion/export; no background capture without user awareness. No required cloud upload for local DJ paths.
- **Music rights:** operate only on audio users are entitled to use; no DRM circumvention; no promises of authorization for public performance. Provider platform APIs and terms may restrict reuse even when local capture is technically feasible.
- **Real UI functionality:** every visible deck, knob, transport, waveform and effect must operate audio or be distinctly disabled with a reason.

## 3. UX, IA, visual identity and landing page

**Design standard:** Premium, performance-grade, responsive and accessible; distinctive identity, dark studio option with crisp high-contrast controls and polished restrained motion. Create a small design system (tokens, typography, spacing, focus/hover/disabled, error/empty states), coherent iconography and technically truthful motion/waveforms. No stock-photo wall, exaggerated visual clutter or fake testimonials. Use accessible touch targets, WCAG AA contrast, keyboard focus and reduced-motion support. Avoid autoplay audible media; opt-in listening demos with captions/transcripts.

**Home page structure** (four equal conceptual sections, not four isolated websites):
1. Hero: *Jamloom — Turn a sound into music. Mix and perform from your laptop.* Subhead explicitly distinguishes AI improvisation from DJ studio; primary CTA **Make a Remix**, secondary **Open DJ Studio**; honest audio demo and clear supported platforms.
2. Four differentiated feature showcase sections anchored to `#improvise`, `#dj-studio`, `#live-dj`, `#music-dna`. Each with specific demonstration (consented before/after audio; functional mixer mini-demo; local live routing diagram; taste-to-new-song demo), crisp benefit, workflow, deep-link CTA, platform badge, pricing signal and status.
3. *How Jamloom works*: capture/select source -> Jamloom listens/composes/mixes -> listen/perform/export. Explain original sound retention and high-level quality controls.
4. **Real samples** with source rights and consent records; honest A/B before/after and a genre selector tied to existing real outputs. Never invent demo audio.
5. Credible comparisons: 'AI improvisation' vs 'traditional mixing' vs 'live source processing'; don't misrepresent streaming compatibility.
6. Pricing and credits calculator with up-front cost for each job, refunds/failures, and account balance. Separate local DJ from cloud generation.
7. Trust/security/privacy: source-local processing, upload retention, consent, intellectual property, acceptable use, public venue playback limitations.
8. FAQs, documentation/help, status, contact and footer.

**Routing:** App Router pages `/`, `/improvise`, `/dj-studio`, `/live-dj`, `/music-dna`, `/pricing`, `/examples`, `/learn`, `/learn/[slug]`, `/help`, `/privacy`, `/terms`, `/licenses`, `/account`, `/account/credits`, `/account/generations`, `/account/purchases`, `/download` (where appropriate), `/status`. Studio routes may be client-heavy but marketing routes must server-render crawlable editorial content. Deep links and login-return paths should work. Do not index private account/project pages.

**SEO + AI search visibility (GEO)**: Research real intent clusters: 'AI voice remix', 'turn speech into a song', 'online DJ mixer without controller', 'DJ from laptop', 'DJ effects on computer audio', 'music based on favorite songs'. Write genuinely helpful, original landing copy and self-contained feature pages with examples, constraints and FAQs; no keyword stuffing, fabricated stats, doorway pages, or promises of inclusion in AI answers. Implement canonical links, unique metadata, OG/X images, social previews, `robots.txt`, XML sitemap, breadcrumbs, internal linking, fast CWV, accessible HTML, hreflang only if localized, `SoftwareApplication`/`Organization`/`BreadcrumbList`/eligible FAQ markup only when page content warrants; verify with Google's Rich Results Test and search crawler. `llms.txt` can be optional documentation convenience, not an SEO guarantee. Include evidence-based public docs explaining architecture in human terms, privacy and licensing; monitor indexing, crawl failures, Search Console, referrers and legitimate AI referral analytics. Never use fake structured ratings, reviews or schema content. Test SSR with JS disabled for marketing copy. Optimize mobile LCP, INP and CLS and audio-demo loading. Make reusable marketing assets; never sacrifice functioning UI for cosmetic mockups.

## 4. Architecture and boundaries

**Monorepo recommended only if existing repo supports it:** `/apps/web` Next.js; `/apps/ios` SwiftUI; `/apps/desktop-companion` macOS first with later Windows/Linux; `/packages/audio-core` portable C++ DSP; `/packages/audio-wasm`; `/packages/performance-schema`; `/packages/ai-planner`; `/packages/payments`; `/packages/ui`; `/services/generation-worker` GPU queue; `/packages/db` Neon schema & migrations; `/docs`; `/tests` integration/e2e/listening fixtures. Adapt paths to existing project. Avoid sweeping rewrites.

**Critical separation:**
- Real-time path: audio capture -> timestamped ring buffer -> WebAudio AudioWorklet/native render thread -> EQ/mixer/FX/instruments -> device output. No LLM calls, database operations, heap churn or networking in audio callback.
- Creative planning path: phoneme/onset/rhythm, phrase and timbral features -> constrained composition plan -> validated events -> deterministic playback/render.
- Expensive offline jobs: orchestrator -> reserve credits + GPU cost cap -> Vast.ai GPU worker(s) -> stem rendering + mastering -> R2 storage -> completion/refund/settlement.
- Shared identity and commercial services: Better Auth stable user ID, Neon append-only wallet ledger, Stripe/Apple receipts, RevenueCat optional bridge, durable job status, monitoring.

Specify protocol/versioned schemas for note events, timebase (sample index / beat / bar), audio source, effect automation, deck state, AI control grants, transport state and generation job. Prevent cross-user project leakage. Implement idempotency, retries and recovery. Use migrations, rollback plans and feature flags.

## 5. Feature A: AI Improvisation — web + native iPhone

**Workflow:** Choose mic or upload (permissions and consent); preview and trim 1–15s (configurable); analyze speech segments, syllables/onsets, pitch contours, rhythm, loudness; select a hook; offer **Surprise Me** default and optional genre/energy/duration; show transparent expected credit charge; submit to generation; poll/stream actual progress; play 15–60s original performance; audition variations; replay, save, share, export subject to entitlements and speaker consent.

**Quality architecture:**
1. Robust preflight with VAD, recording cleanup (without ruining natural voice), transcription optional, timestamped syllables and acoustic event segmentation; handle silence/noise/multilingual phrases and no transcript.
2. Hook proposer scores recognizability, musical meter, semantic humor, rhythmic potential, diversity; retain clean anchor phrase.
3. Style-conditioned musical director emits a constrained `PerformancePlan`: harmony, tempo, phrases, bass/drums, playable piano/guitar/keys/synth/percussion, arrangements, voice chops, FX, transitions. Generate multiple candidates and score variation.
4. **Performance Expression Engine:** groove templates derived from lawful musical examples, interlocking bass/drums, tasteful microtiming, velocity shapes, instrument-specific articulations (piano dynamics, realistic guitar strums, drum ghost notes, bass slides), phrasing, fills, call-response, silence and build/release. Avoid random humanization. Prefer genre-specific musicality.
5. High-quality samples/synth engines with documented commercial rights, not cheap single-note transpose for all instruments. Preserve source audio recognizability and prevent glitches when time stretching.
6. Optional pretrained generative audio model for texture/material if rights, latency and measured improvement justify; maintain controllable engine as main render. Do not train large foundation model from scratch.
7. Stem-aware mix: spectral headroom, compression, limiting, gain staging, tempo changes, balanced mastering, overs/true-peak and clipping tests. Use listener tests at matched loudness.
8. Personalized preference learning from **Jamloom-created** music (opt-in). Curate permissioned expert demonstration traces of original sounds -> exact actions -> stems -> finished performance. No unlicensed performer video training.

**R0/Q0 priority:** First audit the existing 'robotic' baseline. Export source + event plan + drum/bass/harmonic/vocal stems + final mix on at least 10 diverse prompts. Compare (A) current, (B) better instruments, (C) expression engine, (D) arrangement changes, (E) combined. Use blind human tests; evaluate recognizability, natural groove, creativity, variety, entertainment, artifacts and share intent. Record failure examples. No claims of professional musician parity without evidence.

**iOS:** Native SwiftUI microphone/library selection, local preview, generation queue, StoreKit credit purchases, web account sync, restore/refund reconciliation, playback and sharing. No virtual four-deck DJ view in iOS. Support app background/lifecycle interruptions, mic permissions, privacy manifest, battery/memory budgets and offline state. Future optional on-device inference is not required for first release.

## 6. Feature B: Standalone professional DJ Studio — desktop web only

**Input:** User-supplied licensed/owned files (MP3, WAV, FLAC if decoder supports) plus original Jamloom tracks; prefer local processing, IndexedDB/OPFS when supported; do not upload private library merely for playback. Explain codecs/DRM exceptions.

**Authentic functioning controls** (two-deck minimum, extensible four): separate transports (load, play/pause, cue, seek, jog/scratch), live waveforms and beatgrids, tempo/pitch/key detection with uncertainty, speed and sync, hot cues, slip, loops and rolls, channel trim, 3-band EQ, filters, faders, crossfader curve, VU/peak meters, soft clipping/headroom, headphone cue if supported, effects (delay/echo/reverb/filter/phaser/flanger/beat-repeat), samplers, recording subject to source rights, MIDI/keyboard mapping, virtual instruments and note sequencer, preset scenes, crash-safe session restore. Accessible keyboard mapping documentation. True scratch and keylock/time stretch require DSP benchmarks; do not fake.

**Engine:** Web Audio + AudioWorklet + AudioContext; C++ compiled to WASM where beneficial; render animations via Canvas/WebGL separate from audio thread. Explicit latency/xruns monitoring and browser support matrix. Browser audio limitations: prelisten/cue routing, device selection, autoplay policies, sample-rate changes, external MIDI, battery, multi-device synchronization. Provide safe failure states. Single-speaker mode must function without headphones; multi-output professional cue mode should only be shown where verified. Production offline must preload assets; service worker/PWA optional; verify under network loss.

**AI copilot:** opt-in permission-scoped actions—prepare transition, propose compatible sample, add percussion, generate fill into separate channel; user always can take over; manual mode must never be overridden. One-click panic/bypass and restore baseline playback.

## 7. Feature C: Live Audio DJ — web + native desktop companion

**Scope clarification:** System-loopback capture can inspect a permitted application's playback and apply live effects, sampling and accompaniment; it does *not* grant pause/seek/cue control over that external application's transport. Call the mode **Live Source**, not a full deck. It cannot guarantee all streaming/DRM-protected sources can be captured. No DRM bypass, credential interception, streaming download, unauthorized copy, API misuse or stealth capture.

**Architecture:** Mac companion first (ScreenCaptureKit or supported OS audio loopback with explicit permission), Windows WASAPI loopback and Linux PipeWire monitor adapters later. Browser capture is optional fallback, Chrome extension **not required** unless reliable supported use case warrants it. Companion obtains explicit source/device consent and presents a live capture indicator, excludes Jamloom's own output, manages native device routing/loopback feedback, timestamps frames and sends local audio to browser/DSP engine through authenticated loopback transport. Benchmark whether processing entirely within companion/native engine is superior to sending PCM to a web audio graph; favor stable low latency and reliable routing. No cloud PCM upload by default. Add trusted pairing, short-lived token, source-origin checking, TLS/local transport protections, avoid binding unauthenticated public ports.

**Functions:** Live EQ, volume, filter/echo/roll effects, mic sampling (subject to consent), BPM/onset estimates and beat-following (with confidence/relock), instrument accompaniment with groove, synchronized output, bypass/panic, speaker selection. Source audio and Jamloom-processed audio must never be audible twice, and errors must restore source audibility if technically possible. Detect protected/no-audio/permissions-denied cases without attempts to circumvent.

**Policy/legal:** Platform contracts and content rights vary. Technical local loopback is not blanket permission to remix or perform Spotify/Apple Music/YouTube media publicly. Do not claim universal source support or legally approved venue play. Confirm terms independently when adding product-specific integrations. The app must not depend on third-party API permission for generic permitted user-selected local audio; it must also avoid bypassing source protections.

## 8. Feature D: My Music DNA — web + iOS

**Input:** Favorite song titles, artists and user-submitted playlists, genre/tempo/energy preference controls, manually selected relative importance, feedback on original Jamloom outputs. Optional imports using separately authorized metadata sources only. Cross-platform account profile.

**Workflow:** Search catalog -> disambiguate artist/track/edition -> user marks loves/likes/avoids -> transparently show inferred dimensions and evidence/confidence -> optional music preference adjustment -> quote credits -> generate 30–180s original composition (initial time limits based on profitability) -> A/B choices -> save/export -> improve preferences from consented signals.

**Taste embedding:** genre distributions, tempo bands, rhythmic subdivisions/groove, instrumentation, texture, harmonic density, energy curve, vocal versus instrumental, language preference if supplied, era influences, novelty control. Critically, song titles do **not** reveal exact audio fingerprints. Use licensed/reference-independent feature metadata where allowed and show unknowns instead of hallucinating. User selections and first-party opinions may inform tastes; observe provider-specific prohibitions regarding metadata/profile construction and AI ingestion. No unauthorized Spotify/YouTube content feeding AI or soundtrack replication.

**Generation:** latent taste vector -> diverse arrangement proposals -> harmonic/rhythmic originality checks and similarity safeguards -> high-quality expressive instruments + optional authorized AI backing/texture -> master -> evaluation -> export. No copying recognizable melody, lyrics, master recording, named performer voice or identity. Use per-job cost quote/reservation/refund. Exact composition performance must clear quality tests before paid launch.

**Provider integration strategy:** Manual search and catalog metadata are release-safe default (verify metadata license). Apple Music library metadata integration only upon terms review; Spotify developer-policy restrictions on AI use and user profiling make deep integration non-default; YouTube playlists only if API/terms allow the actual requested purpose. No scraping music catalogs or circumventing barriers. Expose import status to user honestly.

## 9. Monetization — launch proposal, configurable and cost-gated

**App download free.** Local basic DJ operation may be free to maximize discovery; charge for premium advanced DJ features later only if justified. **Launch with nonexpiring prepaid consumable generation credits, not subscriptions**; add recurring plans only after repeat usage demonstrates value and correct accounting is in place. No 'unlimited' GPU usage or unbounded included credits.

**Suggested launch price display (US, before applicable sales tax):**

| Pack | Web Stripe | iOS StoreKit | Credits granted | Note |
|---|---:|---:|---:|---|
| Starter | $9.99 | Target $9.99 App Store price tier | 10 | Introductory small pack |
| Creator | $24.99 | Target $24.99 equivalent available tier | 25 | Mid pack |
| Studio | $49.99 | Target $49.99 equivalent available tier | 50 | Larger pack |

**Important:** 1 credit is an internal unit, *not* a promise that any generation costs 1 credit. Cloud quotes consume **N credits determined by worst-case budgeted marginal cost**, quality mode, duration, model, retries and expected provider fees/tax; no low-price guarantee. Pack sizes and amounts are hypotheses and must be revalidated against measured GPU economics before activating purchasing. Avoid hidden variable charges: show quoted credit amount and reserve it prior to work. User consent required for a new price on changed inputs. Validate tax treatment and storefront-specific net proceeds before public sales; do not auto-switch customers to web purchase links in iOS outside storefront rules.

**Margin invariant, MUST hold even for one unlucky generation:**
- Compute recognized *net proceeds per credit lot* from gross purchase, minus tax/remittance, Apple/Stripe fees, payment processing fixed fees, RevenueCat/Stripe Billing fees if applicable, promotions, VAT/GST, expected refunds/chargebacks and allocated overhead. Use conservative effective net when transaction fees uncertain. Attach credits to their actual purchase lot; use earliest-expiring/nonexpiring lot logic that preserves minimum profitability across platforms. Credits purchased through Apple **must not expire** per App Review guidelines; choose no expiry on either platform for simplicity.
- Reserve an upper bound on attributable run costs before launching: Vast.ai actual GPU time plus setup/idle amortization, queue, model inference, storage, R2 egress/operations, bandwidth, transcription, optional third-party inference, retries/failures, retention, support, rounding, currency FX, telemetry, taxes and attributable infra. Add a **minimum 30% of net proceeds contribution-margin floor** after all modeled attributable costs; target 50% until real data supports lower. If insufficient balance or margin, reject/quote more credits; never run as loss leader without explicitly budgeted promotional allowance (and no quiet loss to a paid user's contribution margin).
- Maintain per-user hard budget, per-job hard GPU cost, per-credit-lot profitability and concurrency limits. GPU jobs must terminate at budget, max attempts and timeouts; failure and cancellation reconciliations refund unused reservations to original lots. Provider timeouts, duplicate webhooks and concurrent requests must not mint or double-spend credits. Consider taxes and platform fees by country, currency, subscription/billing plan, and Apple fee tier; never hardcode 30% globally as fact.
- Financial states: `quoted -> reserved -> running -> completed/failed/cancelled -> captured/released/refunded`. Use integer credit units or subunits in an append-only double-entry-like ledger, signed transactions, idempotency keys, unique receipt/purchase IDs and ACID Neon transactions. The balance is derived from ledger, not mutable client state. Persist audit information, no secrets in logs.
- Refunds/chargebacks reverse entitlement appropriately without generating negative paid-margin consumption; freeze disputed wallets and reconcile cross-device access safely. Do not revoke a completed authorized output without a clear disclosed policy.
- Buying once on web should make eligible credits available to the same authenticated account on mobile and vice versa, subject to app/store rules; reconcile receipts server side. Do not use RevenueCat's entitlement flag as the **balance** for consumable credits; ledger is authoritative.

**Web:** Stripe Checkout and verified signed webhook; webhook idempotency; no credits granted from client success redirect alone. Stripe Tax if configured, otherwise mark merchant setup blocker. Stripe Billing/RevenueCat optional for later subscriptions. Use test mode with mocked credentials until owner config.

**iOS:** Apple's **StoreKit In-App Purchase**, not Apple Pay, for digital remix-generation credits. May use RevenueCat to observe IAP/receipts and subscriptions when introduced, but server ledger enforces credit balances and costs. Validate purchases against Apple's transaction/notifications or a correct RevenueCat verification path; receipt replay protection; sandbox tests; product pricing synced from StoreKit, not hardcoded UI. Apple-purchased IAP credits never expire. Restore nonconsumables/subscriptions as applicable; consumable balance sync via backend account. Do not route customers to unsupported third-party checkout flows in the app.

**Optional later subscriptions** (NOT launch default): web Studio Pro $14.99/month for *non-GPU functionality* such as advanced project features, and iOS/desktop feature eligibility where compliant. Any included generation allowance must be limited and financially capped; no automatic infinite rollover. Validate RevenueCat App Store + Stripe billing bridge and storefront rules before enabling. Owner decides final price after analytics.

## 10. Detailed data model (adapt existing schema)

Tables/entities: `users` (Better Auth owner ID), `projects`, `source_media` (R2 key, MIME, owner, provenance/license/consent), `performance_plans` (schema version), `generation_jobs` (model/config/input/output/cost cap/quality score/status), `audio_outputs` (stems/master/cache/retention), `taste_profiles` (explicit+inferred fields/confidence/provenance), `favorite_references` (metadata only and source license), `dj_sessions`, `deck_states`, `capture_sessions` (minimal, no persistent raw audio without consent), `products`, `price_versions`, `credit_lots`, `wallet_ledger_entries`, `credit_reservations`, `payments`, `provider_webhook_events`, `gpu_runs`, `cost_events`, `refunds`, `feature_flags`, `consents`, `deletion_requests`, `owner_tasks`, `qa_evaluations`, `audit_logs`. Foreign keys, unique constraints, tenant isolation/RLS where applicable, migrations with rollback. Separate analytics/marketing consent and avoid retaining unneeded raw mic/source streams. R2 signed uploads and downloads with short TTL; never public-bucket user source recordings by default.

## 11. Vast.ai workers, resiliency and cost controls

Inspect current Vast.ai deployment. Worker must accept signed durable jobs with server-calculated spending limits. Record GPU type/rental rate, startup idle cost, memory/time/model, token or audio duration, storage, retry and result validation. Validate worker environment, model license, egress, health and deployment controls. Queue workers with lease/heartbeat, cancellation, kill-on-budget, idempotent outputs, checksum and antivirus/file content checks where relevant, no secret logging and untrusted input sandbox. Limit concurrency and per-user queue depth. Implement price/cap settings through admin config. If production GPU unavailable, provide deterministic local synthesis and a `NOT RUN` integration report. CI must not secretly spend Vast.ai credits.

## 12. Reliability, security, privacy and rights

- Auth: Better Auth server sessions, CSRF and origin checks, permissions and rate limiting, per-route authentication state, abusive upload caps.
- Audio: MIME sniff, file size/length limits, malformed decoder handling, decompression bombs, silence and noise controls, model prompt injection resistance in audio transcripts.
- Legal: record ownership/consent acknowledgments; no unauthorized voice cloning/impersonation; DMCA/privacy reporting/deletion workflows; licensing inventory for code, instruments, samples, fonts and model weights; legal review of public-performance and source content rules. Use only consented media in public examples.
- Abuse: spam, offensive shared remix reporting, disallowed copyrighted uploads to public galleries, account fraud and chargeback monitoring. Do not claim copyrighted content becomes unrestricted because processing is local.
- Observability: privacy-safe traces by job, model version, quality metrics, GPU expense, percent failed, cost per usable output, listening ratings, conversion, wallet reconciliation, Web Vitals. No unconsented raw audio in telemetry.
- Performance: browser real-time audio callback must remain responsive; measure output latency, glitch/xruns, sustained 60-min DJ playback, hot-plugging speakers, suspend/resume, offline source playback and memory use. A failed AI copilot must never silence existing deck playback.

## 13. Test plan and release criteria

**A. Unit/contract:** DSP deterministic seeded render, correct timing to sample frame, key/BPM estimates with uncertainty, audio clipping/peak/headroom, effect parameter mapping, plan JSON schema, taste-profile provenance, wallet conservation, tax/fee calculation, idempotent payment webhooks, race-safe reservations, rights/consent enforcement, API validation.

**B. End-to-end:** User signup -> local voice upload -> quote -> checkout test -> wallet credits -> reserve -> GPU worker sandbox -> result in R2 -> play/export -> ledger reconciliation; Apple sandbox equivalent; three separate user accounts concurrent; payment refunds/replays/failures; DJ mixing 2 real input files; locally captured consented test audio via Mac native companion; My Music DNA manual song selection -> taste inference with uncertainty -> original new audio.

**C. Human musical evaluation:** At least 20 diverse utterances for improvisation, multiple voice accents and noise types, at least 10 initial evaluation listeners including musicians where practical. Blind A/B vs existing robotic baseline and simple stock-loop baseline at matched loudness. Grade groove, expression, instrument realism, phrasing, creativity, original-voice recognizability, variety, transitions, ear fatigue and willingness to replay/share. Include statistical uncertainty; thresholds as internal initial gates: >=70% listener preference over old baseline, >=80% usable renders, >=85% phrase recognizability when words matter, zero severe clipping/timing failures. **Do not claim parity with Mr. Wobbles based on these gates**. Collect raw judgments and audio artifacts. Repeat after changes; block paid launch if people find music consistently robotic.

**D. UX/SEO:** Home shows four accurate sections/routes, four SEO-friendly feature pages, demo assets licensed and functional, working CTA and account state, mobile accessibility, lighthouse/Core Web Vitals measured, canonical/sitemap/indexability validated, schema rich results validated, Open Graph rendered, structured metadata not misleading. E2E and snapshots for four route flows, browser and iOS device coverage.

**E. Live session:** 60-minute web set, clean crossfade and meter response, no duplicate audio from loopback, panic bypass works, explicit permission indicator, no unsanctioned capture, denied/DRM-protected/unavailable source graceful behavior, offline mode only when verified.

**F. Profitability:** adversarial tests with Apple 30% fee case, international tax, payment fixed fees, high GPU price, retries, idle costs, refund, double clicks, webhook replay, GPU run exceeding quote, concurrent generations, price changes, FX and storage egress; each paid execution must retain minimum contribution-margin floor. No untested free GPU quota.

Each acceptance item is `PASS`, `PARTIAL`, `FAIL`, `NOT RUN` with command, environment, artifacts, date, owner and blocker; never convert `NOT RUN` into PASS.

## 14. Work plan for coding agent — continue through all feasible phases

**Phase 0 — Discover & preserve:** inventory current repo, docs and TODO; run existing tests; summarize capabilities and gaps; branch/commit; preserve backward compatibility; record baseline sound files. Establish missing-env owner list.

**Phase 1 — Product foundation:** integrate visual design system, routes, home and four feature sections, marketing SEO/GEO content, shared components, auth and production architecture skeleton; implement real demos only, tag future functionality as upcoming.

**Phase 2 — Audio quality rescue:** diagnose robotic output, fix source/sample processing, expressive instrumentation, groove/phrase planner and mastering; blind comparisons. This is the *critical* audio go/no-go.

**Phase 3 — Paid generation + infrastructure:** secure job queue, Vast.ai budgets, R2, Stripe sandbox, Neon ledger, cost estimator and quote/reserve/settle; comprehensive economic tests; web improvisation.

**Phase 4 — Web standalone DJ:** two-deck real engine and controls; advance to four-deck, cue and advanced effects only after benchmark and real test. Web-only route.

**Phase 5 — Live source:** Mac native companion and authenticated local audio pipeline; effects, analysis, no-double-play and routing; then portable Windows/Linux adapters as feasible; optional browser capture fallback. No Chrome extension unless justified by tests.

**Phase 6 — My Music DNA:** manual choices and defensible catalog metadata; original composition and feedback; eventual permitted provider imports behind a legal/terms gate. Pay only for quality-approved generation.

**Phase 7 — iOS:** two supported experiences only (Improvisation, Music DNA). Better Auth integration, StoreKit IAP, optional RevenueCat, shared wallet, performance, app review prep.

**Phase 8 — Launch hardening:** audits, Sentry/telemetry if existing, quality/financial/SEO/performance matrix, privacy/terms drafts for counsel, staging release, docs, owner checklist, deploy only with owner-approved production configuration.

Implement iterative vertical slices rather than leaving everything as scaffolding. An active task may involve several phases when it reduces risk, but ensure financial, rights and musical-quality gates are not bypassed. After every coherent change run relevant tests and update TODO, report blockers with exact owner action, then move to next independent work item. No fake screenshots, fake WAVs or fake test results.

## 15. Progress tracking and owner handbook (mandatory)

**Existing TODO:** Locate current TODO/task tracker (`TODO.md`, `docs/todo.md`, `tasks/*`, issue tracker, etc.). **Expand it, don't replace it.** Preserve done and in-progress history. Add `Epic -> Milestone -> Task -> Acceptance criteria -> Owner (agent/owner) -> Status -> Evidence -> Dependency -> Commit` for every workstream, with per-UX and shared architectural dependencies. Keep a durable current progress summary in `docs/STATUS.md`; for every checkpoint update date, active task, exact completed features, passing/failing/not-run tests, artifacts, blockers, next safe actions, URL/build links when verified, model/provider cost metrics where available. Add `docs/DECISIONS.md` for architectural alternatives and rationale.

**Owner handbook (`docs/OWNER_HANDBOOK.md`)** must be practical, no secrets, and include separate checklists with links to actual provider setup guides and UI steps: 
- domain/DNS/Vercel production environment, Jamloom branding, analytics and Search Console;
- Neon DB access/migrations/backup/restore, Better Auth OAuth callback domains, allowed origins;
- R2 bucket/CORS/lifecycle/retention/keys;
- Vast.ai GPU account funding, templates/model weights/approved licenses, usage cap, network secrets/health checks;
- Stripe sandbox/live business identity, account, Checkout products, tax settings, signed webhook endpoint secrets, refund policies, payouts, staged production switch;
- Apple Developer/App Store Connect bundle ID, app icons/privacy labels, IAP consumable products, sandbox test accounts, tax and bank paperwork, server notifications, TestFlight, review notes, accessibility;
- RevenueCat account/project/API keys and StoreKit connect **only if adopted** (can be postponed until subscriptions); receipt/webhook reconciliation;
- music/sample/model commercial licenses, rights to demos and user recording consent, legal review of supported live sources and venue performance;
- external provider metadata API terms / optional catalog sources;
- manual subjective listening tests, customer support/privacy contact information, ads/tracking consent.

For each owner-only step: **why needed; exact page/service and navigation; what owner must do; non-secret config variable names; how the agent verifies setup safely; dependent features; priority; current state**. Mark missing items `[OWNER ACTION REQUIRED]` but leave implementation runnable with tests/mocks and move on. Never ask owner to paste full production secrets or upload them to chat. Do not create live charges, rent GPU instances, publicly launch, buy domain or send mass email without authorization.

## 16. Agent implementation response format / definition of done

At each checkpoint report: (1) implementation completed, (2) exact git commits and changed paths, (3) screenshots or real audio artifacts where available, (4) automated and listening tests with statuses, (5) real estimated/observed unit economics, (6) owner handbook updates, (7) TODO/STATUS changes and next independent actions. Deliver local repro instructions. If workload exceeds the session, leave the repo in a resumable state with safe checkpoints and an explicit next command/task, not a claim it will continue in the background.

**Product done** means the four separate routes work at their explicitly supported capability levels; landing and feature pages are launch-quality and truthful; web+iOS core parity is tested; payment and budget gates are enforced; real audio quality is independently validated; desktop capture is demonstrated where supported; rights/consent and privacy controls work; SEO/technical/accessibility audits run; progress and owner docs are complete; remaining owner-only external production prerequisites are identified, not fabricated. If a provider restriction makes a requested integration unavailable, deliver the closest lawful/technically supported fallback and mark that original requirement `BLOCKED` with reason—never quietly omit it.

## 17. External authoritative documentation the agent should consult and periodically reverify

- Apple App Review Guidelines (digital credits / nonexpiring IAP currency): https://developer.apple.com/app-store/review/guidelines/
- Apple In-App Purchase vs Apple Pay: https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase
- RevenueCat Stripe integration: https://www.revenuecat.com/docs/web/integrations/stripe
- RevenueCat non-subscription purchases: https://www.revenuecat.com/docs/platform-resources/non-subscriptions
- Spotify Developer Policy: https://developer.spotify.com/policy
- Chrome tab capture (only if optional browser fallback): https://developer.chrome.com/docs/extensions/reference/api/tabCapture
- Google SoftwareApplication structured data: https://developers.google.com/search/docs/appearance/structured-data/software-app
- Verify official docs for Apple ScreenCaptureKit, Windows WASAPI, Linux PipeWire, Next.js, Better Auth, Neon, Vercel, Cloudflare R2, Stripe, StoreKit, Vast.ai, Web Audio, AudioWorklet and relevant model/instrument licences at the time of implementation.

**Final principle:** Build a genuinely enjoyable *musician*, a functioning *professional DJ deck*, a responsibly scoped *live local audio processor*, and an original *taste-driven composer*—one shared audio backbone, four product experiences, credible marketing, and guaranteed controlled economics.
