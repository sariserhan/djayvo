# Direct singer identity research — 2026-10-23

**PARTIAL: research audition, not normal generation.** The owner accepted the
original female/male reference pair as natural and different, but rejected four
further reference auditions as two repeated pairs. Removing accompaniment from
the male references also failed distinctness. Those failures remain recorded;
only the original pair is selectable in the local generator.

## Different method

This trial uses [Seed-VC's singing conversion model](https://github.com/Plachtaa/seed-vc)
to change the voice of one existing, synthetic 30-second disco vocal. Its pitch
conditioning stays on, automatic pitch adjustment stays off, semitone shift is
zero, and length adjustment is 1. Thirty diffusion steps and the documented
half-precision inference mode are used. This is voice conversion, not training.

Three original spoken references were synthesized locally with stock
[Kokoro voices](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md):
`am_michael`, `am_fenrir` and `am_puck`. These references supply vocal character;
the existing sung melody and words are the source performance. No customer
recordings or favorite-track audio are used as target voices.

The source is the unconditioned synthetic disco render already preserved in
`renders/music-validation-20261023/improvise-disco/`. Its original generation
receipt and the pinned separator's vocal stem are checked before use. Converted
vocals are resampled to 48 kHz, aligned to the original 30-second duration,
matched to the source vocal RMS and mixed over the same estimated backing.
The mix receipt records backing checksum, vocal gain, master trim and frame
adjustment. Separation can leave vocal or instrumental bleed; naturalness and
recognizable voice differences need listening.

## Execution and reproducibility

- Runtime: isolated `.venv-vocal-identity`, separate from the working singer environment.
- Seed-VC source: `51383efd921027683c89e5348211d93ff12ac2a8`.
- [Model revisions, hashes and declared licenses](evidence/song-validation/vocal-identity-models.json).
- Local sources, target receipts, conversion settings, environment freeze,
  preparation/conversion/publication scripts and outputs: `renders/voice-identity/`.
- Model inference is offline after the pinned public downloads. No paid compute,
  source uploads, hosted worker change or website deployment.

The first Mac attempt failed because the pitch extractor returned float64,
which MPS cannot transfer. The wrapper converts that array to float32. The
float32 diffusion attempt then ran into memory pressure and was stopped before
output; the replacement uses the model's documented fp16 mode. Soundfile writes
the output WAV instead of adding an unrelated codec runtime. Original failure
logs remain in `build-song-finish/identity-conversion-*.log`.

The upstream loader also reports skipped alternate output-layer checkpoint keys
and its positional buffer; this is retained in the log, not hidden. The active
configuration uses the MLP output head. This is a bounded compatibility trial,
not a production qualification of the new engine.

## Release boundary

Seed-VC code/weights declare GPL-3.0; the downloaded research runtime and models
are not added to a shipping worker image. Each completed comparison is published
through the existing explicit operator flow only after full R2 checksum and
range verification. Website deployment stays owner-controlled. No stock voice
count or acoustic metric is treated as an accepted singer count.


## Completed comparison

**PASS, local technical execution and R2 storage.** Three complete 30-second
conversions ran on MPS in 170.5, 136.0 and 142.0 seconds after model loading.
They use distinct target and output checksums, the same backing checksum and
identical pitch/length settings. Resampling required 548 zero frames at the
ending (11.4 ms), within the checked 100 ms limit. Vocal gains and master trims
are recorded rather than hidden.

The gallery titles are **Disco · voice identity 1**, **2** and **3**.
[Conversion, mix and publication receipts](evidence/song-validation/vocal-identity-comparisons.json).
**Listening: NOT RUN.** These three candidates remain outside normal generation
until their naturalness and distinctness are accepted. This experiment does not
establish language/genre coverage or a broad production voice pool.

All three comparisons passed muted mobile Chromium/WebKit playback and seeking,
with no page errors. [Browser receipt](evidence/song-validation/vocal-identity-browser.json).
