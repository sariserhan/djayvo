# Arrangement and instrument review v2

2026-10-17. The owner authorized completing available improvements and validation
without per-step approval. This revision addresses the reported awkward
experimental style, artificial instrument sound and repetitive openings, using
the measured references as arrangement guidance. **Technical gates: PASS.
Overall musical quality and owner review: PARTIAL; formal evaluation: NOT RUN.**

Subsequent owner feedback on 2026-10-17: “for now they are okay but we have to
improve in a production quality but as a start they are fine.” This is provisional
acceptance of the current prototype. No specific files, seeds, timestamps or
individual quality ratings were supplied; it does not establish that all nine
mixes were auditioned or that instrument realism is accepted. Production quality
remains an explicit development goal. Automated evidence below retains the
listening status at the time those checks ran.

## Implemented

- Five sections: intro, groove, two-bar break, three-bar return, one-bar ending.
  The break actually removes bass and drums; a quieter piano supports the second
  complete speech statement. The return adds fills/response variations.
- Three-note piano chords use nearby inversions and 12-tick staggered attacks.
  Responses use two chord tones, within MIDI 48–79, instead of continuous high
  arpeggios. Experimental uses a half-time backbeat and longer bass notes.
- Single-layer CC0 samples retain their provenance. A velocity-dependent low-pass
  filter darkens softer notes. This is not a claim of multisampled realism.
- Optional instrumental early reflections: 31/47/73/113 ms, no feedback, with
  300 Hz high-pass and 4.5 kHz low-pass shaping (upper cutoff capped by rate).
  Vocals remain dry. Reflections follow the same clean-hook ducking as instruments.
  Instrument gains increase 2–4 dB while remaining below the output ceiling.
- Chops retain original speed/pitch and at least 80 ms clearance from each other
  and complete hooks. All three opening treatments remain available by seed.
- `mix.instrument_room_mix` exports the optional 0–0.35 setting (default zero).
  Native/schema bounds and room-tail coverage are validated. The portability
  comparison now checks mix settings as well as notes, crops and event frames.
- `mac_smoke.sh` accepts fresh reference/output paths and refuses an existing
  output directory, protecting recordings. Its default output is timestamped.

The C ABI remains unchanged. The shared core still uses C++17 and system runtime
libraries only. No reference audio, new samples, models or platform APIs were
added to the engine; the master specification and supplied speech fixture retain
their original SHA-256 hashes.

## Recordings and audition

Open `renders/voice-arrangement-v2/review/index.html`. It contains previous/new
comparisons for each style, six alternate-seed mixes, and excerpts from Down,
Question and Blood Club. All 15 files measure approximately -25 LUFS with
constant gain only; original files are preserved. Browser checks loaded all 15
durations and verified playback-clock progress and automatic pausing of the
previous player. Playback was muted: this is not listening evidence.

New originals: `renders/voice-arrangement-v2/remix.{hiphop,reggae,experimental}.wav`.
The seed-4123 run also includes four stems per style. Seeds 4124/4125 exercise
the alternative openings. An additional fixed-loop baseline and a shuffled,
RMS-matched pilot with blank rating forms are in `blind-pilot/listener/`.
That pilot is preparation only, not a completed blinded trial.

| New master | Duration | Sample peak | Integrated loudness |
| --- | --- | --- | --- |
| Hip-hop | 32.000 s | -6.039 dBFS | -23.5 LUFS |
| Reggae | 32.000 s | -7.982 dBFS | -23.7 LUFS |
| Experimental | 32.96775 s | -7.654 dBFS | -24.0 LUFS |

All 22 new original WAVs decode, remain below the ceiling and have a silent final
100 ms. Both full voice statements in each style match the source after expected
gain/edge fades within 0.000024151 PCM amplitude (below two PCM16 LSBs).
Bass/drum stems clear completely in the interior of each break and return with
nonzero energy. Those are mechanical checks, not groove/enjoyment scores.

## Actual platforms and numerical agreement

Native Mac: Apple M5, arm64, 10 cores, 16 GiB; macOS 26.7.1 (25G241), Xcode 27.1
(27A9275), Apple Clang 21.0.0, SDK 27.0, CMake 4.4.2, Python 3.14.6.

Linux: local isolated Colima profile `djayvo`, aarch64 Linux kernel 6.8.0-117,
Debian 12 container, GCC 12.2.0, CMake 3.25.1, Python 3.11.2. Image digest is
recorded in `evidence/arrangement-review/linux-image-digest.json`. This is actual
Linux execution on the M5 host, not a rerun on the original physical Intel laptop.
The container uses a read-only source mount and a separate output mount. The
existing default Colima/Podman environments and `~/mlx-env` are unchanged.
The task container and VM were stopped after validation; their isolated disks
remain available for reproduction.

The supplied synthetic speech fixture was reused. Linux/Mac plans, mix controls
and compiled instrument event frames match exactly. All three masters and all
twelve stems are byte-identical; maximum and RMS PCM errors are both **0**.
Mac 512/113-frame block renders also match exactly. Original historical Linux/Mac
renders remain untouched. Against the previous acoustic revision, waveform RMS
differences are 0.04192/0.04035/0.04997 (hip-hop/reggae/experimental), expected from
the changed composition and sound processing, not portability errors.

## Gates and reproduction

| Gate | Status | Evidence |
| --- | --- | --- |
| Native M5 release | PASS | Seven CTest suites; 9 foundation and 10 remix groups |
| Native M5 ASan/UBSan | PASS | Same seven suites |
| Linux arm64 release | PASS | Seven CTest suites in the isolated container |
| Current Linux/Mac portability | PASS | Exact plans/events, 15 identical WAVs |
| Blocks, bounds, tails, clean voice, schema | PASS | `verify.py`, native/integration regressions |
| Allocation-free processing | PASS | Render-time allocation counter, room enabled |
| Source/master preservation | PASS | Hashes and smoke overwrite-guard regression |
| Review files and browser controls | PASS | 15 matched files; muted browser playback check |
| Reference signal analysis | PASS | All three supplied files, including 10:34 Blood Club |
| Original owner listening | PARTIAL | Accepted as a start, with reported defects |
| Current owner listening | PARTIAL | Prototype accepted as a start; production quality still needs improvement |
| Specific instrument realism / per-style ratings | NOT RUN | No individual ratings or defect timestamps supplied |
| Formal M1 quality / recognition | NOT RUN | No invented ratings; diverse-source trial missing |
| Original Intel Linux rerun / iPhone / live / AI / release | NOT RUN | No corresponding execution or quality prerequisites |

From the repository root, using matching current Linux references:

```sh
DJAYVO_PYTHON="$PWD/.venv-build/bin/python3" \
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/remix \
DJAYVO_OUTPUT_DIR=renders/new-mac-check sh scripts/mac_smoke.sh
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize --output-on-failure
.venv-analysis/bin/python docs/evidence/arrangement-review/verify.py
```

The fixed verification snapshot expects this run's named render directories.
`prepare-audition.py` reproduces the review when its destination does not exist;
it deliberately refuses overwrites. Python analysis dependencies are pinned in
`analysis-requirements.txt`; the CTest suites require no Python packages.
Logs, environment, artifact measurements, waveform differences and browser checks
are retained in `docs/evidence/arrangement-review/`. No automatic test assesses
instrument authenticity, musical originality, intelligibility or enjoyment.

To resume the retained Linux environment, run `colima start djayvo --activate=false
--ssh-config=false`, then `docker --context colima-djayvo start djayvo-portability`.
Inside that container the build commands were `cmake -S /src -B /work/build
-DCMAKE_BUILD_TYPE=Release`, `cmake --build /work/build --parallel 2`, and
`ctest --test-dir /work/build --output-on-failure`. The renderer used the read-only
`/src/renders/fixtures/synthetic-speech.wav` with `--synthetic-fixture --style all
--stems --seed 4123`, writing `/out/remix`. Choose a fresh prefix for a subsequent
render. Package installation and pinned base-image evidence are in the Linux logs.
