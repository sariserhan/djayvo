# R1 — mixer effect and reset capture

2026-10-20. Follow-up to [gain/EQ capture](r1-mix-automation.md).
Overall R1 remains **PARTIAL**; no training or musical-quality acceptance.

## Delivered components

The private studio mix recorder now exports **Download mixer controls**, covering
A/B/C/instrument tone, echo amount, delay spacing and echo-buffer resets in
addition to its existing gain/EQ schedules. Capture happens in the shared effect
implementation, so manual sliders, resets, MIDI mappings and C's beat-synced
spacing use the same path. The export records resulting audio controls, not a
claimed interpretation of the musician's intent.

- `apps/web/mixer.js`: shared input validation, last successful requested effect
  targets, completed effect/reset capture and incomplete-operation detection.
  Reset send gating now uses one captured clock value for its 0/10 ms schedules.
- `apps/web/mix-automation.js`: strict `2.0-mix-automation` validator and bounded
  mixed-action trace. Existing `1.0-mix-gain-automation` downloads still validate;
  their historical format/evidence is unchanged.
- `apps/web/mix-recording.js`: existing private download/lifecycle; a partially
  failed effect invalidates the trace while retaining the validated WAV.
- `apps/web/dj.html`: updated download label and scope explanation.
- `apps/web/tests/mix-automation.test.js`, `mix-recording.mjs`, `dj.mjs`: schedule,
  format, compatibility, corruption, failure, actual audio and offline coverage.

No dependencies, model weights, cloud calls, upload, deployment, C++ changes or
native rebuild. No original audio/specification was changed or regenerated.

## Versioned contract

New traces use `schema_version: "2.0-mix-automation"` and
`scope: "scheduled_gain_eq_fx_controls"`. Existing WAV hash, rate, observed
recording origin, snapshot time and ten initial gain targets are preserved.
`training_authorized` must remain `false`.

`initial_effects` contains exactly `a`, `b`, `c`, `rack`, each holding
`{tone, echo, spacing_ms}`. These are last successfully requested values, not a
snapshot of filter state, in-flight ramps or echo-buffer audio.

Every event has a nonnegative integer `context_frame` in chronological order:

| Kind | Other exact fields | Meaning |
| --- | --- | --- |
| `gain` | `target`, `value` | Existing ten gain/EQ targets; 5 ms target smoothing |
| `tone_echo` | `target`, `tone`, `echo`, `spacing_ms`, `held_frequency_hz` | One successful effect schedule on A/B/C/rack |
| `clear_echo` | `target`, `spacing_ms` | Successful three-delay replacement and 10 ms send gate |

Tone is [0,100], echo [0,0.5], spacing [100,800] ms. Fractional beat-derived
spacing is retained without rounding to the manual slider's 10 ms step. Held
frequency is positive and at most Nyquist. Reset spacing must match the last
requested spacing for its channel, including the initial snapshot. Unknown
fields, kinds, channels, nonfinite values, reordered frames and incorrect WAV
linkage are rejected. A v2 event cannot masquerade as a v1 event.

Tone scheduling cancels future frequency events, holds the observed AudioParam
value, then ramps exponentially over 30 ms to Nyquist for tone 100, otherwise
`min(Nyquist, 200 * 100 ** (tone / 100))`. Dry/wet targets are `1-echo` / `echo`
with 10 ms smoothing; three delay targets are 1×/2×/3× spacing with 30 ms
smoothing. Existing normalized echo tap weights and routing remain unchanged.

The clock is the actual scheduling argument `context.currentTime`, rounded to
sample frames. Nominal WAV offset is `context_frame - observed_context_start_frame`.
Negative/pre-capture and beyond-end offsets remain unmodified. Consult the
receipt's timestamp-discontinuity diagnostic before interpreting these offsets.
A reset event identifies the send-gate schedule and successful main-thread graph
replacement; it does **not** claim a sample-level graph-application acknowledgement.
The held frequency is an AudioParam observation, not a measured acoustic value.

This remains an incomplete performance record: transport/seek/rate, source asset
identity and verified rights, earlier DSP state, aligned stems and source-to-music
alignment still need work before full deterministic replay or dataset admission.
Native note/mouth commands remain in separate instrument takes; this mixer export
does not automatically link those takes to the mix.

## Consent, failure and resource behavior

Existing explicit private mix consent, source-change/delete cancellation,
permission withdrawal, late-hash suppression and Blob URL cleanup apply to the
new controls. No filenames, identity, transcript or source audio are added to
JSON. Nothing is automatically uploaded, persisted or admitted for training.

Gain and effect/reset events share one 4096-action cap. Exceeding it discards all
trace events and stops collecting; the WAV continues. A partially failed effect
operation also discards the entire trace, preventing an incomplete set of changes
from being presented as complete. The UI distinguishes this from overflow.
The original error still propagates: retaining the WAV is not a claim that a
failed effect/graph operation left its sound unchanged. Retrying recording works.
All added capture and validation runs on the main thread; the audio worklet and
shared engine are unchanged.

## Gates and measured evidence

[Retained evidence](evidence/r1-effects/) includes exact reports, schedules, hashes,
logs, screenshots, preserved-input hashes, runtime versions and comparison data.

| Gate | Status | Evidence |
| --- | --- | --- |
| Versioned capture / compatibility / bounds | PASS | 67 unit tests, including retained v1 file validation, exact scheduling arguments, all four effect channels, malformed traces, shared cap and injected failures |
| Chromium / WebKit recorder | PASS | Ten grouped checks each: real four-channel PCM/trace, UI effect/reset capture, consent, interruption, partial failure, overflow and timed 30-second cap |
| DJ / actual disconnected operation | PASS | 48 Chromium checks, including downloaded gain/effect/reset trace with server closed and cached WAV playback |
| Prepared A + C | PASS | 39 Chromium checks: actual C output/effects, sync, synthetic MIDI, phrase generation, consent and offline session regression |
| Echo position | PASS | 75 measured echoes; maximum absolute error 0.4736221401 sample frames, including C at 60/127.19/180 BPM and three beat divisions |
| Capture versus mixer destination | PASS | Maximum/RMS float error 0 in each browser; stereo reference WAV hash identical to independently rendered destination |
| Historical / cross-browser PCM identity | PARTIAL | Detailed differences below; no cross-browser bit-identity claim |
| Local delivery | PASS | 41-file public-bundle audit; changed localhost assets equal source bytes; desktop/mobile inspected |
| R1 expert corpus / complete replay | PARTIAL | More controls captured, but transport/source provenance and reviewed expert examples remain |
| Human musical quality / physical latency / venue reliability | NOT RUN | Automated PCM/synthetic MIDI checks are not human preference or hardware evidence |
| New Linux / iPhone execution, full Next/native rebuild | NOT RUN | Browser-only change; native code and WASM hashes preserved |
| Model training / paid compute / publication | NOT RUN | No training-ready corpus or authorization inferred from these captures |

Apple M5 / 16 GiB / macOS 26.7.1 (25G241), arm64. Playwright 1.61.1;
Chromium 149.0.7827.55, WebKit 26.5. All final unit/capture/DJ/prepared-session runs explicitly use Node 22.23.1.
The orchestration shell initially resolved Node 26.3.0 (retained initial slider
logs); final reruns pin the existing project executable. No runtime installation
or environment configuration changed.

The final real-time UI WAVs contain 32 accepted controls each. Chromium recorded
34,304 frames with nominal master mute at offset 18,688; WebKit 35,200 frames with
mute at 19,072. At 48 kHz, PCM after the nonempty 100 ms settling interval is zero.
Both report zero timestamp discontinuities and automatic captures reach exactly
1,440,000 frames (30 seconds).

Across browsers the common 36,096-frame reference prefix differs by maximum 2,158
and RMS 12.9222712904 PCM16 units, with 15,324 differing channel samples. Against
the preceding R1 reference run, WebKit is identical; Chromium differs at 11
channel samples by at most one PCM16 unit (RMS 0.0123438833). These are observed
comparisons, not evidence assigning a cause or claiming identical browser DSP.
No PCM was altered to hide the differences.

The initial browser attempts failed because the test filled the manual delay
slider with 175 ms, inconsistent with its step=10 attribute. Corrected to 170 ms;
production validation/UI limits were not relaxed. Initial logs retained. WebKit
reported two screenshot-tool stylesheet CSP warnings; app runtime errors and
external requests were absent. Security policy is unchanged.

## Playable probes and reproduction

- [Chromium studio mix](../renders/mix-recording-chromium-2dLoHL/mix.wav)
- [WebKit studio mix](../renders/mix-recording-webkit-pzNcc0/mix.wav)
- [C piano with triplet echo](../renders/session-chromium-in9H3D/deck-c-piano-triplet.wav)
- [Example v2 control trace](evidence/r1-effects/chromium.controls.json)

These are technical test recordings, not accepted musical demonstrations.
WAVs remain local/ignored; their SHA-256 values are retained in `artifacts.json`.
With the existing prepared WASM bundle and current source assets copied into
`dist/web` (refresh service worker using `scripts/build_offline.py`):

```sh
node --test apps/web/tests/*.test.js
python3 scripts/verify_web_bundle.py
cd apps/web
node tests/mix-recording.mjs
JAMLOOM_BROWSER=webkit node tests/mix-recording.mjs
node tests/dj.mjs
node tests/session.mjs
```

The session regression reuses the existing consented local voice fixture; it does
not train on it. Each browser command prints its artifact directory. To reproduce
the recorded Node selection exactly, use the existing Node 22.23.1 executable
listed in `artifacts.json` for every command.

Next R1 work: transport actions and hash-linked source provenance, followed by
permissioned, expert-reviewed demonstrations. R2 evaluation and learned-model
training remain separate gated work.

Follow-up: [loaded-source fingerprint capture](r1-source-inventory.md) now
identifies loaded A/B/C/phrase/bank bytes. It does not establish audibility,
complete derivation, verified licensing or training authorization.
