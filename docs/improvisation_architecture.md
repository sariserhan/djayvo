# Jamloom R0 improvisation architecture

Scope: the [learning addendum](../jamloom_improvisation_learning_addendum_v1.md), R0 only.
The immutable master remains unchanged. No model, training, network, paid service,
new UI or device integration is introduced. This is an instrumentation and
validation foundation around the working source-driven rule planner.

## Flow and responsibilities

1. `read_wav` / `resample` / `analyze` in the shared C++ engine decode the original
   source, retain its SHA256 identity, and estimate active phrases, onsets, energy
   and periodic pitch with confidence. The original WAV is not changed. These are
   uncertain acoustic observations, **not** word labels, phonemes, semantic hook
   selection, transcription, or trustworthy key detection.
2. `make_remix` in `core/arrangement/remix.cpp` selects a seeded grammar and uses
   source onsets in vocal motifs and instrumental responses. It preserves whole
   clean hooks, chooses quiet-boundary chops, varies openings, and develops
   intro/groove/break/return/ending sections. Hip-hop, reggae and experimental
   are independent grammars, not different random IDs on one score. Musical
   vocabulary and restrictions are listed in `techniques.yaml`.
3. `scripts/r0.py evaluate` requests those existing candidates and a fixed-loop
   stock-beat-plus-voice control. It packages scores in a versioned R0 envelope,
   pins the source ledger, engine binary, adapter implementation and instrument
   manifests, checks rights and schema, then replays each through native import.
   The initial rule generation already runs native validation before rendering;
   the new canonical envelopes must pass both policy and native import checks
   before their replay is accepted. There is no second sound engine.
4. `import_plan` resolves only embedded engine instruments and the supplied source.
   `validate(RemixPlan, AudioBuffer)` and `compile(PerformancePlan)` reject invalid
   clips, tempo, key/ranges, duration, polyphony, collision-prone automation,
   truncated releases and effect tails. There is no external path or executable
   action in the execution score. Unknown commands fail closed.
5. `RemixRenderer` executes the schedule using the existing instruments, fixed
   clock, sample transformations and mixer. File parsing, rights checks, Python,
   candidate selection, allocation and any future inference stay **outside**
   the audio callback. R0 does not change callbacks, native ABI, browser or iOS.
6. Independent WAV decoding, completion-hash verification, block-size replay,
   event checks and structural plan diffs form the objective evaluation. Existing
   blinded listening tooling supplies blank ratings and comparisons. Objective
   differences are not evidence of perceived originality or quality.

## Canonical contract and existing C++ types

`schemas/performance_plan.schema.json` is the **1.0-r0 envelope**. Its `execution`
property references the existing strict `remix-plan.schema.json` (1.0–1.7-remix).
The earlier hyphenated `performance-plan.schema.json` and native schemas remain
backward compatible. Native import, not schema validation alone, is execution
approval. `r0.py validate` performs a temporary actual render to establish this.
`validate_plan()` by itself establishes only the Python schema/policy boundary.

The representation deliberately keeps executable values in their existing types:

| Entity | JSON owner | Actual C++ type / enforcement |
| --- | --- | --- |
| Session seed/rate/context | `execution.seed/sample_rate/key`, `session` ID, ledger and priority | `RemixPlan`, `PerformancePlan`, `MusicalContext`; fixed seed replay |
| Source identity and consent | `source_audio`, `execution.source/source_asset_id` plus validated dataset record | `AudioBuffer` SHA256, original/processed rates/frames; `RemixPlan` source kind/consent |
| Segments/confidence | `execution.analysis`, `voice_clips` | `InputAnalysis`, `Region`; frame bounds against actual resampled PCM |
| Approved patches/articulation | `instruments` plus `execution.tracks` | `Instrument`, `Track`, `Note`; guitar muted flag, drum map, note ranges |
| Timeline | `execution.tempo_milli_bpm`, optional `tempo_changes`, `time_signature`, `key`, `sections`, `target_bars` | `TempoChange`, `Section`, `PerformancePlan`, `KeyMode`; 960 PPQ |
| Harmonic content | `execution.tracks[].events` chord-tone notes | `Note`; explicit sounding voicings, not inferred symbolic chord names |
| Instrument events | `execution.tracks[].events` | `Note` → ordered `Event` / `Schedule`; pitch, duration, velocity, muted articulation |
| Sample events | `execution.voice_events`, `voice_clips` | `VocalEvent` / `Region`; clip index, ticks, gain, pan, rate, reverse, pitch, stretch, echo |
| Gain/effect controls | `execution.mix`, `tracks[].automation` | `MixPoint`, bounded room/reverb/duck/ceiling fields; no arbitrary effect graph |
| Constraints | `constraints`, execution ceiling and source bounds | 128 instrument voices, 16 source voices; native work/transform/release budgets; adapter 10,000 event and 120 s subprocess caps |
| Provenance | `provenance`, `instruments[].license_manifest`, `session.dataset_sha256` | Offline policy only; never interpreted as sample-processing instructions |

These are the compiled C++17 types in `core/include/jamloom/music.h` and `remix.h`,
not a duplicate unused hierarchy. Existing native tests and importer tests exercise
them. JSON action types are determined by their strict container (`tracks.events`,
`voice_events`, `automation`); an arbitrary new event type cannot be injected.

R0 has constant meter/key per performance. Tempo changes are supported by the
native score, but the three rule examples use a constant tempo. Symbolic chord
labels, harmonic confidence over time, meter/key-change commands and richer
phrase annotations remain limitations; sounding chord notes and section/source
phrase boundaries are explicit. Context confidence is zero: the rule's chosen
key is not claimed to be a confidently detected harmonic context.

## Timing, priority and failure semantics

For constant tempo, absolute ticks map to frames by nearest rounding, half up:
`frame = round_half_up(tick * sample_rate * 60000 / (960 * tempo_milli_bpm))`.
Absolute mapping avoids cumulative block drift. Tempo-map segments use the native
32-bit fractional frame accumulator (error less than 65 / 2^32 frames) and round
once. Instrument note-offs sort before note-ons at a shared frame, then ascending
stable note ID (track order, then event order). Sample triggers use stable start
frame ordering, preserving original event order and bounded echo expansion.
Instrument and sample paths sum in the fixed renderer order. Track automation
must begin at the track's initial mix, increase strictly in time and allow at
least 5 ms per ramp; contradictory simultaneous changes are rejected.

R0 priority is **offline_exclusive**, with **reject_before_playback** fallback.
Every event inherits this policy; unknown priority/controller values are rejected.
It does not promise live human override, live cancellation safety, DJ look-ahead
or automatic fallback after a missed inference deadline. The existing native CLI
has explicit `--plan-fallback` for callers opting into rule fallback; R0's adapter
intentionally fails on rejected plans so an invalid example cannot masquerade as
successful candidate execution. No AI is on the render thread.

The CPU constraint is a bounded event/voice/effect/work policy plus a 120-second
wall-time timeout, **not** a CPU-percentage or worst-case real-time guarantee.
The fixed effect set has five bounded stages: source transformation/echo,
instrument room, instrument reverb, ducking, and ceiling. No new effect can be
loaded by a plan. Input remains the engine's tested **2–5 seconds**, output 20–40
seconds; the addendum's wider 1–8-second goal is not silently enabled.

## Data and rights boundary

`datasets/manifest.schema.json` and `r0.py dataset` admit only the unchanged
preserved synthetic speech fixture and four deterministically verified original
non-person signals. Five records are examples of the metadata contract, **not** a
human training corpus. They include asset hash, source owner, purpose, authorization
file/hash, non-person voice status, training opt-in, restrictions, expiry,
withdrawal/deletion policy and split groups. Unknown source kinds, missing fields,
changed evidence, false original-signal claims, training/distribution requests,
expired/withdrawn records, duplicate hashes, cross-split source/session/speaker/
performer groups, absolute/traversal paths and symlinks are rejected.

Recorded-user and third-party ingestion is deliberately closed in R0. A later
rights-reviewed capture workflow must verify all relevant speakers, performers,
master/composition rights and platform terms; a boolean or chat permission must
not manufacture broad training rights. Prior downloaded references are not
read, ingested or trained on here. Matching hashes and a local ledger provide
integrity, not a legal adjudication or protection from a repository owner who
rewrites both code and evidence. Near-duplicate/acoustic leakage detection remains
future work. Withdrawal means exclude the record, delete its source and derived
outputs, and rebuild any downstream dataset/model where applicable. No model
exists in this run. Private raw files stay in ignored `renders/`; tracked records
contain no transcript, audio encoding or private human identity.

Acoustic piano/bass/drums use existing CC0 VSCO/VCSL instrument material;
guitar uses the existing CC0 Black-and-Green bank. Organ/pad/lead and electronic
patches are original project synthesis. Manifest hashes and existing asset audits
are reused. Project outbound licensing is still unselected; do not represent
original project material as newly released CC0. The retained eSpeak fixture's
external GPL tool is not linked into the runtime; fixture provenance is preserved
and its approved scope remains local synthetic testing. No new asset download.

## Dependencies, portability and future model boundary

R0 tooling uses the existing isolated `.venv-analysis` (`jsonschema` and its
`referencing` dependency), plus the standard library. It adds no native runtime
dependency and never changes `~/mlx-env`. `docs/evidence/r0/python-packages.txt`
records installed validation packages. A separate environment can install the
pinned validation dependency listed in `datasets/requirements-r0.txt`.

The portable C++ core, C ABI and platform adapters remain unchanged. Native Mac
checks are current evidence; Linux/physical workstation/WASM/iPhone claims must
be reported independently. Byte-identical comparison against a historical Linux
artifact is useful but not a new Linux execution.

The future model boundary is a proposed canonical plan on a background worker,
followed by exactly these schema, rights, resource and native checks. Models may
choose notes, clips and arrangement operations, never write sample buffers or
bypass consent. Deterministic rules remain the conservative baseline/fallback.
The next milestone is R1 only after explicit authorization and a rights-reviewed
capture design. No fine-tuning, new dataset collection or model/provider integration
is part of R0.
