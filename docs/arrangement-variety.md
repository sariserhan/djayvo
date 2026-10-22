# Varied calls within the song — 2026-10-22

The owner accepts both earlier A/B examples and wants surprise rather than a
fixed arrangement template. [Exact feedback and accepted hashes](evidence/local-call-edit/owner-listening.json).

The local singer studio at <http://127.0.0.1:4198/> now chooses between a short
original phrase in a vocal gap and a short replacement of an isolated estimated
sung phrase. The preserved examples remain at <http://127.0.0.1:4197/>.

The existing song generation path still makes the band and natural AI singing.
The arranger then finds multiple possible entrances near the estimated beat grid,
keeps a later singer response and protects the ending. It may select the complete
short source phrase or a pause-bounded section of a longer recording. Typed ideas
no longer bypass recording analysis. All 23 styles may attempt an arrangement;
style names alone no longer force the recording to be omitted.

Choices are weighted randomly, with penalties for recent arrangement shapes.
The last shape is tried only after different shapes, so A–A or B–B can still occur
at different entrances instead of a predictable A–B–A–B sequence. A shape is the
editing method plus a four-second entrance region. The last twelve successful
shapes persist across restarts in ignored local `renders/singer-studio/arrangement-history.json`,
without speech, source paths or audio. Missing/malformed history starts fresh;
a failed save does not discard a finished song. The studio processes one job at
a time. If only the previous shape passes the audio checks it may be reused;
novelty never overrides those checks.

The shared `local_call_edit.edit` retains original singer timing and exact PCM
outside the edit. There is no wholesale regeneration, pitch shift, time stretch,
forced loop or whole-song reconstruction from stems. Overlap, ongoing backing
and headroom checks reject unsuitable placements before writing an edit. If none
works, the original song is retained with an explicit “could not fit” message;
that fallback is not presented as a successful source-inclusive remix and does
not enter the successful-arrangement history.

## Evidence

- **PASS — scoped owner listening:** both manually selected A/B examples accepted.
- **PASS — 26 scoped tests:** 9 bounded-edit/variation tests, 10 singer/studio
  tests, 3 earlier assembly regressions and 4 source-conditioning regressions.
  [Test log](evidence/arrangement-variety/tests.log).
- **PASS — eight actual local mixes of the same existing song:** both methods,
  consecutive same-method choices, varying source crops, no consecutive shape
  repeat, source preservation, and zero outside-edit PCM error.
  [Executable check](evidence/arrangement-variety/repeated-renders.py),
  [hashes and decisions](evidence/arrangement-variety/repeated-renders.json).
- **PASS — actual Chromium studio generation:** upload a six-second recording,
  supply a typed idea, analyze speech locally, draft lyrics, render a new male reggae
  singer, separate stems and automatically choose a vocal replacement. One unsafe
  candidate was rejected before the successful edit; 27.69 seconds remain exact.
  Playback, seek, exclusive playback, consent, no autoplay and 320/375 px layouts
  pass. [Browser check](evidence/arrangement-variety/studio-browser.mjs),
  [browser result](evidence/arrangement-variety/studio-browser.json),
  [render hashes](evidence/arrangement-variety/studio-render.json).
  Known Gradio waveform-fetch AbortError warnings are recorded separately; no
  other browser errors occurred. Chromium and WebKit both pass the listening-page
  link into the updated studio ([navigation check](evidence/arrangement-variety/navigation.json)).
  WebKit studio generation was not rerun.
- **PARTIAL — general musical acceptance:** the new automatic choices have not
  been heard by the owner. Quiet boundaries are estimates, not semantic phrase
  alignment. Subtracted vocal estimates may contain instrumental bleed, and ASR
  may choose an awkward source clause. Technical checks cannot judge humor,
  naturalness, anticipation, lyric meaning or enjoyment across all styles.
- **NOT RUN — new training, production promotion or deployment.** No new paid
  compute, phone work or launch operations. The rejected source-led performance
  remains **FAIL — owner listening**.

## Reproduce

Use a fresh output directory in the render check to retain earlier evidence.

```sh
.venv-singer/bin/python -m unittest discover -s tests -p 'test_local_call_edit.py' -v
.venv-singer/bin/python -m unittest discover -s tests -p 'test_sing*.py' -v
.venv-singer/bin/python -m unittest discover -s tests -p 'test_sung_assembly.py' -v
.venv-singer/bin/python -m unittest discover -s tests -p 'test_source_led_response.py' -v
.venv-singer/bin/python docs/evidence/arrangement-variety/repeated-renders.py
.venv-singer/bin/python scripts/singer_studio.py
node docs/evidence/arrangement-variety/studio-browser.mjs
```
