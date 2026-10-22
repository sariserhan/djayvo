# Simpler Performance studio — 2026-10-21

**PASS, local presentation and usability. Overall specification remains PARTIAL.**

The studio starts with track loading, Play and the crossfader. A short navigation row
opens music, voice response, instruments, recording or headphones directly. Advanced
tempo/loop/scratch controls and effects stay on their own deck; cue pads remain visible.

Voice response now follows three steps: prepare the backing track, add a phrase,
then create and bring in the response. Keys and pads appear before the sequencer,
MIDI and instrument recording options. Full-set recording, short WAV/stem recording,
and saved setups have separate, plainly labeled choices. Recording remains visible
in disclosure labels while capture runs. Existing permission, storage, deletion and
quality limits remain alongside their controls.

The studio and homepage platters now use fine black vinyl grooves, small colored
paper labels, metal spindles, a stationary light reflection and a dotted strobe rim.
Rotation follows playback; reduced-motion settings still stop visual rotation.

Native disclosures retain the same media elements and audio graph. Navigation and
Academy coaching open the required ancestors before focusing a control. Fullscreen
coaching now recognizes loaded buffer-backed lessons, rather than relying on a native
audio element URL that those lessons no longer use.

## Evidence

- [Before decks](evidence/studio-simplicity/before-decks.png), [after decks](evidence/studio-simplicity/chromium-decks.png), [initial workspace](evidence/studio-simplicity/chromium-overview.png).
- [Voice steps](evidence/studio-simplicity/chromium-voice.png), [mobile](evidence/studio-simplicity/chromium-mobile.png), [homepage decks](evidence/studio-simplicity/chromium-homepage-decks.png), [WebKit laptop fullscreen](evidence/studio-simplicity/fullscreen/webkit-1366.png).
- [Control parity](evidence/studio-simplicity/control-parity.json): all 178 original input/button/select/audio/canvas/jog controls retained, with unchanged types, input bounds, steps and options; no duplicate IDs.
- [Usability](evidence/studio-simplicity/usability.json): Chromium and WebKit PASS. Real practice loading, no autoplay, keyboard disclosure navigation, continued playback while folding tools, WAV recording and its collapsed indicator, instrument audio, all grouped tools reachable, direct/repeated links, nested Academy target reveal, homepage platter playback and reduced motion. All-expanded layouts fit 320–1440 px; zero automated accessibility violations.
- [Deck presentation](evidence/studio-simplicity/presentation/browser.json): both browsers PASS for real playback, fader silence, EQ/echo, keyboard jog, rotation/reduced motion, seven responsive widths and three actual Academy checks.
- [Fullscreen](evidence/studio-simplicity/fullscreen/browser.json): both browsers PASS for playback continuity, coaching, native/fallback entry and exit, keyboard focus, accessibility and nine viewports from 320×640 to 3840×2160. Main controls and pads fit laptop fullscreen at 1366×768.
- [Full DJ regression](evidence/studio-simplicity/dj-regression.json): 48 Chromium checks PASS, including stereo PCM, independent deck FX, real instruments, all 26 MIDI mappings, consent withdrawal, offline playback and hash-verified recording/export.
- [Voice-response regression](evidence/studio-simplicity/session-regression.json): 40 Chromium checks PASS, including real phrase generation, bar-aligned A/C, cancellation, synthetic capture, saved-performance integrity, cross-studio reuse and offline recovery.
- 137 browser-engine unit tests PASS; site TypeScript check PASS; audited web bundle and free Academy offline pack preparation PASS.

All browser audio was physically muted. The shared DSP and composition algorithms are
unchanged. Existing DSP harnesses open grouped tools before exercising them; dedicated
usability tests exercise the actual closed-first interface. Historical test reports
were preserved; presentation/fullscreen results use this new evidence directory.

## Reproduce

From the repository root, with Node 22 on PATH, prepare the site using
`npm --prefix apps/site run studio:prepare`. Run the local site on `127.0.0.1:4224`
with `JAMLOOM_COMING_SOON=false` and no database credentials, then:

```sh
node apps/site/tests/studio-simplicity.mjs
JAMLOOM_TEST_EVIDENCE=../../../docs/evidence/studio-simplicity/presentation/ node apps/site/tests/deck-presentation.mjs
JAMLOOM_TEST_EVIDENCE=../../../docs/evidence/studio-simplicity/fullscreen/ node apps/site/tests/studio-fullscreen.mjs
node --test apps/web/tests/*.test.js
node apps/web/tests/dj.mjs
node apps/web/tests/session.mjs
npm --prefix apps/site run typecheck
```

Human ease-of-use acceptance, listening and physical hardware qualification are
**NOT RUN**. Earlier musical-quality FAIL is retained. No publication, provider
execution, live payments or deployment occurred.
