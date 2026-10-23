# Jazz / Spanish generation investigation — 2026-10-23

**PASS, local reliability repairs; PARTIAL, generation reliability and musical acceptance.**
The previous cloud failures did not retain enough evidence to identify their exact
cause. This increment repairs confirmed prompt/reporting problems and prepares a
bounded cloud reproduction. It does not declare either genre fixed.

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
memory and retry changes address plausible infrastructure failures; cloud
verification is still needed.

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
logs remain under `build-song-repair/`; nothing was uploaded or published.

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

## Verification and next cloud check

- **PASS:** 36 focused Python tests, including all 25 genre families and all 50
  language choices in first/retry caption budgets; interruptions, invalid audio,
  bounded retries, worker timeout and privacy checks.
- **PASS:** 71 site unit tests; 12 provider/real-Postgres tests including retained
  failure reasons and full refunds; TypeScript check.
- **PASS:** The standard-library CI lanes: 23 DNA tests and 8 worker tests. One
  audio-array test is explicitly skipped without NumPy/Torch; it passed in the
  inference environment above.
- **PASS:** Four-request cloud retest dry run and conservative budget assertions.
- **NOT RUN:** Updated Linux/GPU worker, new paid cloud generation, new website
  deployment, musical/native-language listening or model promotion.

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

The endpoint remains disabled (0 minimum / 0 maximum workers). The read-only
[provider check](evidence/song-generation-repair/provider-readback.json) now
includes the previous trial's final billing hour, but reports only 2.791 billed
seconds against roughly 492 seconds of job execution. This does not yet reconcile
the trial's actual bill. No new paid execution occurred.
New paid compute and worker publication require separate owner authorization
under `AGENTS.md`; website deployment remains the owner's decision.
