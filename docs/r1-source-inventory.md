# R1 — private mix source inventory

Latest follow-through: [transport history, aligned stems and source-plan linkage](r1-capture-completion.md). The checkpoint below is retained as history.

2026-10-20. Follow-up to [effect/reset capture](r1-effect-capture.md).
Overall R1 remains **PARTIAL**. This increment supplies source fingerprints for
future reviewed demonstrations; it does not train a model or improve musical
quality by itself.

## Delivered components

The studio mix recorder now offers **Download source details** alongside its WAV,
receipt and mixer controls. The separate, versioned JSON identifies assets loaded
during the recording and links to that recording's exact WAV hash.

- `apps/web/mix-sources.js`: bounded collection, deferred hashing and strict
  `1.0-mix-sources` validation.
- `apps/web/mix-recording.js`: capture lifecycle, source download, cancellation
  and ten-second hashing deadline that preserves the WAV and control export.
- `apps/web/dj.js`: Deck A/B replacement/unload notifications and source lookup.
- `apps/web/performance-session.js`: generated C and normalized phrase identity.
- `apps/web/instrument-rack.js`, `keyboard.js`: exact loaded native WASM identity,
  including its embedded instrument bank, and load/failure notifications.
- `apps/web/dj.html`: source download and its scope explanation.
- `apps/web/tests/mix-sources.test.js`, `mix-recording.mjs`, `dj.mjs`,
  `session.mjs`: validation, bounds, real byte hashes, lifecycle and offline checks.

No dependency, C++/AudioWorklet DSP change, cloud request, upload, training or
deployment. Existing recordings, immutable specifications and synthetic speech
fixture are preserved. Prepared WASM is reused without recompilation.

## Contract and limits

The exact top-level fields are `schema_version`, `scope`, `permission`,
`rights_verified`, `training_authorized`, `wav_sha256`, `sample_rate`,
`observed_context_start_frame`, `assets` and `snapshots`.

`scope` is `loaded_assets`, permission is `user_attested_private_mix`, and both
rights verification and training authorization must be **false**. Rate, observed
origin and WAV hash must match the existing validated recording receipt.

Each asset contains only `{kind, sha256, bytes}`:

| Slot | Asset kind | Bytes identified |
| --- | --- | --- |
| A/B | `local_audio` | Original loaded file, before browser decoding |
| C | `generated_wav` | Exact generated, downloadable C WAV |
| Phrase | `normalized_phrase_wav` | Normalized WAV bytes supplied to the planner |
| Rack | `instrument_engine` | Exact loaded native WASM with its embedded bank |

Each snapshot contains an integer `context_frame` and all five slots, each null
or an index into `assets`. Slots must reference the appropriate kind; every asset
must be referenced. Unknown fields, bad hashes, invalid sizes, reordered clocks,
incorrect linkage and invented rights/training claims are rejected.

Collection starts with the current loaded state. Successful source changes add
snapshots; unloads retain earlier fingerprints. Identical states are omitted.
Bounds are 16 assets, 128 snapshots, 100 MiB per asset and 256 MiB total referenced
bytes. Exceeding a bound discards the inventory, not the recording.

Main-thread observations use rounded audio-context frames. They identify when
the application observed loaded assets, **not** sample-level source switches,
audibility or musical attribution. A paused or muted file can appear. These
fingerprints do not prove that C derives from the listed phrase, verify a licence,
capture the complete instrument performance or replace the rights ledger.
Use receipt discontinuities when interpreting frame offsets; no resampling or
clock correction hides anomalies.

## Privacy and failure behavior

Explicit private mix consent remains required. JSON contains no filenames, audio,
transcripts or personal identifiers. Fingerprints can still identify matching
known files; this is a private download, not anonymous telemetry. No automatic
persistence, upload or dataset admission occurs.

Only lightweight descriptors are collected during capture. Immutable Blob bytes
are read and hashed sequentially after capture; the engine's already-computed
digest is reused. WAV, playback and controls become available first. A read error,
invalid inventory or actual ten-second timeout leaves those outputs available and
reports source details unavailable.

Deletion, permission withdrawal and phrase replacement cancel collection, release
queued assets and suppress stale results. A native read/hash already in flight
cannot be forcibly interrupted; its result is discarded and subsequent reads do
not start. Existing phrase-change cancellation of the whole mix remains intact.
Inventory failure does not relax consent or the separate raw-phrase export option.

## Gates and evidence

[Retained evidence](evidence/r1-sources/) contains reports, JSON examples, exact
artifact hashes, logs, runtime versions and inspected desktop/mobile screenshots.

| Gate | Status | Evidence |
| --- | --- | --- |
| Schema, bounds, cancellation and byte validation | PASS | 73 unit tests; six new tests cover inventory behavior, caps, read failures and malformed exports |
| Chromium/WebKit capture | PASS | 12 grouped checks each, exact A/B/bank hashes, loaded/unloaded B history, delayed cancellation, failed reads and real ten-second timeout |
| Prepared A/C/phrase fingerprints | PASS | 40 session checks; C digest equals downloaded WAV, phrase digest equals actual worker input, A digest equals loaded file |
| Disconnected DJ operation | PASS | 48 checks; source/receipt/control downloads and audio with the local server actually closed |
| Within-browser capture/destination PCM | PASS | Maximum and RMS float differences zero in both browsers; stereo retained |
| Event-frame checks | PASS | Short recordings have zero timestamp discontinuities; master mute reaches zero after the existing 100 ms settling allowance; prepared A/C enter at expected frames +1 with zero A gap |
| Continuous clock / cross-browser identity | PARTIAL | Timestamp anomalies and PCM differences retained below |
| Local delivery | PASS | 42-file bundle audit; seven changed localhost files exactly equal source; desktop/mobile inspected without horizontal overflow |
| R1 complete performance record and expert corpus | PARTIAL | Loaded-asset identity added; transport, complete source lineage/rights, aligned stems, reviewed expert demonstrations and full replay remain |
| Human musical quality, physical latency/MIDI/venue reliability | NOT RUN | Browser PCM and simulated controls are not listening or physical-device evidence |
| New Linux/iPhone execution, full Next/native rebuild | NOT RUN | Browser-only increment using existing WASM |
| Model training, paid compute, public deployment | NOT RUN | No training-ready corpus or spending/release authorization inferred |

Apple M5 / 16 GiB / macOS 26.7.1 (25G241), arm64. Node 22.23.1,
Playwright 1.61.1, Chromium 149.0.7827.55 and WebKit 26.5.
All four browser suites exited zero on their first run.

Short real-time mixes contain 37,632 Chromium / 43,136 WebKit frames, 42 control
events each and three source snapshots each. Their master-mute offsets are 21,248
and 27,136 frames. Both timed captures reach exactly 1,440,000 frames at 48 kHz.
The concurrent Chromium timed capture reports two timestamp discontinuities;
WebKit reports zero. The prepared-session probe separately reports two context
clock anomalies (-128 then +128 frames), with zero independent signal-frame gaps
and zero silent blocks. These results do not establish continuous physical output.
An isolated Chromium rerun passed all 12 checks and recorded exactly 1,440,000
frames with zero timestamp discontinuities. Its timed WAV hash equals the
concurrent run's. Both reports are retained; the rerun does not erase the earlier
clock observations or establish their cause.

Across browsers, the common 36,096-frame reference prefix differs by maximum
2,158 and RMS 12.9221898224 PCM16 units (15,322 differing channel samples).
Against the preceding effect-capture references, WebKit is identical; Chromium
differs at 12 channel samples by at most one PCM16 unit. No browser bit identity
or cause for these differences is claimed.

No application runtime errors or external requests were observed. WebKit retains
two screenshot-tool stylesheet CSP warnings; security policy was not changed.

## Playable outputs and reproduction

- [Chromium recorded mix](../renders/mix-recording-chromium-saqYGu/mix.wav)
- [WebKit recorded mix](../renders/mix-recording-webkit-Jbn66f/mix.wav)
- [Prepared C performance](../renders/session-chromium-a6GRiM/consented-performance.wav)
- [Example loaded-source inventory](evidence/r1-sources/chromium.sources.json)
- [Prepared A/C/phrase inventory](evidence/r1-sources/session.mix-sources.json)

These are technical probes, not accepted musical demonstrations. WAVs remain
local/ignored; `artifacts.json` retains paths, byte counts and hashes.
With existing prepared WASM and current browser assets copied into `dist/web`,
refresh its worker using `worker_source` from `scripts/build_offline.py`, then:

```sh
node --test apps/web/tests/*.test.js
python3 scripts/verify_web_bundle.py
cd apps/web
node tests/mix-recording.mjs
JAMLOOM_BROWSER=webkit node tests/mix-recording.mjs
node tests/dj.mjs
node tests/session.mjs
```

Use `/Users/serhansari/.nvm/versions/node/v22.23.1/bin/node` to reproduce the exact
Node selection. Session tests reuse the already-consented local voice fixture;
they do not train on it. Next R1 work is transport capture and reviewed,
permissioned demonstrations. R2 evaluation and R3 training remain gated.
