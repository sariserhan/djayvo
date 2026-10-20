# R0 evaluation protocol and report template

R0 produces repeatable technical evidence and **blank** human-review material.
It does not run a listening study or begin R1/R2. This supplements the existing
[evaluation protocol](evaluation-protocol.md) and [batch tools](evaluation-batch.md).

## Reproduce and inspect

Use the commands in [datasets/README.md](../datasets/README.md). The final retained
run is `renders/r0-final-evaluation/`. The three canonical plans can be inspected,
compared, validated and replayed independently:

```sh
.venv-analysis/bin/python scripts/r0.py inspect renders/r0-final-evaluation/hiphop.plan.json
.venv-analysis/bin/python scripts/r0.py diff \
  renders/r0-final-evaluation/hiphop.plan.json renders/r0-final-evaluation/reggae.plan.json
.venv-analysis/bin/python scripts/r0.py validate \
  renders/r0-final-evaluation/hiphop.plan.json \
  --manifest renders/r0-final-fixtures/manifest.json --renderer build-jamloom/jamloom_remix
.venv-analysis/bin/python scripts/r0.py replay \
  renders/r0-final-evaluation/hiphop.plan.json \
  --manifest renders/r0-final-fixtures/manifest.json --renderer build-jamloom/jamloom_remix \
  --output renders/r0-another-replay
```

`validate` runs schema and rights checks **and actual temporary native import/render**.
`inspect`/`diff` inspect schema-valid proposals; they do not approve source rights
or native scheduling. Replay rejects stale binary/policy/manifest hashes and
existing output prefixes. Completion manifests are required before accepting WAVs.

## Objective checks

- Independent PCM16 stereo decode: file size, sample rate, duration, non-silence,
  full-scale samples, sample peak ceiling, DC, adjacent steps, release-tail peak.
- Existing native report: nonfinite sample counts, limiter activity, musical
  frames, output frames. Native tests cover memory/callback bounds, malformed
  input, note/source polyphony and release/effect constraints.
- Rule output vs canonical replay at block sizes 512 vs 113: exact WAV bytes and
  instrument event traces. Tests independently calculate every instrument on/off
  frame from ticks using rational arithmetic and check simultaneous-event order.
  Source triggers are not emitted in the existing TSV; exact PCM comparison also
  covers their executed contribution, without pretending to separately observe
  source-trigger timing. Add a vocal-event trace in a future scoped change if needed.
- Structural variation: compare notes, sections, patch set, voice events, mix,
  tempo and bars, excluding seed, session ID and file hash as novelty evidence.
  Require at least three changed musical dimensions per candidate pair. Note-event
  Jaccard distance is a diagnostic only: absolute timing and velocity differences
  can inflate it; it is not a perceptual similarity/copyright test.
- Wall time for planning/rendering and offline render real-time factor. This is
  not time to first audible streaming output. Native `/usr/bin/time -l` records
  one process's CPU/wall time and peak memory, not a sustained thermal benchmark.
- Asset hashes, permission policy and original-signal generation verified before
  planning. No training/provider cost. Environment and tool versions recorded.

The one synthetic speech phrase is an engineering regression control, **not an
unseen held-out human test**. Four original signals exercise the ledger and
non-person audio format. They are not evidence of accents, laughter, languages,
multiple speakers, noisy microphones, or 1–8 second input generalization.

## Prepared human protocol — NOT RUN

`review/listener/index.html` contains the preserved source and four blinded,
RMS-matched candidates (three arrangements and the fixed-loop control).
`responses.csv`, `pairs.csv`, and `extended-ratings.csv` are blank. The organizer
key must remain hidden from listeners. RMS matching is not integrated LUFS.

The current rule planner is also the previous planner: R0's wrapping/replay is
byte-identical. A separate previous-model listening arm would currently duplicate
these candidates and cannot establish improvement. Record that equivalence; add
an actually different frozen prior planner only when one exists and is authorized.

For a future authorized study, preregister a diverse consented source cohort,
independent listeners (at least three), anonymized source/session groups, random
candidate order and comparisons. Rate recognition, enjoyment, groove, coherence,
originality, variation, transitions, mix quality and willingness to share;
collect timestamps and failure examples. Keep the added variation/transition/mix
ratings separate from the existing summary dimensions. Do not average these into
one unvalidated quality score. Use the existing `summarize_listening.py` for its
supported dimensions and Wilson intervals; a later study must aggregate the new
extended dimensions and account for repeated listeners/sources (not independent
clip rows). Report paired effect sizes and confidence intervals, with n=0 left
blank rather than fabricated for this R0 run.

Prospective pilot thresholds remain ≥85% structurally valid, ≥90% recognizable
hook outputs, ≥70% enjoyed, ≥30% volunteered willingness to share, with credible
improvement over control. Do not alter thresholds after looking at results.
These are proposed gates, not professional parity or release certification.

## Per-run report template

```text
Commit, engine/policy hashes, source ledger hash, environment:
Scope and source/listener sample sizes:
Schema/rights/native validation: PASS/PARTIAL/FAIL/NOT RUN
Actual render / nonfinite / peak / duration checks: PASS/PARTIAL/FAIL/NOT RUN
Deterministic replay and event-frame agreement: PASS/PARTIAL/FAIL/NOT RUN
Structural variation and diagnostic distances: PASS/PARTIAL/FAIL/NOT RUN
Cross-platform execution and waveform differences: PASS/PARTIAL/FAIL/NOT RUN
Wall/CPU time, peak memory, streaming latency and thermal limits:
Human recognition / musical quality / originality: PASS/PARTIAL/FAIL/NOT RUN
Per-dimension ratings, paired effects, intervals, failure timestamps:
License/consent exceptions, exclusions, withdrawal/deletion actions:
Overall milestone status and blockers:
Next recommendation; no implicit authorization:
```
