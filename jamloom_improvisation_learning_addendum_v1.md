# Jamloom — Improvisation Learning & Musician Intelligence Addendum v1.0

**Status:** Agent-ready technical addendum, not authorization to train on third-party recordings or proceed past R0.  
**Product name:** Jamloom (supersedes Djayvo wherever named).  
**Relationship:** Complements the existing AI Improvisational Musician master specification; do not modify that specification.  
**Primary objective:** Create an original improvisational musician that can transform short speech and environmental sounds into coherent, surprising, musically engaging performances, and later improvise live alongside a human DJ.

## 1. Product goal and non-goals

**Target experience:** Given a 1–8 second recording such as “I have a question,” Jamloom selects recognizable speech fragments and constructs an original approximately 30-second performance using dynamically arranged instruments, rhythmic vocal chopping, looping, effects, musical variation, and an intentional ending. Repeated runs should yield distinct, good-quality results. In a later phase, decisions update during a continuing DJ set.

**Non-goals:** Reproducing a specific performer's recordings, voice, personality, signature performances, or identity; generic text-to-song prompting; simply placing speech over a stock instrumental; attempting a single end-to-end audio foundation model immediately; and requiring cloud connectivity for basic DSP playback.

**Guiding principle:** Learn **how to make and execute musical decisions**, not just the statistical sound of an existing song. Skilled live-looping artists, including Mr. Wobbles, are inspiration and research references, not imitation targets.

## 2. System boundaries and architecture

Build these separately testable modules:

1. **Audio Listener / Analyzer**: voice activity detection, onset detection, silence detection, transient segmentation, speech transcription when useful, word/phoneme/syllable timing where confidence permits, energy and pitch contours, and sound classification. Each result carries timing, confidence, and provenance. No assumption that transcription alone identifies a musically useful hook.
2. **Musical State**: current BPM, meter, beat/bar position, harmonic center/key confidence, chord progression, active instruments, running loops, available samples, effects states, CPU/headroom, and user-controlled restrictions.
3. **Creative Director / Improviser**: proposes candidate musical intentions and structured actions from source features plus current state. Initially rules and grammars, later a small pretrained model or fine-tuned policy if evidence supports it.
4. **Plan Validator / Scheduler**: deterministic checks and quantization, constraints on tempo/key/ranges/polyphony, resource budgets, collision prevention, command priority, and instrument availability. Converts decisions into scheduled events. Musical AI must never be called inside a real-time audio callback.
5. **Audio Engine**: portable C++ playback/sampler/synthesis/DSP, instrument articulation, routing, effects, rendering, and live performance. Targets Linux native, macOS native, iOS, and browser WebAssembly through platform-specific adapters.
6. **Listener and Reward/Evaluation**: offline objective tests; blinded human comparison; optional model-based ranking trained from licensed/original examples; strict separation of training, development, and held-out evaluation material.

Data flow: **audio input → analysis/features → candidate decisions → validation and ranking → performance plan → deterministic rendering/playback → outcome/evaluation → improvement dataset**.

## 3. Musician technique taxonomy (R0 deliverable)

Create versioned `techniques.yaml` documenting at least 30 concrete operations within these families, each with parameters, audio examples from original/cleared assets, use conditions, known failure modes, and corresponding engine actions:

- **Source capture:** trigger, pre-roll/post-roll, speech-boundary capture, sound isolation, trimming, silence handling.
- **Sample manipulation:** slicing, phoneme/syllable chops, one-shots, reverse, repetition, beat repeat, time stretch, pitch shift, formant-preserving changes where supported, retriggering, stutter.
- **Rhythm/groove:** tempo inference, note quantization, swing, syncopation, polyrhythmic accents, fills, beatboxing/voice-as-percussion, humanization.
- **Harmony/melody:** key detection with uncertainty, chord functions, bassline generation, call-and-response, melodic answer, arpeggiation, contour mapping from speech, instrument voice-leading.
- **Arrangement:** hook selection, layering, motif development, breaks, drop, contrast, genre-inspired instrumental vocabulary, energy trajectory, transition, cadence/ending.
- **Mix/performance:** gain staging, EQ, filters, delay, reverb, sidechain-like ducking, stereo placement, channel mute/solo, cue and live-override semantics.

Genre vocabulary is compositional metadata, not an artist-style cloning instruction. Document the musical basis and restrictions for each genre grammar.

## 4. Canonical structured performance representation

Specify an explicit versioned schema (JSON Schema and C++ types). Minimum entities:

- `session`: ID, format version, deterministic seed, sample rate, musical context, source consent/licensing metadata.
- `source_audio`: local asset reference/hash, start/end boundaries, segmentation annotations, confidence, channel count; no hidden embedding of private audio in logs.
- `instruments`: approved patch/library identifiers and licensing provenance, MIDI note ranges, articulation sets.
- `timeline`: tempo/meter/key changes, bar grid, chords and phrase boundaries.
- `events`: discrete typed actions with precise time coordinates (samples or ticks plus conversion rules), durations, voice/source references, note pitch/velocity, slice boundaries, looping and pitch/time parameters, gain/effect automation, controller priority, and fallback action.
- `constraints`: maximum voices/CPU, clip length, limiter ceiling, sample bounds, maximum concurrent effects, allowed assets.
- `provenance`: planner/model version, prompt/policy version, source licenses, random seed, export metadata.

Implement schema validation and deterministic replay. Reject missing sources, out-of-range parameters, unauthorized assets, unschedulable actions, and overlapping modifications that cause undefined behavior. Explicitly define event ordering for simultaneous commands. Provide a human-readable plan inspector and diff tool for comparing candidate remixes.

### Illustrative plan fragment (not final schema)

```json
{
  "schema_version": "0.1",
  "seed": 17,
  "tempo_bpm": 104,
  "meter": [4, 4],
  "key": {"tonic": "A", "mode": "minor", "confidence": 0.72},
  "source": {"id": "voice_001", "sha256": "<content hash>"},
  "events": [
    {"type": "vocal_slice", "at_tick": 0, "source_id": "voice_001", "start_ms": 850, "end_ms": 1500, "gain_db": -6},
    {"type": "midi_note", "at_tick": 960, "instrument_id": "bass_01", "pitch": 45, "velocity": 92, "duration_ticks": 480},
    {"type": "filter_automation", "at_tick": 6720, "channel": "voice", "target_hz": 800, "duration_ticks": 480}
  ]
}
```

## 5. Learning strategy: what to learn, and from what

### 5.1 R0: no training required

Implement a transparent rule/grammar baseline and data instrumentation. Generate multiple candidate arrangements from the same phrase using independent strategies: vocal-first, percussion-first, melodic response, call-and-response, bass-first, genre transformation, surprise break, and live-DJ compatibility. Run actual audio renders and compare to the simple stock-beat-plus-voice baseline.

### 5.2 Reference performance analysis

When licensed or otherwise validly authorized, ingest examples containing an original phrase and the resulting live-loop performance. Create source-separated/transcribed/timing annotations as **uncertain observations**, not known ground-truth button presses. Human reviewers must correct examples used for supervision. Keep performer identity out of target labels unless separately and explicitly required and authorized. Never claim public online availability equals permission to train or scrape. Check licenses, publicity/voice rights, source/platform terms and provenance; quarantine unclear materials.

### 5.3 First-party demonstration capture

Create a capture interface for musicians to improvise *inside Jamloom*. Record source samples, MIDI notes, track automation, sample slices, edits, track/genre choices, timing, and final mixed WAV (plus stems if available). Obtain explicit rights/consent and separation of private user recordings from opt-in training material. This action-trace dataset is the primary supervised training asset.

### 5.4 Model progression

1. **Heuristic planner** with seeded stochastic exploration and genre grammar, deterministic engine rendering.
2. **Small pretrained reasoning/planning model** outputs structured action plans; apply strict schema validator and reject/fallback behavior. Benchmark inference locally on M5 with MLX if compatible; CPU fallback.
3. **Supervised fine-tuning** on rights-cleared input/state → expert next-action and full-plan traces. Use held-out performers, speakers, phrases, and genre/tempo combinations.
4. **Preference/ranking model** from blinded pairwise comparisons for musicality, novelty, voice recognizability, groove, enjoyment, and over-repetition. Keep rating dimensions separate; do not collapse into one opaque score without validating tradeoffs.
5. **Closed-loop improvisation policy**: observe the most recent bar/phrase and live state, propose changes for future scheduled boundaries; no model inference on audio thread. Add immediate human override and safe fallback.

Do not fine-tune a full audio-generation foundation model until ablations show that structured planning/synthesis cannot achieve target quality. Generative instruments/textures may be an optional asynchronous layer with license checks and resource budgets.

## 6. Data pipeline and rights management

Store explicit metadata for every recording: origin, rights owner, allowed uses (evaluation only/training/distribution), consent for identifiable speakers, original source/hash, training opt-in, retention/deletion requirements, and downstream restrictions. Training pipeline must exclude samples without verified training authorization, and offer removal/rebuild procedures when consent is withdrawn as feasible. Public videos may be studied at a broad methodological level; downloading, training, or distributing derived samples requires separate rights review. No voice impersonation, identity replication, or unlicensed copying of distinctive performances.

Create `datasets/manifest.schema.json` and an ingestion validator with fail-closed licensing checks. Store source audio securely; redact logs. Do not use user voice recordings for training by default. Ensure commercial permissions for SoundFonts, instruments, sample packs, and DSP libraries.

## 7. Benchmarks and musical quality gates

Use test fixture sets stratified by: short/long phrases, noisy/clean environments, different accents/languages, unusual rhythms, laughter/nonverbal sounds, low/high pitches, multiple voices (only where consented), different tempos, and genres. Use disjoint train/dev/test by source performer and speaker, and prevent sample/arrangement leakage.

**Functional gates (automated):**
- Rendering and reloading WAV; true non-silent audio with intended instrumentation.
- No NaNs, invalid buffers, out-of-bounds slices, severe clipping, sample-rate drift, or unbounded memory growth.
- Sample-accurate deterministic event scheduling within defined test tolerance; cross-platform parity measured and reported.
- Never execute ML inference on real-time render callback.
- Invalid plans rejected or recovered from with documented fallback.
- The source voice is audibly present when required; check with human listening rather than transcript alone.

**Quality gates (human):**
- Blinded A/B against (i) stock beat plus voice and (ii) previous model/baseline.
- Ratings for enjoyment, coherent groove, originality, recognizability, variation, transitions, mix quality, and desire to share.
- At least 3 meaningfully distinct remixes per source phrase, rated by independent listeners.
- Report sample sizes, confidence intervals, failure examples, and effect sizes. No fabricated results or claiming professional parity from a few demos.

**Prospective pilot thresholds** (adjust only before evaluation, not after seeing results): ≥85% structurally valid renders, ≥90% recognizable source speech in designated vocal-hook outputs (blinded human panel), ≥70% of evaluated outputs rated enjoyable, and ≥30% unsolicited declared willingness to share. These are hypotheses; the key decision is statistically credible improvement relative to simple baseline. Track time to first audible result, real-time glitches, CPU/memory, session duration, and cost per successful output.

## 8. Latency and performance design

For instant remix: get immediate audio feedback from precached/local sounds; analyze in background; render early bars while composing later bars where feasible. Treat <3 seconds to first audio as a *target to measure*, not a guaranteed ability. For live improvisation: schedule model decisions at bar/phrase boundaries with look-ahead; carry deterministic fallback grooves through missed deadlines. Preload/cap assets, fixed-size callback buffers, bounded queues, predictable memory; no alloc, blocking I/O, network, Python calls, or model inference on the real-time thread.

Benchmark on actual Apple M5 (16 GB unified memory) and Linux CPU-only workstation; log model memory residency, thermal throttling, inference latency, render latency, max track polyphony, and clipping. Cloud models only behind explicit opt-in/credits and server-side per-generation spending limits.

## 9. Project integration

Keep the master spec unchanged. Product/repository/docs: **Jamloom** (rename any newly authored assets accordingly; do not rename existing repo without checking workspace). Reuse the existing planned C++ cross-platform core, the web DJ studio's real mixer/decks, and iOS audio adapters. The AI improviser emits the *same* typed instrument/sampler/effect actions used by human UI controls; avoid separate incompatible sound engines.

**Machines:** Linux (~32 GB, no dedicated GPU) for DSP, batch analysis, offline rendering, evaluation; MacBook Air M5 (8 GPU cores, 16 GB, verified MLX GPU) for MLX experiments, native iOS/Web testing, Apple acceleration. Limit GPU memory use; train larger models on remote GPUs only after benchmark and spending approval.

## 10. Milestones and stop gates

### R0 — Improvisation intelligence foundation (AUTHORIZE ONLY THIS MILESTONE)

Deliverables:
1. Survey and define ≥30 concrete musician techniques in versioned `techniques.yaml` (no proprietary performer imitation instructions).
2. Create `docs/improvisation_architecture.md` explaining module boundaries, event flow, baseline vs model tradeoffs, rights, and timing constraints.
3. Define and validate `schemas/performance_plan.schema.json`; produce at least 3 example plans and invalid-plan tests.
4. Create first-party dataset manifest schema, licensing/consent validation script, and 5 synthetic/original example records. No third-party video ingestion until explicitly authorized.
5. Implement a rule-based candidate planner producing ≥3 diverse, executable plans for one supplied/consented phrase; if shared engine is not ready, provide schema-valid dry runs **clearly labeled not audio evidence**. Avoid recreating existing M0a work.
6. Implement offline evaluation harness design and, where executable, actual WAV output, objective tests and report templates. Human judgments remain **NOT RUN** unless performed by real people.
7. Identify any dependencies and licensing concerns, with conservative alternatives. No paid API calls or cloud GPU usage.
8. Mac compatibility smoke test when environment available; otherwise **NOT RUN** with exact commands for the Mac agent.

**Stop:** Report R0 as PASS/PARTIAL/FAIL/NOT RUN at individual gate level and overall, with git commit hash, files changed, reproducible commands, runnable outputs, and blockers. Do not begin R1/data collection/model training/web UI/iPhone work without authorization.

### R1 — Original / licensed reference dataset and expert demonstration capture
Permissioned recordings; structured annotated timelines, first-party action-trace capture, rights ledger, stratified splits. Requires separate authorization.

### R2 — Baseline comparison and musician listening study
Rule-based and model-planner variants, blind pairwise human ratings, documented statistics. Requires separate authorization.

### R3 — Supervised planner training and preference learning
Train only on cleared data, evaluate held-out generalization and incremental quality. Requires separate authorization.

### R4 — Live, adaptive, DJ-integrated improvisation
Bar-boundary decisions, human override, graceful fallbacks, crash-resistant audio. Requires separate authorization.

## 11. Agent execution rules

- Read the existing master spec, current repo status, and this addendum before editing.
- Inspect already implemented M0a functions and tests; integrate rather than replace them.
- Maintain backwards compatibility; request explicit approval before schema-breaking changes or paid-resource use.
- Do not claim a trained model, human evaluation, copyright clearance, or actual audio result unless evidence exists.
- Treat musical quality as distinct from compilation, valid schema, and WAV generation.
- Write tests first where practical; keep artifacts and generated evidence easy to reproduce.
- Preserve original musical output and privacy; do not recreate identifiable performer's voice or signature recordings.
- Halt at the milestone boundary.

## 12. Acceptance report template

```text
Jamloom R0 Report
Commit / branch:
Environment:
Techniques taxonomy: PASS/PARTIAL/FAIL/NOT RUN
Plan schema and validators: PASS/PARTIAL/FAIL/NOT RUN
Data provenance validation: PASS/PARTIAL/FAIL/NOT RUN
Planner produces three distinct plans: PASS/PARTIAL/FAIL/NOT RUN
Actual audio render: PASS/PARTIAL/FAIL/NOT RUN
Objective DSP tests: PASS/PARTIAL/FAIL/NOT RUN
Mac portability: PASS/PARTIAL/FAIL/NOT RUN
Human musical quality tests: NOT RUN unless genuinely conducted
Third-party training rights: NOT ASSESSED / VERIFIED BY ASSET
Commands and output file paths:
Open blockers:
Overall R0 status:
Next recommended milestone (do not start):
```
