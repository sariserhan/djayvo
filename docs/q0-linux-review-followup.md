# Q0 follow-up — Linux execution and independent-review preparation

2026-10-20. **Technical gates PASS; overall Q0 PARTIAL. Musical recovery remains
unestablished.** The owner's response “continue” to the new five-condition
listening question authorizes work; it supplies no preference, score or
acceptance. The prior guitar improvement judgment remains **FAIL**.

## Linux execution

The existing project Colima VM and Debian container were stopped. Starting
them restored the installed local compiler without downloading an image or
installing packages. The repository mount is read-only; output uses a fresh
directory in the existing `/out` mount. No audio was sent to a remote host.

`scripts/q0_linux_trial.py` verifies the frozen isolated Q0 source manifest,
builds with GCC in a fresh container directory, runs the three native test
groups and imports all five E plans from the current performance trial. It
rechecks source permissions/hashes and compares actual exports with Mac using
the existing portability comparator and rational event-frame checker.

| Gate | Result | Evidence |
|---|---|---|
| Linux native build and tests | PASS | GCC 12.2.0; `core`, `remix_core`, `live_instruments` all pass |
| Five actual E renders | PASS | WAV, score, events, render report and complete-export receipts validated |
| Plan/event agreement | PASS | All five match Mac; 1,432 on/off rows have zero frame errors |
| Waveform agreement | PASS | All five WAVs byte-identical to Mac; maximum/RMS PCM error zero |
| Existing thresholds | PASS | No changes to maximum 0.001 / RMS 0.0001 normalized PCM limits |
| Source/spec/production preservation | PASS | Prior inventory verifier rerun; original plans, audio and core unchanged |
| Runtime restoration | PASS | Container and project VM stopped after testing; `desktop-linux` remains the active Docker context |
| Physical Intel Linux workstation | NOT RUN | This is ARM64 Linux virtualization on Apple M5 |
| iPhone / live AudioWorklet | NOT RUN | No inference from native offline or Node/WASM tests |

Environment: Debian GNU/Linux 12, Linux `6.8.0-117-generic`, aarch64,
GCC `12.2.0-14+deb12u1`, CMake 3.25.1, Python 3.11.2.
Existing VM: two CPUs, 3 GiB memory, Colima 0.10.3, Apple virtualization on M5.
This establishes execution compatibility, not physical output latency or
Intel CPU performance.

Actual WAVs:
`renders/arrangement-linux/q0-performance-20261020/<source>.<style>.wav`.
The existing Mac and WASM exports remain unchanged. This run adds Linux
evidence to their already-recorded agreement.

## Separate independent-review packet

`scripts/q0_independent_packet.py` reuses the existing frozen listening
WAVs, form and results validator. It includes only records whose already
verified provenance grants independent review, local processing and the
recorded CC0/CC-BY commercial-use license with attribution. It excludes
owner-only permission records and fails closed when no eligible input exists.

The prepared packet contains the three LibriSpeech clips and Commons laughter:
four original recordings plus twenty matched comparison mixes. All 24 WAVs
are byte-identical to the corresponding files in the original packet.
Attribution remains included. No new performance, sample acquisition or
training took place.

- Local preview: [licensed-source review](http://127.0.0.1:4208/).
- Your private five-source packet is still [at 4207](http://127.0.0.1:4207/).
- Independent-review files:
  `renders/q0-independent-review-20261020/listener/`.
- Organizer key, permission manifest and results remain **outside** `listener/`.
  Only the contents of `listener/` are intended for reviewer access.
- Nothing was published or sent to anyone. The local preview is loopback-only.

Packet:
`7095f92d62e2a53555b7c10daf04ec63db2e5d131046b3c35da50a2f2cc0fc72`.

| Gate | Result | Evidence / limit |
|---|---|---|
| Permission filtering | PASS | Owner-only, absent, false and unreviewed-license cases rejected by tests |
| Private-voice exclusion | PASS | No owner audio or section; direct owner-source request returns 404 |
| Packet/key integrity | PASS | New subset packet ID, unchanged WAV hashes, organizer key outside served folder |
| Chromium review flow | PASS | 24 audio elements, 120 blank rating fields, partial-candidate local download, responsive width, no external requests |
| WebKit review flow | PARTIAL | Forms, decoding and pause pass; known headless clock/physical-audio limitation remains |
| Q0 regression suite | PASS | 17 tests |
| Real listening observations | NOT RUN | Zero submitted ratings; synthetic browser fixtures deleted |
| Independent panel / substantial improvement | NOT RUN | Preparing a packet does not recruit reviewers or establish quality |
| Q0 success criterion | PARTIAL | No accepted improvement yet; no production promotion |

This four-source subset is a small diagnostic cohort. It does not replace the
larger dataset, reviewer independence, variety or quality thresholds in the
master specification. Public dataset permission is not individual study consent.
Do not combine ratings from different packet IDs silently or treat reviewer
codes as proof of independent people.

## Evidence and reproduction

[Logs, environment, permissions, hashes and browser evidence](evidence/q0-followup/).
Use fresh output paths on reruns; no frozen exports or responses are replaced.

```sh
colima start --profile djayvo --activate=false --ssh-config=false
docker --context colima-djayvo start djayvo-portability
.venv-q0/bin/python scripts/q0_linux_trial.py \
  --trial renders/q0-performance-20261020 \
  --output renders/arrangement-linux/q0-performance-NEW
docker --context colima-djayvo stop djayvo-portability
colima stop --profile djayvo

.venv-q0/bin/python scripts/q0_independent_packet.py \
  --trial renders/q0-performance-20261020 \
  --output renders/q0-independent-review-NEW
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python docs/evidence/q0-followup/verify.py
```

The last command verifies the retained paths for this run. Start a local HTTP
server on the prepared `listener/` directory for browser review. With this
run's server at 4208:

```sh
Q0_REVIEW_URL=http://127.0.0.1:4208/ Q0_CANDIDATES=5 Q0_SOURCES=4 \
  node tests/q0_review_browser.mjs
.venv-q0/bin/python scripts/q0_listening_results.py \
  --trial renders/q0-independent-review-20261020 \
  --response REAL_DOWNLOADED_RATINGS.json --output NEW_RESULTS.json
```

Results without real responses remain NOT RUN. The next quality decision
requires actual comparative listening; no model training, paid infrastructure,
release, production integration or later milestone has begun.
