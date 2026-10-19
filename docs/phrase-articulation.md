# Phrase-shaped piano articulation: private candidate

2026-10-19. **Technical preparation PASS; musical benefit and promotion NOT RUN.**
Four new concealed A/B comparisons are available at
[the local review page](http://127.0.0.1:4196/review/). Listen around 10–15 seconds
and 27–32 seconds; each version has a full mix and a piano-only player. The
default studio engine remains unchanged. This is deterministic score research,
not another training run or a learned improvisation result.

The current Call & Response planner carries the source rhythm and accents into
instrumental answers, but assigns every answer note the same 320-tick duration
(one-third of a beat). This candidate varies those durations with the available
space between phrase attacks. The hypothesis is that articulation and phrase
endings may help the response flow. Neither the hypothesis nor a numerical
waveform change establishes that it sounds more natural.

## What changes

The research utility accepts an existing consented, constant-tempo, 48 kHz,
16-bar Call & Response score. It uses the current two answer windows (zero-based
bars 5–6 and 13–14); other forms and already-modified answers are rejected.
It takes three quarters of the gap to the next attack or bar boundary, rounds
down to an eighth of a beat, and bounds duration to 120–1440 ticks. The last
answer note can sustain into the remaining response space. Note-offs stay before
the next bar, and scheduled notes retain an 80 ms margin around voice events.

All four owner takes change 16 durations, from 320 ticks to 360–1440 ticks.
The largest note-off extension is 625 ms at 112 BPM, or 603.46 ms at 116 BPM.
Attack frames, pitches, velocities, voice clips/events, bass, drums, mix controls,
tempo, form and ending chords are unchanged. The native validator accepts every
candidate without fallback; exported scores exactly match the requested plans.

This uses **inter-attack space**, not measured syllable sustain, semantic timing
or inferred human intent. Note-offs do not guarantee acoustic silence: the
instrument release and room response continue naturally. Sustaining the last
note might sound too drawn out; the comparison explicitly asks listeners to
check that. Longer notes are not automatically more expressive.

## Evidence

| Gate | Status | Result / boundary |
| --- | --- | --- |
| Research logic and safeguards | PASS | [Five tests](evidence/phrase-articulation/tests.log): duration bounds, harmonic boundary, input rhythm sensitivity, exact preservation of other fields, voice margin, wrong forms/duplicates, consent/provenance, existing-output refusal and failed-render marker |
| Actual M5 rendering | PASS | [Eight score imports/exports](evidence/phrase-articulation/mac-render.log), four controls and four candidates with stems |
| Actual Linux rendering | PASS | [Eight imports/exports](evidence/phrase-articulation/linux-render.log); existing local Debian arm64 VM, not the physical Intel computer |
| Cross-platform timing/audio | PASS | Eight exact musical plans and event traces; **40 byte-identical master/stem WAVs**, maximum/RMS PCM errors zero |
| Experiment isolation | PASS | Four controls reproduce previous master/stem audio exactly; all 12 candidate voice/bass/drum stems equal their controls; all note-on and non-piano event frames remain exact |
| Playable review | PASS | 16 matched WAVs: full mixes −22 LUFS, piano stems −25 LUFS (within 0.1); maximum true peak −5.5 dBFS |
| HTTP delivery | PASS | [All 16 files decoded through HTTP](evidence/phrase-articulation/review-delivery.json), byte ranges, restricted methods/private paths; server binds only 127.0.0.1 |
| Source/default preservation | PASS | Master, supplied fixture, owner recording, shared engine sources, native renderer and default WASM hashes unchanged |
| Rendered browser interaction | NOT RUN | Required browser execution tools unavailable; HTTP decoding is not a browser play/seek test |
| New human preference / formal listening | NOT RUN | No preference or naturalness score received; concealed owner comparisons are not an independent M1 study |
| Candidate WASM/device/venue checks | NOT RUN | Research uses CLI score import; not integrated into browser generation or device apps |
| Default-engine promotion | NOT RUN | Needs useful listening evidence; C06 and overall musical quality remain PARTIAL |
| Training / learned source-response behavior | NOT RUN | No training, upload or new paid compute; Blood Club checkpoints and reviews preserved |

At identical absolute frames, the original-level full mixes differ as follows:

| Seed | Maximum normalized PCM difference | RMS normalized PCM difference |
| --- | ---: | ---: |
| 4123 | 0.00967407 | 0.00067018 |
| 4124 | 0.00979614 | 0.00065596 |
| 4125 | 0.01293945 | 0.00079453 |
| 4126 | 0.00946045 | 0.00066246 |

These are small signal changes confined to piano sustain/release and its room
response, not a new composition or a measure of perceived improvement. Master
and piano stems use separate loudness targets in the listening copies. The
underlying renders retain their original gains. The private allocation key is
outside the server allowlist; review audio contains no control/candidate labels.

[Measurements](evidence/phrase-articulation/measurements.json) retain note-off
frames, waveform differences, loudness values and preservation hashes. The first
unit run exposed an incorrect expected duration in the test: it allowed a note
to cross the bar boundary. Correcting that expectation from 720 to 360 ticks
made it agree with the intended cap; the algorithm was unchanged. The
[initial failure](evidence/phrase-articulation/tests-initial.log) is retained.

Actual toolchains: Apple M5, 16 GiB, macOS 26.7.1, Apple Clang 21.0.0,
Python 3.15.0, Node 22.23.1, FFmpeg 9.0.2; Linux arm64, GCC 12.2.0, CMake
3.25.1, Python 3.11.2. [Mac](evidence/phrase-articulation/mac-environment.json)
and [Linux](evidence/phrase-articulation/linux-environment.log) receipts record
renderer hashes. The unchanged renderer's full suites and sanitizers were
validated in [the prior engine fix](analysis-offset.md); they were not rerun
for this Python-only research utility. The Linux container/VM were stopped
after rendering. `~/mlx-env` was not changed.

## Reproduce

From the existing checkout, choose a **new** output directory:

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_phrase_articulation.py -v
.venv-analysis/bin/python scripts/phrase_articulation.py \
  --renderer build-mac/djayvo_remix \
  --input renders/voice-20261017-221411/source-pcm.wav --consent \
  --plan renders/analysis-offset-20261019/after/owner-4123.call_response.score.json \
  --output renders/phrase-articulation-new-4123
```

Repeat with seeds 4124–4126 and their corresponding saved plans. Native Linux
reproduction imports each generated `control.json` and `candidate.json` using
the same seed/source and `--style call_response --sample-rate 48000 --stems`.
[measure.py](evidence/phrase-articulation/measure.py) verifies the recorded
Mac/Linux paths and makes a fresh review folder; it refuses to replace that
folder. Update its paths for another run. Existing recordings and prior reviews
must not be replaced. Restart this review server with:

```sh
node docs/evidence/phrase-articulation/serve.mjs
```

Next decision: use actual A/B observations to retain, revise or reject this
articulation treatment. Do not promote it because tests pass, infer ratings from
“continue,” or treat this single-speaker experiment as independent training data.
