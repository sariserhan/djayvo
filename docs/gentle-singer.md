# Preserve the song when adding the source — 2026-10-22

The owner reports that the songs sound great without the input, but the integrated
sample makes them worse. The previous repeated/chopped arrangement therefore has
**FAIL — owner listening feedback**. This is informal feedback, not a formal
blinded study. The owner authorized trying all or part of the input where it fits,
without interrupting the music. Previous recordings and reports remain intact.

## Implemented behavior

The arranger now adds at most one source phrase. It first tries the full audible
phrase, then shorter spans bounded by sustained pauses. It no longer subdivides
continuous speech at envelope valleys. Crops keep quiet padding and short edge
fades. No time stretching, echo, repeated fragments, singer subtraction, backing
ducking, replacement drums, master attenuation or new ending fade is applied.

The estimated vocal stem is used only to find quiet intervals. The sample must
fit inside one with 180 ms clearance at each end, ongoing music, and a returning
singer; the final outro is protected. Style accents guide the entrance when drum
analysis is confident. Otherwise a natural gap boundary is used. Sample level is
relative to the existing music, bounded by available headroom. The original
music stem is a byte-exact copy; the mixed PCM outside the source event is exact.

If no phrase fits or there is insufficient headroom, the original song is returned
unchanged and the UI explicitly says no sample was inserted. This is
`NO_SAFE_PLACEMENT`, not an accepted source-containing remix. Lyrics still respond
to the input's stated meaning. New generation prompts ask for a four-second
instrumental pocket before a sung answer; the output must still pass the gap check.

No new dependencies, speech model, training, cloud upload, paid compute or release.
All 23 styles and both voices remain available. The studio now shows **Your song**
and **Compare with the original song** with truthful placement status.

## Listen

Open `renders/gentle-singer-review-20261022/review/index.html`.
Each pair uses the **same original generated song** as the previous six-style
review and matched loudness. Nothing autoplays. The underlying music is preserved;
comparison copies have only the documented loudness adjustment.

| Song | New source entry | What to compare |
|---|---|---|
| Reggae · male | Whole phrase, 7.64–11.23 s | Does the call fit before the returning singer? |
| Hip-hop · female | None | Original song retained; no suitable gap |
| Funk · male | Whole phrase, 11.59–15.18 s | Does the phrase add to the instrumental passage? |
| House · female | None | Original song retained; no suitable gap |
| Drum and bass · male | Shorter phrase, 3.88–6.59 s | Is the excerpt understandable and comfortable? |
| Acoustic pop · female | Whole phrase, 5.75–9.34 s | Does the entrance feel natural? |

## Verification

- **PASS — nine scoped tests:** source/song preservation, no forced repeats,
  continuous speech kept whole, pause-bounded excerpt selection, guarded vocal
  gaps, no final-outro insertion, silence rejection, unchanged fallback,
  deterministic assembly, provenance, consent and studio status.
  [Test log](evidence/gentle-singer/tests.log).
- **PASS — six actual audio comparisons:** four candidates and two explicit
  unchanged fallbacks; exact music hashes and PCM outside sample events,
  bounded source reconstruction error, finite/unclipped output and matched
  loudness. [Measurements](evidence/gentle-singer/audio.json),
  [replay check](evidence/gentle-singer/check-audio.py).
- **PASS — review playback:** Chromium and WebKit, twelve 30-second players,
  muted playback/seek/exclusivity, downloads and 320/375 px layouts.
  [Browser evidence](evidence/gentle-singer/browser.json).
- **PASS — actual studio generation:** A fresh Reggae reply ran from browser
  upload through local lyric/song generation, separation and assembly. The model
  did not provide a suitable gap despite the prompt; the song was returned
  byte-identical with explicit no-sample status. Consent, playback, seeking and
  narrow layouts pass. [Browser check](evidence/gentle-singer/studio-browser.json),
  [render receipt](evidence/gentle-singer/studio-render.json). Existing Gradio
  waveform-reload abort warnings remain recorded separately from errors.
- **NOT RUN — musical acceptance of this replacement:** the owner has not yet
  auditioned it. Low estimated vocal energy does not prove a natural musical gap;
  separator bleed, instrumental leads and unverified speech boundaries remain
  limitations. Pause-based crops do not understand the words. A lack of a useful
  crop keeps the complete source candidate or declines insertion.
- **NOT RUN — publication, physical and formal quality qualification:** unchanged.

Reproduce the private comparison with the existing pinned environment and renders:

```sh
.venv-singer/bin/python scripts/prepare_singer_review.py \
  --plan renders/integrated-singer-audition-20261022/plan.json \
  --results renders/integrated-singer-audition-20261022 \
  --source renders/voice-20261017-221411/source-pcm.wav \
  --score renders/voice-20261017-221411/remix.hiphop.score.json \
  --output /fresh/private-output --consent
```

Run the updated studio at <http://127.0.0.1:4198/> with
`.venv-singer/bin/python scripts/singer_studio.py`.
