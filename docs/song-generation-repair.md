# Jazz / Spanish generation investigation — 2026-10-23

**PASS, reliability repairs and worker publication; PARTIAL, generation reliability and musical acceptance.**
The previous cloud failures did not retain enough evidence to identify their exact
cause. This increment repairs confirmed prompt/reporting problems and completes
the approved bounded cloud reproduction. Both jazz requests passed; Spanish
reliability remains unresolved.

## Confirmed problems and changes

- Generated singer captions were approximately 1,200–1,500 characters. The pinned
  [ACE-Step inference contract](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/INFERENCE.md)
  recommends at most 512; its text encoder also truncates input. Both takes now
  put genre, tempo, instruments, vocal language and voice first and keep the
  caption below 512 characters. Full production notes remain in the saved plan.
- The audio checker now processes one passage at a time, reducing activation
  memory. A real batch-versus-serial comparison changed scores by at most
  `0.0000005365`. Thresholds and required matching windows are unchanged.
- A killed or timed-out checker gets one retry on the **same rendered audio**.
  Invalid audio or evidence is not retried. A genuine style rejection retains
  the existing two-take limit. Per-attempt diagnostics survive locally.
- Worker failures distinguish style rejection/window count, checker exit or
  timeout, and overall timeout. The website stores only an allowlisted static
  reason in the job receipt; private error text, lyrics and signed URLs are
  discarded. Failure still releases all reserved credits.

The original cloud `fit@unavailable` messages cannot retrospectively prove an
out-of-memory error, a bad song, or a Spanish-language limitation. The reduced
memory and retry changes address plausible infrastructure failures. The cloud
retest below now distinguishes an actual style rejection from a checker crash.

## Local musical experiments

The same public favorite metadata used in the failed trial was reused:
Feeling Good — Nina Simone / Jazz / English, and La Bicicleta — Carlos Vives /
Latin / Spanish. These are metadata inputs, not sampled recordings. New fixed
seeds are `6302301` and `6302302`. Existing lyrics and plans are held constant
within the rendering comparisons.

| Local variant | Jazz matching passages | Spanish Latin matching passages |
|---|---:|---:|
| Short caption, original shift 1 | 1/4 — FAIL | 2/4 — FAIL |
| Short caption, shift 3 | 2/4 — FAIL | 1/4 — FAIL |
| Focused retry caption, shift 3 | 2/4 — FAIL | 0/4 — FAIL |
| Short caption, shift 3 + semantic planner | 2/4 — FAIL | 0/4 — FAIL |

The recommended Turbo shift of 3 and optional semantic music planner were tested
locally. They are research comparisons, not accepted production changes. The
product retains its original rendering setting and disabled semantic planner.
The first PyTorch/MPS planner attempt was stopped under severe memory pressure;
the Apple Silicon MLX retry completed inference. No new model was downloaded.

See the [local evaluation](evidence/song-generation-repair/local-evaluation.json)
for individual take results, exact input/plan/audio hashes and settings. These
are broad style-screen results, **not listening judgments**. Local audio and raw
logs remain under `build-song-repair/`; these local experiment songs were not
uploaded or published.

## Calibration boundary

`scripts/evaluate_dna_screen.py` reproducibly checks the ten existing cleared
practice tracks, verifies their hashes and records four distinct passages per
track. These are publisher-labelled, often instrumental or hybrid recordings;
they are **not** a representative, listener-labelled vocal-song calibration set.
The report must not be interpreted as a false-rejection rate or musical-quality
score. Threshold calibration and human musical/language acceptance remain
**NOT RUN**. Listening remains deferred as the owner requested.
The [reference report](evidence/song-generation-repair/catalogue-screen.json)
completed all ten tracks; four passed their single assigned target, including
the jazz reference. The other six include hybrids and instrumental tracks; this
is a limitation signal, not six proven false rejections.

An existing Spanish vocal render passes the unchanged screen at 3/4 passages;
an earlier jazz render still fails at 2/4. This supports neither a blanket
Spanish failure claim nor a blanket jazz fix. Evidence:
[Spanish control](evidence/song-generation-repair/spanish-existing-screen.json),
[jazz control](evidence/song-generation-repair/jazz-existing-screen.json),
[batch equivalence](evidence/song-generation-repair/batch-equivalence.json).

## Verification

- **PASS:** 36 focused Python tests, including all 25 genre families and all 50
  language choices in first/retry caption budgets; interruptions, invalid audio,
  bounded retries, worker timeout and privacy checks.
- **PASS:** 71 site unit tests; 12 provider/real-Postgres tests including retained
  failure reasons and full refunds; TypeScript check.
- **PASS:** The standard-library CI lanes: 23 DNA tests and 8 worker tests. One
  audio-array test is explicitly skipped without NumPy/Torch; it passed in the
  inference environment above.
- **PASS:** Four-request cloud retest dry run and conservative budget assertions.
- **PASS:** Published Linux worker CI, pinned model hashes and real GPU execution.
- **NOT RUN:** Website deployment, musical/native-language listening or model promotion.

The [prepared cloud proposal](evidence/song-generation-repair/cloud-proposal.json)
allows at most $2, one worker, 15 minutes and four requests: two jazz and two
Spanish Latin. It uses the existing isolated-database/Stripe-TEST harness,
requires an exact reviewed image digest, has an independent shutdown watchdog,
and removes temporary R2 objects. Worker publication uses `codex/runpod-setup`,
which is explicitly excluded from website deployment in `apps/site/vercel.json`.
The endpoint-bound template read uses the documented option in Runpod's
[official REST schema](https://raw.githubusercontent.com/runpod/docs/main/api-reference/openapi.json)
and was verified read-only against the existing pinned image. Context7 was not
available in this session, so the official schema was consulted directly.

## Approved cloud retest — completed

The owner approved the worker update and $2 / one-worker / 15-minute /
four-request retest. Only `codex/runpod-setup` was pushed; main and the website
were not deployed. [Worker build](evidence/song-generation-repair/worker-build.json)
records commit `d4bcf0741c9933c42c25aa21ff99c3b950e7e63e` and the
[successful Linux workflow](https://github.com/sariserhan/jamloom/actions/runs/39915983592).
The endpoint template now pins:

`ghcr.io/sariserhan/jamloom/music-worker@sha256:7c0c3145912c38001c5a780237d46f5f9ee5d923ee2113ba6a5c4db483a00a71`

The trial ran 07:23:50–07:37:12 UTC (13 minutes 22 seconds), using public metadata,
sandbox credits and an isolated local database. The provider assigned one NVIDIA
RTX PRO 6000 Blackwell Server Edition MIG 2g.48gb worker. There were four accepted
requests; no additional generation was started after the trial.

| Request | Final result | Execution | Credits settled |
|---|---|---:|---:|
| Jazz 1 | PASS, 3/4 matching passages | 87.725 s | 2 |
| Spanish Latin 1 | FAIL, style-rejected:matched-1-of-4 | 92.037 s | 0, full refund |
| Jazz 2 | PASS, 3/4 matching passages | 88.789 s | 1 |
| Spanish Latin 2 | CANCELLED at bounded shutdown; no musical result | 16.141 s | 0, full refund |

Both successful jazz plans use the focused second take (seeds 6302302 and
6302304), at 108 and 120 BPM respectively. Their downloaded 120-second stereo
48 kHz WAV checksums match the provider receipts. Audio remains locally in
`build-song-repair/cloud/`. This is technical style-screen evidence, not listening
approval or proof that all jazz requests succeed. Spanish 1 confirms a style
rejection in this test; it does not establish a general Spanish-language defect.
Spanish 2 must not be counted as another style rejection.

**Startup PARTIAL:** Four initial submissions returned HTTP 409 without provider
IDs. Provider counters were unchanged and its queue was empty. The new image then
took several minutes to download/extract after explicitly requesting one warm
worker. Once readiness and the absence of accepted jobs were verified, only those
four unaccepted submission intents were reconciled in the isolated test database,
retaining their original deadlines. All four were accepted once. See the
[cold-start reconciliation](evidence/song-generation-repair/cold-start-reconciliation.json).
The harness now prewarms its bounded worker count before dispatch, and its final
report uses the settled state. No automatic production resubmission was added;
this trial does not certify scale-from-zero startup for a newly published image.

**Cleanup PASS:** Minimum/maximum workers are 0/0; all worker counters and queued /
running jobs are zero. All reserved credit balances are zero. Six temporary R2
keys were removed and the disposable database was dropped. The independent
shutdown watchdog remained active through cleanup.
[Trial receipts](evidence/song-generation-repair/trial-result.json),
[final provider readback](evidence/song-generation-repair/final-receipts.json),
[download verification](evidence/song-generation-repair/download-verification.json).
The original trial receipt retains the last polled `state: running` for Spanish 2;
its `finalState: cancelled` and subsequent provider `CANCELLED` receipt are final.

**Billing PARTIAL:** The retest's 07:00 UTC billing bucket was not available at
cleanup; no exact charged total is claimed. The $2 ceiling was guarded by one
worker, the 15-minute watchdog and a conservative rate allowance. The earlier
trial's 06:00 bucket has now arrived: $0.24520468 / 581.063 billed seconds for the
whole endpoint-hour, including preparation. This supersedes the earlier partial
2.791-second receipt; it is not an exact per-song cost.

**Remaining:** Spanish reliability and representative vocal-genre calibration
remain PARTIAL / NOT RUN. Listening and native-language acceptance remain deferred.
No thresholds were lowered and no speculative inference setting was promoted.
Website deployment remains the owner's decision. The approved four-request trial
is consumed; no further paid run was started.
