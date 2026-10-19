# MIDI Learn for mixer and sound controls

This local continuation adds absolute 7-bit CC assignments to the existing
opt-in MIDI input. The master specification, sound assets and shared C++ engine
remain unchanged. The full professional studio remains **PARTIAL**; physical
controller validation and musical-quality listening remain **NOT RUN**.

At http://localhost:3000/studio/dj.html, enable MIDI and choose an input. In
**Control to assign**, select a control, press **Learn control**, then move a
knob/fader. That message records the assignment without moving the screen
control. Move the hardware control through the current screen value to pick it
up. The assignment list shows whether it is waiting for pickup or active.

The 26 targets cover crossfader/master, A/B/C levels, A/B three-band EQ,
A/B/C tone/echo/spacing, instrument level/tone/echo/spacing, Talk bass mouth and
computer/touch velocity. MIDI note velocity still comes from the incoming note.
Disabled controls ignore mapped CC, including Mouth when Talk bass is not
selected. Music/instrument controls retain their existing permission/readiness
checks; assigning a control does not enable recording, load audio or resume a
suspended audio context.

Mappings are specific to a MIDI channel and CC number on the selected input.
Each target has one assignment, and each channel/CC controls one target.
Reassigning either replaces its previous binding. Learn can be cancelled, and
**Clear mappings** removes all assignments without changing sound levels.
The maximum assignment count is bounded by the 26 targets. C's three effect
targets were added on 2026-10-19; [current evidence](performance-effects.md)
includes their disabled-state and ready-performance pickup checks.

Pickup waits until the incoming value is within one MIDI step of the current
screen value or crosses it. Values then follow the target's bounds and step.
Mouse/touch changes rearm pickup; programmatic value changes are checked before
the next CC is applied. Window blur or a hidden page cancels learning and rearms
all pickups. Changing input, unplugging, disabling MIDI and leaving the page clear
mappings. Nothing is persisted, uploaded or sent to a MIDI output.

CC64 and channel-mode messages retain their fixed sustain/note-release functions
and cannot be learned. Unmapped CC do not release held notes. Existing notes and
pads remain playable during learning. Relative/endless encoders, 14-bit CC,
NRPN/RPN interpretation, pitch bend, MIDI clock, transport/recording mapping,
custom drum-note layouts and saved mapping presets are not implemented.

Mappings drive the existing validated UI/audio paths. MIDI interpretation and
DOM work stay on the browser main thread, outside the shared C++ audio callback.
There is no new dependency, runtime service or inference step. Controller-to-
speaker latency and sample-accurate live MIDI event placement are **NOT RUN**;
these controls still use the existing next-available audio processing path.

## Reproduce

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
node apps/site/scripts/prepare-studio.mjs
node apps/web/tests/midi-site.mjs
python3 scripts/verify_web_bundle.py
```

The site check requires the local Next server on port 3000. Each DJ/session test
prints a new ignored artifact directory. Tests use synthetic MIDI ports and
measure real media/worklet audio, muting only physical output after the meter.
They do not establish physical-controller support. Chromium exposes native Web
MIDI here; the tested WebKit does not. WebKit synthetic tests establish app logic,
with a clear keyboard/touch fallback when native MIDI is unavailable.

The in-app Browser skill's required Node REPL tool is unavailable in this
session, so the existing repository Playwright workflow is used. No new browser
or build dependency was installed. [Evidence](evidence/midi-learn/summary.json)
records exact runs, versions, protected hashes and unrun gates.

## Original MIDI Learn evidence and limits

Apple M5 / 16 GiB, macOS 26.7.1 (25G241), Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55, WebKit 26.5 and local Next 16.4.2. The build uses the
existing isolated Emscripten 6.0.1 toolchain; no environment was replaced.

| Gate | Status | Evidence |
| --- | --- | --- |
| Unit validation and pickup | PASS | 24 checks; message boundaries, crossings, manual changes, range/step endpoints and invalid values |
| Final DJ browser suites | PASS | 40 checks per engine, including all 23 targets, notes during learning, real deck/instrument PCM, remapping, cancellation, disabled controls, input changes and offline reload |
| Prepared A/C regression | PASS | 19 checks per engine; generation, shared-clock entry, real audio, cancellation and offline reload |
| Integrated site and UI | PASS | Identity/content, pickup-controlled master audio, disable cleanup, no app errors; 1440×1000 and 390×844 screenshots inspected; DJ suite also checks 320/768 widths |
| Bundle and source preservation | PASS | 35 audited assets; unchanged master, fixture, consented source, x/y/z/pipe and engine binaries |
| Playable output / waveform regression | PASS | All 12 dry/echo piano/deck WAVs byte-identical to preceding increment; browser comparison in `waveforms.json` |
| Offline echo timing regression | PASS | All 36 measured deck echo peaks at the requested frame; prepared clock tests pass |
| Live MIDI event-frame agreement | NOT RUN | No sample-frame MIDI timestamp scheduler; pickup/audio energy checks do not measure hardware timing |
| Whole-track loop repeatability | PARTIAL | One WebKit near-end loop timeout; final full run and 20 isolated repeats pass, root cause unconfirmed |
| Native Web MIDI availability | PARTIAL | Chromium exposes API; installed WebKit needs keyboard/touch fallback |
| Physical MIDI, latency, Linux browser, venue endurance, listening | NOT RUN | Separate physical/platform/human gates |
| New native Mac/Linux and voice-studio reruns | NOT RUN | Those engines/surfaces unchanged; previous evidence remains historical |
| Full specification / production | PARTIAL | See tracker; no release or quality acceptance |

Current playable regression files are in `renders/dj-chromium-rPfPsm/` and
`renders/dj-webkit-Hl5vrH/`. The dry cross-browser PCM difference is zero; echo
maximum difference is 1 PCM16 step, RMS 0.0000019082. Existing
`docs/evidence/deck-effects/measure.py` reproduces these comparisons with the two
new directory paths. These are rendered regression clips, not captured hardware
MIDI performances or evidence of improved musical quality.

The first two failed test attempts concerned an assumed value and a restore
operation on the disabled Mouth slider. Both now verify preservation without
trying to edit an unavailable input. A separate WebKit timeout occurred in the
existing whole-track loop test at paused position 59.9 s before MIDI activation.
[That failed receipt](evidence/midi-learn/webkit-loop-initial-failure.json) is
retained. The final full suite passes; a targeted
[20-cycle probe](evidence/midi-learn/loop-probe.json) also passes. Reproduce it with
`node docs/evidence/midi-learn/loop-probe.mjs` while port 3000 is running. The main
suite now records bounded media-event traces and deck errors on failure. The
intermittent loop issue remains open, with no claim that this MIDI change fixed it.
