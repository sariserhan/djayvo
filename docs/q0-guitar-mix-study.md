# Q0 — Guitar calibration in complete arrangements

2026-10-20. **Technical execution PASS. Musical acceptance NOT RUN.
Overall Q0 PARTIAL; earlier rejected packets remain FAIL.**

The isolated guitar calibration now has a controlled full-mix comparison for
all five authorized inputs. This follows the
[instrument diagnostic](q0-guitar-layer-study.md), which reduced a large
velocity-layer level discontinuity. The owner's request to continue authorized
this experiment; it is not recorded as listening acceptance.

## What changed

The five [phrase-form plans](q0-phrase-form-study.md) are imported unchanged.
Sources, note pitches, velocities, durations, tempo, instrumentation, vocal
clips/events, effects and track gains stay fixed. Controls reuse the existing
master WAVs byte for byte. Candidates use the previously measured sampler
object, linked into an isolated CLI with the frozen core archive.

No guitar gain compensation is applied. This deliberately measures the
calibration's effect on existing mix balance before deciding whether it belongs
in the production engine. These scores use ordinary guitar velocities below
85 and muted guitar passages; they do not cross the layer boundary. The prior
isolated probes test that boundary. This study tests the collateral change to
existing complete arrangements.

The current comparison reuses `scripts/q0_phrase_trial.py --guitar-layer`,
its existing loudness matching/private review controls, and
`scripts/q0_phrase_evidence.py`. The default phrase-form experiment remains
available. A regression test checks that changed sampler objects, source files
or the frozen archive are rejected before compilation.

## Results and mix-balance risk

The raw guitar stem becomes quieter:

| Source | Guitar RMS change |
|---|---:|
| Owner speech | −4.840 dB |
| ls-2277-149896-0026 | −9.303 dB |
| ls-2035-147960-0013 | −4.258 dB |
| ls-2086-149220-0047 | −4.258 dB |
| Commons laughter | −4.258 dB |

The calibrated medium samples receive different attenuation by sampled pitch
and take, while muted notes stay unchanged. This can alter the relationship
between ordinary and muted guitar passages as well as overall level.
Simply raising the entire guitar track would also raise the unchanged muted
notes; this experiment does not assume that would be a satisfactory remedy.
Lower guitar energy is not evidence of better musical balance.

All piano, bass, drum and vocal stems are byte-identical to their controls.
The independent mix check subtracts before/after guitar stems and compares
that difference with the full-master difference: maximum residual is **one
PCM16 unit**, within the three-unit quantization/summation tolerance. Thus the
measured change is explained by guitar alone. The tolerance is an engineering
check, not a revised musical-quality benchmark.

All five exported scores and event TSVs are unchanged. Five candidate
WAV/score/event replays at block sizes 512 and 113 are identical. Both sides'
**4,244 instrument event rows** have zero frame errors. All thirty new
masters/stems decode without full-scale samples or silence; each master reports
zero limiter interventions. All ten listening mixes are within **0.01 LU of
−23 LUFS**, with maximum true peak **−6.34 dBTP**.

## Listen

[Private full-mix comparison](http://127.0.0.1:4204/) — start with
`owner-speech`. Each source has two blind candidates at matched overall
loudness. Listen for the guitar's prominence, its ordinary/muted articulation
balance and how the music supports the voice. Leave unheard ratings blank.
Ratings download locally; the organizer key is outside the served directory.
No listener scores have been collected.

Files:

- Candidates: `renders/q0-guitar-mix-20261020/<source>/candidate.<style>.wav`
- Stems: matching `.piano.wav`, `.guitar.wav`, `.bass.wav`, `.drums.wav`, `.vocals.wav`
- Plans/events/reports: matching `.score.json`, `.events.tsv`, `.report.json`
- Controls: `renders/q0-phrase-form-20261020/<source>/candidate.<style>.wav`
- Evidence: [measurements, build identity, tests and waveform isolation](evidence/q0-guitar-mix/)

Packet:
`c45422bce5025c84c8c521e12612b0c43ce0b038d0e765c4b7f73689649e94dd`.
Durations remain 28.214–36.786 seconds. Style suffixes retain the existing
native plan metadata; this is the same authored 112 BPM form.

## Gates

| Gate | Result | Evidence / limitation |
|---|---|---|
| Consent and source integrity | PASS | Same five source hashes and permission records revalidated |
| Experimental build | PASS | Pinned sampler object and core archive; actual Apple M5 compilation/execution |
| Actual audio | PASS | Five masters, 25 stems, five replay masters |
| Plan/event preservation | PASS | All submitted/exported plans and event schedules unchanged |
| Instrument timing | PASS | 4,244 rows, zero frame error |
| Block-size determinism | PASS | Five exact WAV/score/TSV replays |
| Change isolation | PASS | Twenty non-guitar stems identical; master delta explained by guitar within one PCM16 unit |
| Headroom and levels | PASS | Thirty decoded masters/stems; no full-scale samples; zero master limiter interventions; ten matched masters |
| Regression tests | PASS | 13 Q0 tests, including rejection before compilation when pinned inputs change |
| Previous control preservation | PASS | All 107 inventoried phrase-form files retain their hashes |
| Asset provenance | PASS | Frozen licensed assets/archive reused; no new samples or license changes |
| Browser review controls | PARTIAL | Chromium/WebKit decode, width, partial ratings and local download pass; known headless WebKit clock limitation |
| Direct/physical listening | NOT RUN | No automated playback result is treated as hearing |
| Fresh Linux/iPhone/WASM execution | NOT RUN | No cross-target result inferred from Mac |
| Musical improvement and mix acceptance | NOT RUN | No preference inferred from reduced guitar energy |
| Earlier owner acceptance | FAIL | Rejected earlier packets remain rejected |
| Q0 success criterion | PARTIAL | Substantially less robotic, more coherent music still requires listening evidence |

The isolated sampler's three native regression programs passed in the preceding
instrument study; those are prior results, not rerun claims for this CLI. This
run validates the complete rendering path, plans, replay and unchanged stems.
Exact compiler command/version and input/output hashes are in `build.json`.
The M5 environment and immutable master/core hashes are retained in the
linked earlier report and `preservation.json`.

## Reproduce

Choose fresh output/evidence directories for a rerun:

```sh
.venv-q0/bin/python scripts/q0_phrase_trial.py --guitar-layer \
  --output renders/q0-guitar-mix-20261020
.venv-analysis/bin/python scripts/q0_phrase_evidence.py \
  --trial renders/q0-guitar-mix-20261020 --output docs/evidence/q0-guitar-mix
.venv-analysis/bin/python docs/evidence/q0-guitar-mix/verify-mix.py
.venv-q0/bin/python tests/integration/verify_q0.py
.venv-q0/bin/python -m http.server 4204 --bind 127.0.0.1 \
  --directory renders/q0-guitar-mix-20261020/listener
```

In another terminal:

```sh
Q0_REVIEW_URL=http://127.0.0.1:4204/ Q0_CANDIDATES=2 node tests/q0_review_browser.mjs
```

`verify-mix.py` checks the frozen paths and all experiment-file hashes. Keep the
combined packet private because it contains the owner's consented recording.
No training, uploads, new dependencies, paid services, dashboard redesign or
production promotion occurred.

The result argues for caution about promoting the calibration unchanged:
its effect on existing guitar balance is substantial. The next Q0 decision
requires listening to these complete arrangements before choosing any
compensation or sampler revision. Existing references, instrument realism and
creative planning still need musical evaluation; this experiment does not
close those gaps or authorize a later milestone.
