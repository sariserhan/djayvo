# Style adaptation pilot

2026-10-18. **Local preparation PASS; dataset readiness PARTIAL; training NOT RUN.**

The owner agreed to an ACE-Step adapter experiment and confirmed permission for
the downloads in response to an explicit training-rights question. The scope is
x.mp3, y.mp3 and z.mp3, not every file in Downloads. The
[hash-bound ledger](evidence/style-training/permissions.json) records that
attestation verbatim. It does not invent a rights-holder identity, license
document, redistribution permission or commercial-release clearance. Previous
reports describing these as analysis-only are historical; this confirmation
authorizes local training preparation. No files have been uploaded or trained on.

The objective is to improve production character and musical development toward
the owner's reference target. An adapter experiment does not establish voice
identity preservation or learned source-to-improvisation behavior. Paired source
phrases and musical outcomes remain a separate data requirement.

## Prepared data

The existing Downloads files total approximately 34.3 minutes. The preparation
script extracts six nonoverlapping 30-second windows from each, spread through
the file with margins. These are chronological candidates, not detected musical
phrases, beat-aligned crops or verified songs. No loudness alteration, source
separation, inferred transcript or artist-name caption was added.

- x and y: 12 training candidates, six minutes total.
- z: six held-out candidates, three minutes total; exclude from all fitting.
- All clips: stereo 48 kHz PCM16, exactly 1,440,000 frames each.
- All 18 remain `training_eligible: false` until content review.

Files are local and ignored by Git in
[renders/style-training-20261018](../renders/style-training-20261018).
[review.csv](../renders/style-training-20261018/review.csv) has blank caption,
vocal-content, lyrics, BPM, key, session and notes fields. Preserve the original
candidate receipt when making a separate accepted dataset. The preparation tool
does not export an ACE-Step training manifest or fit tensors.

Separate files do not prove separate recording sessions. Unknown session IDs
remain blank. Detect repeated passages and establish source sessions before
treating z as an independent quality test. If material overlaps across files,
move the entire session to one split or acquire separate evaluation material.
Eighteen excerpts are not eighteen independent recordings.

## Review and training protocol

1. Review candidate audio: exclude commentary, unrelated audio, abrupt edits and
   unsuitable crops; set musical boundaries deliberately. Identify speech,
   singing and instrumental content without assuming all tracks are instrumental.
2. Write musical captions and verify any lyrics/transcripts. Leave uncertain
   metadata absent instead of manufacturing BPM, key or instruments. Record
   session grouping and duplication decisions. Direct listening is NOT RUN here.
3. Keep the existing pinned ACE-Step code
   `ca1e85fe9430179831e6bc6be790c332190a3866` and weights
   `19671f406d603126926c1b7e2adc169acbcade22` as the first candidate. Review the
   actual training entry point and checkpoint compatibility in an isolated
   environment before installing/running; inference success is not training proof.
4. Proposed separate rental: one 24 GB RTX 3090, at most $0.50/hour combined
   compute/disk quote, two-hour maximum lifetime including setup and retrieval,
   $10 total experiment ceiling including transfer/storage. Recheck live quotes
   and implement the cost/timeout/deletion controls before creating the rental.
   Do not treat a setup failure as permission to start another paid instance.
5. Preprocess only accepted x/y material; fit a small LoRA with batch size one.
   First measure a short run's time, VRAM and loss before selecting a bounded
   optimizer-step budget. Save intermediate adapters and compare against the
   unchanged base model. No unmeasured speed or training-quality promise.
6. Compare base/adapter using identical original prompts and seeds, multiple
   generations and matched loudness. Include unfamiliar prompts to test variety.
   Check copying/repetition and source responsiveness separately from timbre.
   Blind the final listening comparison; keep z out of tuning and early stopping.
7. Retrieve and hash adapters, outputs, configuration and logs; delete the rental
   and verify remote cleanup. Keep results private until rights and quality
   requirements for distribution are met.

The $10 proposal is a new training experiment, not reuse of the completed prior
pretrained-generation trial's authorization. Before launch, the owner must
authorize the new expense, temporary cloud transfer of the accepted reference
excerpts, and a research-only exception to the M1 hold. Owner microphone recordings
are outside this upload scope. No production gate is waived. The master remains
unchanged. [AGENTS.md](../AGENTS.md) preserves the M1 evidence requirement and
requires explicit approval for paid services; this report does not override it.

## Evidence and gates

| Gate | Status | Evidence / remaining work |
| --- | --- | --- |
| Owner training permission recorded | PASS | Exact statement and three source hashes in ledger |
| Rights ledger completeness / distribution | PARTIAL | Training attestation present; holder, documentary terms and release scope absent |
| Local candidate extraction | PASS | 18 complete WAVs; [receipt](evidence/style-training/candidates.json) |
| Preparation safeguards | PASS | Seven [tests](evidence/style-training/tests.log): duration bounds, nonoverlap, permission, source hash, path, split and existing-output preservation |
| Decode reproducibility / preservation | PASS | 18 format/hash checks; repeated x-01 byte-identical, max/RMS PCM difference zero; all originals/master unchanged; [verification](evidence/style-training/verification.json) |
| Content, captions, lyrics and session review | NOT RUN | Blank review sheet; no accepted examples |
| Independent holdout validity | NOT RUN | File split prepared; session independence unverified |
| GPU training / inference comparison | NOT RUN | No rental, upload, new model download or adapter |
| Blinded listening / reference-quality acceptance | NOT RUN | Automated checks do not establish musical quality |
| M1/M2 advancement / production | NOT RUN | Existing holds remain |

Reproduce into a new directory (never overwrite existing recordings):

```sh
python3 -m unittest discover -s tests -p test_style_candidates.py -v
python3 scripts/prepare_style_candidates.py \
  --ledger docs/evidence/style-training/permissions.json \
  --source-dir ~/Downloads \
  --output renders/style-training-new
```

The script uses Python's standard library and the existing FFmpeg installation.
No shared engine, fixture, model environment or application was modified.
Platform portability and browser tests were not rerun for this local data tool.

The official [pinned LoRA training tutorial](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/LoRA_Training_Tutorial.md)
documents audio/caption/lyrics preparation and recommends 20 GB or more VRAM.
It requires review of generated transcripts; its epoch and speed suggestions
are not measurements for this dataset. Context7 tools were unavailable, so the
official pinned documentation was consulted directly.
