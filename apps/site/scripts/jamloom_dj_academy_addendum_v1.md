# JAMLOOM — DJ ACADEMY IMPLEMENTATION ADDENDUM v1.0
**Status:** New product addendum; implement inside the existing Jamloom repository  
**Date:** 2026-10-20  
**Owner-approved commercial model:** $79.99 one-time Academy Complete Pass  
**Platforms:** Desktop web first; optional desktop packaging later; no hardware DJ controller required  
**Priority:** Preserve existing four products and their unresolved release gates. Add Academy as fifth product, with independently verifiable launch status.

## 0. MANDATE TO CODING AGENT

Implement a *playable, gamified, coach-guided DJ training academy directly inside Jamloom's real browser DJ deck*. Do not create a static course, a gallery of videos, an interactive mockup, or a separate toy mixer. Users must learn by doing on the actual audio engine and controls. Provide a short action cue, guide the user to the real control, listen to/measure what they do, mark the task complete *only on real evidence*, then provide ample ungraded music time to enjoy and practice. Build from complete beginner to advanced/venue-readiness stages. The person should need only a laptop, browser, and an ordinary audio output to begin; headphones and a DJ controller remain optional enhancements.

Use Tribe XR/Tribe Studio (tribexr.com) for high-level inspiration in *interactive, hardware-free practice*, **not** to copy its branded equipment, assets, user-interface layout, course material, protected representations, or terminology. Build a distinct Jamloom learning experience.

**DO NOT start a new repository or rewrite the existing master specification.** Inspect the current repository and documentation before changes. The working folder may still be named `djayvo`; do not move/rename paths casually and break existing builds. Display the product brand as **Jamloom**. Expand the existing `TODO.md` in place; preserve completed items and evidence. Keep a dedicated `docs/ACADEMY_IMPLEMENTATION.md`, update `docs/STATUS.md` if present, and expand `docs/OWNER_HANDBOOK.md`. If a listed file does not exist, create it without replacing an existing equivalent. Do not mark unrelated work complete.

### Known checkpoint (user-supplied; verify, not assume)

The prior agent reports commits `efa13be`, `35c0df0`, a clean working tree, a local web server at `127.0.0.1:4220`, and:
- Responsive landing page + four routes, Live Source effects, Music DNA saved preferences.
- Credit ledger, sandbox verification, budgeted GPU queue, Vast.ai rental shutdown safeguards.
- iOS preferences and gated StoreKit; 10-input audio baseline/stems/plans.
- Production/TypeScript, database/web/C++, iOS simulator, browser/accessibility checks passing.
- **Musical-quality release gate FAIL; full product PARTIAL.**
- **Real payment transactions, hosted music generation, physical audio capture, production release NOT RUN.**

Check code and tests to establish the current real state. Academy development must not quietly claim the four-product plan has shipped, enable paid generation despite the known musical-quality failure, or mask unfinished provider reconciliation.

## 1. PRODUCT DEFINITION

**Positioning:** *Jamloom DJ Academy — Learn on the decks. Practice with music. Perform with confidence.*

**Core promise:** From zero music/DJ knowledge to being able to complete an assessed DJ set using a laptop and the same browser-based virtual DJ studio available in Jamloom. A web learner can make real noise, correct mistakes immediately, experiment, and master skills via exercises, not passive consumption. Lessons should feel closer to playing a music game than taking a lecture.

### User experience principles
1. **Play immediately.** On first launch, audio starts only after the required user gesture. The learner touches the actual Deck A Play control within the first minute of onboarding. Provide sample tracks with commercial redistribution rights.
2. **Tiny instructions, immediate action.** One sentence/instruction and one highlighted control per micro-step where practicable. Tooltips and optional expandable explanation; avoid reading walls.
3. **Demonstrate, then hand over.** Instructor can show a brief, real, replayable deck action using the engine, then reset state for the learner. No long videos as the core content.
4. **Verify real execution.** Teach the action, observe actual mixer/transport/control events and (when appropriate) audio measurements, mark it checked only when acceptance criteria pass.
5. **Enjoy and practice.** Each checked objective is followed by an optional, generous ungraded jam section (e.g. 2–10 minutes or unlimited free-play, depending on lesson). Never interrupt user's voluntary play with forced timers, auto-advance or paywalls. "Continue" only when learner chooses.
6. **Forgiving but meaningful.** Auto sync permitted during beginner instruction when taught explicitly; later challenges require less assistance. Adapt difficulty and tips. No fake competency awards.
7. **Musical assets sound good.** Ship rhythmically clean, professionally prepared, correctly licensed teaching tracks/stems/loops; the separate failing generative music-quality gate must not contaminate core Academy lessons.
8. **No equipment purchases.** Default keyboard/mouse/trackpad workflow. Optional MIDI controller and multi-output headphone cueing are enhancements, not a prerequisite.
9. **Accessible coaching.** Keyboard operability, visible focus, reduced motion, high contrast, captions for spoken hints, volume/sound checks; lessons cannot rely solely on color or hearing a spoken instruction.

## 2. ROUTES AND LANDING/PURCHASE FLOWS

Use Next.js App Router convention if the existing app does. Adapt exact filenames to repository conventions.
- `/academy` — SEO-indexable Academy marketing page: clear value, live demo of lesson mechanics, curriculum tiers, included one-time $79.99 pass, FAQ, learn-without-equipment positioning, transparent limitations.
- `/academy/learn` — auth-aware learner dashboard: resume, skill map, completed checks, saved practice sessions, upcoming challenges, buy/access state.
- `/academy/levels/[levelSlug]` — tier overview with skills, progression, badges and lessons.
- `/academy/lessons/[lessonId]` — guided session overlay *on actual DJ decks*. Important: preserve real audio state when moving among internal coach steps.
- `/academy/practice` — unrestricted sandbox with goal presets, optional ghost demonstration, optional track selection and track licensing notices.
- `/academy/challenges/[challengeId]` — skill evaluations and final assessments.
- `/academy/checkout` — purchase review; use hosted or embedded Stripe Checkout according to existing payment architecture.
- `/academy/success` — payment outcome verification on server, never trust client redirect alone.
- `/academy/progress` — user stats, skill breakdown, play history, achievements and certificate/assessment evidence.

Integrate navigation and homepage as **fifth feature**: original four product sections continue working; add Academy card/section with distinct call-to-action **Learn to DJ**, and revise homepage wording only insofar as supported functionality. Update meta/OG descriptions, internal links, sitemap, robots, FAQ and structured data appropriate to actual published content. Do not fabricate testimonials, partner affiliations, rating stars, outcome claims, or certification legitimacy. Lazy-load heavy lesson audio/deck code; no giant main-thread bundle on the landing page.

## 3. PROPOSED UI (DESIGN, NOT STATIC MOCKUPS)

Desktop layout, responsive down to common laptop sizes:
- **Top:** level name, lesson objective, time-free progress (e.g. Task 2 of 4), pause/restart, coach sound toggle, mute, exit; persistent access to ungraded practice.
- **Main center:** actual two-deck workstation and mixer: waveform, play/pause/cue, sync, tempo, EQ, gains, faders, crossfader, sampler and effects as supported by *real engine*. Guided mode only emphasizes necessary controls but uses the exact shared components.
- **Side coach dock:** friendly short instruction; optional audio narration; "Show me", "Try again", "Why?", "Practice", "Skip explanation". An unobtrusive arrow, glow or callout points to the exact control and updates with responsive layout.
- **Bottom:** an objective checklist with verified evidence state, a compact skill meter, and "Free Jam" switch. Checkmark animations should be tasteful and disableable.
- **Free Jam after success:** music keeps playing; coaching retracts; show optional fun prompt (e.g. try an eight-beat fade, layer percussion); no grading unless user explicitly resumes challenge; no forced countdown.
- **Assessments:** audio-reactive waveform/beat alignment visualizer; feedback describes measured error and a single specific correction, not generic compliments.
- **Accessibility:** keyboard shortcuts help, ARIA semantics, screen-reader alternative for pointing gestures and waveform instructions, no trap in modal coach overlays.

Use the existing Jamloom visual system, typography and design tokens; create cohesive branded design. Do not mimic Tribe XR's physical equipment trade dress or copyrighted UI.

## 4. EDUCATIONAL PROGRESSION

Five stage taxonomy; generate structured editable lesson manifests with prerequisites, allowed assistance, evidence checks, licensed track fixtures, remediation, free-practice prompt, difficulty knobs and outcome descriptions. Proposed scope, to be refined after user tests:

### Level 0: Intro / Free sampler (no payment)
- Sound check: select output and test volume safely.
- Deck A: play, pause, cue and learn waveform/playhead.
- Deck B: load approved practice track, play and pause.
- Faders: audible volume change; identify crossfader.
- First guided crossfade with matched-tempo, matched-phrase teaching tracks.
- Completion: experience 1 satisfying audible transition with honest measured success criteria.

### Level 1: Beginner — rhythm and equipment fundamentals
- Hear a kick vs snare; count four beats and eight beats interactively.
- BPM basics: match visual pulse and tap beat.
- Transport controls, cue points and basic track structure.
- Mixer, channel faders, gain, crossfader, simple transition.
- Audio levels, avoiding clipping and hearing-safe volume.
- Assess: perform a clean transition of two curated 120 BPM tracks using explicit visual guidance.

### Level 2: Elementary — beatmatching and EQ
- Understand downbeats, bars, phrases and basic 4/4 timing.
- Tempo matching via BPM slider and optional sync with progressive removal.
- Nudge phase alignment, cue/start timing, headphones optional.
- EQ: bass swap and reducing clashes; teach using specially authored teaching audio.
- 8/16/32-beat transitions, first mashup concept using original Jamloom stems.
- Assess: two aligned transitions with bounded phase/tempo error and no audible clipping.

### Level 3: Intermediate — artistic control
- Loop length selection, hot cues, phrase entry/exit, loop exit on beat.
- Beat jump, echo, filters, delay, beat roll with restraint.
- Keys/harmonic compatibility as practical listening skill, without claiming single key estimation is infallible.
- Track selection by energy, creating rising/falling arc, reading waveforms.
- Capture and incorporate a live voice sample only with consent and appropriate settings.
- Assess: create a 5–10-minute coherent recorded practice mix from licensed course audio.

### Level 4: Advanced — improvisation, 3rd channel, recovery
- 3/4 deck concepts if actual backend supports; do not use dummy controls.
- Layer vocal loops, drum samples and instrument parts without clutter.
- Handle unexpected incoming track endings, tempo changes, late cues, effects mistakes.
- Transition across compatible and incompatible BPM/keys using appropriate techniques.
- Self-evaluation: explain why a mix was made and assess audible outcome.
- Assess: complete a multi-transition scenario with recoveries and expressive choices.

### Level 5: Performance / Professional readiness
- Create an organized 30–60-minute practice set from cleared tracks or user-supplied music.
- Practice stable gain staging, appropriate peak control, pacing and transitions.
- Venue drill: simulate interruptions, source failure, track misses and recovery.
- Set planning: backup, preload, browser power and OS audio interruptions, speaker setup and real-world venue licensing checklist.
- Perform and submit a complete local mix (subject to consent/recording rights), replay it and receive an evidence-backed rubric.
- "Jamloom Academy Completion" badge means passed Jamloom's specific measured course; do not imply accreditation or hardware proficiency without real-world testing.

The academic levels should not imply that the user's skill automatically equals an experienced professional merely from software scores. Encourage real-world practice before accepting paid gigs.

## 5. LESSON STATE MACHINE AND TASK CHECKOFF

Explicit state machine:
`locked -> available -> preparing -> demonstrate -> guided_attempt -> verify -> passed -> free_jam -> completed`; with `retry`, `paused`, `resumed`, `skipped_explanation`, `failed_attempt` transitions as appropriate. Lesson completion only when every *required* task is passed; free-jam may be exited voluntarily without affecting achieved checks. Resume must restore unlocked progression without falsely restoring an old real-time audio stream.

Every task has:
- `task_id`, immutable manifest version, objective, prerequisite IDs.
- `target_control_ids`, `start_condition`, `allowed_assists`, `reference_audio_id`.
- `event_predicates` and optional audio metrics thresholds.
- `min_attempt_duration` where sensible; checks protect against trivial clicks.
- `max_attempts` for remediation triggers (not punitive lockouts).
- `success_copy`, `specific_failure_feedback`, `free_play_suggestion`.
- `evidence_payload` with timestamps, device/audio mode, score and hashes/version; avoid raw audio retention by default.

### Sample lesson: crossfade
1. Load two approved teaching tracks; verify they actually start and are audible.
2. Coach points to Deck A play; learner starts playback; event verified.
3. Coach demonstrates moving crossfader across eight beats, using live audio; learner can hear what changes.
4. Reset crossfader. Coach: "When the beat hits, gradually move this from A to B over eight beats."
5. Observe actual crossfader automation and deck playback events with audio clock timestamps; evaluate whether movement occurred over target beat span, both deck signals were active when needed, gain stayed within allowed safety limits, and no unacceptable silence/clipping occurred.
6. If unsuccessful, say specifically: "You moved in 2 beats; try a slower fade across 8." Invite retry; don't fake PASS just because slider reached right.
7. If passed, check task in checklist. Offer **Free Jam** with both decks active, unlimited user-controlled practice. Next lesson when clicked.

### Sample lesson: beatmatching
Use curated two-track fixtures with known tempo/phase differences; initially display beat phase overlay, later hide it. Score tempo deviation, sustained phase alignment over a few bars, audible phasing and smoothness. Avoid deriving performance grade solely from noisy BPM estimation; test against known fixture ground truth and engine events.

## 6. INTELLIGENT COACH — RULE ENGINE FIRST, AI OPTIONAL

The deterministic lesson evaluator is authoritative:
- Derive playback/audio events from the actual deck engine: `deck.play`, `deck.cue`, `deck.seek`, `tempo.set`, `eq.set`, `gain.set`, `crossfader.set`, `hotcue.trigger`, `loop.enter/exit`, `fx.apply`, `mix.master_level`, etc.
- Include beat clock/transport tick and event order for accurate evaluation. Send events through a typed stable interface, not DOM click observation only.
- Grade objectively measurable skills with explicit thresholds and deterministic tests.
- If using signal measurements (peaks, RMS, loudness, beat phase, inter-track overlap), compute them on actual signal path with correct reference timestamps; allow device-specific latency calibration.
- A low-cost optional AI coach can summarize authenticated telemetry and explain what to do next. Model never invents scores/checkmarks; every claim derives from measurable events. The user can disable AI coaching.
- Author a hint taxonomy for common failure modes; free deterministic hint fallback must always work offline.
- Use AI-only explanations sparingly and meter against per-user quota; never create unbounded GPU/LLM cost under a $79.99 lifetime course.

## 7. TRACKS, AUDIO QUALITY AND RIGHTS

Course must ship with a small high-quality collection of **originally composed and produced or explicitly commercially licensed** tracks, with:
- instrument stems where beneficial, clear kick transients, several tempos and structures;
- controlled phase-aligned instructional track pairs with known BPM, key, phrase boundaries and beatgrids;
- gradual progression from easy to complex musical material;
- licensing metadata, redistributable asset provenance and required attribution;
- loop-safe transitions and true stereo output; sensible normalization, no clipping and a limiter used conservatively;
- offline caching for approved course audio in supported browsers, within quota; handle missing cache gracefully;
- tracks available for *education and actual deck playback*, not placeholders, static waveforms or a text-only tutorial.

Do **not** depend on existing robotic AI improvisation output as a required Academy track source. Independently verify that course audio sounds musical. User-supplied files may be allowed for optional free-play and certain later assessments, with rights declarations and privacy protections. Do not rely on Spotify/YouTube/Apple Music extraction or bypass DRM. Do not require users to buy licensed third-party songs to complete lessons.

## 8. ARCHITECTURE AND REUSE

**Existing stack to preserve:** Next.js, Neon Postgres, Better Auth, Vercel, Cloudflare R2 and existing C++/WASM/Web Audio engine. Vast.ai GPUs support selected generation features but must **not** be required for ordinary Academy lesson playback, scoring, guided controls or free practice.

Components/modules (exact paths follow repository reality):
- `academy/content/` — versioned manifests, lesson assets, localized hint strings, objective definitions.
- `academy/engine/` — task state machine, rubric evaluator, assist flags, event integration.
- `academy/ui/` — coach overlays, accessible highlighted targets, checklist, progress and practice feedback.
- `academy/audio/` — exercise-track registry, protected/controlled examples, cue/tempo fixtures.
- `academy/server/` — account entitlements, authoritative progress persistence, purchases, event summary ingestion and anti-replay protections.
- `academy/tests/` — grading fixtures, progression cases, payment cases, E2E.

Embed the actual existing deck components in lesson layout. Avoid a second simplified audio engine whose controls behave differently. Route real deck control operations through one typed command bus, and publish corresponding clock-aligned state/telemetry. Do not bind lesson logic to fragile CSS selectors. Coach highlight targets should be stable accessible identifiers from the deck components.

Example internal event schema:
```ts
type AcademyDeckEvent = {
  schemaVersion: 1;
  sessionId: string;
  deckId?: 'A' | 'B' | 'C' | 'D';
  action: string;
  monotonicAudioTimeSec: number;
  source: 'user' | 'coach_demo' | 'system';
  payload: Record<string, number | string | boolean | null>;
};
```
Important: coach/demo events **do not** satisfy student action checks. Validate external inputs. Server should persist only limited assessment summaries, not millions of raw audio-clock events. Grade locally in real time; sync signed/validated summary with reasonable tamper controls where relevant. Do not claim this defeats all client tampering.

## 9. DATA MODEL AND PERSISTENCE

Adapt table/model names to existing Drizzle/Prisma/SQL conventions. Proposed entities:
- `academy_courses` (slug, curriculum_version, status, access_policy)
- `academy_levels` (id, course_id, ordinal, slug)
- `academy_lessons` (id, level_id, manifest_version, published_at, prerequisites)
- `academy_enrollments` (user_id, course_id, entitlement_snapshot_ref, started_at)
- `academy_attempts` (id, user_id, lesson_id, manifest_version, state, start/end, device)
- `academy_task_results` (attempt_id, task_id, pass, measured_metrics_json, evaluator_version, completed_at)
- `academy_skill_progress` (user_id, skill_id, score/level, updated_at)
- `academy_entitlements` (user_id, product_key, source, valid_from, valid_until nullable, purchase_id unique)
- `academy_purchase_events` (provider, provider_event_id unique, processed_at, result/status)
- `academy_certificates` (user_id, curriculum_version, passed_assessment_id, issued_at, revoked_at nullable)

Use migrations, index user/lesson/prerequisite queries, enforce uniqueness/idempotency, make authorization checks server-side, and avoid duplicating an existing general entitlement table where a polymorphic product key works. Progress must survive browser restarts and multi-device login. Do not store raw speaking audio without consent. Provide delete/export capability consistent with Jamloom's account lifecycle.

## 10. PAYMENT: $79.99 COMPLETE ACADEMY PASS

**Owner's decision:** `$79.99 USD` one-time payment for **Academy Complete Pass** on web. No required recurring Academy subscription. Includes every current Academy level (Intro/Beginner/Elementary/Intermediate/Advanced/Performance), built-in guided lessons, unlimited practice on owned Academy assets, course evaluations, and course completion badge. Make any material future major-course exclusions explicit before taking payment; avoid ambiguous "lifetime everything" marketing. Suitable marketing phrase: "One-time purchase. Access to Jamloom DJ Academy's included course and practice studio." Beginner sampler stays free.

**Important:** Academy access and music-generation **credits are separate**.
- Academy Pass grants access to curriculum and included practice tools, not Vast.ai jobs, paid AI music generations or unrestricted cloud AI coaching.
- An Academy user who requests Jamloom Improvisation / Music DNA generation must separately spend quoted prepaid credits through the existing budgeted billing pipeline.
- Never deduct music-generation credits for ordinary Academy lesson playback or measured skill evaluation.
- No unbounded server-paid coaching. Provide deterministic tutoring freely; cap optional AI chat or make it user-paid with clear separate consent and per-request cost authorization.
- Use Stripe Checkout and the existing web account/Stripe integration; **separate Stripe product/price ID** from generation-credit packs. Owner to create/configure missing Stripe items.
- Purchase lifecycle: create authenticated Checkout session -> payment confirmed by verified signed webhook -> idempotent transaction -> grant Academy entitlement -> user access. Success redirect alone is insufficient.
- Handle webhook duplicates/out-of-order arrival, refund/reversal/chargeback appropriately, receipts and tax via the configured checkout/tax stack. Entitlement must be restored correctly on legitimate repurchase.
- Ensure price/currency sourced from verified server catalog. No client-supplied amounts, price IDs or entitlement authority.
- Price is list price before applicable tax. Compute real post-tax/processor net economics in an owner-reviewed margin report; ensure unlimited cloud liability is not attached to one-time purchase.
- Free intro must remain accessible even if Stripe configuration is not yet provided; locked paid chapters preview cleanly.
- Academy is **web-first**. If native iOS purchase/access is proposed later, do a separate App Store review and StoreKit/RevenueCat compliance design before offering the same digital purchase inside an app; do not assume Stripe web-only purchase UI can be transplanted into iOS.

## 11. LOW-LEVEL IMPLEMENTATION PLAN / EXECUTION ORDER

Work continuously on independent engineering tasks; don't stop for every missing external setup. Stop only on genuine safety/legal/irreversible production action. Maintain resumable commits and actual evidence.

**A0 — Audit and preserve.** Inspect current branch, master specs and TODO. Verify tests and actual deck controls, old four-route implementation, musical quality FAIL, payment hard limits, AudioWorklet/WebAssembly status. Record existing state and regressions; avoid unrelated rewrites. Expand TODO with Academy workstreams; do not erase earlier backlog.

**A1 — Real DJ command/telemetry bridge.** Enumerate functional controls; wire stable action identifiers, audio-clock timestamps, state subscriptions and coach/demo provenance. Establish contract tests. Any missing core deck control becomes an explicitly tracked dependency, not a fake green task.

**A2 — Track/fixture package.** Create or source appropriately licensed professional-quality practice clips; instrument original tracks if possible; generate beatgrid/phrase annotations; produce asset provenance manifest, loudness measurements and browser-load tests.

**A3 — Lesson framework.** Build declarative manifest parser/validator, prerequisite rules, reproducible grading state machine, undo/retry, assistance flags, local resumability and secure persistence. Write tests before expanding all lesson content.

**A4 — Live guided UX.** Build coach dock, highlight arrows and keyboard shortcuts, checklist, demonstration replay, actionable mistake feedback and post-success Free Jam. First vertical slice: "First Crossfade" using real deck + real audio + evidence-based pass + free practice + saved progress.

**A5 — Curriculum.** Implement all levels and exercises only against working real controls; add optional adaptive assistance and varied teaching fixtures. Complete reliable user-performed assessments for each stage.

**A6 — Commerce.** Create Stripe product/price configuration schema, Checkout initiation, webhook and entitlement logic, tests for refunds/duplicates/retries. Document owner-only Stripe steps but continue elsewhere without live credentials.

**A7 — Routes and marketing.** Integrate Academy into homepage, navigation, SEO, academy landing and course overview; no unsupported promises or fake social proof. Create web-first checkout preview.

**A8 — Evaluation and quality.** Run accessibility, performance, audio and actual-user tests. Validate a complete novice can learn the first crossfade without outside instructions. Seek human testers and make results honest; no fictitious evaluations.

**A9 — Release readiness.** Build, tests, QA, migration verification, R2 asset access, Stripe sandbox, demo audio, owner handbook, separate academy feature flag and deployment checklist. Do not silently deploy, purchase, change DNS, perform live charges or enable production without authorization.

## 12. ACCEPTANCE GATES

Each gate status must be PASS / PARTIAL / FAIL / NOT RUN with commands, fixture IDs, artifact paths, captured evidence and test environment:

- **G1 — Correct integration:** existing four product routes and payments unaffected; repo build + TypeScript + existing test suites PASS.
- **G2 — Real equipment:** changing an instructed control measurably changes *actual rendered audio*; instructor and learner use identical deck backend; no fake controls.
- **G3 — Guided crossfade:** real user action across real music satisfies objective, generates verifiable result and checkmark; deliberately wrong actions fail with specific feedback.
- **G4 — Free jam:** after passing, learner can play without grading/interruption, then resume next task by choice.
- **G5 — Curriculum:** published levels each have valid manifests, available fixtures, grading rubrics, remediation and accessible user flows; every end assessment is runnable.
- **G6 — Audio:** nonrobotic, playable, licensed teaching tracks; no clipping, crackle or main-thread freezes in representative browsers under measurement.
- **G7 — Accessibility:** keyboard-only basic completion, visible focus, no color-only feedback, reduced-motion support, tested in Chromium/WebKit.
- **G8 — Identity/progress:** unauthenticated free intro and authenticated paid progression behave as designed; user cannot access paid course by editing local browser state; sync/restart tested.
- **G9 — Commerce sandbox:** verified Stripe webhook grants exactly one entitlement; duplicate webhook, refund, invalid signature, payment failure, wrong user and replay tests PASS. Live purchase status remains NOT RUN unless actually tested.
- **G10 — Human learning:** at least 5 genuine novices complete first lesson without verbal handholding and 3 finish a beginner mini-set; measure task completion, hints, attempts, time, learner-reported clarity/enjoyment. If no testers available, mark NOT RUN, never fabricate.
- **G11 — Business safety:** course does not allow unlimited external AI compute; purchased entitlement remains separate from credits and maintains positive modeled contribution after processing fees/taxes/support/hosting reserves.
- **G12 — Release:** full end-to-end course, Stripe production verification and public launch NOT RUN until genuinely done; prior Jamloom musical-quality FAIL remains separately visible and keeps **paid generation disabled** until its own release criteria pass.

## 13. OWNER HANDBOOK — REQUIRED SECTION

In existing `docs/OWNER_HANDBOOK.md`, create/update **DJ Academy — Owner Actions** with per-item checkbox, exact URL/console settings, requested value/ID, env-var name (without secrets), reason, status, validation command and affected feature. At minimum:
- Decide and create a Stripe one-time product **Jamloom DJ Academy Complete Pass** at `$79.99 USD` and its price ID; configure tax behavior, refund/terms/privacy information and webhook.
- Provide or authorize production art/logo and design review if needed (can be implemented using existing brand tokens meanwhile).
- Approve legal rights and redistribution terms for selected lesson audio; maintain attribution and provenance.
- Approve final course curriculum, accessibility copy, any course-completion certificate wording, purchaser rights and refund policy.
- Approve support email/help center, analytics privacy policy, deletion policy, sale tax treatment, country availability and commercial launch.
- Review initial human-user testing and audio demo; recruit actual novice evaluators if agent cannot do so.
- Approve production payment test and deploy after results, including monitoring, backups and incident plan.
- Only if future desktop/mobile purchasing is introduced: separate platform entitlement and storefront review.

Never ask the owner for API secrets in chat or commit them. Never mark an owner action as completed without evidence. Continue with mocks/sandbox/instrumentation while owner-only work is pending.

## 14. TRACKER AND REPORTING REQUIREMENTS

Modify the current `TODO.md` **in place**. Keep completed work and unresolved tasks from previous milestones. Add an `ACADEMY` workstream with item IDs `ACA-001` onward, owner, dependency, status and proof. Update status at each significant milestone. Append relevant architecture decisions to existing decision log.

Maintain `docs/ACADEMY_IMPLEMENTATION.md` with:
- actual initial repository status and tested baseline;
- design and architecture decisions, alternatives and tradeoffs;
- exact file paths changed and migration list;
- audio fixture list and licenses;
- route inventory with functional vs mocked distinction;
- lesson and rubric coverage matrix;
- real test outcomes and known issues;
- payment sandbox evidence and production NOT RUN state;
- remaining TODO and owner blockers;
- commits, commands and final progress recap.

If the environment ends before completion, commit reversible work, leave a deterministic next-step instruction and truthful gate status. **Do not pretend to work asynchronously or claim completion of an unrun test.**

## 15. PRACTICAL PRIORITY / FAIL-SAFE

**Build the first crossfade lesson to an audible, enjoyable and verifiably scored PASS before mass-authoring dozens of lessons.** A beautiful academy page with inert virtual buttons is a failure. Correct audio, genuine task feedback and pleasurable free practice take precedence over decorative gamification. Then scale the curriculum using reusable lesson manifests and instrumented controls.

**Do not hold Academy implementation hostage to unrelated generative-music quality failures**, but do preserve the existing paid-generation hold. Academy lessons and their licensed original practice music can become an independent product revenue stream while Jamloom's improvisation model continues to improve.
