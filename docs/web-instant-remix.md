# Djayvo browser Instant Remix

2026-10-18, America/New_York. The owner requested the web version first and paused
phone work. The master remains immutable; prior device evidence remains intact.
**Technical web delivery: PASS. Overall acceptance/production quality: PARTIAL.**

Open **http://localhost:4173** while `python3 scripts/web_serve.py` is running.
[Build/run instructions](../apps/web/README.md), [tracker](../TODO.md),
[machine evidence](evidence/web-instant-remix/report.json).

## Delivered flow

Consent → Record or import → waveform and 2–5 second trim → Three takes or Club
→ generate → play/download. Regeneration uses a new seed. Input converts locally
to mono 48 kHz PCM16; original files are unchanged. Imports accept browser-decodable
mono/stereo audio, 2–15 seconds and at most 8 MB. Capture visibly times out around
4.8 seconds. Hiding the tab pauses playback and discards capture/cancels generation.

The shared C++ planner, instruments and DSP run in a WebAssembly worker. Cancel
terminates its unpublished in-memory filesystem. MEMFS lacks native hard links,
so a small web adapter publishes only a fully completed set. The shared engine's
only accompanying change is an explicit stream-size cast after the existing
32 MB input validation, resolving a 32-bit compiler warning without altering DSP.

Completed sessions save atomically in IndexedDB, with per-file SHA-256 verification
on reload. The ten-session limit never evicts older work. Failed storage leaves
the current mixes downloadable. Corrupt/incomplete sessions are withheld without
deletion. Scoped and all-session deletion require confirmation; delete-all also
removes withheld data. Original input and consent are not persisted. No account,
upload, analytics, model, paid API or backend. Download important mixes: private
browsing, browser cleanup, storage eviction or changing origin can lose the library.

The single-screen frontend uses HTML/CSS/native ES modules, no runtime packages.
Emscripten 6.0.1 is isolated under `build-web-tools/emsdk`; `~/mlx-env` is untouched.
The public bundle includes only app/engine/notice files. A loopback-only server
serves `dist/web`, with CSP, permission restrictions and WASM MIME type; it never
serves the checkout or private recordings. Bundle audit rejects extra files and
symlinks and checks the exact sample notices plus Emscripten/runtime notices.

## Gate ledger

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| WebAssembly build | PASS | Emscripten 6.0.1; dedicated CMake target; isolated SDK |
| Native M5 regression suites | PASS | 9/9; corrected current-reference Mac smoke |
| Native ASan/UBSan suites | PASS | 9/9; unchanged rendering behavior |
| JavaScript bounds/PCM tests | PASS | Exact decimal two-second trim; invalid selection/NaN rejection; PCM format/clamping |
| WASM adapter boundary tests | PASS | Missing consent publishes nothing; corrupt input rejected; four styles render |
| Chromium full flow | PASS | 16 named checks; desktop 1440×1000 and mobile layout 390×844 |
| WebKit full flow | PASS | 14 named checks; same viewports; screenshot-tool warnings recorded separately |
| Microphone automation | PASS | Chromium fake device uses supplied fixture; revoking consent discards capture; timed capture decodes/generates |
| Physical browser mic / audible playback | NOT RUN | Owner phone result is separate evidence |
| Browser/native plans and event frames | PASS | Four strategies × two browser engines, exact agreement |
| Browser/native waveform comparison | PASS | Eight byte-identical WAVs; maximum and RMS PCM differences both 0 |
| Node WASM/native comparison | PASS | Four identical masters; supplied fixture unchanged |
| Current Linux-reference/M5 comparison | PASS | Three exact masters/plans/events; actual Linux artifacts from prior run, Linux not rerun this turn |
| Library persistence/integrity/deletion | PASS | Reload, scoped delete, delete-all, tamper withholding, ten-session transaction bound |
| Cancellation | PASS | No partially published session; previous mixes retained |
| Request privacy | PASS | Tested flows emitted only same-origin GETs, no upload requests |
| Bundle/notice audit | PASS | Exact file allowlist; private/test files excluded; negative extra-file test rejects |
| Desktop/mobile visual layout | PASS | Concept and final screenshots viewed; no overflow at 390 px |
| Assistive-technology review | PARTIAL | Semantic labels, focus styles and keyboard dialog dismissal; full VoiceOver NOT RUN |
| Browser/device coverage | PARTIAL | Chromium/WebKit automation; Firefox, installed Safari and physical mobile browsers NOT RUN |
| Human web listening / M1 evaluation | NOT RUN | No musical-quality or Blood Club similarity conclusion from automated checks |
| Hosting / production release | NOT RUN | Local build only; no deployment, purchase, submission or billing |
| Further phone checks | NOT RUN | Paused by owner request; earlier device failures remain recorded |

## Actual portability measurements

Fixture unchanged, seed 4123, 48 kHz and 512-frame blocks. Current native references:
`renders/mac-20261018-014651/remix` (three styles),
`renders/web-validation/native-final/club` (club). Actual browser-worker outputs:
`renders/web-validation/{chromium,webkit}-engine/mix`.

| Strategy | Frames | Chromium vs native | WebKit vs native |
| --- | ---: | --- | --- |
| Hip-hop | 1,536,000 | PASS: exact | PASS: exact |
| Reggae | 1,536,000 | PASS: exact | PASS: exact |
| Experimental | 1,582,452 | PASS: exact | PASS: exact |
| Club | 1,741,714 | PASS: exact | PASS: exact |

[Full measurements](evidence/web-instant-remix/browser-comparison.json) include
plan/event agreement, maximum/RMS PCM difference and byte identity. Browser tests
use the UI consent path on synthetic input; this is not proof of human consent.
Permission flags are not part of the musical-plan comparison contract.

Single worker trials: Chromium three takes **1.445 s**, club **0.944 s**; WebKit
three takes **1.031 s**, club **0.393 s**. These include worker/module loading and
result preparation, exclude writing test artifacts to disk, and are not p95 or
performance promises. Browser memory/battery/thermal/slow-device benchmarks are
NOT RUN. WASM linear memory is capped at 512 MiB; this is not total browser memory.

Actual hardware/toolchain: Apple M5, arm64, 10 CPU cores, 16 GiB; macOS 26.7.1
(25G241), Xcode 27.1 (27A9275), Apple Clang 21.0.0, macOS SDK 27.0, CMake 4.4.2,
isolated Python 3.14.6 for native checks. Emscripten 6.0.1 commit
`25e4e8d6550d392ba9e0c2936bce7cf41ee47cc0`, SDK checkout
`1c9a998ee5dd2e38aec0c5abbf23dffdb8f10d57`; Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55, WebKit 26.5. Browser/test tools are not shipped.

## Failures investigated

- **FAIL → PASS:** WebKit ephemeral IndexedDB rejected Blob writes:
  `UnknownError: Error preparing Blob/File data to be stored in object store`.
  A focused Blob/Uint8Array/ArrayBuffer experiment isolated it. Save now writes
  byte buffers and load reconstructs playback Blobs; full reload flows pass.
- **FAIL → PASS:** Initial unconfigured `sh scripts/mac_smoke.sh` compared the
  current engine with historical `renders/m0/remix`; all three plan comparisons
  failed while 9/9 native tests passed. Rerun with the handoff's current
  `renders/arrangement-linux/ios-core-v9/remix` passes. Both the
  [initial failure](evidence/web-instant-remix/historical-reference-failure.json)
  and [corrected comparison](evidence/web-instant-remix/native-linux-comparison.json)
  are retained. No reference was regenerated to conceal a mismatch.
- **PARTIAL tooling:** Playwright's WebKit screenshot operation injects inline
  styling blocked by CSP. Reproduced on an otherwise idle page with an inspector
  script's `style-src-elem`/`inline` violation. Only matching messages during
  screenshot capture are classified as tooling warnings. Final WebKit report
  retains three warnings; there are no application console errors. CSP stays strict.
- **PASS:** Final screenshots wait for the short colour transition to settle;
  early images captured enabled buttons halfway between grey and lime.

## Design and visual evidence

Working [concept](evidence/web-instant-remix/concept.png) was generated with the
built-in Image Gen tool: a complete charcoal/lime private voice-to-music studio,
recorder left, direction right and saved mixes below, with no marketing sections.
This is an implementation reference, not an owner design-acceptance claim.
The generated image is evidence only and is not a runtime asset.

Tokens: `#101211` background, `#191c19` surface, `#f0f3eb` text, `#a5aca2` muted,
`#c3ef69` lime, `#303830` borders. System sans type, maximum 70 px headline,
28 px headings, 16 px controls, 7–9 px corners, 54 px buttons. Two columns stack
at 760 px. Exact visible headings/navigation/empty-state copy follow the concept.

Concept and final [desktop](evidence/web-instant-remix/desktop.png),
[mixes](evidence/web-instant-remix/mixes.png),
[mobile](evidence/web-instant-remix/mobile.png) were inspected with `view_image`:

1. PASS — charcoal/light/lime palette and action hierarchy.
2. PASS — simple wordmark/navigation and left recorder/right direction layout.
3. PASS — large three-line headline, aligned widths and generous spacing.
4. PASS — restrained recorder frame, paired actions and two direction rows.
5. PASS — lower mix list; stacked mobile controls without horizontal clipping.

Functional deviations: capture is disabled before consent, the empty waveform
is flat instead of invented audio, native players vary by browser, capture uses
simple glyphs, and real trimming/progress/errors/session dates/downloads extend
the initial state. No extra marketing copy or fake metrics. Browser plugin was
listed but its required Node REPL tool was unavailable on discovery, so the
app-builder Playwright fallback was used with disposable contexts, never owner data.

## Reproduction and remaining work

Follow [web README](../apps/web/README.md). Current native checkpoint:

```sh
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/ios-core-v9/remix \
  DJAYVO_PYTHON="$PWD/.venv-build/bin/python" sh scripts/mac_smoke.sh
cmake --build build-mac-sanitize --parallel 4
ctest --test-dir build-mac-sanitize --output-on-failure
```

Run `scripts/compare_portability.py` against each browser prefix; club uses
`--styles club` and the native club prefix. Always choose fresh native export
prefixes. Source/evidence hashes: [source-hashes.json](evidence/web-instant-remix/source-hashes.json).

Next owner action: open the local page, confirm consent, Record, speak for a few
seconds, choose Club or Three takes, then play/download. Browser microphone
permission requires owner action. No further phone checks are requested. Diverse
blinded listening, production acceptance, physical browser/device validation and
public release remain open; this web app does not complete every master gate.
