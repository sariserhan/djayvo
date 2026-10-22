# Musician training curriculum — 2026-10-21

**Preparation PASS; training NOT RUN; overall PARTIAL.** The owner requested
training for DJ performance, music creation, improvisation and music theory.
This is a bounded first curriculum, not all musical traditions or a trained
checkpoint. Writing instructions does not change model weights or application
behavior. Listening and physical checks remain deferred.

## What actually exists

The product's local composer is the shared rule-based C++ engine. Its executable
plans and browser actions already support capture, notes, mixing and replay.
There is no trained general-purpose musician planner to resume in `ai/director`.

The separately trained audio candidate is **ACE-Step 1.5 turbo**, with x/y and
Blood Club LoRA experiments. Preserve both Blood Club checkpoints (80 and 160
steps); neither has been accepted as the quality winner. See the
[actual run](blood-training-run.md) and [split audit](style-adapter-effect.md).
The latter found cross-split waveform overlap: those clips cannot establish
independent generalization.

ACE-Step's pinned [training tutorial](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/LoRA_Training_Tutorial.md)
uses audio, captions and optional musical annotations, with reviewed lyrics where
applicable. Context7 tools were unavailable; the official pinned document was
checked directly. Feeding this curriculum to that audio adapter is not a supported
substitute for demonstrations of the desired sound. The existing trainer also
does not learn Jamloom deck-control commands from an audio recording.

The [local inventory](evidence/musician-training/inventory.json) verifies the
retained demonstration rows, clip hashes and adapter hashes. It audits these
known artifacts, not every private recording or browser database. The six R1 rows
are scripted evaluation material, not reviewed expert supervision. The sixteen
Blood Club training windows have no human content review or verified action
annotations. No permissions are changed by this curriculum.

The owner subsequently located the references in Downloads. A read-only
[inventory](evidence/musician-training/downloads-inventory.json) confirms four
additional previously analyzed recordings: `f.mp3` (114.41 s), `down.mp3`
(143.80 s), `question.mp3` (155.32 s) and `pipe.mp3` (79.66 s). These total
approximately 8.22 minutes; their historical scope is analysis-only. A specific
training-rights question is pending. The location reply is not recorded as a
new training-rights attestation. The owner's microphone recording and generated
Night Current exports were excluded. None of the four supplies verified action
labels merely by being present in Downloads.

## Curriculum and demonstration assignments

Each row is an **assignment to demonstrate and review**, not an observed successful
performance. Record an appropriate example and an instructive failure under the
same starting state. Annotate the reason for the choice and when another choice
would be valid. Numerical tests assess execution; musical effectiveness needs
listening. Examples below are original teaching briefs, not excerpts from songs.

Musical conventions depend on style and intent. Tonal resolution, regular phrase
lengths, steady pulse, diatonic notes and equal temperament are useful starting
contexts, not universal laws. Teach uncertainty, silence and deliberate exceptions.
Never enforce tonal or metrical conventions as safety constraints.

### Rhythm and timing

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| R01 | Count beats, bars and subdivisions; place eight bars of quarter/eighth/sixteenth notes on a declared 4/4 grid. | Reject unit confusion and cumulative frame drift; distinguish this grid from musical preference. |
| R02 | Identify downbeat and phrase start; annotate a pickup before the first full bar. | A loud transient need not be beat one; retain uncertainty and manual correction. |
| R03 | Demonstrate straight, swung and triplet feels with the same motif. | Avoid independent random jitter; preserve intended subdivision and accents. |
| R04 | Build syncopation over a stable pulse; leave space before a strong arrival. | Distinguish intentional displacement from accidental late playback. |
| R05 | Demonstrate 3:2 accents over a shared cycle, then return together. | Do not confuse polyrhythm with a tempo change; review cycle alignment. |
| R06 | Write a fill into a new phrase, contrasting half-time and double-time feel. | A feel change need not double transport BPM; avoid filling every gap. |

### Harmony and ear training

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| H01 | Identify interval, pitch class, octave and register from an original note sequence. | Octave equivalents have different registers; low-confidence pitch stays unknown. |
| H02 | Compare major, natural minor, pentatonic and modal motifs in a stated tonal context. | Do not force speech/noise into a confidently asserted key. |
| H03 | Construct triads and seventh chords with inversions; label roots and bass notes separately. | An inversion changes bass, not necessarily the chord's root. |
| H04 | Demonstrate tonic, predominant and dominant functions in a tonal phrase, plus a static modal vamp. | Functional harmony is not required in every style. |
| H05 | Connect two chords with common tones and small voice movements; contrast a deliberate register jump. | Avoid blindly moving every part by the same interval or forbidding all parallel motion. |
| H06 | Introduce a passing tone, suspension, borrowed chord or modulation with an audible purpose. | Out-of-scale notes are not automatically errors; review preparation and destination. |

### Melody, bass and composition

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| C01 | Write a short original motif; repeat, transpose, sequence and rhythmically vary it. | Distinguish development from a completely unrelated new melody each bar. |
| C02 | Shape a phrase with contour, rests and a chosen arrival note. | Avoid uniform endless notes; a leap may be intentional. |
| C03 | Compose a bass part that relates to the harmony and leaves useful kick space. | Root-only bass and constant kick doubling are options, not universal requirements. |
| C04 | Write a supporting counterline in another register with complementary rhythm. | Assess masking and competing hooks, not just pitch legality. |
| C05 | Develop an intro, statement, contrast, return and ending within a fixed duration. | Do not mistake a louder repeated loop for structural development. |
| C06 | Recast one original motif in contrasting groove/instrument vocabularies. | Keep genre labels descriptive; do not target an artist's identity or signature recording. |

### Improvisation and source response

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| I01 | Select a recognizable consented phrase and preserve an intelligible clean anchor. | A high signal level does not prove the words remain recognizable. |
| I02 | Answer source rhythm with a different instrument after the phrase ends. | Avoid mechanically talking over every source syllable. |
| I03 | Translate a reliable speech contour into a bounded melodic answer. | Preserve uncertainty; do not treat octave errors or noisy pitch estimates as truth. |
| I04 | Develop a motif across three responses, changing one meaningful dimension at a time. | Measure difference separately from perceived novelty or enjoyment. |
| I05 | Choose between playing, sustaining and resting based on current density and human activity. | More notes and layers are not automatically more responsive. |
| I06 | Adapt at the next schedulable phrase boundary; recover from a late or invalid proposal. | Keep the current groove running; human override takes precedence. |

### DJ preparation and transitions

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| D01 | Cue a local track, verify beatgrid/downbeat and prepare its intended entry. | Automatic BPM is an estimate; never assume every track is steady 4/4. |
| D02 | Match tempo and phase, then make a small jog correction during a blend. | Equal BPM alone does not imply aligned beats. |
| D03 | Align musical phrases for a long blend and contrast a deliberate short cut. | Eight/sixteen/thirty-two-bar conventions need track-specific inspection. |
| D04 | Exchange bass and channel level during a transition, retaining sufficient headroom. | Do not stack competing bass parts or rely on the limiter to fix balance. |
| D05 | Choose a harmonically compatible transition or a brief percussive bridge. | Key-wheel neighbors do not guarantee compatibility; uncertain keys require audition. |
| D06 | Build a set with energy rises, recovery and contrast; adapt the next selection to explicit feedback. | Do not invent audience reactions or increase tempo/level continuously. |

### Deck performance and effects

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| P01 | Use hot cues and beat jumps to rephrase a track without losing the intended arrival. | Check source bounds and musical continuity after the jump. |
| P02 | Demonstrate a loop, shortened build and slip roll, then exit on the intended timeline. | Explain whether playhead position continues or stays in the loop. |
| P03 | Demonstrate a short scratch with controlled transport and fader movement. | A rotating platter animation is not evidence of scratch audio or timing. |
| P04 | Make a tempo-synchronized echo-out, then clear feedback before the next phrase. | Prevent uncontrolled feedback and avoid smearing the next vocal. |
| P05 | Contrast filter, reverb, phaser and flanger on a brief original phrase. | Use bounded wet levels; intensity does not establish musical suitability. |
| P06 | Layer a third deck or live instrument, then return to a two-deck mix and panic bypass. | Grant control explicitly; manual actions and transport recovery must survive automation. |

### Expression, instruments and production

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| E01 | Shape note velocities and timing around a phrase accent and response. | Random velocity/timing per note can destroy groove rather than humanize it. |
| E02 | Demonstrate piano/keyboard articulation, release and overlapping voices. | Avoid stuck notes and implausible density; assess instrument realism by listening. |
| E03 | Demonstrate guitar strum order, muted attacks and bass articulation using permitted patches. | A transposed single sample does not establish realistic playing behavior. |
| E04 | Interlock drums, ghost notes, hats and bass with intentional dynamic hierarchy. | Avoid identical accents and every drum filling simultaneously. |
| E05 | Balance gain, EQ, panning and space; compare a dense mix with a clearer version at matched loudness. | Louder is not evidence of better; preserve vocal intelligibility and mono checks. |
| E06 | Automate ducking, transitions and release tails, then render bounded master and stems. | Detect clips, discontinuities and cut tails separately from subjective mix quality. |

### Listening, adaptation and performance judgment

| ID | Skill and exercise | Counterexample / assessment |
| --- | --- | --- |
| J01 | Diagnose repetition, timing, harmonic clashes, masking and awkward source edits with timestamps. | Keep observed faults separate from guesses about their cause. |
| J02 | Compare two concealed, gain-matched performances and allow ties or uncertainty. | Never convert training loss or synthetic labels into human preferences. |
| J03 | Revise one diagnosed defect while retaining the source, motif and successful sections. | Do not improve a proxy metric by deleting the musical content being evaluated. |
| J04 | Perform unfamiliar phrase/tempo/key/style combinations from held-out sessions. | Keep variants of one source/performer/session out of different splits. |
| J05 | Recover from silence, noisy input, missing asset, ambiguous pulse and unexpected user intervention. | Abstain or fall back; never fabricate confidence or continue an unauthorized action. |
| J06 | Produce three distinct interpretations and explain contextual choices without claiming a single correct style. | Measure variety, coherence and recognizability separately; complexity is not quality. |

## Reuse the existing capture and validation paths

Start with the existing [35-technique taxonomy](../techniques.yaml), shared
performance schema and [R1 capture](r1-demonstrations.md). The taxonomy is an
implementation snapshot, not a claim that every assignment above is already
supported. H06 and R05, for example, need capability checks before executable
targets are admitted; never invent unsupported engine commands.

For source-to-music demonstrations retain the authorized source, initial state,
accepted action, next state, final plan, stems and rendered outcome. Reuse the
existing action `reason` for the musician's explanation. Record the curriculum
ID and content review separately alongside the trace; do not change frozen traces
or mark an automated session as human supervision.

For DJ demonstrations use the studio's mix recording, optional aligned stems,
source inventory, deck history and instrument take, following
[private replay](mix-action-replay.md). Its historical timing/decoder limits
remain explicit. A mixed WAV by itself does not reveal exact deck actions.

Keep a distinct rights declaration for training, processing and evaluation, with
speaker consent, group identities, expiry and withdrawal. Playback permission for
the Aurowall catalogue does not authorize training. No source is selected from
Downloads or browser storage merely because it exists locally.

## Training and evaluation sequence

1. **Qualify examples:** obtain reviewed demonstrations for a small subset first,
   with valid action/audio pairs and failure examples. Record missing skills as
   missing rather than padding the corpus with duplicated windows. Existing R1
   exports remain evaluation-only; add a separately tested admission path only
   once actual reviewed data and its training declarations are available.
2. **Split before fitting:** group by source, speaker, performer, session, phrase
   and arrangement; check hashes and near-duplicate audio. Use separate sessions
   for development and final evaluation. Multiple windows are not independent
   recordings. Reserve the final set before choosing hyperparameters.
3. **Teach decision-making:** select a compatible compact planner and benchmark
   schema-valid output against the existing rule director on local hardware.
   Fine-tune state → accepted action/plan only after data qualification. Do not
   introduce an unrelated toy classifier and report it as the existing model.
4. **Improve audio separately:** if reviewed examples demonstrate a timbre or
   production deficit that the deterministic engine cannot address, prepare
   accurately captioned audio for an ACE-Step adapter using the existing pinned
   trainer and controls. Preserve the base and previous checkpoints. More epochs
   on the same weak labels do not supply missing techniques.
5. **Measure real training:** retain exact data/model/code hashes, splits,
   optimizer steps, checkpoint reload, finite/nonzero weight checks, resource
   use and losses. Compare unchanged base, previous candidate and new candidate
   under matched prompts/seeds. Report loss separately from musical quality.
6. **Measure transfer:** test held-out state/action situations, invalid plans,
   manual override and fallback; render actual outputs. Reuse existing waveform,
   repetition, source-preservation and scheduling checks. Synthetic rule agreement
   proves only agreement with those rules, not expert ability.
7. **Resume listening when authorized:** compare blinded, level-matched outputs
   using the existing quality protocol. Keep ties, disagreements and failure
   examples. Only then choose a quality winner or consider production promotion.

The current request authorizes local training work; it does not supply missing
demonstrations or waive the explicitly retained listening gate. Previous GPU
rentals were completed, bounded authorizations. Any new paid experiment needs a
concrete data package, measured configuration, cost/timeout/cleanup proposal and
separate spending approval under `AGENTS.md`. No new rental is requested before
the data is suitable. Local feasibility must be measured rather than assuming
16 GB unified memory is equivalent to the former 24 GB CUDA host.

## Current acceptance

| Gate | Status | Evidence / next input |
| --- | --- | --- |
| Curriculum and integration mapping | PASS | 48 contextual assignments; existing taxonomy, capture, replay and training paths identified |
| Retained artifact integrity | PASS | Local inventory rehashes 16 clips and both Blood Club adapter files |
| Qualified general-musician corpus | NOT RUN | Four additional references located; training permission pending, no reviewed expert action corpus identified |
| New optimizer run / trained checkpoint | NOT RUN | No suitable reviewed corpus admitted; no weights modified |
| Learned performance improvement | NOT RUN | No new training, listening or generalization result |
| Production integration | NOT RUN | Existing rule engine and release gates retained |

No model download, paid compute, audio playback, deployment or source upload was
performed. This document is preparation and a resumable handoff, not completion
of the request to train a general musician.

Reproduce the read-only inventory with
`python3 docs/evidence/musician-training/audit.py`. It checks curriculum IDs and
retained hashes and fails on a changed/missing artifact. The local checker also
passed an isolated corrupt-hash rejection check. It does not deserialize model
weights or certify dataset permissions, technical replay or musical quality.
