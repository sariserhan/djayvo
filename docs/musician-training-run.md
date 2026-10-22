# Authorized musician-reference GPU trial — 2026-10-21

**Owner listening update:** Group 1: all versions sound weird. Groups 2–4: fine, but the owner hears no clear difference between versions. Informal listening is now PARTIAL; audible adapter improvement is NOT DEMONSTRATED and no checkpoint is selected. Human voice is requested; this comparison explicitly used instrumental mode and “No vocals” prompts. [Exact feedback](evidence/musician-training/owner-listening.json). Formal quality, physical checks and production promotion remain open.

**Research execution PASS; musical acceptance PARTIAL.** The owner approved the
one-GPU, $10/two-hour trial and temporary upload. It completed on one RTX 3090:
13 excerpts screened, six provisionally selected, 60 optimizer steps, two saved
adapters and 13 comparison WAVs retrieved. The rental and temporary keys were
deleted. The execution-time listening status below is historical; the owner
feedback above supersedes it. Physical checks and production promotion remain deferred.

This changes experimental **ACE-Step 1.5 turbo LoRA weights**, not the product's
rule-based C++ composer. It does not establish mastery of DJ techniques, music
theory, composition or improvisation. The [48-exercise curriculum](musician-training-curriculum.md)
still requires reviewed expert demonstrations and independent session evaluation.

## Data and actual training

The [owner approval](evidence/musician-training/authorization.json) binds the
original [run proposal](evidence/musician-training/run-plan.json) and archive.
Only the thirteen authorized 30-second excerpts and research scripts were
uploaded; original MP3s, owner microphone audio and unrelated Downloads files
were excluded. Source permission and preparation are recorded in the
[preparation report](musician-training-preparation.md).

Machine screening processed all thirteen. The [selection receipt](evidence/musician-training/selection.json)
admits `f-02`, `down-04`, `question-02`, `question-03`, `question-04` and `pipe-01`:
180 seconds across four source files. Seven other candidates were excluded for
vocal/spoken descriptions or insufficient support for the broad conditioning.
This is provisional machine screening, **not human content acceptance**. Detailed
genre, language, instrument, tempo and lyric guesses were not used as labels.
Every selected excerpt uses only `Music with rhythmic bass and drum patterns.`,
empty lyrics/key and unknown tempo/instrumental status. File diversity does not
establish independent recording sessions or train/dev/test separation.

Preprocessing completed all six without failure. The fixed V2 trainer used
rank 16, alpha 32, dropout 0.1, learning rate 0.00005, BF16, batch/accumulation 1,
10 warmup steps, constant-with-warmup scheduler, seed 51021 and ten epochs.

| Checkpoint | Optimizer steps | Training loss | Adapter SHA-256 |
| --- | ---: | ---: | --- |
| Epoch 5 | 30 | 1.9056 | `525ed092c5bb2b95a80d0425e370827cbf05e240f15d88550583327bb09418a5` |
| Epoch 10 | 60 | 1.4963 | `00ea4afe4857dfb8737e0dc4ea70e16a51e68f3004f09ce7fab87fa0dede90a8` |

Each checkpoint contains 384 finite tensors, 11,010,048 trainable parameters
and 192 nonzero LoRA-B tensors. Actual epoch/step state was checked. Training
took 28.79 seconds, with 4.666 GiB peak allocated and 4.703 GiB reserved CUDA
memory. These memory/timing figures cover training only, not setup, screening or
the complete application. Lower training loss is not evidence of better music.
Receipts: [preprocessing](evidence/musician-training/preprocess.json),
[training log](evidence/musician-training/train.log),
[resources](evidence/musician-training/train-resources.json),
[checkpoint validation](evidence/musician-training/checkpoints.json).

## Reproducibility and comparisons

Pinned ACE source: `ca1e85fe9430179831e6bc6be790c332190a3866`.
Pinned weights: `19671f406d603126926c1b7e2adc169acbcade22`.
Execution used Python 3.12.3, Torch 2.10.0+cu128, CUDA 12.8 and RTX 3090.
[Provenance](evidence/musician-training/provenance.json) records initial checkpoint
hashes. ACE initialization then synchronized two model Python files from the
pinned source into the checkpoint directory. Their
[executed hashes](evidence/musician-training/executed-model-code.sha256) match
the pinned source, as checked in [preservation](evidence/musician-training/preservation.json);
the initial Python-file hashes should not be mistaken for the executed versions.
No tensor-weight replacement was part of that code synchronization.
[Exact scripts](evidence/musician-training/executed-scripts.json),
[prepare command](evidence/musician-training/remote-prepare.sh),
[training/render commands](evidence/musician-training/remote-train.sh) and
[packages](evidence/musician-training/packages.txt) retain the executed setup.
Committed console logs have trailing whitespace normalized; retrieved raw logs
remain private and hash-verified. These are historical commands, not
authorization for another rental.

Four fixed briefs/seeds were reused unchanged: bass 7441/7442 at 140 BPM,
funk 8123 at 112 BPM and hip-hop 9123 at 92 BPM. Base, epoch 5 and epoch 10
each generated four 30-second, 48 kHz stereo WAVs using eight inference steps
and adapter scale 0.7. A thirteenth WAV repeats the first base case.

- Same-device repeated base PCM is exact. All four base cases also exactly match
  the earlier Blood Club trial's corresponding base PCM.
- Both adapters change all four outputs; the two checkpoints differ from each
  other in all four cases. These are measurable effects, not quality scores.
- Twelve concealed review files measure −22.1 LUFS after gain-only matching;
  their highest measured true peak is −2.0 dBFS. No playback was performed.
- Calibrated two-second mono waveform scans found zero flags among 72
  output/training pairs at correlation 0.8; the maximum was 0.3394. The three
  different-seed bass comparisons also had zero flags.
- Internal repetition remains in bass-b: flagged query coverage is 17 seconds
  for base and epoch 5, and 16 seconds for epoch 10. Repetition may be intentional;
  this does not demonstrate improved arrangement. No other output crossed the
  diagnostic threshold.

These scans miss transformed, short and melodic reuse and do not prove novelty,
ownership, independence or generalization. Receipts:
[render comparison](evidence/musician-training/comparison.json),
[signal and loudness checks](evidence/musician-training/output-measurements.json),
[waveform diagnostics](evidence/musician-training/output-diagnostics.json).
The diagnostic reuses `decode`, `scan` and `calibration` in
`scripts/check_style_overlap.py`: compare each of the twelve outputs against
each of the six selected clips, then each output against itself with
`same_file=True`, then bass-a against bass-b within each mode. Historical base
PCM uses `difference` from `scripts/review_cloud_music.py`.

Private files remain under `renders/musician-training-20261021/`:

- `results/adapter/checkpoints/`: both trained checkpoints and their state.
- `results/`: verified raw WAVs, private screening output and full logs.
- `review/index.html`: four concealed A/B/C groups; no autoplay.
- `blind-key-private.json`: outside the review directory.
- `musician-results.tar.gz`: retrieved archive, SHA-256
  `6803d0fffd35dde21147814635a888d08501ff2a32ef03cf2c66b79a2e64a5b5`.

Local review generation command: `.venv-analysis/bin/python scripts/review_style_trial.py --musician`.
It refuses to overwrite an existing review directory; preserve the completed
packet. Audio, adapters, predicted lyrics and raw audio codes stay ignored and
are not committed or published.

## Rental, retrieval and cleanup

The first stale offer returned two `no_such_ask` errors, creating no rental.
An empty-account check preceded selecting the alternate offer. Only instance
**57149907** was created (offer 56607987, Oregon US, RTX 3090).
The quote including 60 GB disk was $0.298889/hour, with $0.754028 reserved for
the full two-hour lease and conservative transfer allowance. A local watchdog
ran before creation; elapsed time from the first reservation attempt through
deletion was **1,085.63 seconds**, including the failed requests and setup.

All 48 artifact hashes matched after download; the archive contained 56 members
and 13 WAVs. Extraction checked paths/types and size limits. The rental deletion
was verified against the provider API, the temporary account key was removed,
and local temporary private/public keys were deleted. The watchdog exited.
Final read-only follow-up found **zero active instances**. Observed account
debit was **$0.0945214**; provider billing settlement remains PARTIAL.
Receipts: [rental](evidence/musician-training/rental.json),
[upload](evidence/musician-training/upload-verification.json),
[retrieval](evidence/musician-training/transfer.json),
[cleanup](evidence/musician-training/cleanup.json),
[billing follow-up](evidence/musician-training/billing-followup.json).

## Gates and validation

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Bounded authorization and upload | PASS | Exact owner answer and manifest/archive hashes |
| Content screening | PARTIAL | All 13 processed; six provisionally admitted, no human review |
| Preprocessing, training and real inference | PASS | Six inputs, 60 steps, two valid checkpoints, 13 WAVs |
| Retrieval, cleanup, preservation | PASS | 48 verified artifacts; no rental/temporary keys; ten protected files unchanged |
| Budget | PASS | Observed debit < $10; elapsed < two hours |
| Final provider billing | PARTIAL | Account balance observation, not settled invoice certification |
| Local controller/input/review regression checks | PASS | 13 controller + 3 input + 3 review tests; shell syntax checks |
| Technical waveform/loudness diagnostics | PASS | Calibration and actual outputs checked; repetition retained in report |
| Human listening / physical checks | NOT RUN | Owner deferred |
| Expert action corpus / independent generalization | NOT RUN | No eligible reviewed action corpus or independent session split |
| Production learned AI / release promotion | NOT RUN | Product engine unchanged; prerequisites remain open |

The earlier fourteen preparation tests remain separate evidence. No full native
or website rebuild was needed for this research-only change. No deployment,
public media upload or new model rental follows from this completed approval.
Final [local validation](evidence/musician-training/local-validation.json) also
rechecks the executed script hashes, shell/Python syntax, report links and all
48 retrieved artifacts. Test logs: [controller](evidence/musician-training/controller-tests.log),
[input validation](evidence/musician-training/input-tests.log),
[review generation](evidence/musician-training/review-tests.log).
