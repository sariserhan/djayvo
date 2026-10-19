# What the style adapters actually changed

2026-10-19, local Apple M5 analysis. **Diagnostic execution PASS; musical
improvement NOT RUN; perceptual interpretation PARTIAL.** No new rental,
upload, model training or production change occurred. The master is unchanged.

The Blood Club bass and funk outputs remain strongly waveform-correlated with
their matched base outputs. The hip-hop outputs change more. This narrows what
the trial demonstrates: training affected the audio, but neither a new musical
arrangement nor better improvisation follows from that fact. We must not choose
a checkpoint simply because it produces the largest numerical difference.

## Matched checkpoint comparison

The existing diagnostic now compares all checkpoint pairs for each identical
prompt and seed, rather than only comparing outputs to training excerpts. It
also fits `target = gain × base + DC offset` at the original sample alignment,
then reports the residual separately. Constant gain/DC changes cannot count as
new residual content. Negative polarity is retained in the signed correlation.

Audio is decoded to mono at 4 kHz. The window search retains the established
two-second query window, one-second hop, sample-by-sample target search and
absolute-correlation threshold of 0.8. Coverage is the union of flagged query
windows, so overlapping detections are not counted twice. A 30-second coverage
does **not** mean identical audio or that every sample exceeds a threshold.

| Brief | Base/80-step aligned correlation | Base/160-step correlation | Matched query coverage, 80 / 160 steps |
| --- | ---: | ---: | ---: |
| Bass, seed 7441 | 0.9926 | 0.9615 | 30 / 29 s |
| Bass, seed 7442 | 0.9957 | 0.9897 | 30 / 29 s |
| Funk, seed 8123 | 0.9903 | 0.9854 | 30 / 30 s |
| Hip-hop, seed 9123 | 0.8225 | 0.6467 | 24 / 6 s |

After fitting gain/DC, the residual RMS relative to the target's centered RMS
is 0.092–0.139 for the early bass/funk takes, 0.143–0.275 for the later ones,
and 0.569 / 0.763 for early/later hip-hop. These ratios are **not percentages of
new composition**, nor perceptual distances. Small timing or phase changes,
timbre, mix, distortion and changed notes can all affect the measurements.

For context, the earlier x/y adapter's four aligned correlations are 0.8449,
0.8020, 0.8642 and 0.4993, with matched query coverage 28, 23, 25 and 2 seconds.
Its data, learning rate and number of steps differ; this is not a controlled
comparison of training recipes or evidence that the earlier adapter is better.

The Blood Club second bass seed's earlier passages matched later passages over
**17 s** of query coverage in both base and early outputs, and **16 s** in the
later output. The later first bass seed adds a two-second flag. Those are
earlier query intervals only; later matching regions are not added to this
coverage. The previous total of 37 overlapping flags remains unchanged.
Repetition can be musical; this audit does not label it good or bad.

Full results: [Blood Club](evidence/style-effect/blood.json),
[previous adapter](evidence/style-effect/previous-adapter.json).

## Training/holdout audit

The four locally held-out windows were compared with all sixteen training
windows: **64 pairs**, with no model inference, fitting or checkpoint selection.
Two windows crossed the fixed waveform threshold, both between `blood-20.wav`
and `blood-16.wav`:

| Original recording, holdout query | Original recording, training match | Correlation |
| --- | --- | ---: |
| 9:33.000–9:35.000 | 7:30.887–7:32.887 | 0.838467 |
| 9:34.000–9:36.000 | 7:31.2525–7:33.2525 | 0.816224 |

The two query windows overlap; their combined coverage is **three seconds**,
not four. These are similarity candidates, not proof of identical samples or
of a particular musical phrase. All twenty clips also share one declared source
group. **Independent source-group split: FAIL. Independent generalization:
NOT RUN.** Chronological separation within this recording cannot supply the
independent evaluation needed for a production claim. A zero-flag scan would
not establish that independence either.

Four exact two-second PCM crops are available for local inspection, without
changing the prepared clips or the original MP3:

- First match: [held-out passage](../renders/style-effect-20261019/overlap-1-holdout.wav)
  and [training passage](../renders/style-effect-20261019/overlap-1-training.wav).
- Second match: [held-out passage](../renders/style-effect-20261019/overlap-2-holdout.wav)
  and [training passage](../renders/style-effect-20261019/overlap-2-training.wav).

These crops preserve original PCM and levels; they are inspection aids, not
level-matched musical-quality comparisons. Their file hashes and exact source
frames are in [the excerpt manifest](evidence/style-effect/audition-excerpts.json).
The model comparisons remain at **http://127.0.0.1:4195/review/**, with their
original audio, loudness matching and concealed assignments unchanged.

## Validation and boundaries

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Gain/DC and interval-union checks | PASS | Five tests cover gain, polarity, offsets, shifted/unrelated content, silence, malformed inputs, overlap merging and prior safeguards |
| Actual waveform analysis | PASS | 12 Blood Club checkpoint pairs, four previous-adapter pairs and 64 train/holdout pairs |
| Previous diagnostic results | PASS | Every preexisting result field agrees exactly for both trials |
| Independent split-audit repeat | PASS | All 64 pair results and input hashes reproduced |
| Playable diagnostic crops | PASS | Four PCM16 stereo 48 kHz, two-second excerpts, exact source bytes |
| Source/model preservation | PASS | 28 protected source hashes and all 45 retrieved GPU artifacts unchanged |
| Independent source-group split | FAIL | One declared source group; cross-split waveform flags also found |
| Interpreting composition, novelty and creativity | PARTIAL | Mono low-bandwidth waveform checks miss transformed/melodic reuse and do not judge musical structure |
| Human listening / musical improvement | NOT RUN | No new owner preference supplied; no score inferred |
| Native/browser event-frame agreement | NOT RUN | Shared engine unchanged; model outputs have no engine event stream |
| New training / production promotion | NOT RUN | Checkpoints remain candidates; no new spend |

The analysis uses the existing isolated Python 3.15.0 / NumPy 2.5.4 / SciPy
1.18.1 environment and FFmpeg 9.0.2 on macOS 26.7.1, Apple M5. `~/mlx-env` is
unchanged. The preserved [trial results](blood-training-run.md) remain valid;
this follow-up adds evidence and does not replace the original measurements.

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_style_overlap.py -v
.venv-analysis/bin/python scripts/check_style_overlap.py --blood --output /tmp/blood-effect-new.json
.venv-analysis/bin/python scripts/check_style_overlap.py --output /tmp/previous-effect-new.json
.venv-analysis/bin/python docs/evidence/style-effect/audit-split.py --output /tmp/blood-split-new.json
```

Each diagnostic refuses an existing output file. The crop manifest records
`source_start_frame` and `frames`; reproduce a crop by reading that exact PCM
range from the recorded source WAV with Python's `wave` module and writing the
same stereo PCM16/48 kHz format. No synthesis or trained inference is involved.

The next quality decision still needs listening preference and better data.
Retain separate cleared source groups for evaluation and verified phrase/response
examples for learning improvisation. More steps on the same reference, or picking
the most changed waveform, would not resolve those evidence gaps by itself.
