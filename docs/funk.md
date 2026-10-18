# Funk composition and web integration

Recorded 2026-10-18. **Funk implementation and local technical checks: PASS.
Human musical acceptance: NOT RUN. Overall specification: PARTIAL.** The master
is unchanged. This implements the syncopated funk strategy specified in §3.3
using the existing cleared sampled piano, bass and drum kit. No new instrument,
model, dependency, asset download or cloud service was introduced.

Choose **Funk** in the local web studio at `http://localhost:4173`, then Make
music. It produces one approximately 31–33 second mix, saves it in the existing
local library and supports playback, regeneration, WAV download and deletion.
Three takes still generates hip-hop/reggae/experimental; Club is unchanged.

## Musical behavior and bounds

The planner chooses four coordinated bass/kick patterns, four minor-key chord
cycles and 108/112/116 BPM from the seed. Bass uses short root/octave/fifth/third
figures with sixteenth-note syncopation. Kicks coincide with selected bass
attacks; backbeats have quieter intervening snare notes. Piano uses brief chord
stabs and alternating-bar responses timed from source onsets. The return adds
hat detail, alternate bass pitches and extra stabs; a two-bar break removes the
bass/drums before the final return and cadence.

The form is 14 bars: intro 0–1, groove 2–7, break 8–9, return 10–12, ending 13,
plus two seconds of release tail. Openings rotate among clean voice, instruments
and a fragment. Both full clean hooks remain, with the existing 80 ms separation
from other vocal fragments. The original input stays local and unmodified.

These are bounded rule choices. A new random seed can repeat a previous pattern;
there is no recent-take history filter or learned creative judgment. Structural
difference in notes does not establish perceived variety, groove or enjoyment.
Guitar/organ/pad/lead and separate hybrid/call-response strategies remain open.

## Contracts and reproduction

The CLI and existing recording helper accept `--style funk`. C ABI strategy `6`
selects funk; previous numeric values and struct layout are unchanged. The web
adapter accepts direction `2` for funk (0 three takes, 1 club). Native export,
score/completion schemas, integrity verification, plan import and portability
comparison all include funk. A six-strategy native export is bounded at 48
artifacts. The historical plan version remains valid; this strategy requires no
new timing or effect fields.

```sh
build-mac/djayvo_remix \
  --input renders/voice-20261017-221411/source-pcm.wav --consent \
  --style funk --seed 4123 --stems --output renders/funk-new-review

# Rebuild only the local public assets; no deployment:
sh scripts/web_build.sh
node apps/site/scripts/prepare-studio.mjs
```

Always choose a fresh output prefix. The site preparation command copies the
audited bundle into the existing Next studio; the new flow was tested on the
standalone loopback server. A new Next server build or live-hosted execution was
**NOT RUN**. Remote library/upload infrastructure remains paused; its database
strategy constraint must be extended for funk before cloud saving is enabled.
The existing local IndexedDB library accepts funk without changing or deleting
older sessions. Phone UI remains unchanged while device work is paused.

## Gate results

| Gate | Status | Evidence |
| --- | --- | --- |
| M5 native release | PASS | [10/10 suites](evidence/funk/mac-tests.log), including actual C calls for funk and rejection of strategy 7 |
| Linux arm64 release | PASS | [10/10 suites and detailed remix groups](evidence/funk/linux-tests.log) |
| M5 ASan/UBSan | PASS | [10/10 final-source suites](evidence/funk/sanitizer-tests.log), 351.39 seconds |
| Composition/source constraints | PASS | [20 remix groups](evidence/funk/remix-details.log): 64-seed structural audit, bass/kick alignment, syncopation, ghost notes, source response, 2/3/5-second hook preservation, section contrast, stems and block identity |
| Plan replay / validation | PASS | [Six strategies / 48 identical artifacts, 90 rejected candidates](evidence/funk/plan-import.log) |
| M5/Linux portability | PASS | [50 byte-identical WAVs and exact event frames](evidence/funk/measurements.json); maximum/RMS cross-platform PCM error zero |
| Legacy arrangements | PASS | All 25 WAVs, five scores and event traces unchanged for hip-hop/reggae/experimental/club/baseline |
| WebAssembly | PASS | [Five styles and invalid direction/permission/input checks](evidence/funk/wasm.log); all five native/Node masters and event traces match exactly |
| Real browser worker portability | PASS | [Ten Chromium/WebKit masters and event traces](evidence/funk/browser-portability.json) match M5 byte-for-byte |
| Local storage validation | PASS | [Three web unit tests](evidence/funk/web-unit.log): hashed funk session, missing/duplicate/corrupt/mislabeled artifacts |
| Browser user flow | PASS | [Chromium/WebKit](evidence/funk/browser.json), real generation/play/seek/download/reload/regenerate/delete, preserving previous club/funk sessions |
| Public-bundle audit | PASS | [Assets/notices and no private audio](evidence/funk/bundle.json); [local Next studio copy](evidence/funk/site-studio.log) |
| New listening / naturalness / perceptual novelty | NOT RUN | Private owner comparisons ready; automated playback was muted |
| M1 formal baseline | NOT RUN | Diverse cleared clips and independent blinded observations absent |
| Full specification / production quality | PARTIAL | Remaining features and release evidence are tracked in [TODO](../TODO.md) |
| New phone, live services, deployment, training | NOT RUN | No new rental, voice upload, publication or model call |

The 64-seed structural test excludes velocities, sample takes and voice events:
at least 12 different four-bar note structures and all three tempos are required.
It also rejects a copied hip-hop/reggae/experimental/club structure, and changes
input onsets to verify the melodic response changes. It is not a listening score.

## Private listening evidence

[Open the four-seed owner comparison](../renders/funk-20261018/review/index.html).
Eight players provide four matched mixes and their isolated voices. Listen for
bass/drum timing, clipped chords, repetition, word clarity and the return after
the break. The raw exports and stems remain under `renders/funk-20261018/`.

| Seed | BPM / seconds | Original LUFS / true peak dBFS | Max / RMS PCM difference from 4123 |
| --- | --- | --- | --- |
| 4123 | 112 / 32.000000 | −23.2 / −7.9 | 0 / 0 |
| 4124 | 116 / 30.965521 | −23.2 / −7.7 | 0.476440 / 0.066961 |
| 4125 | 116 / 30.965521 | −23.2 / −8.0 | 0.496429 / 0.067664 |
| 4126 | 116 / 30.965521 | −23.3 / −7.2 | 0.470490 / 0.063562 |

Differences compare common-prefix absolute frames, without time alignment;
unequal tails are excluded and lengths are retained in JSON. All four note
structures differ. Both clean hooks in each voice stem match the gain-adjusted
source interior within one PCM16 quantization step; maximum error is
0.000024151. The 3 ms edge fades are excluded from this comparison. Master/stem
peaks stay below −1 dBFS and the final 100 ms are silent. Review mixes measure
−22 LUFS with true peaks −5.9 to −6.8 dBFS; isolated voices retain original gain.

[`render.py`](evidence/funk/render.py) creates fresh native outputs;
[`measure.py`](evidence/funk/measure.py) verifies exports, both schemas, legacy
identity, source hooks and cross-platform PCM, then creates listening copies
without overwriting prior audio. Linux used the same sources and seeds with
`/work/funk/build/djayvo_remix`, writing `renders/arrangement-linux/funk-20261018`.
Master/fixture/owner-source SHA-256 values remain unchanged and are in the report.

## Browser QA and environment

Flow: consent/import → Funk → Make music → play/seek/download → reload → generate
again → delete the latest session. A prior club session and earlier funk session
survive. Cancelling a new funk render leaves no partial library session. Reload
restores verified outputs but not source audio or consent. The current build was
tested at `http://localhost:4173` with disposable browser contexts.

| Browser check | Status |
| --- | --- |
| Page identity, meaningful content, no framework overlay | PASS |
| New Funk control, generation state, saved track and controls | PASS |
| Playback, seek, WAV download and persisted integrity | PASS |
| Desktop 1440×1000; 390/320×844 with no horizontal overflow | PASS |
| Application console/page errors | PASS: none |
| Requests stay same-origin GET; no uploads | PASS |
| Physical microphone / installed Safari / human hearing | NOT RUN |

The Browser plugin's required JavaScript execution/discovery tools were absent;
the previously authorized installed-Playwright fallback was used. WebKit's
screenshot-only inline-style CSP warnings are separately recorded, not suppressed
as application success. Desktop and mobile screenshots were visually inspected:
`/tmp/djayvo-funk-chromium-desktop.png`,
`/tmp/djayvo-funk-webkit-mobile-direction.png`. The new radio fits the existing
layout; mobile remains a vertical flow. [Reproduction script](evidence/funk/browser-check.mjs).

[Actual toolchain record](evidence/funk/toolchain.json): Apple M5 arm64, 10 cores,
16 GiB, macOS 26.7.1 (25G241), Xcode 27.1 (27A9275), SDK 27.0, Apple Clang 21,
CMake 4.4.2; Debian arm64/GCC 12.2/CMake 3.25.1 in the isolated Colima profile.
Original physical Intel testing is NOT RUN. Emscripten 6.0.1, Node 22.23.1,
Playwright 1.61.1, Chromium 149.0.7827.55, WebKit 26.5; FFmpeg 9.0.2, NumPy 2.5.4,
jsonschema 4.19.2. Project Python environments and `~/mlx-env` were preserved.
The prior bounded 64-to-32-bit source-index warnings in the WASM arrangement
build remain; this phase adds no new warning.
