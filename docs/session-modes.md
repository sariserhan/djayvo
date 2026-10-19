# Major and minor prepared performances

2026-10-18. **PASS (technical):** the prepared Deck A/C path now supports all
12 tonics in major or natural minor. Full studio/specification **PARTIAL**;
human musical-quality acceptance **NOT RUN**.

Open <http://localhost:3000/studio/dj.html>, prepare a permitted track on A, and
confirm its tempo, **Tonic**, **Mode** and first downbeat. Import/record a consented
phrase and make C as before. Changing mode stops the prepared session, clears the
old C/download and requires confirmation again. Context controls are locked while
A plays or preparation runs. Major-triad analysis can populate the mode, but the
estimate is explicitly a heuristic and the checkbox remains mandatory.

## Musical and compatibility contract

The shared C++17 planner uses a small, seeded family of I/vi/IV/V progressions
for major call-response performances. Chord inversions, bass roots and the
phrase-derived piano answer use the selected scale. Minor planning keeps the
existing progressions. Both modes preserve timing, clean source hooks, voice
clipping/consent limits, validation and the 20–40-second performance bound.
The default Instant Remix strategies retain their existing minor behavior.

`MusicalContext.mode` and `RemixPlan.key_mode` default to minor. Major scores
serialize as **1.7-remix**; older schema versions allow only minor. The JSON
Schema and bounded CLI importer accept 1.7, reject unknown modes and reject
major mislabeled as an older version. Native major validation and CLI import
reject out-of-scale sustained pitched notes; short passing notes up to half a
quarter note remain permitted by the import contract. Generated context plans
use in-scale notes throughout. The original four-argument WASM session entry
point remains minor-compatible; the new mode-aware entry point validates mode
before rendering. The browser verifies returned mode as well as tonic/tempo.

This is rule-based composition, not a new learned director. Selecting a key does
not follow the actual track's chord progression, modulation or tuning. It does
not retune the clean voice hook. Tempo remains constant 4/4 and downbeat is manual;
manual Deck B is still unsynchronized. These limits prevent a key-membership
check from being mistaken for a good musical accompaniment.

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Apple M5 native build/tests | PASS | 15/15 suites; 288 plans = 2 modes × 12 tonics × 4 tempi × 3 seeds |
| Actual Linux arm64 native build/tests | PASS | 15/15 suites in the isolated Debian 12 container |
| Address/undefined sanitizers | PASS | Shared remix core and complete CLI plan-import suite |
| CLI replay and rejection | PASS | Major replay preserves score/PCM across block sizes; voice/drum stems unchanged in the paired mode test; old-version/unknown-mode/out-of-key candidates rejected without output |
| JSON Schema | PASS | 40 checks covering eight scores and invalid versions/modes |
| Mac/Linux/WASM event agreement | PASS | Eight scores and event traces exact; shared six-hour grid exact |
| Mac/Linux/WASM waveform differences | PASS | All eight PCM16 outputs identical; maximum absolute and RMS differences zero |
| Existing minor behavior | PASS | Four historical minor scores, events and WAVs byte-identical; legacy WASM entry point exact |
| Changed major audio | PASS | Major versus minor PCM differs; voice events/clips and drum plans unchanged. Only the 60 BPM pair has the same tonic; other pairs also change tonic |
| Browser workflow/offline | PASS | 19 checks each in Chromium/WebKit; major generation/entry/ending, mode-change invalidation, minor offline generation, capture/cancel/failure regressions |
| Unit and Voice studio regressions | PASS | 23 unit tests; 40 voice browser checks |
| Integrated site / visible controls | PASS | `/studio/` in Chromium/WebKit at desktop and 390 px; major C preview, no horizontal overflow or page errors; screenshots inspected |
| Physical microphone/output latency, Linux browser, venue endurance | NOT RUN | Existing synthetic/software checks are not hardware evidence |
| Formal listening, learned AI and production release | NOT RUN | No quality promotion, paid compute or deployment |

Sanitizer results and toolchain versions are recorded in the
[machine receipt](evidence/session-modes/summary.json). Detailed
[cross-platform comparison](evidence/session-modes/comparison.json) and
[mode waveform differences](evidence/session-modes/mode-differences.json) separate
portability equality from intentionally changed compositions.

The same-tonic C minor/C major 60 BPM pair has maximum absolute PCM difference
0.18478394 and RMS difference 0.00976419 (full-scale units). These numbers establish
a changed waveform, not improvement, realism or perceptual novelty. Per-render
peak/RMS/nonfinite reports and EBU R128/true-peak logs are retained with the receipt.
Integrated loudness spans −24.6 to −23.4 LUFS; true peaks span −7.9 to −7.8 dBFS.
No loudness normalization or mastering-quality claim is made.

Playable private outputs:

- `renders/session-modes-mac-20261018/session-major-60000.wav` — C major, 60 BPM.
- `renders/session-modes-mac-20261018/session-major-83920.wav` — E-flat major, 83.92 BPM.
- `renders/session-modes-mac-20261018/session-major-120000.wav` — F-sharp major, 120 BPM.
- `renders/session-modes-mac-20261018/session-major-180000.wav` — B major, 180 BPM.
- Matching minor controls omit `major-`; matching WASM outputs are in
  `renders/session-modes-wasm-20261018/` and Linux outputs in
  `renders/arrangement-linux/session-modes-linux-20261018/`.

## Reproduce

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
npm --prefix apps/web run test:browser
DJAYVO_BROWSER=webkit npm --prefix apps/web run test:browser
node apps/site/scripts/prepare-studio.mjs
node apps/web/tests/session-site.mjs
.venv-analysis/bin/python docs/evidence/session-modes/check_schema.py
python3 scripts/verify_web_bundle.py
```

The renderer helper now produces eight mode cases. Use **new output directories**:

```sh
./build-mac/djayvo_session_render renders/voice-20261017-221411/source-pcm.wav renders/NEW_MAC --consent
# Run that helper on actual Linux, writing to its mounted output directory.
node scripts/verify_session.mjs renders/voice-20261017-221411/source-pcm.wav renders/NEW_MAC renders/arrangement-linux/NEW_LINUX renders/NEW_WASM renders/session-native-20261018
```

The schema check uses the retained Mac evidence directory named above. The
Browser skill's execution tool was unavailable; repository Playwright was used.
WebKit screenshot-injection CSP warnings were captured separately by the existing
runner; application errors remain failing checks. No CSP change was needed.
The master, supplied fixture, owner voice and x/y/z/pipe originals were checked
against protected hashes. No recording or model is committed. `~/mlx-env` is
unchanged; the dedicated Colima profile was stopped and global context preserved.
