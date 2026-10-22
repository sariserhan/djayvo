# Authorized musician references — 2026-10-21

**Local preparation PASS; content readiness PARTIAL; new training NOT RUN.**
The owner confirmed: **“Yes, all four are authorized for training”**, answering
the explicit question naming `f.mp3`, `down.mp3`, `question.mp3` and `pipe.mp3`.
The [permission ledger](evidence/musician-training/permission.json) binds that
statement to their original hashes. It supersedes the earlier analysis-only
scope for these four files. It does not establish distribution/commercial rights,
authorize unrelated Downloads files, or authorize a new GPU rental/upload.

## Prepared material

The [preparation receipt](evidence/musician-training/preparation.json) records
13 nonoverlapping 30-second candidates: three from f, four from down, four from
question and two from pipe. Each starts at least five seconds into its source
and ends at least five seconds before the source ends. These are chronological
windows, not verified musical phrase boundaries.

Private output: `renders/musician-training-20261021/`:

- `candidates/`: 13 stereo 48 kHz PCM16 WAVs plus a hash-bound manifest.
- `review.csv`: pending decisions, captions, vocals/lyrics, tempo/key, session,
  curriculum IDs and phrase-boundary fields. No musical annotations invented.
- `musician-review-candidates.tar.gz`: exactly the 13 WAVs and manifest, each
  archive member rehashed. This is a review package, not an accepted dataset.
- `preparation.json`: reproduction metadata, original and derived hashes.

Existing headroom-safe extraction is reused: −6 dB before PCM16 conversion,
rejection of remaining full-scale samples. All candidates contain exactly
1,440,000 stereo frames; zero full-scale samples, maximum sample peak 0.838837,
and none trips the low-energy screen. Four original source hashes remain intact.
The originals, owner microphone recording, Night Current, x/y/z/Blood Club
material and existing adapters were not changed or added to the package.

[Validation](evidence/musician-training/candidate-checks.json) includes 62
cross-file clip comparisons with the existing calibrated waveform diagnostic:
zero flagged pairs at absolute correlation 0.8. It compares two-second mono
windows at 4 kHz; it misses transformed melodies, short copies and perceptual
similarity. This does **not** prove independent sessions, originality, suitable
content, accurate captions or musical quality. No train/dev/test split is asserted.

## Concrete next run

The [run proposal](evidence/musician-training/run-plan.json) is bounded to the
prepared archive hash and the existing pinned ACE-Step 1.5 turbo workflow:

1. Use one verified US RTX 3090; confirm CUDA before uploading the candidate
   package. Keep originals and private microphone material local.
2. Run provisional audio-understanding/content screening. Exclude silence,
   predominant commentary and uncertain/conflicting material. Machine labels
   remain provisional; do not insert guessed lyrics, key, tempo or deck actions.
   Stop without fitting if fewer than four usable candidates from two files remain.
3. Initialize from the unchanged base, preserving earlier adapters. Reuse the
   fixed V2 trainer: rank 16, alpha 32, dropout 0.1, LR 0.00005, BF16, batch one,
   gradient checkpointing, seed 51021, up to ten epochs / 130 optimizer steps.
   Save epochs five and ten and verify actual steps and finite/nonzero tensors.
4. Generate the existing four briefs with the base and both checkpoints plus
   an exact base-repeat control: 13 thirty-second files. Retrieve hashes, logs,
   resource measurements and matched private comparisons. No autoplay/listening
   or quality-winner claim while the owner's deferral remains in force.
5. Delete the rental and temporary keys and verify cleanup. No automatic
   replacement host or second experiment under this proposal.

The corrected [live offer search](evidence/musician-training/offers-corrected.json)
returned two eligible US 3090 offers. The lower total-reservation option was
$0.285556/hour including 60 GB disk, with a conservative $0.731111 reservation
for two hours and 60 GB transfer each direction. Recheck availability and prices
immediately before rental. The first search's country-name filter was wrong;
its empty result is retained and is not evidence that no GPUs were available.

**Proposed maximum:** one instance, two hours including setup/retrieval, $10 total
budget, quotes ≤$0.50/hour including disk and ≤$6 including reserved transfer.
Reuse the existing independent watchdog and $7 observed-debit shutdown reserve
with new isolated state. Provider accounting can lag: these are application
controls, not a provider-enforced spending cap. No rental has been created and
new spend is **$0**. `AGENTS.md` requires separate explicit spending approval;
temporary upload of the 13 excerpts is included in the pending request.

The local pinned trainer lists CPU and MPS paths, so local execution is not
declared impossible. The checked project environments have no PyTorch and the
training checkout has no base checkpoints. No local model download/setup or
MPS memory/compatibility benchmark was performed. The proposed GPU route reuses
the previously measured CUDA workflow. The official pinned
[training guide](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/LoRA_Training_Tutorial.md)
describes audio/caption preparation; its hardware guidance is not an M5 benchmark.
Context7 was unavailable; pinned source and official documentation were inspected.

## Scope of learning

This experiment can test audio adaptation from these recordings. It does not
teach the 48-exercise curriculum merely because that curriculum exists. Exact
DJ decisions and general source-responsive improvisation still require reviewed
state/action/audio examples and held-out evaluation. The local product composer
remains rule-based. Neither lower training loss nor changed waveforms establishes
better music, broader technique coverage or production readiness.

## Reproduce and gates

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_musician_candidates.py -v
.venv-analysis/bin/python -m unittest discover -s tests -p test_style_candidates.py -v
.venv-analysis/bin/python scripts/prepare_musician_candidates.py \
  --ledger docs/evidence/musician-training/permission.json \
  --source-dir ~/Downloads --output renders/musician-training-NEW
```

Use a fresh output directory. The new tool rejects missing permission, changed
source hashes, duplicate/foreign names, symlinks and output reuse; decoder failure
does not publish a preparation receipt or upload archive. Shared extraction still
rejects decoded overshoots. The six new tests and eight extraction regressions
pass; actual 13-file preparation/archive/format checks are additional evidence.

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Owner training permission | PASS | Exact answer and four hashes |
| Local candidate preparation / archive | PASS | 13 clips, 390 seconds, exact member/hash checks |
| Source preservation / signal checks | PASS | Four unchanged hashes, no full-scale samples |
| Cross-file waveform scan | PASS | 62 comparisons, zero flags; independence unproven |
| Tool regressions | PASS | 14 tests, including real FFmpeg float-overload check |
| Content, labels, independent sessions | PARTIAL | Candidate review pending; no verified action pairs |
| New GPU spend / temporary upload | NOT RUN | Explicit bounded approval required |
| New optimizer execution | NOT RUN | No new checkpoint or trained weights |
| General musician improvement / production | NOT RUN | No claim; existing quality gates remain |

No shared engine, product behavior, master specification or previous training
artifact was changed. Listening, physical checks and deployment remain NOT RUN.
