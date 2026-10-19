# Blood Club training preparation

2026-10-19. **Preparation PASS; dataset readiness PARTIAL.** This report records
preparation before the paid trial. The subsequently authorized
[completed training run](blood-training-run.md) has **training, retrieval and
cleanup PASS; musical quality NOT RUN**. Its results supersede the pending
execution statuses in this historical preparation ledger.

The owner replied **“train with blood_club”** to the request for cleared complete
improvisation recordings. This selects the existing `~/Downloads/blood_club.mp3`
and is recorded as an owner training-permission attestation, bound to its original
SHA-256 in the [permission record](evidence/blood-training/permission.json).
No additional training-rights confirmation is requested. It does not establish
commercial distribution rights or waive production quality gates.

The original is the complete 634.067313-second, stereo 48 kHz file already
analyzed in [reference analysis](reference-analysis.md). Its hash is unchanged.
The new package lives outside Git at `renders/blood-training-20261019/`:

- `train-input/`: 16 nonoverlapping 30-second candidates, 0:00–8:00.
- `same-session-holdout/`: four candidates, 8:30–10:30, excluded from fitting.
- 8:00–8:30 separates the groups; the final 4.067313 seconds are unused.
- `review.csv`: blank content and source/response annotations. No annotations
  or listening judgments were invented.
- `blood-training-input.tar.gz`: exactly 16 training WAVs plus two JSON manifests;
  contains no holdout audio, original MP3, other references, microphone recording,
  credentials, or full repository.

All twenty WAVs are stereo PCM16 at 48 kHz, exactly 1,440,000 frames. Existing
headroom-safe extraction attenuates 6 dB before integer conversion. Maximum
sample peak is 0.58242798; zero samples reach full scale. All clip hashes are
distinct, and training archive contents were independently rehashed.

These are chronological windows, not verified beat/phrase boundaries or a
curated set of input/response pairs. The provisional conditioning caption is
“Music with rhythmic bass and drum patterns.” Lyrics, vocal presence, BPM and key
remain unknown. One source file is treated as one group: the held-out passages
are **not independent sessions**, and similar musical material may recur across
the gap. This package supports a bounded style experiment, not a claim that the
model has learned general improvisation or that a recording was human-made.

## Original run proposal

The [run plan](evidence/blood-training/run-plan.json) proposes one new Vast.ai
RTX 3090 rental, at most two hours and a $10 ceiling, with no replacement host
unless separately approved. Reject quotes above $0.50/hour including disk or
$6 reserved including transfer. The existing controller's $7 observed-debit
shutdown reserve and independent watchdog are required; these are application
controls, not a provider-enforced spending guarantee. Verify cleanup afterward.

Reuse the previously executed, pinned ACE-Step model and corrected V2 trainer.
Initialize from the unchanged base, preserving the existing x/y adapter. Train
rank 16 / alpha 32, dropout 0.1, BF16, batch/accumulation 1, gradient checkpointing,
learning rate 0.00005, seed 51019, ten epochs. Sixteen examples imply 160 optimizer
steps; save epochs 5 and 10 (80 and 160 steps). Independently verify actual steps,
finite nonzero adapter tensors, model/source hashes, peak memory and elapsed time.
The upstream CLI's zero exit status alone is insufficient proof of training.

Generate the same four existing bass/funk/hip-hop prompt-and-seed cases with the
base and both checkpoints, plus an exact base-repeat control: 13 thirty-second
files. Prepare concealed, gain-matched comparisons. Check copying against the
training excerpts, within-output repetition, and variation across the two bass
seeds; none of those numerical measurements proves musical quality. Retain
unaltered output files alongside listening copies. Select a checkpoint from real
listening evidence, not training loss. Holdout passages stay local and are not
used to choose training parameters in this pilot; their independence is unproven.

The original audio file and owner's microphone recording stay on the Mac. Only
the 16 reference clips and their manifests are proposed for temporary upload.
No streaming-library integration, production promotion or deployment is included.
The shared C++ engine is unchanged and remains the fallback.

At preparation time, the previous paid approvals covered completed individual
rentals. [AGENTS.md](../AGENTS.md) requires explicit authorization for new paid
compute. The owner subsequently approved this bounded rental and temporary
upload with **“yes continue”**; see the [authorization](evidence/blood-training/authorization.json)
and [executed run](blood-training-run.md). No new rental is authorized by these
completed-run records.

## Evidence and reproduction

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Owner source selection / training attestation | PASS | Hash-bound instruction and question context |
| Original/source preservation | PASS | Seven protected originals checked, including master, fixture and owner microphone source |
| Local extraction and upload-package preparation | PASS | 20 distinct, valid, nonclipped WAVs; train-only archive verified |
| Preparation safeguards | PASS | Four new tests; eight existing extraction tests including float overshoot |
| Dataset content / pairing | PARTIAL | Complete source selected; window content, boundaries and pair annotations unverified |
| Independent holdout | NOT RUN | One source session only; chronological separation is not independence |
| GPU provisioning / upload / training | NOT RUN | No new spending or model update |
| Training/output quality and copying evaluation | NOT RUN | No new generated outputs yet |
| Native/browser event-frame and waveform agreement | NOT RUN | Shared engine unchanged; no new model output or engine event trace |
| Musical-quality / release acceptance | NOT RUN | Prior inconclusive contour experiment supplies no positive preference labels |

Run from the repository root using the existing isolated analysis environment:

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_blood_training.py -v
.venv-analysis/bin/python -m unittest discover -s tests -p test_style_candidates.py -v
.venv-analysis/bin/python scripts/prepare_blood_training.py \
  --source ~/Downloads/blood_club.mp3 \
  --ledger docs/evidence/blood-training/permission.json \
  --output renders/blood-training-NEW
```

The output directory must be new. A failed extraction never creates the final
preparation receipt. The source checksum and permission are checked before any
decoder invocation. Existing audio is never overwritten.
[Preparation metadata](evidence/blood-training/preparation.json),
[verification/toolchain](evidence/blood-training/verification.json),
[tests](evidence/blood-training/tests.log), and
[extraction regressions](evidence/blood-training/extraction-tests.log) retain results.

Actual preparation: Apple M5, macOS 26.7.1, project Python 3.15.0, FFmpeg 9.0.2.
`~/mlx-env` was not accessed or changed. No native/device rebuild was needed.
This is preparation for training, not completed training.
