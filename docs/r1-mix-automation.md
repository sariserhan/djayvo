# R1 — private mixer gain and EQ automation

2026-10-20. Continuation of [private studio mix recording](r1-mix-recording.md).
R1 remains **PARTIAL**. No model training or production quality claim.

## Delivered

The studio mix recorder now offers **Download gain & EQ changes** alongside its
existing WAV and receipt. The versioned JSON links to that WAV's SHA-256 and
observed recording frame origin. It captures the resulting A/B/C/instrument gains
and six deck EQ gains where the audio API accepts their schedules. Master and
crossfader changes produce effective channel gains; this is not an inference of
which physical gesture caused them. MIDI mappings already use these same paths.

- `apps/web/mixer.js`: shared validated gain scheduling, last requested target
  snapshot and optional recorder. Existing 5 ms exponential target smoothing retained.
- `apps/web/{dj,deck-controls,performance-session}.js`: all ten covered gain/EQ
  targets use the shared scheduling function, including the independent C slider.
- `apps/web/mix-automation.js`: bounded capture and strict versioned validator.
- `apps/web/mix-recording.js`, `dj.html`: private third download, coupled lifecycle,
  overflow notice. Existing `1.0-mix-recording` receipt remains unchanged.
- `apps/web/tests/mix-automation.test.js`, `mix-recording.mjs`, `dj.mjs`:
  scheduling, validation, failure, bounds, actual PCM, browser and offline checks.
  Existing VM-based deck-rate/media-start tests updated to strip the new import.

No dependencies, C++ changes, model weights, cloud calls or schema migrations.
Immutable specifications, original synthetic speech fixture and pinned native
instrument WASM preserved. No original recordings were deleted or regenerated.

## Contract and timing limits

`1.0-mix-gain-automation` has exactly these fields:

| Field | Meaning |
| --- | --- |
| `schema_version` | `1.0-mix-gain-automation` |
| `scope` | `scheduled_gain_eq_targets` |
| `training_authorized` | Always `false` |
| `wav_sha256` | Must match the validated mix receipt and downloaded WAV |
| `sample_rate` | Receipt rate, integer 32000–192000 |
| `observed_context_start_frame` | Receipt's first worklet `currentFrame` observation |
| `snapshot_context_frame` | Rounded `context.currentTime × sampleRate` before recorder creation |
| `initial_targets` | Exactly ten last requested values; not instantaneous ramp/filter state |
| `events` | At most 4096 `{context_frame, target, value}` records in nondecreasing frame order |

Targets `a`, `b`, `c`, `rack` are linear gains in [0,1]. Targets
`eq-a-0` through `eq-b-2` are low/mid/high EQ gains in [-12,12] dB.
Each event schedules `setTargetAtTime(value, context.currentTime, 0.005)`.
The recorded time is the exact scheduling argument rounded to a sample frame,
not a measured sample-level application acknowledgement or physical input time.

A nominal WAV offset is `event.context_frame - observed_context_start_frame`.
Preserve negative offsets: actions can precede the recorder's first audio block.
Capture continues until completion acknowledgement, so events can also lie beyond
the WAV, especially after its hard 30-second cap. Never clamp those into the WAV.
Consult `timestamp_discontinuities` in the accompanying receipt; nonzero values
make this clock mapping uncertain. No full mix replay is claimed.

The initial snapshot lacks prior ramp history, echo buffers, source hashes,
transport/rate/seek events, notes and effect controls. Those must be supplied
before constructing a replayable performance or training example. Existing dry
instrument traces have their own exact native event frames and are unchanged.

## Consent, storage and bounds

Control data follows the same explicit private recording permission as the WAV.
It stays in this tab as a Blob download; no automatic persistence/upload/dataset
admission. Voice/music/capture permission withdrawal, source replacement/deletion,
recording interruption or deletion discards the linked trace too. Late hash
completion cannot restore revoked exports. Downloaded copies remain user-owned.
The JSON contains no filenames, identities, transcription or raw source audio.

At action 4097 the recorder releases all captured control events and stops adding
more. Audio schedules and WAV capture continue. The UI explicitly reports that
the control trace was discarded and retains the WAV. A truncated trace is never
presented as complete. This bounds control storage independently of the audio cap.

## Validation

Evidence: [retained machine-readable results](evidence/r1-automation/).

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Gain/EQ schedules, validation and bounds | PASS | 63 web unit tests; accepted schedules preserve values/times/5 ms smoothing; failed schedules are not recorded |
| Chromium and WebKit capture | PASS | Eight grouped checks each: real PCM, hash-linked controls, mute timing, mobile/desktop, consent/stale results, interruption, overflow and 30-second limit |
| Audio versus independent mixer destination | PASS | Maximum and RMS float difference zero within each browser |
| Automation timing | PASS | Target scheduling arguments agree with trace frames; actual UI master mute reaches zero PCM after smoothing; not a hardware latency claim |
| Offline operation and DJ regressions | PASS | 48 Chromium checks; actual disconnected server, cached gain trace/WAV downloads and playback |
| Public bundle / local site | PASS | 41-file audit; localhost served changed files byte-identical to source |
| Cross-browser DSP identity | PARTIAL | Existing browser differences persist; see artifacts.json for common-frame PCM comparison |
| Complete replay / source provenance / expert demonstrations | PARTIAL | Gains/EQ captured; transport, FX, source rights evidence, stems and expert review remain |
| Human musical quality, physical MIDI/audio latency, current Linux/iPhone execution | NOT RUN | No invented listening scores or device evidence |
| Model training, paid infrastructure, deployment | NOT RUN | No training-authorized corpus; no publication performed |

The first unit run failed eleven existing VM harness cases because the new deck
module import was not removed before VM evaluation. Updated only that import
handling; all 63 tests then passed. One preliminary DJ run launched from the wrong
working-directory edit attempt was stopped and excluded; the final updated suite
is the retained result. Browser tests use the repository's existing Playwright
fallback because the in-app browser runtime discovery was unavailable.

## Measured outputs

Apple M5 / 16 GiB / macOS 26.7.1 (25G241), arm64; Node 22.23.1,
Playwright 1.61.1, Chromium 149.0.7827.55 and WebKit 26.5.
Both UI recordings use 48 kHz stereo, contain 20 accepted gain/EQ schedules,
and report zero worklet timestamp discontinuities. Chromium records 29,440
frames with the nominal mute at frame 13,568; WebKit records 32,128 frames with
the mute at 13,952. Each has a nonempty PCM interval after the 100 ms settling
window, all zero. This interval bound was also checked independently against
retained artifacts. Both automatic captures reach exactly 1,440,000 frames.

- [Chromium playable test WAV](../renders/mix-recording-chromium-50hunw/mix.wav)
- [WebKit playable test WAV](../renders/mix-recording-webkit-LrciYB/mix.wav)
- [Offline playable test WAV](../renders/dj-chromium-5rhtd7/offline-mix.wav)
- [Example gain/EQ trace](evidence/r1-automation/chromium.controls.json)

These are short synthetic technical probes, not musical-quality demonstrations.
The independent four-source reference has exactly zero capture-versus-destination
float error in each browser. Across browsers, its common 36,096-frame prefix has
maximum 2,158 and RMS 12.9221764230 PCM16-unit differences (15,325 differing channel
samples), unchanged from the previous comparison. No exact cross-browser DSP
identity is asserted.

## Reproduce

With the existing prepared WASM bundle and these source assets copied into
`dist/web` (refresh its service worker using `scripts/build_offline.py`):

```sh
node --test apps/web/tests/*.test.js
python3 scripts/verify_web_bundle.py
cd apps/web
node tests/mix-recording.mjs
JAMLOOM_BROWSER=webkit node tests/mix-recording.mjs
node tests/dj.mjs
```

Each browser run prints its artifact directory under `renders/`. WAVs remain
local/ignored; report, receipt, control JSON and hashes are retained in evidence.
Existing Next production server was restarted to discover the new static module;
no full Next build or native recompile was needed for this browser-only change.

Next R1 increment: remaining effect/transport actions and hash-linked source
provenance, then reviewed, permissioned expert demonstrations. These recordings
are not yet a training-ready corpus or proof of better musical improvisation.
