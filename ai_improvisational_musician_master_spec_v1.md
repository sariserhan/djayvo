# AI Improvisational Musician — Master Product & Engineering Specification v1.0

**Status:** Agent-ready implementation specification  
**Date:** 2026-10-17  
**Working name:** AI Improvisational Musician (brand TBD)  
**Product:** iPhone-first, future Android/desktop, short recorded-input improvisation first; live improvisation later.

## 0. Operating instructions for the coding agent

Read this document completely before making changes. Treat it as the source of truth unless the product owner explicitly changes a requirement. Do not claim an unrun test passed, invent listening results, fabricate model benchmark numbers, or declare musical quality based only on unit tests. Work incrementally; each milestone must produce executable code, committed artifacts, reproducible commands, and a concise PASS / PARTIAL / FAIL / NOT RUN report. Do not silently proceed past a milestone marked **HOLD**. Ask questions only for decisions genuinely blocking safe implementation; otherwise apply defaults below, document assumptions, and proceed.

**Immediate authorized scope:** M0 offline audio prototype and M0 portability smoke test. Later milestones are specified for planning, **not automatically authorized**. Do not purchase GPUs, deploy cloud services, provision paid APIs, train on third-party videos, publish an app, or charge customers without explicit approval.

**Core principle:** Build the musical instrument first; add an AI director only when listening evaluations show improvement. Musical event timing is deterministic, never scheduled by an LLM in a real-time audio callback.

## 1. Product definition

### 1.1 Problem / solution / audience

- **Problem:** Most people cannot spontaneously turn an ordinary spoken phrase, laugh, clap, or ambient sound into a compelling, distinctive musical performance.
- **Solution:** Record a short sound (initial target 2–5 s), press **Make Music**, and receive a surprising, rhythmically coherent 20–40 s performance that recognizes and creatively transforms the original sound through vocal chopping, looping, pitch/time transformations, drums, bass, piano, guitar, synths, and other instruments. A fresh remix should follow a meaningfully different musical plan rather than merely shuffling a backing loop.
- **Audience:** Consumers, families, creators, streamers, playful musicians. Product must be entertaining for its first user with zero network effects.

Inspired by improvisational looping as a broad musical practice, **not** an imitation of one artist or a request to clone anyone's exact voice or sound identity.

### 1.2 Product promises

1. Original input remains recognizably present in each accepted remix; some effects may obscure portions, but at least one clean or intelligible hook must survive.
2. Musical structure and instruments genuinely respond to phrase rhythm/timbre and selected sample boundaries.
3. Multiple genres/strategies yield substantially different arrangements from the same input.
4. Playable output, not an AI-written description of music.
5. Quick, low-friction creation with no mandatory prompt or music knowledge.
6. Privacy-conscious recording and sharing; no unattended ambient recording in MVP.
7. Cost bounded; no unlimited metered cloud generation.

### 1.3 Product modes

**MVP (priority): Instant Remix** — opt-in record 2–5 s (permit up to 15 s in research tools), generate 3 distinct ~30-second outputs, replay, regenerate with new seed, and export WAV. Eventually an iPhone app with Record, Make Music, Remix Again, Save, Share.

**Post-MVP: Live Improviser** — opt-in continual capture; detect phrase boundaries and integrate new snippets into an uninterrupted musical performance at bar boundaries. Requires separate latency, feedback, and consent gates.

**Deferred:** multiuser music sessions, creator marketplace, video-first social network, voice-cloning, imitation of named performers, personalized generative singing, infinite cloud generations, Android app, multi-track manual DAW.

## 2. Hardware and development allocation

Known hardware:

- **Linux:** Intel Core i5-14500HX (14-core/20-thread class), ~32 GB RAM, Intel UHD integrated graphics, no discrete CUDA GPU. Primary environment for C++ audio/DSP, Python analysis, reproducible offline rendering, asset validation, batch tests.
- **MacBook Air:** Apple M5, 10-core CPU, 8-core integrated GPU, Metal 4, 16 GB unified memory. Has Xcode/developer account. Native `arm64`, Python 3.14.6, and MLX GPU matrix operation confirmed successful in `~/mlx-env` (`Device(gpu, 0)`). Primary for MLX experiments, Apple frameworks, iOS build, device testing. The GPU demonstration is *not* a music-model benchmark.
- **Python compatibility:** Pin project environments by supported dependency matrix; use Python 3.12 or 3.13 if particular audio/ML packages lack Python 3.14 wheels. Never modify or break existing `~/mlx-env` to force compatibility.

Develop one Git monorepo. Build shared portable core on Linux **and Mac by the first portability checkpoint**. Do not wait until the core is finished. No iOS-specific code in shared C++ components.

## 3. Architecture (hard boundaries)

```
Mic/file
  -> Input validation + normalization + consent metadata
  -> Analysis: VAD, speech/word timing, onsets, phrase/syllable candidates, pitch, loudness, event features
  -> Candidate selector: clean recognizable hooks, optional word/syllable chops
  -> Creative planner: deterministic strategies initially; later local/cloud MLX or other model
  -> Validated PerformancePlan (versioned schema, seed, events, musical constraints)
  -> C++ offline renderer / real-time engine: clock, MIDI/note events, samplers, DSP, effects, mixing
  -> Audio quality checks + stems/telemetry -> WAV / eventual AAC/M4A + share video
```

Keep content (what to play) separate from mechanism (sample-accurate scheduling). Plan format must remain independent of synthesizer implementation and mobile UI.

### 3.1 Shared C++ music engine

- C++20 or conservative C++17 with CMake; choose and document toolchain support.
- 48 kHz float32 internally by default; configurable sample rate and block size. Stereo output, mono input accepted.
- Offline rendering in fixed-size blocks using **integer sample-frame positions**. Accumulate musical time in double precision or rational beat grid and convert once to sample frames; test long-render drift.
- Event queue for note on/off, sample triggers, tempo/section changes, automation, effects and vocal chops.
- Polyphonic playable instruments (note pitch, velocity, duration; release/tail; program/articulation), dynamic drums/percussion, synthesizer voices.
- Instrument groups: piano/electric piano, acoustic/electric guitar, electric/synth bass, organ, drum kit, synth pad/lead, vocal percussion; begin with a small set of **high-quality cleared presets**. Guitars require strum/attack/decay/muting articulation, not naive pitch shifts of one WAV.
- Groove library: tempo ranges, swing, syncopation, accent, subdivision, fills, velocity variations by genre. Timing embellishment deterministic per random seed.
- Voice tools: slicing at zero-crossing or crossfade boundaries, transient preservation, normalized envelopes, gain control, pitch shifts, time stretch, repeats, reverses where appropriate, call-response, filters, delay, reverb. Do not bundle a DSP dependency until its proprietary distribution/license implications are reviewed.
- Headroom/limiting, peak and loudness reporting, no clipping in accepted exports, smooth loop crossfades, no clicks at phrase boundaries.
- Run the engine in batch mode first; real-time-safe design rules apply from day one (avoid allocation/locks/logging on eventual audio render callback).

### 3.2 Audio analysis (Python research, later portable/on-device equivalent)

- Validate input length, format, channels, sample rate, silence and corrupted files; normalize to internal format without silently destroying source.
- Collect envelope, onset and transient positions, candidate voice activity intervals, rough pitch/voicing, word boundaries if transcriber available.
- Models are replaceable, optional modules: speech transcript / alignment; non-speech sound-event classifiers; pitch trackers. No single-model requirement.
- Initial baseline must function **without a GPU or cloud model** using DSP and heuristic slicing.
- Each selected crop includes source-offset start/end, confidence, transform limits, and provenance; never select from beyond original bounds.
- Preserve clean original voice somewhere; classify profanity/abuse and consent/share risks separately from musical suitability.

### 3.3 Creative musical director

**Stage A: rule/grammar planner.** Independent strategies: vocal-first hip-hop, offbeat/reggae groove, syncopated funk, experimental beatbox/electronic, call-response, surprise/hybrid. Each specifies harmonic framework, tempo, rhythm grammar, instrument roles, motif derivation, dynamic arrangement, transitions and ending.

**Stage B: constrained AI planning.** An LLM or compact specialized model proposes a typed `PerformancePlan`. Validator must check schema version, limits, sample bounds, permitted assets, tempo/time signature, key/harmony compatibility, max polyphony/events, duration, instruments, predictable costs, and absence of unsupported actions. Invalid results trigger bounded retries or baseline planner, never crashing audio playback.

**Stage C: learned improvisation (only after data and quality proof).** Collect opt-in/cleared input + intermediate decisions + stems + outcome scores. Train/rank *musical actions*, not artist identity. Hold out speakers, input phrases, and source sessions to avoid leakage. Compare against Stage A in a blinded listening trial.

### 3.4 Musical planning output

Implement a versioned JSON schema plus native structs. Minimum contract:

```json
{
  "schema_version": "1.0",
  "seed": 4123,
  "source_asset_id": "input-001",
  "sample_rate": 48000,
  "tempo_bpm": 108,
  "time_signature": [4, 4],
  "key": "A_minor",
  "target_bars": 14,
  "strategy": "funk_vocal_hook",
  "sections": [{"name":"intro","start_bar":0,"bars":2},{"name":"groove","start_bar":2,"bars":8},{"name":"finale","start_bar":10,"bars":4}],
  "voice_clips": [{"id":"hook1","start_ms":240,"end_ms":1320,"recognizable":true}],
  "tracks": [{"instrument":"piano","events":[{"bar":2,"beat":0,"note":60,"velocity":92,"duration_beats":1}]}],
  "voice_events": [{"clip_id":"hook1","bar":0,"beat":0,"gain_db":-3,"transpose_semitones":0}],
  "mix": {"master_target_peak_dbfs":-1.0}
}
```

This is a *schema sketch*, not a full valid 30-second composition. Define exact bar math (duration from BPM, time signature and number of bars), time units, clip ownership, arrangement constraints, stem names, deterministic ordering, section coverage, sample gain and limiter behavior in the definitive schema. Example 14 bars at 108 BPM in 4/4 is ~31.1 s. No ambiguous units.

## 4. Music quality and creativity requirements

The same phrase must yield different outcomes that are audible as different compositions, not just different random samples. Require genre-appropriate patterns, harmonic compatibility, a readable hook, musical arcs (intro/groove/variation/ending), silence and tension as deliberate choices. Prevent constant full-volume layering. Musical director may change genre during one output if transition rules make sense, but this is not required for M0.

Baseline comparison: original phrase pasted over a stock beat. If a custom arrangement does not beat that baseline in a controlled listening study, do not claim AI magic or proceed to train bigger models.

## 5. Instrument/sample assets and rights

Use **original, public-domain, or explicitly licensed commercial-use/distribution-permitted samples**, with metadata per file: creator, source, license, attribution obligations, modifications allowed, redistribution permitted, territory, license URL/copy, and hashes. **Publicly viewable ≠ copyright-free.** User possession of a video does not itself authorize model training, sampling, republishing, or scraping.

Do not include YouTube video audio, proprietary SoundFonts, commercial loops, artist-specific recordings or performer likeness/voice assets in training or shipping packages without rights review. Third-party libraries (JUCE, FluidSynth, Rubber Band, Essentia, AudioKit, etc.) require license matrix/approval based on actual version and distribution model; they are **candidates**, not mandatory dependencies. Favor permissively licensed code for proprietary app if possible. Ensure sample-library resale/redistribution limits are respected even where commercial music composition is allowed.

Dataset rights ledger: source ID, owner, explicit training rights, usage categories (analysis / training / sampling / distribution), permissions, withdrawal handling, retention and audit trail.

## 6. Model strategy and compute

- **Do not train a large end-to-end music generation model for MVP.** First reach human-validated quality using sample instruments and programmatic arrangements.
- MAC M5 MLX can be used for compact music-direction inference, small experiments and selected speech/audio models after benchmarking. 16 GB unified memory caps model size and concurrent tools; avoid claiming feasibility of a model merely from its published parameter count.
- Linux runs DSP, portable render, dataset prep and parallel offline tests. CPU-only fallback required.
- Research optional generative instrumental services/models only behind feature flags. Benchmark on actual input, model license, inference latency, memory, identity preservation, cost, output controllability, consistency and failure rate. **Do not assume any specific model version is commercially suitable.** Verify official docs/licenses before installation/use.
- If cloud GPU generation becomes necessary, require explicit approval and hard per-request budget, model timeout, retries capped, estimated and recorded spend, concurrency cap and fail-closed behavior. Never expose raw paid-provider keys in client binaries.

## 7. iOS product and APIs (Mac development)

- SwiftUI, native audio capture/playback (AVAudioEngine, AVAudioSession or current supported Apple APIs), microphone permission and recording indicators, headphone/speaker handling, interruption and route-change handling, lifecycle management, share sheet.
- Cross-platform C++ core surfaced via thin Objective-C++ wrapper or a documented C ABI; SwiftUI may call wrappers, never reimplement beat engine in Swift. Offline renderer can initially return exported audio for app playback.
- UI flow: welcome/consent -> Record -> waveform and clip trimming -> Make Music -> play 3 variations -> Remix Again -> Save/Share. No account required for local generation.
- MP3/AAC/M4A/video export codecs only after licensing and quality assessment; initial lossless WAV required.
- For live mode, microphone capture + render callback + phrase segmentation + scheduled transition at bar boundary. Define bounded end-to-end latency budgets on real iPhone hardware before committing to live MVP.
- Do not assume background recording is allowed/reliable; disclose constraints and test App Store policy.

## 8. Privacy, safety and trust

- Opt-in microphone capture only; visible recording state; no hidden ambient capture or automatic upload. Provide local delete and in-app consent explanation before recording voices; require appropriate consent from recognizable speakers for recording/sharing under applicable law.
- By default process locally; only upload when a user explicitly enables cloud features, with clear retention/deletion policy.
- Avoid artist/person imitation or unauthorized voice clones; do not market as a simulation of the exemplar artist.
- Abuse controls for public sharing, including reporting and removal; protect minors and identifiable recordings, do not publish location metadata in shares.
- Validate file sizes, lengths, decoders, and user-supplied metadata; safe filenames, path traversal protection, resource limits, model-output schema verification.
- Avoid claims of copyrighted music ownership or indemnity that have not been legally reviewed.

## 9. Product economics

Local CPU/DSP/instrument rendering should not incur per-play cloud costs. Any optional AI cloud feature requires ledger of actual costs, subscription/credit entitlement, payment commissions, storage, bandwidth, tax effects as applicable, refunds, margin buffer, preauthorization and hard cutoffs. No unlimited GPU-intensive generations. Cloud render output stored temporarily with TTL; opt-in permanent storage priced and capped. Avoid background uploading raw voice files.

Monetization only after quality/product-demand proof: free limited local remixes, premium additional features/styles/exports, optional prepaid credits for explicitly metered cloud enhancements. Price points are experiments, not factual unit economics.

## 10. Telemetry and evaluation

Privacy-preserving metrics (opt-in where applicable): generation duration, render time, memory, crash, clipping, selected strategy, asset hash, seed, fallback frequency, replay, remix request, save/share; don't log raw audio/transcript by default. Export machine-readable `report.json` for each test run.

Automated checks: sample-frame timing correctness; input bounds; deterministic seed re-render hashes; channel balance; finite output; no NaN/Inf; peak below configured ceiling; silence/truncated input; note-off correctness; polyphony caps; seam clicks; sample rate conversion; performance schema validator; failure fallback.

Human tests (blinded): 20–50 diverse consented source clips including short speech, syllabic speech, laughter, claps, noise and silence/control; at least 3 seeds/strategies per clip. Judge recognizability, groove, coherence, originality/variety, enjoyment, share-worthiness. Track per-style failures. Have reviewers compare with the “voice over stock beat” baseline. Never label human-evaluation gates PASS unless real blinded observations are collected.

**Provisional targets, not facts:** >=85% technically usable outputs; >=90% recognizable input where speech is supplied; >=70% listener-rated enjoyable; >=30% declared willingness to share; three distinctly arranged outputs from a common phrase; zero critical glitch/clipping failures in accepted renders. These need a preregistered rubric before M1.

## 11. Repo layout and build constraints

```
ai-musician/
  README.md
  AGENTS.md
  docs/
    architecture.md
    decisions/             # ADRs
    licenses.md
    evaluation-protocol.md
    progress.md
  schemas/
    performance-plan.schema.json
  core/
    include/
    src/
    tests/
  ai/
    analysis/
    director/
    evaluation/
  tools/
    cli/
    asset_audit/
  assets/
    manifests/
    demo-cleared/          # small permissible demo assets only
  apps/
    ios/                   # created at portability/iOS milestone
  tests/
    fixtures/
    integration/
  scripts/
  CMakeLists.txt
  pyproject.toml
  .github/workflows/
```

Never check private recordings, unlicensed sample libraries, model weights with restricted terms, API keys, or large generated audio into Git. `.gitignore` and a script to acquire/verify permissible fixtures as needed. Pin dependencies, hash assets, record licenses and toolchain versions. CI should compile core on Linux and macOS when runner access exists; local documented commands must be sufficient when CI is unavailable.

## 12. Milestones with hard gates

### M0 — Offline instrument + vocal-remix proof (**AUTHORIZED**)

**M0a:** Repo skeleton, ADRs, license/source manifest, CMake unit tests, deterministic WAV rendering. Generate a synthetic four-bar drum + bass + piano arrangement, with timestamp-accurate notes, no vocal input needed yet. Emit playable WAV and report.

**M0b:** Load 2–5 s consented WAV, find selectable clips, preserve recognizable original snippet, produce first 20–40 s musical composition with at least drum, bass, melodic/harmonic instrument and vocal track. WAV + stems (if feasible) + score JSON. Sound assets must be legally usable.

**M0c:** Generate three audibly different arrangements for same input using at least two independently distinct composition strategies (target three genres: hip-hop, reggae, experimental/beatbox). Three distinct seeds do not count if only superficial variations. Include note tracks, identifiable voice, arrangement arcs and real instruments.

**M0d:** Portability smoke test on Apple M5: compile shared C++ core, render at least one identical plan, compare numerical/event results and note intended nondeterministic differences; do not require byte-identical audio across all compiler DSP backends unless designed for that.

**M0 gate:** Provide WAV paths, instructions to audition, source/asset license inventory, test summary, peak/loudness metrics, known failures, and actual listening-assessment requests. M0 can only claim a *technical* PASS if tests passed; musical-quality gate remains PENDING until evaluated by humans.

### M1 — Musical quality baseline (**HOLD**)

Refine instrument realism, groove grammar, phrase hook selection, structure, clean transitions. Run blinded evaluation against stock-beat baseline. Ship three musically distinct remixes for diverse voices. Failed style(s) recorded with actionable defects. Advance only if improvements justified.

### M2 — Mac inference benchmark / AI director (**HOLD**)

Create separate ML environment compatible with actual dependencies; keep existing `~/mlx-env` stable. Benchmark pure-rule planner vs model-generated structured musical plan, measured RAM, GPU use, latency, cost, diversity, schema-valid rate, quality. Demonstrate fallback. Do not assume MLX is best for every audio model.

### M3 — iPhone Instant Remix prototype (**HOLD**)

SwiftUI app + microphone permission + local core integration + play/share. Test actual device, app lifecycles, sample quality, codecs, CPU/battery/memory. Make no unsupported claims about live latency.

### M4 — Live Improviser research (**HOLD**)

Bar-aligned continual input integration, glitch-free audio, headphone/feedback handling, reliable input endpoint segmentation, consent controls. Quantify user-perceived response time on actual device; reject impossible targets rather than hiding delays.

### M5 — Production and monetization (**HOLD**)

Privacy policy, rights audit, abuse/moderation, App Store testing, paywall/cost budget, usage reporting, crash diagnostics, beta feedback and measurable retention/share outcomes. Ship only with product-owner release approval.

## 13. Agent's immediate execution checklist

1. Inspect repository and hardware/tool availability; do not assume this repository already exists. If path not supplied, create the project in a user-accessible working directory and record it in `docs/progress.md`.
2. Implement M0a only initially: portable CMake core, minimal instrument sample/synthesis, note sequencer, WAV writer, deterministic seed, score JSON and tests. Use self-generated or safe/cleared audio assets, never random licensed assets fetched from the internet without review.
3. Render one real WAV file and verify by decoding/statistics, not just file existence.
4. Commit logical changes if a Git repo is available; avoid destructive actions to existing project files.
5. Report `PASS`, `PARTIAL`, `FAIL`, or `NOT RUN` individually for build, unit tests, renderer, listening validation, and macOS portability. Include exact commands and artifact locations.
6. Stop for M0a review, unless owner specifically instructs to continue through the remaining authorized M0 phases.

## 14. Definition of done / non-goals

- **Code written** is not **music demonstrated**. Actual audible WAV output is mandatory.
- **Audio generated** is not **good improvisation**. Blinded listening evidence is mandatory before claims of quality.
- **GPU available** is not **models benchmarked**. Real memory/latency/model reports are required.
- **Publicly online** is not **licensed to train on**. Rights ledger must be complete.
- **One functioning desktop render** is not **an iPhone app**. Real-device integration and permission tests are separate milestones.

The intended long-term differentiator is a reliable, original, expressive virtual musician that transforms a person's own sound into structured, surprising musical improvisation, with immediate solo-user value and organic shareability.
