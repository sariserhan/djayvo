# Source phrase development: Call & Response

2026-10-18. **Implementation and portability: PASS. Musical quality and owner
listening: PARTIAL.** The owner selected x/y/z as the style and quality target.
This is a focused step toward that goal, not evidence of matching those recordings.

Call & Response now carries the source's chronological rhythm and measured
accents into a two-bar instrumental answer. Previously it folded onsets modulo
one bar and used at most four of those positions for each answer. The new
regression test fails against the preserved previous library because it loses
source attacks. It passes with the new planner.

The planner sorts/deduplicates onsets, takes at most eight spread across the
phrase, removes initial silence from their timing, and preserves their order.
Longer rhythms are uniformly compressed to fit two bars with room for the
return. Sixteenth-note collisions merge using the stronger measured accent.
An 80 ms local variance estimate supplies bounded note accents; this is an
energy proxy, not a verified expressive or semantic interpretation. Missing
onsets retain a bounded fallback rhythm. No pitch-contour extraction was added.

The first answer spans bars 5–6 (zero-based). The return in bars 13–14 shifts
the rhythm by half a beat, changes chord-tone choices and lets bass reinforce
stronger accents. Short voice calls leave these answer windows free. Both
complete clean hooks remain; their opening placement still varies by seed.
The four owner examples have two fewer vocal events each (5→3, 7→5, 6→4, 5→3).
The source remains unchanged, and clean-hook interior sample errors stay below
one PCM16 step (maximum 0.000024151).

This changes default Call & Response generation in the shared CLI/C ABI and
rebuilt web engine. Other styles retain exact outputs. There is no new schema,
API, instrument, model, runtime dependency in the C++17 core, or cloud call.
Saved scores contain explicit events and replay exactly. Reproducing the old
rule-generated take from only its seed requires the previous engine or saved
score. The frozen evaluation cohort has not been regenerated.

## Listen locally

[Open four matched before/after pairs](http://127.0.0.1:4192/review/).
The [local page](../renders/source-motif-20261018/review/index.html) includes
piano, bass and voice stems at their original levels. Listen around 10–15 s
for the first answer and 27–32 s for its return. The eight masters are gain-
matched to -22 LUFS, with measured true peaks between -5.7 and -5.5 dBFS.
These are labeled owner comparisons, not a blinded study or independent ratings.
The owner answered **“More connected”** when asked whether the After instrumental
answers feel more connected to their phrase. This supports that specific change;
no take/timestamp, realism score or reference-level acceptance was supplied.
The observation remains separate from the frozen blinded study's blank forms.

The private loopback server allows only this page and its 20 WAVs and supports
audio byte ranges. It reuses the installed Next.js static-file implementation;
it is research tooling, not hosted production infrastructure. Restart with:

```sh
/Users/serhansari/.nvm/versions/node/v22.23.1/bin/node docs/evidence/source-motif/serve.mjs
```

## Evidence

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Defect reproduction | PASS | New source-phrase test fails with the preserved old library; [log](evidence/source-motif/before-tests.log) |
| Source influence / composition | PASS | Chronology beyond one bar, accent inversion, leading-silence invariance, unordered/duplicate onsets, later-rhythm changes, developed return and vocal clearance; existing 128-seed dialogue/hybrid checks retained |
| Actual M5 release | PASS | 14/14 suites; [log](evidence/source-motif/mac-tests.log) |
| Actual Linux arm64 release | PASS | 14/14 suites; [log](evidence/source-motif/linux-build-tests.log) |
| Mac smoke | PASS | Actual `sh scripts/mac_smoke.sh`; [log](evidence/source-motif/mac-smoke.log) |
| M5 ASan/UBSan | PASS | Five affected core/ABI/import/render suites passed before the explicit-cast cleanup; rebuilt final remix suite passed in 119.40 s ([log](evidence/source-motif/sanitizer-tests-final.log)) |
| Cross-platform output | PASS | 12 exact plans and event-frame traces; 65 byte-identical master/stem WAVs, maximum and RMS PCM differences zero |
| Compatibility | PASS | Seven unchanged styles (40 WAVs); five old Call & Response scores replay with identical master/stem audio (25 WAVs) |
| Web engine | PASS | Seven styles × Node/Chromium/WebKit = 21 exact plan/event/PCM comparisons; bundle checks pass |
| Browser product flow | PASS | 21 Chromium checks including generation, persistence, cancellation, playback and consent; fake microphone only |
| Private review page | PASS | 20 players in each of Chromium/WebKit; four pairs play/seek with exclusivity, no mobile overflow or console/page errors; byte ranges, HEAD, method/path restrictions checked |
| Master/source preservation | PASS | Master, supplied speech fixture and consented owner WAV hashes unchanged |
| Owner listening | PARTIAL | “More connected” for the After instrumental answers; informal labeled comparison only |
| Formal listening / reference-level quality | NOT RUN | No independent ratings or reference-level acceptance; automated checks do not establish quality |
| Learned direction / production release | NOT RUN | Quality holds remain; hosted infrastructure and phone work paused |

[Machine-readable measurements](evidence/source-motif/measurements.json),
[review checks](evidence/source-motif/review-browser.json),
[Mac environment](evidence/source-motif/mac-environment.json) and
[Linux environment](evidence/source-motif/linux-environment.log) retain details.

Expected changes from each same-seed old master, using identical absolute frames:

| Owner seed | Maximum PCM difference | RMS PCM difference |
| --- | --- | --- |
| 4123 | 0.315186 | 0.017878 |
| 4124 | 0.299652 | 0.018199 |
| 4125 | 0.323120 | 0.020135 |
| 4126 | 0.266083 | 0.017564 |

These measure changed arrangements, not improved quality. All checked new WAVs
remain below the -1 dBFS sample ceiling and end with 100 ms of silence.

Initial problems are retained: the local project CMake executable was absent,
so the installed Homebrew CMake was used without installing anything; a new
implicit-conversion warning was corrected with an explicit cast. Native release
and WASM renderer bytes remained identical after that cast. Two earlier bounded
64→32-bit source-index warnings remain in the WASM build. The first review
server failed a seek test; byte-range delivery fixes the actual playback path.
The next review check incorrectly treated WebKit's same-origin media blob URLs
as network traffic; it now accepts those exact-origin GET URLs. Both initial
logs remain. Browser plugin execution tools were unavailable; the existing
isolated Playwright fallback was used. Desktop and mobile captures were inspected.
The [final-build receipt](evidence/source-motif/final-build.json) records both
source hashes and binary equality; final Mac/Linux remix suites were rerun.
The sanitizer debug binary changed; its final remix-suite rerun passed.

## Reproduce / continue

Use fresh output directories. The [render script](evidence/source-motif/render.py)
accepts `--renderer PATH --output NEW_DIRECTORY`; `--plans OLD_DIRECTORY`
replays the five old Call & Response plans. It uses existing owner/fixture audio,
never regenerates the fixture. Run it with the prior preserved binary and the
new Mac/Linux binaries. [measure.py](evidence/source-motif/measure.py) checks the
fixed evidence paths and creates a fresh review directory. Existing recordings
are never replaced. Browser engine checks use `apps/web/tests/wasm.mjs` and
`browser-render.mjs`; the review check is `evidence/source-motif/review-check.mjs`.
The existing isolated Linux container uses `/src` read-only and `/out` for renders.

Hardware: Apple M5 arm64, 10 cores, 16 GiB, macOS 26.7.1 (25G241),
Xcode 27.1, Apple Clang 21.0.0, CMake 4.4.2, project Python 3.14.6.
Linux is the local Debian arm64 container, GCC 12.2.0 and CMake 3.25.1;
the physical Intel computer was NOT RUN. Browser checks use Node 22.23.1,
Playwright 1.61.1, Chromium 149.0.7827.55 and WebKit 26.5. Analysis uses
the existing Python 3.15 environment and FFmpeg 9.0.2. `~/mlx-env` is unchanged.

Remaining work: formal listening, instrument realism, adaptive form/voice roles,
reliable pitch contours and extending proven phrase development to other styles.
This remains a finite rule planner; the broad musical-intelligence goal and full
specification remain PARTIAL. Do not infer x/y/z similarity from this report.
