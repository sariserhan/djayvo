# Let the idea become the song — 2026-10-22

The owner explicitly changes the product requirement: the input may inspire the
song without appearing as audio. All, part, repetitions or none are creative
possibilities; making good music takes priority over including the recording.
The owner specifically prefers the acoustic audition without the input. This
supersedes the mandatory recognizable-source requirement for this local singer
workflow. The immutable master and earlier reports remain unchanged.

## Current behavior

The studio accepts short or long recordings instead of requiring a 2–5 second
phrase. The local preview has explicit resource limits of **5 minutes / 100 MB**;
empty or undecodable files still fail clearly. The entire accepted recording is
preserved and decoded for understanding. There is no silent first-five-seconds
cut or requirement to remove quiet. Short and quiet inputs are valid.

With **Words or idea** left blank, the existing pinned Whisper tiny model reads
speech locally in the isolated speech environment. The existing lyric planner
responds to the central idea, emotion or story instead of quoting the transcript.
An optional supplied idea overrides recognition. **What inspired the song** shows
what was used so recognition mistakes can be corrected. Quiet or non-speech input
can inspire a general response without fabricated transcribed words; the UI says
when no intelligible speech was found. Recognition failure suggests supplying an
idea rather than repeatedly asking for a new recording.

Replaying the input is optional before song generation, not merely a fallback
when no gap fits. Acoustic and other melody-focused styles use the idea without
sampling. Some rhythmic styles may try one short recognized phrase, or an excerpt
from a longer recording. It still must fit the conservative gap/headroom checks;
otherwise the song stays intact. A supplied idea currently uses the meaning-only
path. Optional extraction, separation or placement failure cannot discard a
completed song. It returns the original instead.

These conservative rules are **not a trained musical taste judge**. Automatic
looping is not enabled in this revision: the owner rejected the earlier repeated
arrangement, and rhythm-grid alignment alone does not justify bringing it back.
The original audio is not mandatory; neither sampling nor a repetition count is
used as a success metric. The studio no longer tells the generator to leave a
forced four-second hole for speech.

The speech tool keeps its original no-transcript research behavior by default.
Only the explicit `--understand` mode stores a private transcript, bound to the
exact decoded source. The singer's bounded text context now accommodates longer
recordings. All transcripts, raw logs, recordings and model files remain local
and outside Git. No new dependency, model download, cloud service or training.
The existing speech setup and pinned environment are documented in
[word-timing.md](word-timing.md); optional supplied ideas work without that model.

## Listening page

<http://127.0.0.1:4197/> now serves
`renders/meaning-singer-review-20261022/review/index.html`.
The acoustic performance is exactly the original song. Earlier phrase experiments
for the other five styles remain available for comparison. The previous listening
page and recordings are preserved separately. The live studio is
<http://127.0.0.1:4198/>. Restart the private listening server with
`node scripts/serve_singer_review.mjs`; it uses the installed static-file server
for byte-range requests so seeking works. The old basic HTTP server failed a seek
check; that failure is retained in the evidence folder. [HTTP checks](evidence/meaning-singer/http.json)
cover byte ranges, directory boundaries and unsupported methods.

## Evidence and limits

- **PASS — 17 scoped tests:** short through five-minute quiet inputs, original
  preservation, optional excerpts, acoustic omission, fallback on optional sample
  failure, consent, plan validation, source arrangement and both speech-tool modes.
  [Log](evidence/meaning-singer/tests.log).
- **PASS — actual local recognition:** the retained six-second recording was
  understood locally, producing six recognized words. This is execution evidence,
  not a claim that the words were transcribed perfectly.
  [Receipt without transcript](evidence/meaning-singer/understanding.json).
- **PASS — six private listening pairs:** the acoustic performance is byte-identical
  to its original; three earlier sample candidates and two unchanged fallback
  songs remain. No earlier render was overwritten.
- **PASS — browser and actual generation:** The six-second recording completed
  automatic recognition → local lyric planning → new acoustic singing, with no
  typed words and no sampled recording. The recognized text was passed unchanged
  to the planner, and the song was preserved exactly. Both-browser listening-page
  playback and actual studio playback/seek/mobile checks pass.
  [Review checks](evidence/meaning-singer/browser.json),
  [studio checks](evidence/meaning-singer/studio-browser.json),
  [render receipt](evidence/meaning-singer/studio-render.json).
- **NOT RUN — musical acceptance, transcription accuracy across speakers/languages,
  long-speech performance at the maximum limit, and physical microphone capture.**
  Speech recognition and generation can make mistakes. No guarantee of universally
  good or non-awkward music is inferred from code or browser tests.
- **NOT RUN — publication / production promotion:** local preview only.
