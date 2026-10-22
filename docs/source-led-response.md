# Source-led musical conversation study — 2026-10-22

The owner reconsidered meaning-only songs and authorized one short performance
built around a recognizable user phrase, before changing the whole studio.
This study uses the existing permitted recording and a new reggae composition.
The ordinary 23-style studio remains available; this is a separate local audition.
The earlier meaning-first workflow and its listening evidence are preserved.

## What actually changes

The previous workflow sent only text to the song generator and inserted source
audio afterward. Here the actual recording reaches the music model **before**
composition. `source_led_response.py prepare` selects the complete phrase,
keeps the original, and places two calls in a 30-second guide. Quiet procedural
percussion gives the model timing cues; that percussion is not used in the final
mix. The chosen 1.96-second phrase spans three beats at 91.84 BPM without changing
its pitch or speed. This is a manually selected, ASR-assisted crop and a fixed
study arrangement, not automatic understanding of musical prosody.

The pinned ACE-Step runtime runs its existing audio-conditioned `cover` task:

1. Generate a reggae band using the actual phrase guide as source audio.
2. Estimate/remove vocals from that band and add the original calls to a second
   guide. Generate a natural male singer answering the phrase, conditioned on
   that backing and those calls. The two short replies are authored for this
   study; the existing lyric planner is not retrained or evaluated here.
3. Separate the generated singer, select complete estimated vocal phrases, and
   place them in the response windows. Keep the backing continuous and the
   original voice at its natural speed. Separate source, reply and music stems
   make the scheduled turns explicit. Reject a trial if complete phrases cannot
   fit; do not quietly return a song without the source.

The general singing wrapper has one optional private conditioning argument. Its
ordinary text-to-music callers retain their existing behavior. Conditioning is
bounded and hash-checked, and the pinned model/runtime checks still run. Existing
outputs are protected; incomplete jobs retain a `.partial` marker.

## Reproduce locally

Use `.venv-singer` and the already pinned runtime. Raw recordings, transcripts,
lyrics, model logs and renders stay under ignored `renders/`.

```sh
.venv-singer/bin/python scripts/source_led_response.py prepare \
  --source renders/source-led-input-20261022/source.wav \
  --work renders/source-led-response-20261022 \
  --start 1.94 --end 3.90 --phrase 'I have a question' --consent
.venv-singer/bin/python scripts/singing_response.py sing \
  --runtime build-style-training/upstream \
  --plan renders/source-led-response-20261022/plan.json \
  --output renders/source-led-response-20261022/band --case reggae-male \
  --conditioning renders/source-led-response-20261022/band-conditioning.json
.venv-singer/bin/python scripts/separate_singer.py \
  --input renders/source-led-response-20261022/band/singer.wav \
  --output renders/source-led-response-20261022/band/stems
.venv-singer/bin/python scripts/source_led_response.py answer-guide \
  --work renders/source-led-response-20261022
.venv-singer/bin/python scripts/singing_response.py sing \
  --runtime build-style-training/upstream \
  --plan renders/source-led-response-20261022/plan.json \
  --output renders/source-led-response-20261022/singer --case reggae-male \
  --conditioning renders/source-led-response-20261022/singer-conditioning.json
.venv-singer/bin/python scripts/separate_singer.py \
  --input renders/source-led-response-20261022/singer/singer.wav \
  --output renders/source-led-response-20261022/singer/stems
.venv-singer/bin/python scripts/source_led_response.py assemble \
  --work renders/source-led-response-20261022
.venv-singer/bin/python scripts/source_led_response.py review \
  --work renders/source-led-response-20261022 \
  --previous renders/meaning-singer-review-20261022/review
node scripts/serve_singer_review.mjs renders/source-led-response-20261022/review
```

These commands preserve existing files: use a new work directory for a repeat and
update the later paths. The browser page has the conversation, the same
arrangement without the user, and the selected original phrase, with matched
loudness, downloads and a link to the earlier style comparisons.

## Limits

Source conditioning is confirmed execution, not proof that the generated groove
follows every syllable or that the model has learned improvisation. The final turns follow the estimated drum pulse when confident; its bar phase
is not a verified downbeat. Stem separation can leave voice/instrument
bleed. Quiet boundaries are estimates, not verified word alignment; moving a sung
phrase can change its relationship to the harmony. The second pass contains sparse short answers; diagnostic ASR did not establish delivery of all four intended lyric lines. No pitch or time stretching
is applied to the user or singer. The fixed two-turn arrangement needs listening
before broader automation, more styles or a studio-default change.

Human musical acceptance, transcription/lyric accuracy, naturalness and
improvement over the earlier songs remain **NOT RUN**. No training, model
promotion, new dependency, paid compute, upload, publication or iOS change.

## Retained failure

The first singer pass at 0.45 source influence produced only one 1.61-second
vocal-energy segment and no recognized speech in the diagnostic ASR. Assembly
rejected it because two complete answers could not fit. Its generated audio and
receipts remain in `singer-no-reply/`; no listening candidate was published from
that pass. The next pass uses 0.20 influence and four short authored lyric lines.
This is a bounded local model experiment, not evidence that every source works.

## Current evidence

Listen at <http://127.0.0.1:4197/>. Earlier comparisons remain linked on the page.
Private files are in `renders/source-led-response-20261022/`.

- **PASS — actual local renders and assembly:** two model passes for the accepted
  band/singer path, plus the retained rejected singer pass. 30-second stereo PCM,
  two original-voice calls at 2.80 and 13.22 seconds, no scheduled voice overlap,
  no source time/pitch change, source reconstruction within half a PCM16 step,
  and peak 0.762 before audition loudness matching.
  [Sanitized render receipt](evidence/source-led-response/render.json).
- **PASS — 16 scoped tests:** four new source/conditioning/phrase/assembly tests
  and twelve existing singer/studio/assembler regressions.
  [New tests](evidence/source-led-response/tests.log),
  [regressions](evidence/source-led-response/singer-regression.log).
- **PASS — browser audition:** Chromium and WebKit playback, seeking, exclusive
  playback, HTTP 206 downloads, mobile layouts, no autoplay and all twelve
  earlier comparison players pass. [Browser receipt](evidence/source-led-response/browser.json).
- **PARTIAL — generated vocal content:** two estimated complete vocal phrases fit
  the planned responses. Diagnostic ASR recognized some response words, but not
  all intended lyrics. That is not a listening judgment or proof of naturalness.
- **NOT RUN — musical acceptance and generalization:** one manually prepared
  example, no claim of a trained improviser, no studio-default promotion.
