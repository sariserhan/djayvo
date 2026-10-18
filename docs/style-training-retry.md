# Bounded style-adapter trial: replacement host

2026-10-18. **Technical trial PASS; dataset readiness PARTIAL; musical improvement
and production acceptance NOT RUN.** The owner approved this replacement with
“yes try”, sharing the original $10 ceiling. One replacement was used; both
attempts are now deleted. The first host's SSH failure remains in the
[historical report](style-training-pilot.md).

Audition four concealed, level-matched pairs at
**http://127.0.0.1:4193/review/**. Each pair uses the same prompt and seed for the
unchanged base model and the trained adapter. Pairs 1–2 request bass music with
different seeds; pair 3 requests funk; pair 4 requests hip-hop. These are
30-second model sketches. The prompts request instrumental output; actual vocal
absence and musical qualities have not been assessed by a listener.

## Data and fixes

Only the approved x/y reference excerpts and research scripts went to the rental.
z and the owner's microphone recording stayed local. No API credential or whole
Djayvo checkout was uploaded. The original recordings, initial candidates,
master specification and supplied synthetic fixture retain their hashes.

The initial MP3-to-PCM16 preparation saturated decoded overshoots. Across the
18 local candidates, **48,690 samples reached full scale**. The corrected tool
attenuates by 6 dB before integer conversion and rejects remaining full-scale
samples. Eighteen fresh copies have **zero full-scale samples**, unchanged
window timing, and a maximum sample peak of 0.695435. A float-overload regression
check exercises the actual FFmpeg conversion. Existing files were preserved.
See [headroom measurements](evidence/style-training/headroom.json) and
[preservation](evidence/style-training/retry-preservation.json).

Two labeling passes processed the twelve x/y clips. Detailed genre, language and
lyric predictions changed substantially between the initial and corrected audio.
They are **unverified machine predictions**, not listening evidence. None of the
guessed lyrics, tempo, key or language was used as training metadata. Private raw
label receipts are retained outside Git.

Five clips were provisionally selected: **x-01, x-02, x-06, y-04, y-05**;
150 seconds from two source files. All use the broad conditioning caption
“Music with rhythmic bass and drum patterns.” Lyrics are empty; instrumental
status, tempo and key remain unknown. Other candidates were excluded for speech
flags, conflicting descriptions, or descriptions outside this limited trial.
These decisions are provisional, not verified musical annotations. See
[selection and exclusions](evidence/style-training/selection.json) and
[signal measurements](evidence/style-training/selection-signals.json).

This small, correlated dataset tests feasibility. Separate files are not proof
of independent sessions. z was not used for fitting, tuning, early stopping or
quality assessment. Full content review, phrase-aligned cropping, independent
holdout validity remain **NOT RUN**. Subsequent [waveform diagnostics](style-waveform-diagnostics.md)
make copying assessment **PARTIAL**; perceptual memorization remains **NOT RUN**.

## Actual execution

The replacement used a different physical host: machine 5314 / host 42512,
Oklahoma, US, instance 56631623. Direct SSH and an actual CUDA tensor operation
passed before any reference upload. The quote was **$0.261852/hour** including
60 GB disk, with a conservative $1.154329 two-hour/transfer reservation.
[Rental receipt](evidence/style-training/retry-rental.json).
The controller preserves the original credit anchor across attempts, refuses
existing rentals/state reuse, excludes the prior location, and avoids attaching
already-inherited account keys twice.

- GPU: NVIDIA RTX 3090, 24,576 MiB; driver 595.80; CUDA 12.8.
- GPU environment: Linux x86_64 6.8.0-146-generic, Python 3.12.3,
  PyTorch 2.10.0+cu128, PEFT 0.18.1, Lightning 2.6.1,
  Transformers 4.57.6, FFmpeg 6.1.1-3ubuntu5.
- ACE-Step code: `ca1e85fe9430179831e6bc6be790c332190a3866`;
  weights: `19671f406d603126926c1b7e2adc169acbcade22`.
  Locked environment: [packages](evidence/style-training/gpu-packages.txt)
  and lock hash in the [result](evidence/style-training/retry-result.json).
- Local preparation/review: Apple M5, macOS 26.7.1, Python 3.15.0,
  FFmpeg 9.0.2, NumPy 2.5.4, SciPy 1.18.1, Node 22.23.1.
  `~/mlx-env` was not used or modified.

All five files preprocessed successfully in **14.35 seconds**. An initial training
attempt executed zero steps because the upstream loader restricts tensor paths
to its project directory. The tensors and outputs were moved inside that root;
the restriction was retained. Earlier shell timing/CLI argument errors are also
retained. The prepared script now uses the correct directory. The upstream CLI
can exit zero after a training failure, so successful exit alone was not accepted
as evidence.

The corrected `fixed` trainer used rank 16 / alpha 32, dropout 0.1, batch size 1,
accumulation 1, BF16, AdamW at 0.0001, ten warmup steps followed by constant LR,
gradient checkpointing and seed 51018. It trained **11,010,048 parameters**:
ten steps in a two-epoch probe, then a checkpoint resume to **50 epochs / 250 total
optimizer steps**. No holdout-based checkpoint selection was performed.

The probe took 12.545 seconds wall time. The continuation's measured Python
execution took **83.236 seconds**, with **4.666 GiB peak allocated** and **4.703 GiB
peak reserved** CUDA memory. These are training-phase measurements, not the memory
requirement of labeling or a complete hosted application. Average epoch loss was
3.5420 in probe epoch 1 and 1.0119 at epoch 50; training loss is not musical quality.
The CLI summary incorrectly displayed zero completed epochs, so epoch/step values
were independently checked in the saved training state.

All 384 adapter tensors are finite; all 192 LoRA-B tensors contain nonzero values.
The final adapter is 22,069,696 bytes, SHA-256
`7a05d7f882259550a34bfb14547793d2d511d92ff0c1898f60e09f221634b6d0`.
[Checkpoint verification](evidence/style-training/adapter-verification.json),
[probe log](evidence/style-training/train-probe.log),
[continuation log](evidence/style-training/train-full.log).
The actual remote commands are [probe](evidence/style-training/train-probe.sh)
and [continuation](evidence/style-training/train-full.sh); rerunning them requires
a separately authorized rental and the approved input files, not merely these logs.

## Comparison and retrieval

A fresh process reloaded the unchanged base model, generated four cases, repeated
the first case, then loaded the adapter at scale 0.7 and generated the same four
cases. Direct DiT inference used eight steps and fixed prompts/seeds. It did not
use a learned source-to-improvisation planner or the owner's voice.

All nine retrieved WAVs are 30 seconds, stereo 48 kHz PCM16. The repeated base
render is exactly equal: maximum and RMS PCM difference **zero**. The four
base/adapter pairs differ as follows (normalized PCM, before loudness matching):

| Pair | Maximum absolute difference | RMS difference |
| --- | ---: | ---: |
| Bass, seed 7441 | 0.730713 | 0.046313 |
| Bass, seed 7442 | 0.998352 | 0.080602 |
| Funk, seed 8123 | 0.944611 | 0.078113 |
| Hip-hop, seed 9123 | 1.221893 | 0.140929 |

These differences show that the loaded adapter affected output. They do not prove
improvement, novelty, lack of copying, prompt fidelity or perceived variety.
Event-frame agreement is **NOT RUN**: this model produces audio without the native
engine's event trace. No new native/Linux/WASM portability run is implied.

The eight audition files use gain-only matching to approximately **−22.1 LUFS**,
within 0.2 LU, with true peaks below −1.8 dBFS. The concealed allocation stays
outside the served directory. Chromium 149.0.7827.55 and WebKit 26.5 passed all
eight players' muted playback/seek, mutual pause, range delivery, private-path
isolation and mobile overflow checks. Desktop/mobile screenshots were inspected.
The browser harness was corrected to recognize WebKit's same-origin blob URLs;
external requests are still rejected by the check. This is playback validation,
not human listening. [Measurements](evidence/style-training/output-measurements.json),
[browser evidence](evidence/style-training/review-browser.json).

The archive and all **27 files** passed SHA-256/size verification, including the
final adapter, probe adapter, final resumable checkpoint, configuration and audio.
[Transfer receipt](evidence/style-training/retrieval.json). Private files live in
`renders/style-training-20261018/results`; the server exposes only the review HTML
and eight concealed WAVs. Restart from the repository root with
`node docs/evidence/style-training/serve.mjs` if needed.

## Cleanup, cost and gates

The rental was deleted after 1,364.78 seconds from the replacement controller's
start. Empty account listings were verified repeatedly. The temporary account
key and local temporary key were removed; earlier owner/trial keys were preserved.
Observed credit moved from the original $9.9081871581 anchor to $9.7149660355:
**$0.193221 across both attempts**, of which $0.158485 was observed after the
replacement began. Final billing reconciliation is **NOT RUN**; observed debit
is **PARTIAL** billing evidence. The watchdog was an independent local process,
not a provider-enforced spending cap. [Result and cleanup](evidence/style-training/retry-result.json).

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Owner training/upload/replacement authorization | PASS | Hash-bound permission and two explicit trial approvals |
| Initial host SSH | FAIL | Historical failure retained; no training on that host |
| Replacement SSH / CUDA / pinned setup | PASS | Real execution before upload |
| Decode headroom / protected-file preservation | PASS | 18 corrected files; old files and originals unchanged |
| Dataset content and caption readiness | PARTIAL | Five provisional selections; detailed labels discarded |
| Independent holdout | NOT RUN | z remains local and unused; session independence unknown |
| Copying assessment | PARTIAL | [Local waveform scan](style-waveform-diagnostics.md) completed; perceptual/transformed reuse unassessed |
| Tensor preprocessing / optimizer training / checkpoint | PASS | Five tensors, 250 steps, finite nonzero weights |
| Repeat control / adapter output / transfer | PASS | Exact base repeat, four changed pairs, 27 verified files |
| Listening page / technical local checks | PASS | Two browser engines; 11 controller, 5 scope, 8 preparation and 1 end-to-end checks |
| Native engine event-frame agreement | NOT RUN | No event output or shared-engine change in this trial |
| Human listening / reference-level musical quality | NOT RUN | Concealed comparisons awaiting judgments |
| Source-conditioned learned improvisation | NOT RUN | This is style-adapter research only |
| Rental and temporary-key cleanup | PASS | No remaining rentals; key absence verified |
| Final cost reconciliation | PARTIAL | Observed combined debit $0.193221; final invoice NOT RUN |
| M1/M2 advancement / production acceptance | NOT RUN | Research exception does not waive release evidence |

C07 and the full specification remain **PARTIAL**. Next work is listening to the
pairs, then curating verified musical windows/captions and independent sessions.
A model trained on paired source phrases and musical responses remains separate
from this style adaptation experiment.

Context7 was unavailable. Provider launch fields were checked against the official
[Vast create-instance documentation](https://docs.vast.ai/api-reference/instances/create-instance);
training behavior was inspected in the pinned upstream source, including
[the corrected trainer](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/training_v2/cli/train_fixed.py).
