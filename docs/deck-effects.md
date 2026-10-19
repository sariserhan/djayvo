# Deck tone and echo

**PASS (technical):** independent effects on Deck A and Deck B, including prepared
A. **PARTIAL:** full professional DJ studio. **NOT RUN:** musical-quality listening,
physical latency and venue endurance. The master specification remains unchanged.

At http://localhost:3000/studio/dj.html, confirm music permission, load a track,
and use its **Deck effects** controls. Tone softens high frequencies; Echo mix
blends three fading repeats, with manual 100–800 ms spacing. Each deck retains
independent settings. These controls remain available while A is prepared.

The route is media/prepared source → EQ → tone/echo → scope → channel/crossfader/
master gain → existing output limiter. Muting a channel or fading it out also
silences its echoes. Deck C and the instrument channel remain independent.
Pausing a single deck lets its echoes decay. Reset, successful replacement,
unload, permission withdrawal, Pause all, page exit and audio interruption clear
the appropriate deck buffers. Invalid replacements preserve the existing track
and effects. Echo processing is local and works after the prepared app reloads
with the server disconnected; reload does not retain personal tracks.

The existing bounded instrument effect graph is reused; no new dependency,
model, audio asset or shared C++ processing was introduced. Parameters are
validated before changing audio. Tone uses the existing 30 ms exponential ramp;
wet/dry controls use a 10 ms time constant. Three normalized parallel taps avoid
a feedback cycle and its extra render-block delay. Reset replaces delay buffers
and gates their input for 10 ms so prepared A's 5 ms stop fade cannot repopulate
them. Instrument Reset effects now clears buffers too, rather than only reducing
wet gain. The unchanged piano dry/echo outputs are byte-identical to the prior
instrument-effects evidence.

Echo spacing is not beat-synchronized. Moving spacing bends echo pitch. Hard tail
clearing is intentional; no perceptual click-free or venue-safe claim is made.
Scratch emulation, beat loops, headphone cue routing, MIDI learn and the other
open [tracker](../TODO.md) tasks remain open.

## Verification

[Summary](evidence/deck-effects/summary.json),
[waveform measurements](evidence/deck-effects/waveforms.json) and browser receipts
retain the exact artifacts and versions. Apple M5 / 16 GiB, macOS 26.7.1;
Node 22.23.1, Playwright 1.61.1, Chromium 149.0.7827.55, WebKit 26.5, Next 16.4.2.
The build used Emscripten 6.0.1, CMake 4.4.2, Apple Clang 21 and Xcode 27.1.

| Gate | Status | Evidence |
| --- | --- | --- |
| Web build, public bundle, protected originals | PASS | 35 audited assets; master, speech fixture, consented source, x/y/z/pipe unchanged |
| Unit checks | PASS | 23 checks; invalid effect inputs rejected before audio mutation |
| DJ browser flow | PASS | 35 checks per browser: real PCM, independent controls, mute/reset, failure handling, MIDI and offline reload |
| Prepared A/C regression | PASS | 19 checks per browser; A effects operate while the shared clock, phrase generation and scheduled C continue |
| Integrated site and rendered UI | PASS | Both browsers: identity/content, controls, generation/preview, no page errors; desktop/mobile screenshots inspected; 320/390/768/1440 px layouts checked in DJ flow |
| Echo timing | PASS | 36 measured A/B echo peaks at exact requested frames; minimum/default/maximum spacing; no added block delay |
| Stereo and waveform comparison | PASS | A/B/instrument PCM identical within each browser; dry cross-browser exact; echo maximum difference 1 PCM16 step, RMS 0.0000019082 |
| Buffer clearing | PASS | Raise echo again after reset/unload; render a 5 ms source stop fade after clearing; no delayed old signal |
| Playable output | PASS | Six-second stereo piano dry/echo files for A and B in both browser artifact directories |
| New native Mac/Linux execution, Linux browser, voice-studio regression | NOT RUN | Browser mixer change; shared engine binaries and voice app unchanged; prior results remain historical |
| Physical latency, human musical quality, venue endurance | NOT RUN | Automated PCM checks do not establish these gates |
| Full specification / production studio | PARTIAL | Outstanding implementation and external evidence remain in TODO |

The audio tests mute physical output after the measured signal. They did not
listen to the recordings. Playable comparisons are retained locally in
`renders/dj-chromium-O5hizs/` and `renders/dj-webkit-miQuhf/`:
`deck-a-piano-dry.wav`, `deck-a-piano-echo.wav`, and corresponding `deck-b-*` files.
Both use the same C++ piano events, note-on frames 0/96000 and note-off frames
24064/120064 at 48 kHz. Echo vs dry maximum difference is 0.0649109, RMS about
0.00637184. This demonstrates an audio effect, not musical improvement.

Reproduce from the repository root (site check requires the local site running):

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
node apps/site/scripts/prepare-studio.mjs
node apps/web/tests/session-site.mjs
python3 scripts/verify_web_bundle.py
python3 docs/evidence/deck-effects/measure.py renders/dj-chromium-O5hizs renders/dj-webkit-miQuhf
```

Each DJ/session run prints a new artifact directory. Substitute the new two DJ
directories in the measurement command to compare a rerun. The required in-app
Browser Node REPL tool was unavailable, so validation used the repository's
Playwright workflow. Initial low-frequency attenuation assertions were corrected
to respect the filter's cutoff; the dedicated 8 kHz test remains. A malformed
range value in the integrated test was corrected from `.4` to `0.4`. All final
runs passed; no application failure was suppressed.
