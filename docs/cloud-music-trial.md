# Bounded cloud music research trial

The owner authorized a $10 Vast.ai experiment and supplied a funded account on
2026-10-18. This is a separate pretrained-model audition, not a production
integration, model-training run, or substitute for the master specification's
M1 evidence. Vercel remains the intended web host.

**GPU trial and cleanup: PASS. Musical quality and production readiness:
NOT RUN.** Ten 30-second stereo 48 kHz instrumentals were generated, retrieved
and checksum-verified. This includes one intentional duplicate control, leaving
nine distinct WAV hashes. The rental was destroyed and the account listing is
empty. The observed credit debit is approximately **$0.09**, below the $10
authorization; this is not a final invoice.

Open the [local audition page](../renders/cloud-trial-20261018/review/index.html).
Start with `club seed 7441`, `club seed 7442`, and `club lm 7441`, then compare
the three hip-hop seeds and `hiphop lm 4123`. The LM cases use the pretrained
1.7B planning model in addition to audio diffusion. Playback copies are matched
to −22 LUFS; downloads retain the model output level. These are instrumental
sketches, not speech-preserving remixes or a completed replacement engine.

## Measured results

Hardware: NVIDIA RTX 3090, 24,576 MiB, driver 595.71.05; host Intel Xeon
E5-2673 v4 at 2.30 GHz; Linux 6.8.0-117, glibc 2.39. Environment: Python
3.12.3, PyTorch 2.10.0+cu128, CUDA 12.8, uv 0.13.1. The model used CUDA
bfloat16 and SDPA, without compilation or quantization. The LM used the PyTorch
backend. This is one rental and a small batch, not a sustained service benchmark.

| Path | Generation time per 30-second clip | Peak PyTorch allocated memory | Peak reserved memory |
| --- | --- | --- | --- |
| First direct take | 4.966 s | 7.032 GiB | 7.566 GiB |
| Subsequent seven direct takes | 2.447–2.492 s | 7.032–7.034 GiB | Up to 7.648 GiB |
| Hip-hop with planning LM | 23.189 s | 10.175 GiB | 13.965 GiB |
| Club with planning LM | 26.344 s | 10.175 GiB | 11.791 GiB |

Rental-to-setup readiness took about 16.8 minutes, including roughly nine minutes
for the cold container. DiT initialization took 13.983 s and LM initialization
80.251 s, separately from generation. Framework import, provisioning, downloads
and retrieval are not part of the warm generation figures. Allocated/reserved
figures are PyTorch counters, not total device/process memory.

The live instance reported $0.19333/hour including the 60 GB disk. At that rate,
2.5 seconds is about $0.00013 and 26.3 seconds about $0.0014 in warm compute/disk
time. These are arithmetic marginal estimates, excluding startup, idle time,
network charges, failures, service infrastructure and future marketplace changes.
Do not treat them as production per-song pricing.

All ten files have 1,440,000 stereo PCM16 frames at 48 kHz, finite samples and
zero full-scale samples. Original integrated loudness ranges from −20.8 to
−14.4 LUFS; measured true peaks range from −1.0 to −0.3 dBFS. Audition copies
measure −22.0 LUFS, with true peaks no higher than −2.2 dBFS. There is no claim
of mastering quality, correct phrasing, realistic timbre or a musically resolved
ending. The upstream decoder peak-normalizes before its final −1 dB sample-peak
normalization; these checks do not establish absence of audible artifacts.

| Waveform comparison | Maximum absolute PCM difference | RMS PCM difference |
| --- | --- | --- |
| Hip-hop seed 4123, repeated | 0 | 0 |
| Hip-hop 4123 vs 4124 | 1.286987 | 0.155935 |
| Hip-hop 4123 vs 4125 | 1.103729 | 0.161096 |
| Club 7441 vs 7442 | 0.905396 | 0.120938 |

PCM values are normalized to full scale; a difference between opposite-polarity
samples can exceed 1. These measurements prove sample differences, not perceived
originality, musical diversity or freedom from similarity to existing works.
**Event-frame agreement: NOT RUN** — this text-to-audio model produces no Djayvo
event trace and has no corresponding CPU-engine plan. Earlier portability
results remain separate.

## Failures investigated and fixed

The initial RTX 4090 offer disappeared before rental. No charge was started for
that offer; the selected verified US 3090 stayed within the authorized budget.
An attempted offer-ID search returned no offers even for a listed offer, so the
controller rechecks the supported filtered offer list before creating a rental.

The container exposes Ubuntu system Python rather than an immediately usable
project environment. A global pip bootstrap failed under PEP 668, then creating
a virtual environment failed because `ensurepip` was missing. The final setup
installs `python3-venv` and FFmpeg only inside the disposable container, then uses
separate bootstrap/project environments and the frozen upstream lock. One SCP
connection failed with “Network is unreachable”; retrying with IPv4 succeeded.
All retrieved WAVs were verified before deletion. No Mac ML environment changed.

The model automatically synchronized two Python model definitions from the
pinned source checkout into the checkpoint directory. Weight hashes and the
executed batch-script hash are retained. Turbo overrides the requested default
CFG value to its effective value of 1.0; the batch log records this upstream
behavior. Neither a training run nor adapter weights were used.

Only original text briefs are sent to the rental. No owner recording, reference
song, application secret, user database or private repository is uploaded.
The existing local-only voice consent does not authorize cloud voice processing.

## Reproduction and limits

- Controller: `scripts/vast_trial.py`; key read locally from `VASTAI_KEY` or the
  existing ignored dotenv file. Never copy the key to the rental or logs.
- Setup: `scripts/cloud_music_setup.sh` inside the temporary GPU container.
- Batch: copy `scripts/cloud_music_batch.py` into the ACE-Step checkout and run
  its isolated `.venv/bin/python` with a 20-minute process timeout.
- ACE-Step code `ca1e85fe9430179831e6bc6be790c332190a3866`; weights
  `19671f406d603126926c1b7e2adc169acbcade22`; official frozen dependency lock.
- Container pinned by digest; one 24 GB GPU, 60 GB disk. Price filter includes
  compute, disk and a reserve for 60 GB transfer in each direction.
- Detached local watchdog requests destruction after 90 minutes, a $7 observed
  credit drop, or three consecutive account-check failures. This is **not a
  provider-enforced spending cap**: billing lag, network loss or shutting down
  the local computer can delay cleanup. Verify destruction before finishing.
- Copy outputs and sanitized evidence locally, destroy the temporary instance,
  then verify absence from the account. Do not leave stopped billable disks.

The first eight cases use diffusion conditioned directly on text, with the
planning LM disabled: three identical hip-hop briefs with different seeds,
one same-seed repeat, jazz and half-time hip-hop, and two dark club seeds.
Two additional cases enable the 1.7B planning LM. All request 30-second
instrumentals. These prompts describe musical attributes and contain no artist
names or reference audio. No generated output is promised to be unique merely
because its seed or waveform differs.

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Account access and bounded quote | PASS | $10 starting credit; no pre-existing rentals or automatic top-up reported |
| Local price/deletion safeguards | PASS | Six network-free controller regression tests |
| GPU setup and generation | PASS | Ten successful 30-second outputs, pinned code/weights and actual CUDA execution |
| Transfer integrity and audio file checks | PASS | Ten derived and ten original files hash-verified; independent local PCM/loudness checks |
| Repeatability and seed diversity measurements | PASS | Same-seed zero difference; different-seed numeric differences recorded, without perceptual claims |
| Audition preparation | PASS | Ten local level-matched players; all source files decoded with FFmpeg |
| Browser playback interaction / audible playback | NOT RUN | Page opened; automated browser interaction and human playback not observed in this trial |
| Owner listening / perceived originality | NOT RUN | Requires actual audition |
| Stable Audio comparison | NOT RUN | Gated weights need separate access and terms acceptance |
| Cloud voice processing | NOT RUN | No cloud consent; no voice uploaded |
| Rental cleanup / observed budget | PASS | Instance destroyed; account empty; approximately $0.09 observed debit |
| Final billing reconciliation | PARTIAL | Post-deletion credit captured; final invoice not verified |
| Production integration, M1/M2 and release | NOT RUN | Research outputs do not close these gates |

Evidence is under [evidence/cloud-music-trial](evidence/cloud-music-trial): batch
parameters/timing, hardware and weight hashes, package versions, setup/error logs,
generation log, measurements, rental quote/credit observation and protected-file
hashes. Original audio stays in ignored `renders/cloud-trial-20261018/`; no
API key, SSH private key, model weights or owner recordings are committed.

Next decision: audition the direct and LM takes for realism, groove, repetition,
transitions and endings. A successful research batch supports further evaluation;
it does not waive M1 or justify production integration. Stable Audio, larger
models, diverse consented speech, blinded reviewers, speech-preserving assembly,
queueing, worker lifecycle and production privacy/security remain separate work.

## Sources

- [ACE-Step code and MIT license](https://github.com/ace-step/ACE-Step-1.5/tree/ca1e85fe9430179831e6bc6be790c332190a3866)
- [Pinned ACE-Step weights](https://huggingface.co/ACE-Step/Ace-Step1.5/tree/19671f406d603126926c1b7e2adc169acbcade22)
- [Vast instance API](https://docs.vast.ai/api-reference/instances/create-instance)
- [Stable Audio access requirements](https://huggingface.co/stabilityai/stable-audio-3-small-music)

Context7 was unavailable in this session; provider documentation and pinned
upstream source were used directly.
