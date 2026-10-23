# Hosted songs follow-through — 2026-10-23

**PARTIAL overall.** The owner requested every remaining Music DNA / Improvise
item except website deployment, and explicitly authorized necessary migrations
without per-migration confirmation. Listening remains deferred. No real ratings
or musical acceptance were invented.

## Database and release configuration

**PASS:** Production migration `0018_hosted_songs.sql` applied on the existing
Neon target. All 17 prior hashes matched; an encrypted-transport dump was saved
in ignored mode-0600 local storage and restored into a disposable PostgreSQL 18
instance before applying. Repeat application was a no-op and song counts were
unchanged. The default local PostgreSQL 16 tools initially failed against server
18; no production write occurred during those failures. The temporary PostgreSQL
18 server was stopped. [Migration receipt](evidence/song-finish/migration.json).

**PASS, prepared:** Production Vercel now has the endpoint ID, conservative
1000-micros/second allowance, $20 daily application cap, live credit mode, approved
`txcd_10000000`, and the separate credit webhook secret. Generation and purchase
flags remain **false**. Existing Runpod/R2/auth/cron keys were preserved.
The Stripe song-credit webhook is separate from Academy/Pro, has the five
required checkout/refund/dispute events, and is **disabled**. No charge occurred.
[Configuration](evidence/song-finish/production-config.json),
[billing preparation](evidence/song-finish/billing-preparation.json).

Production R2 preflight allows both Jamloom origins, rejects a foreign origin,
and a real signed range read returned 206 and 44 bytes. The Vercel team is Pro;
the repository already schedules `/api/song-jobs` once per minute. These checks
are not proof of deployed execution. [R2](evidence/song-finish/r2-cors.json),
[plan](evidence/song-finish/cron-plan.json).

## Hosted feedback to research training

**PASS, implementation and tests:** `hostedTrainingSnapshot` reads live completed
Music DNA songs with owner consent version 1, positive feedback, matching saved
plan and provider audio/style receipts. Suspended, withdrawn, sandbox,
non-owner, negative, changed or unconsented records cannot enter training.
Favorite names and account identifiers are replaced by a normalized favorite-list
fingerprint; only generated planning fields enter the local private snapshot.
The existing text-planner trainer validates plans, deduplicates audio, and keeps
favorite-list groups out of both training and holdout. No reference audio is used.

The operator command keeps consent synchronized every five seconds while the
research process runs. Snapshots expire after twenty seconds; withdrawal or a
failed database refresh stops training and blocks/removes affected candidates.
It creates review candidates only; no serving model is replaced automatically.

From `apps/site`, with Node 22 and the existing private database credentials:

```sh
node --import tsx scripts/train-hosted-feedback.ts
# Run a bounded local candidate only when enough real eligible feedback exists:
node --import tsx scripts/train-hosted-feedback.ts --train
```

**NOT RUN, learned improvement:** The real production collector found **zero**
eligible ratings. The existing minimum remains 24 positive distinct songs,
six favorite-list groups, three genre families and two languages, with at least
16 training and four held-out songs. The importer is operator-run, not an
always-on training service. Synthetic test ratings never count toward evidence.

## Startup recovery

**PASS, local guard:** The dispatcher reads actual provider capacity before
recording a paid submission intent. Disabled capacity stays queued without a
POST; enabling capacity submits once under concurrent polling. Cancellation and
expiry refund, and lost POST responses still cannot trigger automatic duplicate
paid work. Control API failures retain the local request for retry.

The owner approved a separate **$1 / one-worker / twelve-minute / one-song**
startup test. [Proposal/approval](evidence/song-finish/startup/proposal.json).
**PASS, generation after correction; PARTIAL, fresh-activation recovery:** The test
ran 08:00:54–08:11:15 UTC (10 minutes 21 seconds). The initial POST returned HTTP
409, without a provider ID or any queued job. After confirming unchanged counters
and an empty queue, one controlled diagnostic retry of the same request was
accepted. Minimum workers remained zero throughout; no manual prewarming occurred.

The accepted job remained queued under `QUEUE_DELAY`. Within the original
one-worker/time/spend bound, scaling changed to `REQUEST_COUNT` with threshold 1.
A worker then initialized and processed the original accepted request. The final
120-second English heavy-rock song passed all four style windows, with 80.658
seconds execution and 353.811 seconds provider queue delay. Its local WAV hash,
format and peak match the provider receipt. The downloaded song is retained in
`build-song-finish/startup/startup.wav`.

Request-count scaling is retained in the endpoint and setup script. Endpoint
minimum/maximum are back to 0/0; all worker counters and queued/running jobs are
zero. Two temporary object keys were removed and the disposable database dropped.
The test settled two credits and left zero reserved. The independent shutdown
watchdog was active through cleanup. No second song or extra paid run was started.
[Trial](evidence/song-finish/startup/trial-result.json),
[reconciliation](evidence/song-finish/startup/reconciliation.json),
[scaling correction](evidence/song-finish/startup/scaling.json),
[provider receipt](evidence/song-finish/startup/final-receipt.json),
[download](evidence/song-finish/startup/download.json).

The controlled retry is not proof of automatic recovery from every HTTP 409.
At release, enable bounded endpoint capacity before opening the website's
creation flag, and allow configuration propagation. Unknown POST outcomes remain
held rather than risking duplicate paid work. A first-try activation test after
this scaling change has not been run.

**PASS, expiry regression:** A missing provider receipt (HTTP 404) can no longer
hold credits forever after TTL expiry. Refund/cleanup require both the full
provider lifespan plus a safety interval and an empty provider queue. A local
application deadline alone is insufficient; active or uncertain work is retained.
The real-Postgres test verifies these boundaries.

## Spanish and quality checks

**CORRECTED, local proposed arrangement evidence:** The earlier two reported
fixed-seed Latin renders were the same audio: the research harness changed a
field the singer did not read. They establish one unique failed take, not two
independent trials. The tracked harness now changes and verifies the actual case
seed and rejects duplicate audio. New seeds 6302303 and 6302304 produced distinct
audio and matched 1/4 and 0/4 style windows, respectively. No threshold was
relaxed and no arrangement fix was promoted. See [correction](evidence/song-validation/experiment-correction.json)
and [new results](evidence/song-validation/latin-distinct.json).

**Subsequent status:** [Local validation](music-validation.md) records a successful
first-try startup, actual owner listening reactions and the continuing broader
language/style run. Earlier deferred/not-run statements below are historical.

**NOT RUN:** Representative human genre calibration, multilingual singing/lyrics
acceptance and demonstrated improvement from real user feedback. The earlier
approved examples and two jazz screen passes do not replace these checks.
Further blind prompt rerolls cannot close this evidence gap. An eleven-sample
[review packet](evidence/song-finish/listening-packet.json) provides verified
multilingual examples, jazz controls and rejected Latin variants, with no invented
ratings. The facilitator hides settings/classifier outcomes; native-language
review and group-separated calibration remain necessary.

## Release boundaries

No website deploy or main-branch push occurred. Hosted smoke tests and enabling
the prepared Stripe webhook/purchase/generation flags remain tied to the owner's
website release. Provider bills are reported only when their final hourly
records appear. The prepared settings do not establish production traffic
capacity or musical quality.

## Final checks and provider accounting

**PASS:** 37 focused Python tests; 17 provider/setup/real-Postgres tests; 73 site
unit tests; final TypeScript check, production build and client bundle audit.
The hosted collector ran against the migrated database and reported zero eligible
ratings. Its consent expiry/withdrawal and sandbox-isolation paths pass fixtures.
No browser UI changed; prior browser evidence was not relabelled as a new run.

**PARTIAL, final bill:** Both the legacy and current provider billing APIs still
omit the 07:00 and 08:00 UTC usage buckets at the final readback. The earlier
06:00 endpoint-hour is $0.24520468 including preparation. No invented final cost
or per-song price is substituted. [Final provider audit](evidence/song-finish/provider-final.json).
To refresh the read-only receipts from `apps/site`:

```sh
node --import tsx scripts/song-provider-audit.ts
```

The remaining external gates are real musical/native-language ratings, enough
consented feedback to demonstrate improvement, delayed final billing, and the
owner-controlled website release/hosted smoke checks. Fresh activation without
manual reconciliation also remains a verification limit.
