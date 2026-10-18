# Call-and-response, hybrid and recent-composition checking

2026-10-18. Overall **PARTIAL**: implemented and technically verified; human
listening and production acceptance **NOT RUN**. The master is unchanged.

The engine now has all six named Stage A directions: hip-hop, reggae, funk,
experimental, call-and-response and hybrid, plus club and the baseline control.
CLI `--style call_response` / `--style hybrid`, C ABI strategies 7 / 8, and web
studio choices expose the new directions. Existing enum values and default
three-take behavior remain stable. Eight strategies fit the native export budget;
score import, schema and completion verification cover both new names.

Call-and-response uses a 16-bar form at seed-selected 108/112/116 BPM. Sparse
bass/drums support full calls; an upper piano answer derives its rhythm from
input onsets, waits until the whole call ends, and develops on the return.
Shorter calls occupy alternating bars. Hybrid uses the same clock/key and
voice-leading while switching between hip-hop, funk and reggae rhythm grammars
at phrase boundaries. Seed choices rotate the order, harmony and rhythm. Both
retain two full untransformed hooks, 80 ms vocal clearance and varied openings.
These are deterministic rules, not a learned director or semantic word analysis.

The web worker checks new instrumental bodies against up to 30 recent saved
scores (ten sessions). Its SHA-256 identity excludes seed, voice, opening/final
bar, tempo, velocity, pan, sound palette and absolute tonic. It includes body
note pitch relative to tonic, positions, durations, instrument roles, length and
meter. This rejects exact structures even after superficial changes; it does
not measure perceptual similarity. Old local sessions participate without a DB
migration. Deleting sessions removes that history; other tabs/devices have no
shared history. Native CLI seed replay intentionally stays deterministic.

At most four complete candidate renders run in the isolated worker, under the
existing two-minute timeout; cancellation terminates it. A repeat changes the
seed deterministically. Only an accepted complete set reaches IndexedDB, with
its actual selected seed used for downloads and replay. Exhaustion reports an
error and preserves old mixes. No provider call, upload, paid resource or model.

## Evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| M5 release | PASS | 10/10 CTest suites; [log](evidence/creative-strategies/mac-release.log) |
| Linux arm64 release | PASS | 10/10 suites; [log](evidence/creative-strategies/linux.log) |
| Actual Mac smoke | PASS | [fresh smoke run](evidence/creative-strategies/mac-smoke.log) |
| M5 ASan/UBSan | PASS | 10/10 suites, 439.26 s; [log](evidence/creative-strategies/sanitizer.log) |
| Composition / safety | PASS | 128 new seed plans, dialogue timing, three hybrid rhythms, input response, 2/3/5 s vocal spacing, bounds, repeatability and silence tails |
| Import / ABI | PASS | Eight-style exact replay, malformed-plan rejection, actual C ABI 7/8 renders and invalid 9 rejection |
| Numerical portability | PASS | 80 byte-identical Mac/Linux masters/stems and exact event frames; 30 prior WAVs/scores/events unchanged |
| Browser / Node engine | PASS | All seven output styles match native events and PCM exactly in three runtimes |
| Web flow | PASS | Consent, both choices, cancellation, save/reload, download, muted playback/seek, scoped deletion, forced repeat retry, 320/390 px overflow and desktop checks |
| Recent-structure selection | PASS | Seven web unit groups; ignore superficial changes, retry, exhaustion, history bound; both browsers select seed 3581773502 after rejecting 4123 |
| Privacy / assets | PASS | Same-origin GET-only browser traffic, audited static bundle, no private audio bundled, protected master/fixture/source hashes unchanged |
| Listening / realism / perceived novelty | NOT RUN | Eight private owner comparisons prepared; no rating inferred |
| Production release | NOT RUN | No deployment; M1, hardware, infrastructure and release gates remain open |

[Measurements](evidence/creative-strategies/measurements.json),
[browser run](evidence/creative-strategies/browser.json),
[reproduction scripts](evidence/creative-strategies/render.py), and
[measurement script](evidence/creative-strategies/measure.py) preserve results.
The first UI test selected the short source-preview player for a 20-second seek;
that test failed. It now targets the generated session player and passes. The
failed log is retained. Browser-plugin execution tools were unavailable, so
isolated Playwright contexts were used. Screenshots were inspected at desktop
and 320 px; WebKit screenshot-only CSP styling warnings are excluded from app
errors. This does not establish physical microphone, installed Safari or hearing.

Private review: `renders/creative-strategies-20261018/review/index.html`.
Eight distinct owner instrumental bodies, each with two full hooks. Maximum
interior clean-hook error is 0.000024151 (less than one PCM16 step). Original
masters measure −24.4 to −23.4 LUFS, true peak −7.9 to −6.0 dBFS. Review masters
are gain-matched to −22 LUFS; voice stems keep original level. Every tested WAV
ends with 100 ms silence. Cross-platform maximum and RMS PCM differences are
zero; different-seed common-prefix differences are recorded without time alignment.

M5 hardware/toolchain: Apple M5 arm64, 10 cores, 16 GiB, macOS 26.7.1 (25G241),
Xcode 27.1 (27A9275), Apple Clang 21.0.0, CMake 4.4.2. Linux is the existing
isolated Debian arm64 VM/container, GCC 12.2, CMake 3.25.1. Node 22.23.1,
Emscripten 6.0.1, Playwright 1.61.1, Chromium 149.0.7827.55, WebKit 26.5,
FFmpeg 9.0.2. The original physical Intel machine was not rerun.

Use `DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/creative-strategies-20261018/fixture`
and a fresh `DJAYVO_OUTPUT_DIR` with `sh scripts/mac_smoke.sh`. Existing recordings,
`~/mlx-env`, the supplied fixture and master were preserved. Future cloud saving
must extend its strategy constraint for funk/call_response/hybrid before enabling
these directions; remote storage remains paused.
