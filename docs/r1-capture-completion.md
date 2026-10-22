# Demonstration capture and split checks — 2026-10-21

Follow-up: [private source/action reconstruction](mix-action-replay.md) implements the later replay path. The checkpoint below preserves its original evidence and limits.

**Implementation commit: `8f3027f` (local only).**

**Local capture tooling PASS; full specification PARTIAL.** The owner asked to
finish the remaining technical work and explicitly kept listening and physical
checks deferred.
This closes four concrete gaps found after `86728f8`: deck transport history,
aligned mixer stems, saved-plan/source linkage, and near-duplicate split checks.
Earlier quality rejection remains **FAIL**. No expert judgments, rights approvals,
model training, paid execution, iOS work or launch operation is inferred.

## Delivered

- **Deck history:** a bounded, WAV-linked `1.0-mix-transport` export records the
  initial state and A/B play/pause/end, seek, rate, key lock, loop, slip-roll,
  scratch and source changes. Prepared A/C entries preserve their scheduled
  start/end frames and confirmed tempo. Capture hooks live in shared transport
  code, including buffered course decks and native-decoder events. No filenames,
  device IDs or audio are embedded. Unknown fields, invalid states, mismatched
  recording identities, backwards observations and over 4,096 events are rejected.
  A failed/overflowed history is discarded while the mix WAV remains available.
- **Optional aligned stems:** the existing private recorder can also capture
  A/B/C/instruments after their effects and faders, before the master limiter.
  All four stems share the master's exact start, frame count and discontinuity
  diagnostics because one worklet copies all five inputs. Missing inputs become
  silence. Separate IEEE float32 stereo WAVs preserve pre-limiter headroom;
  a strict receipt links all hashes to the master. They are for private download,
  with no automatic upload, storage or training permission. Stop/cancel transfers
  or releases fixed buffers outside `process()`; the callback only copies samples.
- **Plan identity:** additive `2.0-mix-sources` inventories hash the exact saved C
  score and validate its source SHA-256 against the captured normalized phrase.
  Snapshots associate C, score and phrase. A malformed plan or mismatched phrase
  suppresses the inventory, preserving audio. Existing `1.0` exports remain valid.
  This checks declared derivation and byte identity, not legal rights or a new
  independent re-render of the score.
- **Near-duplicate guard:** demonstration ledger ingestion and cross-ledger export
  now reuse the existing calibrated waveform comparator, after rights checks.
  Exact hashes and declared source/speaker/session/performer/phrase/arrangement
  guards remain. At most 128 unique sources are compared in a mixed-split batch;
  larger batches fail with a review requirement. Verified 2–5 second PCM16 WAVs
  are decoded to bounded 4 kHz mono. Two-second windows are searched in both
  directions, using absolute centered correlation ≥0.8. Suspected cross-split
  matches block export; no data is silently reassigned or removed. Gain, polarity,
  DC, offsets and light noise are covered by synthetic controls. Same-split reuse
  is permitted. Missing comparison dependencies fail closed for mixed splits.

The comparator uses already installed NumPy/SciPy and FFmpeg, with the Python
versions pinned in `datasets/requirements-r1.txt`. There was no dependency install
or change to `~/mlx-env`. The implementation policy digest includes the comparator
and dependency manifest. Historical traces retain their frozen policies and are
not rewritten; their old policy hash will fail current-policy revalidation.
Generate a fresh trace under the new policy to produce a current export.

## Bounds and honest limits

Normal recording memory is unchanged. Stem capture is optional, limited to
32–96 kHz and 30 seconds. At 48 kHz the five float capture buffers total 57.6 MB;
at 96 kHz they total 115.2 MB, plus bounded WAV/preview exports. At higher rates,
turn off stems to use the existing master-only recorder. Stem export failures
retain the master. Deletion, permission withdrawal, phrase replacement and
interruption preserve the recorder's existing cancellation rules, including
revoking all new download URLs and suppressing late async results.

Transport observations use the main-thread AudioContext clock. Native decoder
seeks, asynchronous worklet commands, earlier held instrument notes and DSP
history do not become sample-exact action replay merely because they were logged.
The existing deterministic native-plan and dry-instrument replay remain separate.
Captured float stems permit reconstruction of the recorded mix; they do not
regenerate a performance from actions or establish an expert supervision corpus.

The waveform guard is a **suspected reuse** screen. It misses short copies,
pitch/time transformations, stereo-side cancellation and some window-boundary
copies; periodic material can be flagged conservatively. It does not prove
independence, musical originality, a balanced dataset or speaker consent. Human
corpus review and the existing declared-group checks remain required.

## Validation

Evidence is retained in [transport-history](evidence/transport-history/). The
failed first stem-download test is retained: it attempted `fetch(blob:)` under
an intentionally restrictive CSP. The test now downloads through the real link;
application policy was not relaxed. The first accessibility harness used an implicit
Playwright context, which Axe rejects; the corrected harness creates an explicit
context. Both failed logs are retained. Build/typecheck logs have terminal
carriage returns and trailing whitespace normalized; their substantive output is unchanged. All browser playback was muted downstream.
No microphone or system-audio permission was obtained by these tests.

| Gate | Status | Evidence |
|---|---|---|
| Web unit contracts | PASS | 131 tests, including float headroom, shared stem clock, release/cap, source linkage, transport states and overflow |
| Chromium/WebKit recording | PASS | 15 grouped checks each: actual master/stems, playback, SHA-256 linkage, active/silent channels, history overflow, deletion, revoked/delayed exports, failures and real 30-second cap |
| Stem reconstruction | PASS | Both captures reconstruct through the existing limiter within **1 PCM16 unit**; unchanged tolerance is 2. FFprobe independently recognizes float32/stereo/48 kHz |
| Imported scratch/key lock | PASS | Real Chromium/WebKit DSP and UI checks; new history preserves key lock, backwards scratch and paused release |
| Prepared-session/offline regression | PASS | 40 checks each in Chromium/WebKit, including real plan/phrase identity, scheduled C cancellation, saved output and actual server disconnect |
| Recording accessibility | PASS, automated | Six Axe scans at 1440/390/320 pixels across Chromium/WebKit; zero violations, no horizontal overflow; screenshots inspected |
| Demonstration native regression | PASS | All 14 existing tests, real native edits/replay, current-consent withdrawal and export tamper rejection |
| Near-duplicate guard | PASS | Five new integration tests, existing matcher calibration, gain/polarity/DC/offset/noise/stereo, unrelated/silent controls, modified bytes, bounds, ingestion and cross-ledger rejection |
| Production build / typecheck / bundle | PASS | Production build, TypeScript, 78-file offline audit, updated site preparation and client-secret audit |
| Human listening / expert corpus | FAIL / NOT RUN | Earlier rejection retained; listening explicitly deferred; no new reviewed expert examples |
| Physical audio / providers / models | NOT RUN | Physical checks explicitly deferred by the owner; no paid run, final provider bill or approved model benchmark |
| iOS / launch | NOT RUN | Still deferred, in that order; no push, hosted migration, deployment, publication or charge |

Prepared-session receipts retain their original timing diagnostics; these are not
physical deadline qualifications. Local macOS 26.7.1 (25G241), arm64; Node 22.23.1; Python 3.15.0;
NumPy 2.5.4, SciPy 1.18.1; FFmpeg 9.0.2. Shared C++ and the existing WASM binaries
are unchanged. New sanitizer/physical/iPhone execution is not claimed.

## Remaining acceptance work, in order

1. **Listening, currently deferred:** resume the existing comparison packet,
   collect the required independent judgments and fix evidenced defects. The M1
   gate still prevents learned production AI/personalization promotion. Do not
   label catalogue inference or saved preferences as trained personalization.
2. **Physical qualification, currently deferred:** when the owner resumes these
   checks, arrange a permitted source app and named output; verify capture permission, source suppression/restoration, no feedback/doubled
   playback, headphone isolation, actual MIDI, route/interruption behavior,
   latency/endurance and Academy/manual accessibility. Browser fixtures do not
   substitute for these. WebKit native-loopback control retains its documented
   native-controls fallback; no browser security bypass is introduced.
3. **Provider/model execution:** choose a quality-approved model and explicit
   spending ceiling; then verify actual remote execution/recovery, authoritative
   finalized all-in bills and commercial assumptions. Current mocks/local jobs
   cannot establish live provider reliability or profitability.
4. **iOS**, then **launch operations:** keep the owner's order. The new duration
   schema still needs hosted migration 0013 during the approved rollout. Public
   distribution, legal/business acceptance, sales and publication remain separate.

The remaining R1 corpus work needs permissioned musicians, corrected/aligned
human supervision and reviewed rights. Full action-only browser re-rendering is
not implemented; captured-stem reconstruction and native/dry replay are the
available technical paths. No complete-spec or trained-musician claim is made.

## Reproduce locally

Use Node 22, the existing prepared `dist/web` and the isolated analysis environment:

```sh
node --test apps/web/tests/*.test.js
node apps/web/tests/mix-recording.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/mix-recording.mjs
node apps/web/tests/deck-dsp.mjs
node docs/evidence/transport-history/accessibility.mjs
node apps/web/tests/session.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/session.mjs
.venv-analysis/bin/python tests/integration/verify_demonstration_overlap.py
.venv-analysis/bin/python tests/integration/verify_demonstrations.py --renderer build-finish/jamloom_remix
python3 scripts/verify_web_bundle.py
npm --prefix apps/site run build
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
```

Playable outputs stay under ignored `renders/mix-recording-*`; committed receipts
contain technical metadata and synthetic source hashes, not private voice audio.
