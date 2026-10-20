# Q0 completion review — expression, controlled audio and portability

2026-10-20. **Overall Q0: PARTIAL. Demonstrated substantial musical recovery:
not established. Latest received improvement judgment: FAIL.**

**Latest:** The owner has now rejected the full 4207/4209 packet too, identifying
weak creativity while accepting the instrument sounds of the other candidates.
[Source-motif composition study](q0-source-development.md) records that feedback
and supplies five new controlled comparisons at 4211, with unchanged instruments,
actual stems, exact replays and Mac/Linux/WASM parity. New acceptance remains
NOT RUN. The historical checkpoint below predates this latest feedback.

[Performed-motif follow-up](q0-motif-completion.md) corrects one final reggae
note that the source-development trace counted before the rest pass removed
it. Eighteen tests and a separate corrected render pass; 4211 remains frozen.
This is technical correctness evidence, not musical acceptance.

Q0 cannot be closed as passed on technical results. The owner heard the
guitar-accent pair and answered **“Neither is substantially better.”**
That is a failed improvement result for that packet, not a numeric rating or
proof of identical quality. [Exact feedback](evidence/q0-guitar-single/owner-feedback.json).
The new full five-condition packet has no submitted listening results yet.
No production change is promoted.

Subsequent [Linux/review follow-up](q0-linux-review-followup.md) closes local
Linux ARM64 execution with five byte-identical renders and prepares a
licensed-source packet excluding private owner voice. The regression suite
now has 17 passing tests. “Continue” supplied no new quality judgment.

This review consolidates the requested steps rather than treating each small
experiment as a completed musical recovery milestone.

## Final local checkpoint — 2026-10-20

**Q0 remains PARTIAL, not successfully completed.** The implementation and
evidence below are delivered for review. The remaining work is substantive:
identify the dominant audible problems and demonstrate a substantial
improvement through controlled human listening. The owner's rejected
comparisons are failures, not unfinished technical tests that another green
test run can cure. No numeric judgments or new acceptance were received.

The final check found and fixed a listening-data workflow bug: selecting only
one of a candidate's six scores allowed a download that the importer would
reject. The page now focuses the first missing score and retains the entered
answers. All six scores or all blank is the existing contract; notes alone
remain valid and unheard candidates stay blank. No rubric or benchmark changed.
The original failure is retained in
[`form-before.log`](evidence/q0-closeout/form-before.log).

Changed source:

- `scripts/q0-review.js`: extracted existing local-only controls and added the
  all-or-none check; no new dependency.
- `scripts/q0_expression_trial.py` and `scripts/q0_independent_packet.py`: use
  the same corrected controls when preparing future packets.
- `tests/q0_review_browser.mjs`: incomplete-entry rejection, retained answers,
  correction, notes-only export, missing-score preservation and privacy checks.
- `tests/integration/verify_q0.py`: blank and note-only response handling.
- [`prepare.py`](evidence/q0-closeout/prepare.py): reproducible form-only copies
  with exact audio/metadata assertions. Historical authored/pair-study generators
  retain their pinned controls and distinct partial-rating protocols.

The corrected [private review at 4209](http://127.0.0.1:4209/) has **exactly
the same recordings and candidate order as 4207**. The
[licensed-only review at 4210](http://127.0.0.1:4210/) likewise preserves 4208.
These are not new musical candidates. All 54 WAV entries are hard links to
immutable existing files, avoiding additional audio storage. Only `review.js`
differs; packet IDs, plans, masters, stems and the old pages remain unchanged.
Do not edit these linked WAVs in place.

| Final check | Gate | Evidence |
|---|---|---|
| Q0 regression suite | PASS | 17 tests; [output](evidence/q0-closeout/tests.log) |
| Corrected private and licensed forms | PASS | Chromium and WebKit reject partial candidate scores, accept complete scores and note-only responses, and retain blank unheard scores |
| Privacy and packet integrity | PASS | Both organizer keys return 404; licensed packet excludes owner voice; no external requests; [hash inventory](evidence/q0-closeout/review-packets.json) |
| Frozen native/WASM evidence recheck | PASS | Original audio/source/spec/core inventories intact; [output](evidence/q0-closeout/native-wasm-verification.log) |
| Retained Linux outputs recheck | PASS | Five exact Mac/Linux WAV/plan/event comparisons and valid export receipts; [output](evidence/q0-closeout/linux-review-verification.log) |
| Physical browser audio | PARTIAL | Decode/form checks pass; headless WebKit clock limitation and actual speaker/headphone listening remain unverified |
| New human judgments / independent panel | NOT RUN | Browser fixture answers were deleted, never imported as study results |
| Previously judged improvement | FAIL | Owner rejected earlier packets and the guitar-accent comparison |
| Substantial recovery / overall Q0 | PARTIAL | No accepted musical improvement; do not promote or move to training |

The two browser reports and mobile screenshots are in
[`q0-closeout`](evidence/q0-closeout/). Desktop and mobile browser checks passed;
the retained Chromium mobile screenshot was also visually inspected. Native
and Linux compilation were **not rerun** for this form-only change; the
previous actual execution evidence was reverified. No additional audio
perception, provider action, publication or device run is implied.

Reproduce the form checks with the two loopback servers running:

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-analysis/bin/python docs/evidence/q0-performance/verify.py
.venv-q0/bin/python docs/evidence/q0-followup/verify.py
Q0_REVIEW_URL=http://127.0.0.1:4209/ Q0_CANDIDATES=5 \
  node tests/q0_review_browser.mjs
Q0_REVIEW_URL=http://127.0.0.1:4210/ Q0_CANDIDATES=5 Q0_SOURCES=4 \
  node tests/q0_review_browser.mjs
```

The updated private page is served from
`renders/q0-performance-form-v2-20261020/listener/`; the licensed-only page
from `renders/q0-independent-form-v2-20261020/listener/`. Serve only `listener/`
on `127.0.0.1`, keeping organizer metadata outside the web root. `prepare.py`
refuses existing destinations; change its destination names for a fresh rerun.
Downloaded real responses remain compatible with the original packet's
results validator because the audio identities and candidate mapping match.

**Next experimental decision, still inside Q0:** obtain a verdict on the
current full packet. If it too fails, use isolated instrument/stem judgments
and an authorized musician's annotated phrase-to-performance demonstration
to select a new causal intervention. The existing tests do not tell us which
sound change will succeed. More timing jitter, new numerical thresholds or
unreviewed training would not establish the required improvement.

## Requirement-by-requirement status

| Q0 step | Gate | Evidence and remaining limitation |
|---|---|---|
| 1. Audit before engine changes | PARTIAL | [Baseline diagnosis](q0-quality-recovery.md), event/waveform measurements and instrument probes identify mechanisms. Dominant perceptual causes remain unranked. Production engine unchanged. |
| 2. Five real baseline inputs, plans, stems, masters and measurements | PASS | Frozen owner conversation, three licensed speech clips and laughter; originals/plans retained. Metadata-based selection is not broad population validation. |
| 3. Instrument realism, SFZ/sfizz and licenses | PARTIAL | Native piano/bass/drums/guitar/synth probes, sample-based SFZ comparisons and license audit exist. Owner rejected prior realism packets. No new recorded layers or verified realism improvement claimed. |
| 4. Modular deterministic expression capabilities | PASS | Functional offline plan layer now includes groove, shared microtiming, accents/ghost strokes, phrasing, supported articulation, bass/kick relationships and transition pickups; rendered and tested. Listening quality remains separate. |
| 5. Coherent composition and development | PARTIAL | Intact vocal calls, source-rhythm answers, recurring contour, contrast and resolution are executable; improvement in musical ideas remains unproven. |
| 6. Controlled A/B/C/D/E audio and matching | PASS | Five sources, same source/tempo within each block, twenty candidate masters/stems plus preserved A; 25 matched listening mixes. |
| 6. Blind human improvement evaluation | PARTIAL | Earlier packets and latest guitar pair rejected; new full packet ready, no new submitted ratings. No independent panel inferred. |
| 7. Reproducible reporting | PASS | Plans, traces, waveform differences, exact commands, test logs, failure logs, source/build hashes and this report retained. |
| Success: substantially less robotic and more coherent | PARTIAL | No accepted improvement yet; cannot turn technical completion into a quality PASS. |

The current recommendation is to remain inside Q0. No training or later
milestone is authorized by this result.

## What was implemented in this continuation

`scripts/q0_performance.py` adds a versioned offline expression transform on
top of the existing `q0_expression.py` shared-clock transform. It never edits
the source plan or engine:

- Rolled chord attacks are grouped; phrase ends follow rests or section
  boundaries. Mid-phrase arrival and phrase-end release use intentional
  velocities and shorter final gates.
- Bass notes already coincident with kicks receive coordinated accents;
  their shared onsets stay aligned. Off-kick notes stay syncopated.
- Genre-specific snare pickups occur only before section changes with an
  established groove and space clear of vocals. Existing snare strokes are
  not doubled. Reggae receives no fill in this cohort because its available
  windows are occupied; the rule does not force decoration everywhere.
- Existing bounded microtiming, offbeat delays, ghost-stroke accents, pitched
  gates, guitar muting and phrase dynamics are reused. Seed reproduction is
  deterministic, with no independent random onset jitter.

`scripts/q0_expression_trial.py --performance` applies this layer to the five
frozen inputs. The five conditions remain:

| Arm | Renderer | Plan |
|---|---|---|
| A | Frozen production | Frozen baseline |
| B | Previously isolated longer drum decay | Exactly A |
| C | Frozen production | V2 expression of A, including declared ornamental pickups |
| D | Same isolated decay | Exactly C |
| E | Same isolated decay | Existing intact-call/source-rhythm composition, then V2 expression |

B is the prior narrow drum-decay hypothesis, **not** a new sample library or
an accepted realism improvement. The failed guitar alternative is not added
to this renderer. A/B and C/D plans and event files remain identical.
E changes composition; C/D add performance ornaments to the same underlying
score. No claim that every event is unchanged across A/C is made.

`scripts/q0_listening_results.py` validates downloaded forms against the
actual audio hashes and packet identity. It rejects stale packets, duplicate
reviewer/source/condition records, unknown fields, out-of-range or incomplete
ratings, missing listening attestations and known browser-test identities.
Unheard candidates stay blank. Notes are preserved without inventing scores.
Paired candidate-minus-A differences are averaged within source before
descriptive bootstrap intervals using the existing evaluation helper. Reviewer
codes cannot establish independent people; the tool never automatically passes
musical quality or changes existing benchmarks.

## Actual audio and validation results

Open the [private five-condition listening packet](http://127.0.0.1:4207/).
Start with `owner-speech`. The source and five anonymous, loudness-matched
versions are available. Rate heard versions only; download stays local.

- Frozen A files: `renders/q0-baseline-v2-20261020/<source>/A.<style>.*`
- New B/C/D/E masters, stems, plans, event TSVs and reports:
  `renders/q0-performance-20261020/<source>/`
- Listening WAVs: `renders/q0-performance-20261020/listener/`
- WASM E masters: `renders/q0-performance-wasm-v3-20261020/<source>.<style>.wav`
- [Evidence directory](evidence/q0-performance/) contains metadata only;
  private audio stays ignored by Git.

Packet:
`e083b97026b09c06b1c6cee5f1140ad3a15d656c14a2fe46f302c087c2abbe63`.

| Validation | Result | Actual evidence |
|---|---|---|
| Q0 regression tests | PASS | 16 tests, including phrase/fill invariants and listening-form rejection cases |
| Native regression groups | PASS | `core`, `remix_core`, `live_instruments`: 3/3 |
| Native event agreement | PASS | 8,264 instrument on/off rows across five arms and inputs, zero frame errors |
| Block-size reproducibility | PASS | Twenty B/C/D/E WAV/score/TSV replays, blocks 512/113 |
| Decoding/headroom | PASS | 112 new masters/stems decoded, no full-scale PCM samples; zero native limiting/nonfinite samples |
| Intervention isolation | PASS | Only drum stems differ for A/B and C/D; other instrument/vocal stems identical |
| Loudness control | PASS | 25 listening mixes −23.05 to −22.99 LUFS; maximum true peak −4.91 dBTP; original 0.15 LU tolerance retained |
| WASM execution/parity | PASS | Five E plans actually executed in Node/WASM; all five WAVs byte-identical to native, zero maximum/RMS PCM error; 1,432 event rows agree |
| Browser review | PARTIAL | Chromium/WebKit layout, decode, pause and local form download pass; physical listening and known headless WebKit clock limitation remain separate |
| Source/spec/core preservation | PASS | Permissions rechecked, frozen specification/library/renderer hashes and trial inventories verified |
| New listening results | NOT RUN | Results validator reports zero submitted candidate ratings |
| Latest guitar improvement | FAIL | One owner: “Neither is substantially better” |
| Linux ARM64 follow-up | PASS | Fresh GCC build and five exact Mac/Linux comparisons; see linked follow-up |
| Physical Intel Linux/iPhone/AudioWorklet execution | NOT RUN | Local ARM64 VM and Node/WASM do not establish those targets |

Five WAVs being byte-identical across native/WASM is this run's observation,
not a universal portability guarantee. The established maximum/RMS normalized
PCM tolerances remain 0.001/0.0001.

## Diagnosis and unresolved musical weaknesses

The original audit disproves blanket claims of uniform velocity, universally
primitive oscillators or scheduler drift. It confirms limited recorded
articulations, repeated component patterns, short drum release, some very short
vocal fragments and large vocal/instrument balance changes. The guitar layer
discontinuity is measurable but its latest correction did not meet the owner's
substantial-improvement test. No single mechanism is established as dominant.

New attack measurements further separate scheduling from sample envelopes.
At velocity 40, the first one-millisecond window reaching half the peak RMS
within the first 250 ms occurs at: bass 19 ms, open hat 4 ms, guitar 18 ms,
lead 6 ms, organ 3 ms, pad 83 ms, piano 9 ms. The first samples above ten PCM16
units occur at 0.146–4.229 ms. These are reproducible waveform thresholds, not
perceptual onset times or speaker latency. They do not justify moving all
instruments independently to an arbitrary transient threshold.

Realism of the existing pizzicato bass/orchestral drums, expressive articulation
coverage, word-level hook selection, musical development and mix balance remain
unresolved perceptual questions. V2 is hand-authored musical logic, not trained
intelligence or proof of professional-quality output.

## Dependencies, licensing, failures and environment

No new sound library, runtime dependency, cloud service, paid API or training
was used. Existing CC0 VSCO/VCSL/guitar assets, CC-BY LibriSpeech and CC0 laughter
remain under the [recorded review](q0-quality-recovery.md#licenses-and-provenance).
Owner voice consent remains local/private only. sfizz stays an offline
experiment; its production notices/integration and target-specific dependency
review are not silently certified by Q0.

Apple M5/macOS 26.7.1, Apple Clang 21.0.0, FFmpeg 9.0.2 and project Python
environments were reused. Native commands/results and browser versions are in
the evidence directory. WASM used Emscripten 6.0.1 and Node 22.23.1.

Two WASM setup failures were retained:

1. The SDK's “installed” markers survived removal of compiler/Node binaries.
   Markers were preserved with an `.emsdk_version.q0-incomplete` suffix and
   the pinned project SDK was restored. `~/mlx-env` was not changed.
2. The native CLI's hard-link publication fails under Emscripten's filesystem.
   An isolated `experiments/q0/plan_render.cpp` uses the same low-level renderer
   as the browser bridge after native plan validation. It requires consent and
   refuses existing outputs; the Python harness owns a fresh directory.
   Native atomic-publication behavior is unchanged. This is offline Node/WASM
   evidence, not a browser callback or application deployment test.

An expanded unit-test fixture initially expected a reggae pickup where an
existing snare already occupied its slot. The duplicate-stroke guard correctly
suppressed it. The test fixture now clears existing snare strokes when testing
each profile's positive path; the production guard was not weakened. The
initial failure and final 16-test PASS logs are both retained.

## Reproduce and collect the missing evidence

Retained directories must not be overwritten; choose new output/evidence paths.
The baseline, prior isolated decay build and authorized sources are prerequisites.

```sh
.venv-q0/bin/python tests/integration/verify_q0.py
ctest --test-dir build-q0-decay-20261020/build --output-on-failure \
  -R '^(core|remix_core|live_instruments)$'
.venv-q0/bin/python scripts/q0_expression_trial.py --performance \
  --baseline renders/q0-baseline-v2-20261020 \
  --instrument-renderer build-q0-decay-20261020/build/jamloom_remix \
  --output renders/q0-performance-NEW
.venv-q0/bin/python scripts/q0_recovery_evidence.py \
  --baseline renders/q0-baseline-v2-20261020 --trial renders/q0-performance-NEW \
  --probes renders/q0-decay-probes-20261020 --output docs/evidence/q0-performance-NEW
.venv-q0/bin/python scripts/q0_wasm_trial.py \
  --trial renders/q0-performance-NEW --output renders/q0-performance-wasm-NEW
.venv-analysis/bin/python docs/evidence/q0-performance/verify.py
```

The last command verifies this retained packet, not a newly named rerun.
For downloaded real ratings:

```sh
.venv-q0/bin/python scripts/q0_listening_results.py \
  --trial renders/q0-performance-20261020 \
  --response PATH_TO_DOWNLOADED_REAL_RATINGS.json \
  --output renders/q0-performance-20261020/listening-results-NEW.json
```

Omitting `--response` reports `NOT RUN: 0 candidate ratings`.
Preserve organizer-key concealment until responses are locked. This packet is
owner-only; do not share the private recording with independent reviewers.
Broader licensed-only or separately consented evaluation remains necessary for
general musical-quality claims. The immediate decision is whether the owner
hears a substantial improvement in the new full packet; if not, Q0 remains
unsuccessful and requires a different musical intervention, not a status change.
