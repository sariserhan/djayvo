# Blood Club training trial

2026-10-19. **Training, retrieval and cleanup PASS. Musical quality and production
acceptance NOT RUN. Overall research gate PARTIAL.**

The owner approved the prepared one-instance, $10/two-hour trial with **“yes
continue”**. [Authorization](evidence/blood-training/authorization.json) binds the
unchanged [run proposal](evidence/blood-training/run-plan.json) and input archive.
The original [preparation report](blood-training.md) remains historical evidence.

Listen locally at **http://127.0.0.1:4195/review/**. Four groups contain concealed
A/B/C versions: unchanged base, 80-step adapter and 160-step adapter, with the
same prompt and seed within each group. Playback copies are matched to −22.2
LUFS, within 0.2 LU; measured true peaks are at most −2.0 dBFS. Originals and both
checkpoints remain private under `renders/blood-training-20261019/results/`.
No checkpoint has been selected or promoted. The owner has been asked for a
preference; no new listening judgment is recorded yet.

## Actual training

One verified US RTX 3090 rental, instance 56677520, processed all 16 approved
30-second clips with zero failures. Only the 480-second training subset and
research scripts were uploaded. The original MP3, four same-session holdout
clips, owner's microphone recording, other references and credentials stayed
local. The dataset still has no verified speech/response pairs, lyric labels,
musical boundaries or independent session split.

The pinned ACE-Step turbo base was trained with the fixed V2 trainer: rank 16,
alpha 32, dropout 0.1, learning rate 0.00005, ten warmup steps, constant scheduler
after warmup, BF16, gradient checkpointing, batch and accumulation 1, seed 51019,
ten epochs. Preprocessing took **28.09 s**; the measured training process took
**57.07 s**, with **4.6657 GiB allocated / 4.7031 GiB reserved** peak GPU memory.
The log contains all 160 sequential steps with finite losses.

| Checkpoint | Verified progress | Weight SHA-256 prefix | Adapter verification |
| --- | --- | --- | --- |
| Early | Epoch 5, step 80 | `4aa53903d275` | 384 finite tensors, 11,010,048 parameters, 192 nonzero LoRA-B tensors |
| Later | Epoch 10, step 160 | `51c6ccde5205` | Same checks; different weights |

Full hashes and progress: [checkpoints](evidence/blood-training/checkpoints.json),
[training log](evidence/blood-training/train.log),
[resources](evidence/blood-training/train-resources.json),
[verification](evidence/blood-training/execution-verification.json).
Training loss measures fitting; it is not a musical-quality score.

The first trained render **FAIL**ed because the upstream loader derived a PEFT
module name from `epoch_5_loss_1.2063`; module names cannot contain a period.
The shared research runner now calls `add_lora` with an explicit safe name.
A regression test exercises the decimal checkpoint path. Rendering resumed from
the existing checkpoints on the same instance; no retraining or replacement
rental occurred. The [original failure](evidence/blood-training/step80-initial-failure.log)
and [resume script](evidence/blood-training/resume-render.sh) are retained.
Both adapters subsequently loaded at scale 0.7 and rendered all four cases.

## Outputs and diagnostic limits

**PASS:** thirteen 30-second stereo 48 kHz PCM16 WAVs, including the base-repeat
control, were retrieved. All **45 artifact hashes** match the remote manifest.
No comparison file has full-scale samples. The repeat is sample-identical, and
all four base WAV hashes also match the earlier x/y trial. Each trained output
differs from its base and from the other checkpoint. The three conditions use
separate processes; adapter state cannot accumulate between checkpoints.

| Brief | Base vs 80-step RMS difference | Base vs 160-step | 80 vs 160-step |
| --- | ---: | ---: | ---: |
| Bass, seed 7441 | 0.009180 | 0.020275 | 0.015905 |
| Bass, seed 7442 | 0.014560 | 0.019058 | 0.014966 |
| Funk, seed 8123 | 0.023873 | 0.028293 | 0.032580 |
| Hip-hop, seed 9123 | 0.070556 | 0.108731 | 0.097888 |

Values use normalized PCM units on original-level files. They demonstrate an
effect, not perceptible improvement, realism or creativity. These are
instrumental text-conditioned sketches, not a learned speech-to-music response.
The existing C++ improviser remains unchanged.

The calibrated local waveform diagnostic checked 192 output/training pairs,
12 within-output repetition cases and three different-seed bass pairs. It uses
two-second centered mono windows at 4 kHz, a one-second query hop and a fixed
absolute-correlation threshold of 0.8:

- Training overlap: **0 flagged windows**, maximum correlation **0.348635**.
- Different bass seeds: **0 flagged windows**, maximum **0.742872**.
- Within-output repetition: **37 flagged windows**, maximum **0.933124**.
  Bass seed 7442 accounts for 13 base, 12 early and 11 later flags. The remaining
  flag is in the later bass seed 7441 output. The strongest repeated bass passage
  starts near 3 s and matches near 23.57 s. Flags overlap and are not counts of
  independent musical phrases.

Repetition is already present in the base; the adapter has not established a
solution. Repeated rhythms may be intentional, and this diagnostic cannot judge
them musically. It misses pitch/time-transformed reuse, melodic resemblance,
short copies and some boundary-spanning copies. **Perceptual novelty and copying
assessment remain PARTIAL.** No claim of originality follows from zero waveform
flags. Holdout excerpts were not used to tune or select a checkpoint.

Evidence: [output measurements](evidence/blood-training/output-measurements.json),
[waveform scan](evidence/blood-training/waveform-overlap.json),
[transfer](evidence/blood-training/transfer.json).

## Hardware, cost and cleanup

Actual remote host: Linux x86_64 6.8.0-146-generic, RTX 3090 24 GiB, NVIDIA driver
595.80; PyTorch **2.10.0+cu128** uses CUDA **12.8**. The driver's reported CUDA
capability is 13.2, a separate value. Python 3.12.3, PEFT 0.18.1, Lightning 2.6.1,
Transformers 4.57.6. Code revision `ca1e85fe9430179831e6bc6be790c332190a3866`;
weights revision `19671f406d603126926c1b7e2adc169acbcade22`. Actual downloaded
model/code hashes, dependency versions and GPU details are retained in
[provenance](evidence/blood-training/provenance.json),
[packages](evidence/blood-training/packages.txt) and
[GPU evidence](evidence/blood-training/nvidia-smi.txt).

Local validation used Apple M5, 16 GiB RAM, macOS 26.7.1 build 25G241, isolated
Python 3.15.0, NumPy 2.5.4, SciPy 1.18.1 and FFmpeg 9.0.2. `~/mlx-env` was not
used or changed. The master, synthetic fixture, owner voice, x/y/z/Blood Club
originals, previous adapter and all 20 prepared clips passed preservation checks.

The quoted rate was $0.271852/hour including 60 GB disk, with a conservative
two-hour/transfer reservation of $1.17433. The independent watchdog was running.
Deletion was requested **644.19 s** after rental creation. The API then confirmed
**no active instances**, deletion of the temporary account key, and preservation
of preexisting keys; local temporary key files were removed. Observed account
credit changed from $9.714966 to $9.595631: **$0.119335 debit** at that check.
**Final billing is PARTIAL** because provider accounting can settle later.
[Cleanup receipt](evidence/blood-training/cleanup.json). A later check still found
no active instances and showed **$0.124824** total observed debit; see the
[billing follow-up](evidence/blood-training/billing-followup.json).

## Gate ledger

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Bounded rental/upload authorization | PASS | One approved instance; no replacement or production promotion |
| Approved input isolation and preprocessing | PASS | 16 examples, zero preprocessing failures; holdout stayed local |
| Optimizer/checkpoint execution | PASS | 80/160 progress, finite trained weights, all 160 logged steps |
| Loader failure recovery | PASS | Initial failure retained; explicit adapter name regression and real renders pass |
| Transfer, output format and base repeat | PASS | 45 hashes; 13 WAVs; exact repeat and previous-base agreement |
| Waveform difference and diagnostic execution | PASS | All variants differ; calibrated scan completed |
| Copying, novelty and creativity | PARTIAL | No strong training waveform matches; repetition and perceptual limitations remain |
| Paired data / dataset curation | PARTIAL | One reference, broad caption; no verified phrase/response pairs |
| Independent generalization | NOT RUN | No independent sessions or held-out quality evaluation |
| Human listening / quality winner | NOT RUN | Review requested; no preference recorded |
| Review HTTP delivery and audio decoding | PASS | All 12 players' WAVs decode over HTTP; range/private-route checks pass |
| Rendered browser interaction / screenshots | NOT RUN | Required Browser execution tool unavailable; no fallback browser claimed |
| New native/browser event-frame agreement | NOT RUN | Model emits audio, no engine event trace; shared DSP unchanged |
| Preserving originals and previous work | PASS | 28 protected hashes |
| Rental and temporary-key cleanup | PASS | Instance absent, keys deleted, originals preserved |
| Final billed cost | PARTIAL | Observed debit approximately $0.12; settlement not confirmed |
| Production promotion / release | NOT RUN | Research artifacts only; existing quality gates remain open |

There are **38 passing local regression tests**: 12 controller, seven Blood Club
input/preparation and 19 shared style/extraction/overlap/review tests. Real GPU
execution and HTTP audio checks are additional evidence, not listening scores.

The review flow is `/review/` → select A/B/C audio → compare the same brief.
HTTP delivery, concealed page labels, all twelve decodes, byte ranges and blocked
private paths passed. Rendered page identity, visual layout, console state and
interactive playback were **NOT RUN**: the Browser skill is present but its
required execution tool and discovery tool are unavailable. No browser fallback
was used. [Delivery receipt](evidence/blood-training/review-delivery.json).

## Reproduction and next decision

Run the local regression suites with `.venv-analysis/bin/python -m unittest
discover -s tests -p PATTERN -v`, using `test_vast_trial.py`,
`test_blood_training.py` and `test_*style*.py`. Re-run the diagnostic with:

```sh
.venv-analysis/bin/python scripts/check_style_overlap.py --blood --output /tmp/djayvo-blood-overlap-new.json
```

The review server is `node docs/evidence/blood-training/serve.mjs`, bound only to
127.0.0.1:4195; it serves only the review HTML and twelve matched WAVs. The blind
key, checkpoints and source audio are not served. The server is already running.
`verify-review.py` exercises delivery. `review_style_trial.py --blood` prepares
fresh listening files and deliberately refuses to overwrite an existing review.

The exact pinned setup, run and resumed render scripts are recorded alongside
their hashes. The paid run is complete and cleaned up; this is not authorization
for another rental. Keep both checkpoints as candidates until listening supplies
a preference. Future general improvisation still needs cleared paired examples,
independent evaluation and the master specification's production gates.
