# M0a listening review

The foundation rubric below remains useful. The continuation now also supplies
three source-driven arrangements and a prepared synthetic pilot; the M1 protocol
follows. Unblinded owner feedback on the first voice trial is now **PARTIAL**:
awkward experimental passages, game-like instruments, and a request for varied
openings. See [acoustic-review.md](acoustic-review.md) for the response. This is
not a completed rubric or blinded trial; formal M1 gates remain **NOT RUN**.
The owner subsequently accepted v4 piano/drums (“they are fine”); this informal
feedback is recorded in [the current report](workflow-hardening.md), not as
completed blinded ratings.

Formal rubric status: **NOT RUN**. No formal rubric scores have been collected.
Informal owner feedback is recorded above. Signal checks demonstrate a valid
recording, not enjoyable music.

Open `renders/m0a.wav` in a WAV player. Start at a comfortable playback volume.
Listen through the full 11.6 s export (the last 2 s are release space). Record
the listener, playback setup, artifact SHA-256, and these observations:

1. Can piano, bass, and percussion each be heard as separate parts?
2. Does the groove feel steady, and do the bass and piano fit harmonically?
3. Are the variation and ending understandable?
4. Are there objectionable clicks, distortion, harsh hats, imbalance, or a cutoff?
5. Is the timbre adequate for an offline foundation, and what should improve first?

Report instrument realism, groove, balance, and ending separately using PASS,
PARTIAL, FAIL, or NOT RUN with actual comments. A single audition can guide M0a
review but cannot establish blinded musical-quality or enjoyment claims. The
larger voice-remix comparison protocol belongs to later authorized milestones;
there are no recordings, recognizable speech, or baseline-remix claims in M0a.

## Prepared pilot and M1 preregistration

Preparation status: **PASS** for tools/assets; M1 evidence status: **PARTIAL**.
Actual human observations: **NOT RUN**. The synthetic fixture is not part of an
eligible human speech dataset and cannot establish speech recognizability.

The comparison control is an original four-bar instrumental arrangement repeated
three times with full source at fixed positions. It represents the voice-over-
fixed-beat baseline; it is not a downloaded commercial loop. The three candidate
strategies derive note/chop timing from input. Render and prepare one block:

```sh
./build/djayvo_remix --input SOURCE.wav --consent --output renders/trial/remix --style all --stems
./build/djayvo_remix --input SOURCE.wav --consent --output renders/trial/control --style baseline
python3 scripts/prepare_listening.py --renders renders/trial/remix --baseline-renders renders/trial/control --source SOURCE.wav --output renders/trial/blinded --seed 4123
```

For generated non-person fixtures, substitute `--synthetic-fixture` explicitly.
Use fresh export prefixes and do not rerun packaging over existing response files.
Preparation verifies completion records/hashes; use `--legacy-export` explicitly
only for retained historical exports that predate completion markers.
Only give `listener/` to reviewers. The organizer key must remain concealed until
responses are locked. Candidates are matched to one common full-file RMS target
with headroom; this is not perceptual LUFS matching. Codecs/metadata do not expose
strategy names, although genre itself is intentionally audible. The original
source is included for recognition judgments. Files remain local by default.

For multiple clips/seeds, use the [batch preparation workflow](evaluation-batch.md).
It freezes source/permission and engine/rubric hashes, records failed attempts,
and emits distinct `block_id` values plus blank forms. Readiness checks are not
listening results. An owner-only pilot cannot authorize independent review.

Before collecting scores, freeze this rubric, engine commit, fixture hashes,
seed schedule, and technical acceptance criteria. Collect 20–50 diverse clips
with documented permission for analysis/sampling and the intended review use:
speech, syllabic speech, laughter, claps, noise, and silence/control. Include at
least ten speech/syllabic clips from multiple speakers/sessions. Do not use
unauthorized recordings. Render each eligible clip with the three strategies
and three fixed seeds (4123, 4124, 4125); balance review blocks to avoid fatigue.
Keep non-speech results separate from speech recognition. Silence should reject
with a clear error and is an expected input-validation control, not music.

Seek at least three independent reviewers per eligible block. Randomize coded
candidate order and control side in paired comparisons. Record 1–5 ratings for
groove, coherence, originality and enjoyment; yes/no for recognizability,
share-worthiness and technical failure. Then compare each candidate with the
control in `pairs.csv`, selecting a preferred code or tie. Do not substitute
synthetic ratings, an AI judge, or a developer's signal inspection for listeners.

Predeclared provisional gates from the master specification:

| Gate | Rule | Current status |
| --- | --- | --- |
| Technically usable | >=85% of eligible energetic-input attempts export valid finite, bounded audio | NOT RUN on the human dataset |
| Recognizability | >=90% yes on speech-containing accepted outputs | NOT RUN |
| Enjoyment | >=70% ratings >=4/5 | NOT RUN |
| Share intention | >=30% yes | NOT RUN |
| Variety | Three independently arranged outputs; real reviewers confirm audible differences | PARTIAL — structures tested, listening missing |
| Critical glitches/clipping | Zero in accepted outputs | PARTIAL — synthetic technical checks only |
| Improvement over control | More than half of paired per-clip majority judgments prefer a custom candidate; report ties and each style separately | NOT RUN |

Aggregate per clip first to avoid treating repeated seeds/reviewers as unrelated
sources. Retain per-style failures and individual judgments; do not conceal a
failed style behind an overall average. Report sample sizes and uncertainty;
these thresholds are provisional product gates, not established user research.
Keep M1 open until actual evidence is reviewed. Refine timbre, groove, or phrase
selection from observed defects before model work or larger training proposals.
