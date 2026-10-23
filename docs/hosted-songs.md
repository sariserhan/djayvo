# Hosted songs and credits — 2026-10-23

**PARTIAL overall.** Website dispatch, durable recovery, private/public storage and
credit billing are implemented and locally verified. A real eight-request trial
completed six songs and refunded the two failures. The subsequent repair retest
passed both jazz requests; Spanish reliability and musical acceptance remain open.
The repaired worker was published with owner approval. No website push/deploy,
production migration or live credit charge was performed.

| Requested work | Status | Evidence / remaining boundary |
| --- | --- | --- |
| Website Music DNA and Improvise generation | PASS, implementation/local browser and real provider integration | Authenticated asynchronous jobs; refresh/reconnect/cancel; verified R2 output before settlement. Hosted HTTP deployment smoke test NOT RUN. |
| Credits and Stripe checkout | PASS, Stripe TEST and real Postgres | Actual hosted Checkout, decline, signed/duplicate webhooks, owner isolation, refund hold; real trial reservations and failure refunds. Live credit purchases disabled. |
| Concurrent queue, timing, cost | PASS, bounded trial | Eight requests, max two workers; six completed, two failed; cleanup verified. Final endpoint-hour receipt $0.24520468 includes preparation. Subsequent repair retest bill is pending. |
| Genre/language quality and source placement | PARTIAL | Rock/Turkish/Russian DNA completed; all three Improvise placements technically passed. Repair retest: two jazz passes, one Spanish rejection and one cancellation. Listening and native-language acceptance NOT RUN. |

## Product behavior

- Music DNA submits the exact favorite snapshot, genre direction and selected or
  inferred language. Improvise accepts a recording, style and singer; the browser
  converts it to bounded mono PCM only after permission/confirmation. No autoplay.
- Both ask for public/private sharing and a credit quote before submission. Owner
  starting prices remain 1 public / 2 private; a higher cost-based quote requires
  another explicit confirmation. Browser retries retain the same request ID.
- Queue and composition messages follow provider status. A late or lost submit
  response is reconciled, never blindly sent again. Cancellation survives an
  in-flight submission and refresh. Account lookup restores active jobs on another
  device; the cron route continues recovery after the browser closes.
- A database lease prevents overlapping workers from dispatching the same song.
  Dispatch intent is saved before the external POST. Ambiguous submissions remain
  reserved until their deadline/grace period and a quiet provider queue; they are
  never automatically regenerated. Sweeps rotate jobs, including ambiguous ones.
- Completed receipts survive network/storage interruption. The app verifies the
  WAV size, duration, hash and style binding, saves the final R2 object, verifies
  it again, then settles credits. Persistent delivery failures expire and refund.
  Cancellation arriving after completed settlement cannot undo the provider work;
  completed public songs can instead be withdrawn.
- Source/staging files are removed after terminal processing; abandoned grants
  expire. Final files use `music-dna/public`, `music-dna/private`, `improvise/public`
  and `improvise/private` prefixes inside the private `jamloom-audio` bucket.
  Database permissions control signed playback. Private favorites, country hints
  and owner identity do not enter public song responses.
- Music DNA feedback is durable per account, with separate personalization and
  training consent and individual/bulk withdrawal. Only song owners can consent
  to training. Personalization supplies up to 12 matching recent ratings to the
  prepared worker. **Hosted feedback-to-training ingestion is not implemented;
  collecting consent does not mean the model has been trained.** The earlier
  local research trainer remains separate and requires eligible reviewed songs.

## Real bounded trial

Owner approved “Approve the $3 trial”: $3 maximum, two workers, 20 minutes,
eight intended songs, public metadata and synthetic speech, unchanged pinned image.
The [proposal](evidence/hosted-songs/trial-proposal.json),
[final run](evidence/hosted-songs/trial-result.json) and
[provider receipts](evidence/hosted-songs/provider-receipts.json) retain the evidence.

| Request | Result | Queue/delay | Execution |
| --- | --- | ---: | ---: |
| English jazz DNA | FAIL; full refund | 116.3 s | 73.5 s |
| English rock DNA | PASS, technical | 52.8 s | 62.4 s |
| Spanish Latin DNA | FAIL; full refund | 190.8 s | 72.5 s |
| Turkish DNA | PASS, technical | 277.2 s | 70.2 s |
| Russian DNA | PASS, technical | 264.3 s | 48.4 s |
| Funk Improvise | PASS, technical | 213.9 s | 62.3 s |
| Reggae Improvise | PASS, technical | 348.4 s | 57.9 s |
| Jazz Improvise | PASS, technical | 313.7 s | 44.6 s |

The first successful song was retrieved about 2.7 minutes after enabling workers;
the last about 7.5 minutes. This was an eight-request burst, not a promise of warm
single-user latency. All final reserved balances were zero. The test used seeded
sandbox credits and a deliberately conservative rate ceiling; it does not establish
the final customer price or a per-song provider bill.

Two interrupted preparations are retained, not counted as successful generation:
[startup stop](evidence/hosted-songs/trial-startup-stop.json) after an overlapping
worker-health count was misread, and [cancelled queue](evidence/hosted-songs/trial-cancellation.json)
after report serialization failed. Those issues were fixed before the final run.
Combined enabled time stayed below the approved 20 minutes. A separate watchdog
enforced shutdown. Endpoint min/max are zero; active workers and queued/running
jobs are zero; temporary R2 objects and the disposable database were removed.
Local audio remains in `build-hosted-song-trial/final/` for review, not publication.

The final 06:00 UTC billing bucket has now arrived: $0.24520468 and 581.063 billed
seconds for the endpoint-hour including preparation. This supersedes earlier
missing/partial receipts. `estimated_cost_micros` remains a conservative application
estimate, not actual charged cost. This receipt establishes bounded hourly spend,
not an exact per-song bill. [Readback](evidence/song-generation-repair/trial-result.json).

## Quality findings

**Update — 2026-10-23:** [The repair investigation](song-generation-repair.md)
adds bounded captions, lower-memory checking, interruption recovery and durable
safe failure reasons. The repaired worker is published and pinned. The approved
$2 retest completed: two jazz passes, one Spanish style rejection and one Spanish
cancellation at the time bound. All reserved credits were released or settled,
workers are off and temporary storage is cleaned. Spanish reliability and human
acceptance remain open; the retest's final bill is pending. Website not deployed.

The previous cloud image reported `fit@unavailable` for jazz and Spanish DNA.
It did not provide enough detail to establish whether the fit process crashed or
rejected the audio. The published worker now reports safe stage/exit diagnostics
without exposing lyrics, recordings, signed URLs or exception messages.

Local jazz experiments also failed the unchanged audio screen. A shorter retry
brief, explicit walking bass/ride swing and a tag-based experiment did not establish
a reliable fix. Do not lower the threshold or call the issue solved. The production
retry now changes the musical brief, rather than only changing its seed; contradictory
BPM instructions are rejected. These changes are locally tested and included in
the repaired pinned cloud image. [Quality summary](evidence/hosted-songs/quality.json).

Three real Improvise songs used the source at different positions: funk replaced a
short vocal region; reggae and jazz used existing gaps. Singing timing did not move;
28.03/29.12/29.12 seconds remained untouched, with zero PCM error outside the edited
region and approximately one 16-bit quantization step of source error. This verifies
placement mechanics, not whether the edits sound good. Human listening remains NOT RUN.

## Verification

- 71 site tests, 33 real-Postgres wallet/queue/cloud tests, 21 planner/worker Python
  tests, TypeScript, production build and bundle-secret audit PASS.
- Chromium and WebKit: upload conversion, public permission, higher-price approval,
  refresh, disconnection, cancellation during submission, private output, responsive
  layouts and scoped accessibility PASS. DNA lost-response/early-404 recovery and
  cancellation across refresh also PASS. Transport fixtures do not claim real GPU UI.
- Real R2 browser upload, range fetch, decode, denied foreign origin, expiry,
  tamper rejection and verified deletion PASS in Chromium/WebKit. Only the HTML
  shell was intercepted; storage traffic reached Cloudflare.
- Real Stripe TEST hosted Checkout and signed webhook verification PASS. No live
  funds moved. [Stripe report](evidence/hosted-songs/stripe-test.json).
- Logs and receipts are in [evidence/hosted-songs](evidence/hosted-songs/).

## Owner-controlled deployment checklist — NOT RUN

1. Resolve the jazz/Spanish failures and review representative musical/language
   output before calling the product ready. Publishing these local worker changes
   and another paid trial require their own authorized release/run scope.
2. Apply reviewed migration `0018_hosted_songs.sql` through the migration workflow.
   It has been tested only against disposable local Postgres. Existing production
   migration evidence still ends at 0017.
3. Release a new pinned worker image including the shared planner retry and feedback
   payload support, then configure the endpoint and bounded max-worker policy.
   The current endpoint remains disabled and its image is unchanged.
4. Set server-only Runpod/R2 credentials, a reviewed conservative
   `JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND`, daily cap, live credit mode and cron secret.
   `JAMLOOM_CLOUD_SONGS_ENABLED` and `JAMLOOM_CREDIT_PURCHASES_ENABLED` default false.
   Hosted generation refuses test credit mode. Confirm every-minute cron support and
   `/api/song-jobs` authorization; verify R2 CORS for the final deployed hostname.
5. Configure the separate live song-credit webhook at `/api/payments/stripe` for
   completed/asynchronous-success checkout, refunds and disputes. Keep Academy/Pro
   secrets and metadata distinct. The owner selected `txcd_10000000` on 2026-10-23;
   local config and the production environment reference contain that category.
   Live purchases remain disabled. A Stripe category setting alone is not a tax
   registration or a live payment verification.
6. Owner deploys the website, then run hosted authenticated submission, closed-tab
   recovery, private/public playback and live-mode configuration smoke checks before
   enabling purchases/generation. Do not infer production success from these local
   or sandbox results.
