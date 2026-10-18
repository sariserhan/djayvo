# Sustained instruments and broader arrangement variety

2026-10-18. Local engine implementation: **PASS**. Production and specification
completion: **PARTIAL**. New musical-quality and perceptual-variety assessment:
**NOT RUN**. The unchanged master remains authoritative.

Organ now plays reggae keyboard parts, a slow pad supports the club introduction,
build and break, and a separate lead answers phrases in experimental. They are
original electronic instruments, not claims of acoustic realism. Sampled piano,
bass, drums and recorded guitar remain available. Sustained voices have distinct
harmonics, attack/release and tone filtering; they continue until note-off rather
than ending with a short recorded sample. No model, artist recording, external
DSP runtime or cloud service is involved.

Reggae, experimental and club now vary harmony and rhythmic placement by seed.
Reggae/experimental also select a later break/return on some seeds. Hybrid
inherits the reggae rhythmic alternatives. Each of these three styles passes a
64-seed test requiring at least 24 distinct instrumental structures; this is
structural diversity, not a listening score. The web history check ignores
instrument substitutions as novelty and tries at most eight candidates. Its
existing 120-second worker deadline, cancellation, saved-session cap and failure
message remain. Finite rules can still produce similar-sounding music.

## Contracts and preservation

- Organ/pad/lead append to the instrument enum; older values keep their meaning.
- New instrument plans use `1.5-remix` / `1.3-m0a`. Strict import and schemas
  reject older versions claiming these instruments. Existing score replay keeps
  the original instrument events and PCM.
- Exports retain the four legacy stems and add each declared guitar/organ/pad/lead
  stem. Manifest verification requires the complete declared set and rejects
  extra undeclared instrument stems. The maximum is 96 artifacts for eight
  strategies with every stem, not an unbounded export.
- Reports now enumerate actual declared banks, including `guitar-v1` and
  `sustained-v1`. Earlier guitar reports incorrectly named only `acoustic-v1`;
  those historical reports are retained. Scores and asset manifests were correct.
  The CLI import test summary now derives its counts from executed cases: eight
  styles and 69 identical artifacts, replacing stale constants.
- Two complete clean hooks remain in every tested owner mix. The later break
  changes the vocal timing of reggae/experimental seed 4124; other tested owner
  vocal stems are unchanged. No word boundary or intelligibility guarantee is made.

## Evidence

Reproducible scripts, raw logs and machine reports live in
[evidence/sustained-instruments](evidence/sustained-instruments/).

| Gate | Status | Evidence and scope |
| --- | --- | --- |
| M5 ASan/UBSan | PASS | Full 12-suite run, 531.68 s; final near-band-edge correction separately rebuilt and checked by the core/provenance tests |
| Native M5 | PASS | Full 12-suite release run; actual `mac_smoke.sh` executes on M5 and compares all default styles |
| Linux arm64 | PASS | Isolated Colima/Debian execution; final full 12-suite run |
| Sustained voices | PASS | Multi-second sustain, distinct signals, release silence, block invariance, allocation-free processing, high-note alias suppression and near-band-edge activity |
| M5/Linux new artifacts | PASS | 93 byte-identical WAVs including stems across 16 owner/fixture cases; exact plan decisions and event frames; maximum/RMS PCM error zero |
| Saved-score compatibility | PASS | All eight prior fixture scores replay exactly: 42 WAVs including stems; 21 regenerated WAVs plus scores/events for unaffected hip-hop/funk/baseline/call-response unchanged |
| Browser engine | PASS | Seven styles agree with native plans/events/PCM in Node, Chromium and WebKit |
| Browser workflow | PASS | Consent, cancellation preserving mixes, generation, playback/seek, download, verified persistence, regeneration and scoped deletion; no upload requests or application errors; 320/390 px layouts |
| Recent-generation history | PASS | Ten consecutive three-take requests per browser give 30 distinct instrumental bodies; forced seed 4123 repeats select 3581773502 on attempt 2; worst measured request 5.68 s Chromium / 3.58 s WebKit, not a general latency guarantee |
| Private audition preparation | PASS | Eight matched before/after pairs and instrument/vocal stems; 32 players load/play/seek in both browsers; screenshots inspected |
| Source preservation | PASS | Master, supplied synthetic fixture and owner WAV hashes unchanged |
| Human musical quality / perceived variety | NOT RUN | No new listener observations; automated results do not establish enjoyment, instrument realism or artist-level production |
| Physical browser microphone / new iOS execution | NOT RUN | Prior owner/device evidence retained; phone work paused |
| Learned production direction / public release | NOT RUN | M1 prerequisites absent; infrastructure paused; no deployment, spending, upload or training |
| Overall production quality | PARTIAL | Rule implementation and technical verification progressed; formal listening and release requirements remain open |

The owner mixes before this revision measure −24.0 to −18.5 LUFS and −7.9 to
−3.8 dBFS true peak. New mixes measure −23.8 to −18.3 LUFS and −7.9 to −3.7 dBFS.
All 16 listening files are matched to −22.0 LUFS, with true peaks −7.7 to −4.9
dBFS. Final 100 ms are silent. Clean-hook interior maximum error is
0.000024151, less than one PCM16 step. Full before/after maximum and RMS
waveform differences, frame counts and hashes are recorded per mix in
[measurements.json](evidence/sustained-instruments/measurements.json). Hybrid seed
4124 is unchanged; the package includes it as a control, not a claimed improvement.

Open [the private comparison page](../renders/sustained-instruments-20261018/review/index.html)
to audition. The raw recording and mixes remain local, excluded from the web
bundle and Git. The bundle remains below the 16 MiB budget.

## Failures investigated

Initial native integration attempts failed on obsolete expectations for the
club bank name, electronic-only track palette, and default export count. Tests
now verify the declared pad/lead/organ stems and mixed bank names; historical
failed logs are retained. The first Linux run had the same stale assertion and
was corrected, followed by a complete final rerun.

Review found a real edge case: filtering all partials at 0.42 times sample rate
could silence a valid high fundamental allowed by plan validation. Fundamentals
now use the existing 0.45 limit; overtones retain 0.42. A MIDI 108 / 9.6 kHz
regression checks activity. The default 48 kHz artifacts remain unchanged, with
final native/WASM comparisons retained separately. Two existing WASM warnings
about bounded 64-bit source-frame indexing remain; no new runtime dependency
or weakened validation was introduced.

## Reproduction and environment

Use the project build/analysis environments. Run `cmake --build build-mac`,
`ctest --test-dir build-mac --output-on-failure`, `sh scripts/web_build.sh`,
`node apps/web/tests/wasm.mjs`, and the Chromium/WebKit browser-render runners.
Evidence render/measurement scripts deliberately require fresh output folders;
change their paths for a new run rather than overwriting recordings. Before
controls use the frozen guitar-stage Linux binary. The matching Mac smoke uses
`DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/sustained-instruments-20261018/fixture`
and a fresh `DJAYVO_OUTPUT_DIR`.

Actual hardware: Apple M5, 10 cores, 16 GiB, macOS 26.7.1 (25G241); Xcode 27.1
(27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2, project Python 3.14.6.
Linux: Debian arm64, GCC 12.2, CMake 3.25.1, Python 3.11.2. Browser/build tools:
Node 22.23.1, Emscripten 6.0.1, Playwright 1.61.1, Chromium 149.0.7827.55,
WebKit 26.5. Exact environment and per-runtime timings are retained with evidence.
The original physical Intel machine was not rerun. `~/mlx-env` is unchanged.
