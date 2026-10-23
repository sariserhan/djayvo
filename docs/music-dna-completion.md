# Music DNA completion work — 2026-10-23

Owner scope: finish the remaining Music DNA work; Spotify will be supplied later.
SoundCloud stays deferred if paid access is necessary. Website deployment remains
owner-controlled. The owner subsequently approved the worker update and a $3, one-worker, 20-minute, two-song hosted test.

## Changes

- Playlist matching searches up to 100 song candidates rather than the eight
  autocomplete tracks. Provider budget, caching/coalescing, cancellation and
  atomic saving remain. Video boilerplate and VEVO suffixes are normalized.
  Omitted guest credits can match only an exact primary artist/title with one
  unambiguous full catalogue identity. Remixes, live versions, different artists
  and conflicting catalogue genres still need review.
- The website's 128 KB Runpod submission limit was inconsistent with large-list
  support. Requests now respect the documented 10 MB asynchronous API limit,
  including its envelope. The worker result budget now permits whole-playlist plans (12 MiB bounded result inside the client's 16 MiB response limit). Owner-private cached descriptions are capped at 4 MiB
  to leave room for the full profile; no favorites are removed. New worker build
  checks caught the missing `dna_sound.py` Docker-context allowlist entry.
- Authoritative genre/instrument fields are filled by the application, rather
  than failing when the writer rephrases them. Tempo, forbidden positive style
  instructions, lyrics and audio checks remain. Explicit complete negative
  clauses such as “No ambient textures” are removed from production prompts;
  positive or mixed clauses are still validated and rejected when incompatible.
- An exact-audio human review can correct an automated style verdict. The owner's
  explicit German jazz review is bound to its existing SHA-256 and jazz target.
  Original model scores and `automated_accepted=false` remain visible in evidence.
  Different audio or another genre cannot inherit this decision. This resolves
  the known recording's verdict, not general classifier calibration. A fresh
  experiment using the original official music CLAP runtime also misclassified
  this recording; it is not promoted and thresholds are unchanged.
- The four approved synthetic singer identities now have portable, checksum-bound
  six-second references. Approved female and full-song male excerpts are byte
  identical to their audition receipts. CUDA can explicitly opt into the same
  conversion path. The worker recipe includes isolated pinned conversion
  dependencies, original GPL source/license and verified model downloads.
  GPU model cache is released before the conversion subprocess. Activation still
  requires the prepared hosted qualification; no shipping switch is enabled.

## Verification

IN PROGRESS: actual whole-playlist rescan, local request-to-song/TEST-ledger
rehearsal, browser regressions and final scoped checks. Evidence will be updated
when those runs finish. No new database migration is needed.

## Approved hosted qualification

`apps/site/scripts/cloud-song-trial.ts --dna-completion` is dry-run by default.
The owner approved this exact test. Publish the reviewed worker through the existing GitHub image
workflow; use its immutable digest on the disabled Jamloom endpoint and enable
`JAMLOOM_VOCAL_IDENTITY_ENABLED=true` for this trial.

- Maximum **$3**, **one worker**, **20 minutes**, **two song requests**.
- English metal (140 seconds) and German jazz (100 seconds), using public track
  names/catalogue genres and Jamloom's original synthetic reference assets.
- Existing disposable PostgreSQL TEST ledger and R2 temporary storage.
- Verify real plan/audio/style receipts, duration, identity conversion, wait and
  execution times, credits/refunds, storage checksums and cleanup.
- Independent shutdown watchdog; cancel outstanding jobs, set worker bounds to
  zero, verify termination and remove temporary objects. Preserve local results.
- No website deployment, live checkout activation or customer charge.

The full Linux image/CUDA execution cannot be certified by Mac tests or dependency
resolution. Maximum-size uncached model timing and broad language/genre accuracy
remain separate limits; every catalogue entry contributes to genre votes, but
model interpretations are not measurements of the original audio.

## Connections

Spotify remains deferred by the owner. SoundCloud's current official API guide
requires an Artist Pro subscription to obtain an API key, so it remains deferred
under the owner's condition. No scraping or unofficial credential workaround.
Sources checked 2026-10-23 (Context7 tools unavailable):
[SoundCloud API guide](https://developers.soundcloud.com/docs/api/guide),
[Runpod operation limits](https://docs.runpod.io/serverless/endpoints/operation-reference),
[official CLAP usage](https://github.com/LAION-AI/CLAP).
