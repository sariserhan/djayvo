# Selective tempo echo

Recorded 2026-10-18. **Technical implementation: PASS. Listening: NOT RUN.
E04 and overall specification: PARTIAL.** The master specification is unchanged.

Selected fragments can now produce three fading, tempo-aligned echoes with
alternating stereo placement. The renderer reuses its existing sample triggers
and cached pitch/time buffers. Clean statements stay dry. Default grammars and
app output remain unchanged; this treatment is opt-in through offline plans.
It is a finite repeat effect, not an unbounded feedback delay or a reverb.

## Contract

`1.2-remix` permits two additional vocal-event fields:

- `echo_ticks`: 0 disables the effect; otherwise 120–960 integer ticks between
  repeats. A quarter note is 960 ticks. Starts are converted independently from
  `start_tick + repeat * echo_ticks`, avoiding accumulated frame-rounding drift.
- `echo_gain_db`: −24 to −6 dB relative to the dry event, default −12 dB for the
  first repeat. The second and third multiply amplitude by 0.35 and 0.35².

Repeat pans are +0.45, −0.45, +0.45. Each uses the same transformed/reversed crop
and 3 ms edge fade as the original. There is no additional pitch shift per repeat.
The effect can accompany independent pitch/time processing and legacy varispeed.

Native validation rejects echoes on clean events, any echo within 80 ms of a
clean interval, more than 16 simultaneous sample voices, more than 1024 compiled
dry-plus-echo triggers, and a tail that cannot retain 100 ms of final silence.
Dry source events still end before the music endpoint; echoes may use the tail.
The importer rejects fractional/out-of-range controls and echo fields under
versions 1.0/1.1. JSON Schema covers structural bounds and version/clean rules;
native validation covers timing, clearance and compiled resource limits.

The exporter emits version 1.2 only when an echo is enabled. Identity-only
controls canonicalize to the earlier applicable version. Legacy exported scores
and waveforms remain unchanged. Echo construction happens before playback;
`process()` allocates nothing. Instrument-only stems omit echo triggers and stay
identical to the dry-control stems. No third-party runtime dependency was added.

## Checks and limits

| Gate | Status | Evidence |
| --- | --- | --- |
| M5/Linux release | PASS | 10/10 suites each; 10 foundation and 17 remix test groups |
| Echo timing/decay/stereo | PASS | Eight rate/tempo/interval cases match independently expanded note-clock sample repeats within 1e-7 float error; exact block-size repeatability and finite tails |
| Callback allocation | PASS | Zero observed allocations during echo processing, including pitch/time treatment |
| Import and resource limits | PASS | 70 invalid plans rejected; valid echo/pitch combinations, deterministic replay, sparse selector and unchanged instrument stems checked |
| Cross-platform owner PCM | PASS | Four comparisons plus a tail probe: 25 WAVs byte-identical, maximum/RMS PCM error 0; plans and instrument event traces agree; echo start/end frames retained |
| Clean hooks / preservation | PASS | Both full owner hooks identical in all five renders; 20 previous owner/fixture WAVs plus five previous 1.1 pitch-shifted WAVs preserved; protected master/fixture/source hashes unchanged |
| Headroom and ending | PASS | 25 owner master/stem WAVs below −1 dBFS sample peak, no full-scale samples, silent final 100 ms; nonzero echo verified beyond the music endpoint in the tail probe |
| Export schemas | PASS | 19 real plans validate; five malformed schema cases reject |
| WebAssembly regression | PASS | Four default styles match native PCM/events; 44.1 kHz duration, consent, corruption and bundle privacy checks pass |
| Local review page | PASS | Eight players; Chromium/WebKit identity/content, no errors/overlay, muted play/pause/seek, exclusive playback and no autoplay; 1280/375/320 px layouts |
| Human listening / production acceptance | NOT RUN | No listening judgment or improvement inferred from signal checks |
| Default app effect selection | NOT RUN | New controls are native/offline-plan capabilities; apps continue existing grammars |
| Continuous feedback/reverb | NOT RUN | Finite three-repeat treatment only; these broader effects remain open |
| New cloud/device/deployment work | NOT RUN | No paid rental, upload, model call, phone action or publication |

**M5 ASan/UBSan: PASS, 10/10 suites.** The full run is recorded in
[sanitizer tests](evidence/vocal-echo/sanitizer-tests.log).
Actual environment: Apple M5/16 GiB, macOS 26.7.1, Xcode 27.1, Apple Clang 21,
SDK 27.0, CMake 4.4.2 and isolated Python 3.14.6. Linux arm64 uses GCC 12.2.0,
CMake 3.25.1 and Python 3.11.2 in the local Colima VM. Emscripten is 6.0.1.
Chromium 149.0.7827.55 and WebKit 26.5 test the file-based audition page using
installed Playwright: the Browser plugin's required execution tool remains
unavailable. No browser dependency was installed. Both VM profiles are stopped
after validation; `~/mlx-env` was not used or modified.

The first overlap-rejection test scheduled fewer than 17 simultaneous voices;
the test fixture was corrected to exercise the actual limit. The first tail
probe placed the dry crop across the music endpoint and was correctly rejected
on both OSes. Moving the dry start one beat earlier permits the echoes to occupy
the tail. Initial logs are retained alongside final passing evidence. The two
previous WASM crop-planner narrowing warnings remain unchanged.

See [gate summary](evidence/vocal-echo/report.json),
[measurements/hashes/event frames](evidence/vocal-echo/measurements.json),
[import cases](evidence/vocal-echo/import-tests.json),
[M5 smoke/environment](evidence/vocal-echo/mac-environment.json),
[Linux tests](evidence/vocal-echo/linux-tests.log), and
[browser checks](evidence/vocal-echo/browser.json).

## Private comparison

[Open the eight-player audition](../renders/vocal-echo-20261018/index.html).
The existing consented recording has four versions: dry control, eighth-note
echo, dotted-eighth echo, and +2-semitone fragments with eighth-note echo. The
selector chooses up to three phrases after four seconds, at least six seconds
apart and clear of both full hooks. Here they start at approximately 10.61,
24.32 and 31.18 seconds. This is a bounded spacing heuristic, not semantic or
learned musical judgment. The separate tail probe is engineering evidence,
not an additional listening candidate.

All candidates share the original plan gains; they are not perceptually
loudness-matched or blinded. Echo overlap may clutter phrases or color the mix
through limiting. Listen for intelligibility, timing, space and distracting repeats.
These recordings remain owner-only. Observed single-run generation times with
stems were 0.80–0.84 seconds; they are not a latency guarantee.

```sh
.venv-build/bin/python scripts/prepare_voice_transforms.py \
  --renderer build-mac/djayvo_remix \
  --input renders/voice-20261017-221411/source-pcm.wav \
  --plan renders/voice-club-v8/final/remix.club.score.json \
  --output renders/vocal-echo-new-review --consent --echo
```

Use a fresh directory. The shared preparation script retains its explicit
consent, source/hash, exclusive-directory, partial-marker and export checks.
No supplied fixture or existing recording is regenerated or replaced.
