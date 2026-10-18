# Specification completion ledger

Audited 2026-10-18 against the complete, unchanged master specification and the
owner's later instructions. **Overall specification: PARTIAL.** Continuing
implementation does not waive formal quality evidence or authorize publication.
The web is the selected product platform; phone and infrastructure work remain
paused. [TODO](../TODO.md) tracks individual past/future work and evidence links.

| Master area | Status | Implemented / remaining |
| --- | --- | --- |
| §1 Instant Remix product | PARTIAL | Record/import, trim, three takes, regeneration, play/save/share implemented; human recognizability, meaningful audible diversity and production acceptance remain |
| §2 portable hardware workflow | PASS | Actual M5 and Linux arm64 execution; isolated environments; original physical Intel rerun remains NOT RUN |
| §3 portable engine and clock | PASS | C++17, deterministic integer-frame scheduling, bounded polyphony, offline WAV/stems, source provenance and cancellation |
| §3.1 full instrument/effect breadth | PARTIAL | Sampled piano/bass/drums, electronic palette, bounded independent voice pitch/time and finite tempo echoes; recorded guitar strum/muting now implemented; organ and dedicated pad/lead roles now implemented; feedback delay/reverb remain unimplemented; tempo maps and track mix automation now implemented; transformed-voice listening remains open |
| §3.2 input analysis | PARTIAL | Bounded decoding/resampling, energy/onset/pitch heuristics and pause-aware crops; reliable word timing, semantic selection and optional classifier/transcriber modules remain unimplemented |
| §3.3–3.4 plans and creative direction | PARTIAL | Rule grammars with seed-selected hip-hop and syncopated funk, developed returns and input-timed responses, typed native plans, JSON export and now strict offline import with explicit fallback; standalone hybrid/call-response and bounded recent-structure rejection and broader reggae/experimental/club harmony/groove implemented; learned direction/ranking, provider retry policy and quality comparisons remain NOT RUN |
| §4 musical quality and creativity | PARTIAL | Informal owner improvement feedback and matched controls; diverse blinded comparison, perceptual novelty and target thresholds remain NOT RUN |
| §5 bundled rights | PASS | Pinned cleared acoustic bank, original electronic bank, asset hashes and notices; no reference-track training or bundled model weights. Future model/catalogue release rights require their own review |
| §6 model strategy | PARTIAL | Separate bounded RTX 3090 feasibility trial executed and rental removed; M5 constrained-director benchmark, source identity evaluation and formal model-versus-rule listening remain NOT RUN |
| §7 iOS | PARTIAL | Native app, simulator and some actual-phone tests, owner capture/playback confirmation; hardware lifecycle/routes, sustained thermal/battery and production release remain open; paused by owner |
| §8 privacy/trust | PARTIAL | Local consent, validation, no automatic upload, delete and bundle checks; public-sharing moderation/reporting, deployed retention/deletion and final public policy remain unimplemented/unverified |
| §9 economics | PARTIAL | Local rendering has no per-play provider cost; bounded trial recorded. Production entitlements, credits/payment ledger, storage TTL/quotas and margin validation remain unimplemented; no monetization authorized |
| §10 evaluation/telemetry | PARTIAL | Machine reports, reproducibility, frozen one-source pilot and blank blinded packets; eligible 20–50-source cohort, independent reviewers, human scores and retention/share outcomes missing |
| §11 repository/builds | PARTIAL | Monorepo, dependency/asset records, local commands and CI configuration; hosted CI execution and hosted release remain NOT RUN |

## Current milestone gates

| Gate | Status | Required next evidence or implementation |
| --- | --- | --- |
| M0a technical foundation | PASS | Retain technical regression evidence |
| M0b/M0c musical acceptance | PARTIAL | Readable hooks, coherent/enjoyable music and audible strategy variety assessed by listeners |
| M0d portability | PASS | Actual M5/Linux arm64 evidence; scope does not include unavailable Intel hardware |
| M1 formal quality baseline | NOT RUN | Diverse cleared cohort and independent blinded observations; owner-only recording permission does not authorize sharing with reviewers |
| M2 constrained AI director | PARTIAL | Offline import/fallback prerequisite implemented; model integration/benchmark and quality advancement remain NOT RUN behind M1 |
| M3 device prototype | PARTIAL | Existing implementation and device evidence retained; remaining phone work paused |
| M4 live improvisation | PARTIAL | Protocol only; live implementation, feedback handling and actual latency/battery measurements remain NOT RUN |
| M5 production/monetization | PARTIAL | Release/privacy preparation exists; quality, demand, moderation, infrastructure, economics and release approval remain open |

This ledger exposes unfinished code as well as missing tests. Neither a successful
model rental nor an accepted JSON plan closes musical-quality gates. No ratings,
speaker consent, release approval or artist-level quality are inferred from
“continue finish the spec.” The owner has already said no additional cleared clips
are available; repeated requests do not supply that dataset.

Latest local engine work: [Sustained instruments and broader arrangement variety](sustained-instruments.md).
New organ/pad/lead voices, compatible saved-score replay and private comparisons.
Perceived quality and variety remain NOT RUN.
Previous local engine work: [Recorded guitar and articulated strums](guitar.md).
90 exact M5/Linux WAVs and seven browser styles pass; eight matched owner pairs
are ready. Guitar realism/acceptance NOT RUN.
Previous local engine work: [Call-response, hybrid and recent-composition rejection](creative-strategies.md).
80 exact M5/Linux WAVs, seven browser styles and retry/persistence flows pass.
Eight private owner takes are ready; listening NOT RUN.
Previous local engine work: [Funk composition and web integration](funk.md).
Native/CLI/C ABI/export contracts, five WASM styles, full local browser flow and
50 exact M5/Linux WAVs pass. Four owner comparisons are ready; listening NOT RUN.
Previous local engine work: [tempo maps and mix automation](timeline.md).
Native/import/schema/echo/stem contracts and 40 exact M5/Linux WAVs pass.
The optional plans are ready for listening; automatic selection remains open.
Previous local engine work: [hip-hop composition variety and evidence](hiphop-diversity.md).
64 tested seeds yield 48 distinct instrumental structures; human-perceived
variety is NOT RUN. Four owner before/after pairs are matched for listening.
Previous local engine work: [selective tempo echo and evidence](vocal-echo.md).
Independent pitch/time evidence is retained in [the previous report](voice-transforms.md).
The default apps keep original-speed fragments pending listening.
Previous local prerequisite: [plan import/fallback and reproducible evidence](plan-import.md).
Current M5/Linux release and WASM technical checks: **PASS**; hip-hop comparison
has exact event frames and 45 cross-platform WAVs. Final M5 sanitizer tests pass
10/10 suites. These do not close any listening/release gate above.
Latest creative listening package: [selective human-voice comparisons](../renders/voice-research-20261018/review/index.html).
