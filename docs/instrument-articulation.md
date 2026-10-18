# Recorded instrument articulation v4

Recorded 2026-10-17, America/New_York. **Technical checks: PASS. Instrument
realism: PARTIAL. V4 listening and formal quality: NOT RUN. Overall M0: PARTIAL.**
This continues the owner's request to improve the artificial/game-like sound;
it does not establish that the complaint is resolved.

## What changed

The former bank reused one recording per pitch/hit. The current bank contains
53 recordings: seven upright-piano pitches × three recorded dynamics × two
takes, three unchanged contrabass notes, and four drum sounds × two takes.
Piano velocities 1–55 select pianissimo, 56–95 mezzo-forte, and 96–127 forte.
The note's existing deterministic seed selects one of two takes. Selection is
repeatable across render blocks/platforms; it is not a strict alternating
round-robin and consecutive hits may select the same take.

The planner, crop selection, note times, harmony, effects, schemas and C ABI are
unchanged. All three default-seed vocal and bass stems are byte-identical to
v3. Piano/drum stems change. Existing velocity gain and tone shaping remain;
recorded layers supply additional attack/spectral differences. Peak-normalized
samples do not preserve the library's original relative recording levels.

The immutable PCM bank grows from 1,459,434 to **6,933,350 bytes**. Playback still
allocates nothing in the tested render loop and adds no runtime dependency.
Bass stays single-layer; piano layers switch discretely, without crossfades.
The mono 22.05 kHz bank, pitch spacing and capped tails remain limitations.
Listen particularly for abrupt tone/level changes near velocity boundaries,
repetitive hits, tuning, groove and whether the instruments fit the voice.

## Sources and reproduction

All 39 additions come from the same pinned repositories as the original bank:
[VSCO 2 CE](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e)
and [VCSL](https://github.com/sgossner/VCSL/tree/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e).
Their pinned LICENSE bytes were re-fetched and matched the retained CC0 notices.
The [manifest](../assets/manifests/acoustic-v1.json) records every URL, source
hash, layer/take, preparation and PCM hash. All original 14 source/prepared
entries remain unchanged apart from selector metadata. `acoustic-v1` retains
its inventory filename; the bank's generated hash identifies this revision.
Raw downloads stay in ignored `renders/acoustic-source/`. No reference-track
sampling, training, private-recording upload or paid service was used.

```sh
python3 scripts/prepare_acoustic_bank.py
python3 scripts/verify_acoustic_assets.py
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize --output-on-failure
```

`prepare_acoustic_bank.py` reconstructs the instrument bank only. It never
regenerates the supplied synthetic speech. The master specification, speech
fixture and consented owner input retain their original hashes; `~/mlx-env`
was not modified.

## Validation and failures investigated

The new waveform-shape regression failed on the old engine: changing the take
seed produced no recorded-take variation. The expanded bank passes that test
at every piano root/dynamic and all four drum pitches, including same-seed
repeatability and layer-boundary differences after energy normalization.

The first full run then failed an existing overlapping-note test. It removed
the first note before recompilation, which renumbered the second note and
changed its take seed. The corrected reference removes the first compiled
event pair while retaining the second note's identity/seed. The exact waveform
assertion is retained. Both initial failures and the passing rerun are in
[evidence/instrument-articulation](evidence/instrument-articulation/).

| Gate | Status | Evidence |
| --- | --- | --- |
| M5 release | PASS | CTest 7/7; 10 foundation + 11 remix groups |
| M5 ASan/UBSan | PASS | Same 7/7 suites, no sanitizer findings |
| Linux arm64 release | PASS | 7/7 in existing isolated Debian 12 container |
| Recorded dynamics/takes | PASS | Shape variation beyond gain/filtering; deterministic seed; complete selector coverage |
| Asset integrity and rights inventory | PASS | 53 source/PCM hashes, pinned notices, bounds/fades, all original entries unchanged |
| Current Linux/M5 event frames and decisions | PASS | Exact supplied-fixture and owner-voice plans/traces, three styles each |
| Current Linux/M5 waveform comparison | PASS | Six masters: maximum/RMS difference 0; twelve fixture stems byte-identical |
| 512/113-frame blocks | PASS | Owner masters exact in all three styles |
| Speech preservation and change isolation | PASS | Two complete hooks per style within 2 PCM16 LSB; v3/v4 vocal and bass stems byte-identical |
| WAV and schema checks | PASS | 22 decoded WAVs: nine mixes, twelve stems, baseline; ten score schemas; no full-scale samples, final 100 ms silent |
| Audition preparation/browser | PASS | 16 matched WAVs, metadata, muted playback clock and exclusive player checks |
| Baseline pilot preparation | PASS | Newly rendered fixed-loop control with current bank; randomized package and blank ratings, no invented observations |
| Owner review | PARTIAL | Earlier prototype accepted as a start; no v4-specific feedback |
| Instrument realism | PARTIAL | Recorded variation implemented; audible improvement unassessed |
| V4 listening / formal blinded quality | NOT RUN | Automated checks do not establish musical quality |
| Physical Intel rerun / iPhone / AI / live / release | NOT RUN | Linux execution is arm64 on the M5 host |

Full [report](evidence/instrument-articulation/report.json),
[Mac environment](evidence/instrument-articulation/environment.json),
[Linux environment](evidence/instrument-articulation/linux-environment.txt),
[audition levels](evidence/instrument-articulation/audition-measurements.json),
and [browser check](evidence/instrument-articulation/browser-check.json) are retained.

| Default-seed master | Sample peak dBFS | Integrated LUFS | v3→v4 maximum / RMS waveform difference |
| --- | --- | --- | --- |
| Hip-hop | −5.977 | −23.3 | 0.2070923 / 0.00994545 |
| Reggae | −7.988 | −23.7 | 0.1733093 / 0.00721163 |
| Experimental | −6.959 | −24.0 | 0.2146606 / 0.00916033 |

These revision differences are expected instrument changes, not portability
errors. Audition copies use constant gain to reach −25 LUFS ±0.2; measured true
peaks stay below −1 dBFS. Isolated stems are matched independently and therefore
do not demonstrate their balance inside a mix.

Hardware/toolchain: Apple M5 10-core, 16 GiB; macOS 26.7.1 (25G241); Xcode 27.1
(27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2, project Python 3.14.6.
Linux: Debian 12 aarch64, kernel 6.8.0-117, GCC 12.2.0, CMake 3.25.1,
Python 3.11.2. Existing FFmpeg 9.0.2 handles audition loudness measurements.

## Listen and reproduce the renders

Open the local [instrument comparison](../renders/voice-articulation-v4/review/index.html).
It contains three v3/v4 master pairs, six alternative-seed v4 mixes, and previous/
new isolated piano/drum pairs. Note style, seed, timestamp and desired change.
The current blind pilot is in `renders/voice-articulation-v4/blind-pilot/listener/`.
Earlier recordings remain untouched and private audio is excluded from Git.

Commands below describe the completed run. Use fresh output paths on reruns.

```sh
./build-mac/djayvo_remix --input renders/voice-20261017-221411/source-pcm.wav --consent --output renders/voice-articulation-v4/remix --style all --stems
# Also render seed4124/seed4125 prefixes with --seed, and --style baseline.
# Existing Linux container: /src read-only checkout, /out = renders/arrangement-linux.
# Build/test /work/build; render fixture to /out/articulation-v4/remix with --stems
# and owner source to /out/articulation-v4/voice/remix with --consent.
DJAYVO_PYTHON="$PWD/.venv-build/bin/python3" \
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/articulation-v4/remix \
DJAYVO_OUTPUT_DIR=renders/articulation-smoke-mac sh scripts/mac_smoke.sh
./build-mac/djayvo_remix --input renders/voice-20261017-221411/source-pcm.wav --consent --output renders/articulation-block113/remix --style all --block-size 113
.venv-analysis/bin/python3 docs/evidence/instrument-articulation/prepare-audition.py
.venv-analysis/bin/python3 docs/evidence/instrument-articulation/verify.py
```

The audition script refuses an existing review directory. Verification can be
rerun over retained artifacts. Formal listening-dependent TODO items remain open.
