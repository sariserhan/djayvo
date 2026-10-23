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
  GPU model cache is released before the conversion subprocess. The hosted qualification now passes with the same settings. Local singer conversion is enabled, and the worker template retains the qualified setting while its endpoint is disabled.

## Verification

- **PASS:** 59 focused site tests and TypeScript. Real isolated PostgreSQL tests
  cover private cached descriptions, credit reservation/refunds and billing isolation.
- **PASS:** 67 Python checks (40 DNA, 8 singer, 7 voice identity, 12 worker).
- **PASS:** Chromium desktop and WebKit mobile whole-playlist import, cancellation,
  failure preservation, saved full-list generation payload, reload and accessibility.
  The real listening page labels the exact owner-approved jazz take separately from
  automated style results. [Local checks](evidence/dna-completion/local-checks.json).
- **PARTIAL catalogue coverage:** all 182 available public playlist entries checked;
  86 unique exact matches, 95 unmatched and one repeat. Earlier recorded matching
  found 77. Primary responses were captured from the actual provider and replayed
  with the final matcher; missing fallback queries used the real API and rate limit.
  Unmatched originals stay visible for manual review, never guessed or silently lost.
  [Playlist receipt](evidence/dna-completion/playlist.json).
- **PASS local request-to-song flow:** “Rise from the Ashes,” 140 seconds, heavy rock,
  English, approved `af_nicole` identity; 776.4 seconds from quote/submit to complete.
  Three of four audio passages pass the existing style screen. The disposable TEST
  ledger settles two private-song credits once, reserves zero afterward, rejects a
  different owner and serves a byte range. This uses the real application handler,
  models and PostgreSQL, not a full browser login/payment purchase.
  [Full receipt](evidence/dna-completion/local-song.json).
- **PASS owner listening — 2026-10-23:** “Rise from the Ashes”: “Heavy rock and natural throughout.” This approves the heavy-rock fit and natural singing of this exact 140-second recording; the receipt binds the review to its audio checksum.
- **PASS sample storage:** the explicitly authorized operator sample is copied to
  public R2 and the gallery manifest; checksum and range playback verified through
  the real local public API. Website publication is still owner-controlled.
- **NOT RUN:** human listening for the two hosted songs, broad genre-checker calibration,
  and maximum-size uncached model timing. Hosted execution passes below.
  No database migration is needed for these changes.

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

## Hosted qualification — PASS

[Linux build](evidence/dna-completion/worker-build.json) and
[trial receipt](evidence/dna-completion/cloud/2026-10-23T21-51-43.738Z/trial-result.json)
pass. Only the worker branch was published; website/main remain local.

Pinned image:
`ghcr.io/sariserhan/jamloom/music-worker@sha256:83a00c568cb48f24e27811c901ac941643aee3352f2a0239c5b071120af58780`.

| Song | Duration | Singer | Execution | Provider queue | Style passages | Credits settled |
|---|---:|---|---:|---:|---:|---:|
| The Machine in the Basement | 2:20 | am_fenrir | 116.645 s | 10.041 s | 4/4 | 1 public |
| Fünf Minuten im Sonnenschein | 1:40 | af_bella | 157.985 s | 127.594 s | 3/4 | 3 private |

This was a real sequential queue with one worker. Initial image startup took
227 seconds; that prewarming is additional to the table's queue and execution
figures. Both requests used the actual application commerce/provider/storage
path with a disposable TEST ledger. Quotes reserved 4 and 5 credits respectively;
settlement released the unused reservation, leaving zero reserved. The private
price has a two-credit minimum, not a fixed two-credit cap; the actual quoted
cost policy adds a credit in this queued case. No live Stripe charge occurred.
[Song and conversion evidence](evidence/dna-completion/cloud/2026-10-23T21-51-43.738Z/songs.json).

The run ended after 9 minutes 36 seconds, below the approved 20 minutes. One
worker maximum was observed. Shutdown, empty queue, zero workers, deletion of
four temporary R2 objects and disposable-database cleanup pass. The final
provider billing entry had not posted at the verification read, so a zero
billing delta is **not** treated as free usage. The conservative trial rate
and measured duration bound usage plus the fixed per-request allowance to
approximately **$0.62**, below the approved $3; the provider invoice amount
remains pending. [Final state](evidence/dna-completion/cloud/2026-10-23T21-51-43.738Z/final-state.json).

Both original operator samples were separately published to public R2 with the
owner's standing permission, checksum and byte-range verification, and added to
`music-validation.json`. The jazz title was verified on the rendered listening
page; both public audio endpoints work. These operator publications do not expose
customer private songs. Human listening for these two hosted samples remains
unrecorded; the owner approved the separate local “Rise from the Ashes” recording above.

## Ready for the owner's release step

The local environment now enables the approved synthetic voice pool and records
the new worker image. The worker template also enables that pool. The endpoint
has **workersMin=0 and workersMax=0** after qualification; continuous paid service,
website deployment and live purchasing were not enabled by this bounded trial.
Use the existing hosted-release checklist when the owner chooses to launch.
Spotify remains deferred; SoundCloud requires paid access and remains deferred.
Broad classifier calibration and all-language pronunciation are not proven by
these successful examples. The earlier owner-feedback model remains research-only.
