# Licensed multi-source evaluation

2026-10-18. A local evaluation cohort now replaces the earlier one-source-only
limitation. Overall M1 remains **NOT RUN**: no independent listeners or ratings
have been invented. Dataset readiness remains **PARTIAL** because recorded quiet
input coverage and human verification of the declared categories remain open.
No model training, audio upload, paid service, publication or reviewer contact
occurred. The owner's private recording is not included in this public-license
cohort or silently granted broader sharing permission.

## Completed gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Corrected technical cohort | PASS | 276 mix WAVs, 69 blinded blocks; 69/69 accepted attempts for each of three styles; all baselines accepted |
| Synthetic silence control | PASS | Three expected rejections; never counted as recorded diversity or music |
| Retained earlier failures | FAIL | Before fix, 66/69 per style; three seeds rejected the mechanical click; retained independently from corrected results |
| Packet audit | PASS | Attribution, source/output hashes and all 483 blank form rows checked; zero submitted ratings |
| M5/Linux release | PASS | 13/13 suites on each platform and actual Mac smoke |
| M5 ASan/UBSan | PASS | Full 13/13 suites, 633.11 seconds; actual Mac smoke also passes 13/13 in 44.99 seconds |
| Recorded-input portability | PASS | 92 byte-identical mix WAVs for one seed across 23 sources; exact score decisions/event frames, max/RMS PCM error 0 |
| Optional model exact parity | FAIL | Earlier synthetic fixture produced seven word estimates on M5 versus six on Linux; timings remain optional and accuracy unverified |
| Mobile listening-page mechanics | PASS | Chromium/WebKit at 390×844; five anonymous players, play/seek, one active player and source credits; WebKit screenshot visually inspected |
| Optional speech timing/crops | PASS | 20 CPU analyses; 54 native-validated proposals, six unchanged fallbacks; no accuracy or musical-quality inference |
| Dataset eligibility | PARTIAL | 23 recorded sources; recorded quiet-input coverage and human category verification remain |
| Independent listening / formal M1 | NOT RUN | No reviewer assignments or ratings; bootstrap implementation does not supply observations |
| Full specification / production quality | PARTIAL | Quality, paused infrastructure/device work and release gates remain |

The frozen engine revision is `6912218`. [Freeze](evidence/licensed-evaluation/freeze.json),
[complete technical report](evidence/licensed-evaluation/report.json),
[packet audit](evidence/licensed-evaluation/audit.json) and
[empty-response summary](evidence/licensed-evaluation/blank-response-summary.json)
retain reproducible evidence. All three seeds produce distinct normalized
four-bar instrumental event structures for each recorded input/style; this is
structural variation, not proof of perceived originality or musical quality.
Corrected mixes last 32.0–32.96775 seconds, peak no higher than -3.936 dBFS,
have no full-scale samples and retain the final 100 ms silence.
[Cross-platform measurements](evidence/licensed-evaluation/portability.json)
record each tested waveform difference separately.

## Sources and rights

Twenty complete 2–5 second utterances come from twenty distinct LibriSpeech
speaker IDs and twenty source chapter/session IDs. Selection takes the first
eligible utterance per distinct speaker in archive order, before rendering any
musical result. This is read English speech, not proof of language, demographic,
acoustic or conversational representativeness. Chapter IDs are source sessions,
not independently verified recording dates.

[OpenSLR's LibriSpeech page](https://www.openslr.org/12/) identifies the corpus and
CC BY 4.0 terms. The 337,926,286-byte dev-clean archive matches the
[published MD5](https://www.openslr.org/resources/12/md5sum.txt)
`42e2234ba48799c1f50f24a7926300a1`. The acquisition ledger records SHA-256 hashes
for the archive, selected FLAC files and converted PCM16 mono 16 kHz WAVs.
Each listener packet retains the supplied `LibriSpeech (c) 2014 by Vassil
Panayotov` notice, creator credits, source/license links and modification notice.
Audio is used under that license, not described as individually obtained study
consent. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) does not itself
settle every possible privacy/publicity right.

Three public-domain recordings supplement speech:

| Input | Declared source | Rights and processing |
| --- | --- | --- |
| Laughter | [Laughter(s).ogg](https://commons.wikimedia.org/wiki/File:Laughter(s).ogg), sagetyrtle | CC0 1.0; first 3 seconds |
| Claps | [Clapping hurray.ogg](https://commons.wikimedia.org/wiki/File:Clapping_hurray.ogg), starlite; metadata credits Zack and friends | Author public-domain dedication; first 3 seconds; may include cheering |
| Mechanical noise | [Clicker sound.ogg](https://commons.wikimedia.org/wiki/File:Clicker_sound.ogg), Maddy | CC0 1.0; complete 2.3205-second recording; a click is not broad ambient-noise coverage |

These labels derive from source descriptions and are **NOT RUN** for human
verification here. They are not claims that all content or identities have been
independently authenticated. A separate three-second procedural silence control
is explicitly synthetic and excluded from recorded-source diversity counts. No
supplied speech fixture was regenerated. The original files and converted inputs
stay under ignored local `renders/`; only metadata/scripts/evidence enter Git.

## Frozen technical comparison

The cohort contains 23 recorded sources plus one synthetic silence control.
The freeze records commit, renderer/source/preparation/rubric hashes, source
permissions and seeds 4123/4124/4125. Each non-silent input receives hip-hop,
reggae and experimental arrangements plus the fixed-loop baseline. Expected
silence rejection is recorded separately, never counted as a successful music
render. Per-style failures remain in the denominator.

Blinded packets use existing common-RMS matching with peak headroom, **not LUFS**.
Each contains source audio, four anonymous candidates, source credits, a local
mobile-friendly listening page and blank rating/comparison CSVs. Only its
`blinded/listener/` directory is suitable for review; the parent tree contains
organizer keys. No packet has been sent to anyone. At least three actual
independent reviewers per eligible block and a completed preregistration remain
necessary. Synthetic controls do not close the missing recorded-quiet condition.

Results and exact attempt counts are retained in
[evidence/licensed-evaluation](evidence/licensed-evaluation/). The frozen output
lives at `renders/licensed-evaluation-validated-20261018`.

## Failures retained during preparation

The initial US archive mirror failed TLS hostname validation. The verified main
OpenSLR host worked; a slow sequential transfer was preserved and completed with
eight bounded range requests, with strict Content-Range/size and final MD5 checks.
Certificate verification was never disabled. The first batch was stopped before
listening to include the exact supplied copyright notice in every packet. Its
partial files and interruption record remain; the corrected cohort uses a fresh
folder. No source, response or prior recording was overwritten.

## Optional timing research

All twenty licensed speech analyses executed locally on M5 CPU (**PASS**), with
2–16 estimated words and English detected for each. Observed inference was
0.284–0.365 seconds, maximum worker peak RSS 422,526,976 bytes, concurrent with
native batch preparation. This is not an isolated performance benchmark or
accuracy result. Three declared non-speech recordings returned zero estimated
words; the procedural silence was rejected before inference. This small set
cannot establish general resistance to hallucinations.

The [optional timing tools](word-timing.md) retain no transcript. Crop proposal
research is separate from the frozen baseline and cannot modify its rating
packets. Word-boundary accuracy, recognizability, musical novelty, groove,
enjoyment and preference all require actual human observations.

## Engine defect found and fixed

The first complete frozen run exposed a real failure on the mechanical click:
`no usable energetic source region`. Its energy was sufficient, but every
transient was shorter than the 83 ms phrase minimum. The analysis now adds a
bounded 200 ms context region around the strongest onset only when ordinary
phrase detection produced none. Existing speech phrase decisions are preserved.
Silence/quiet rejection remains intact; this is energy analysis, not a semantic
claim that an input is speech. Commit `6912218` implements the fix.

New regression checks cover transients at the beginning, middle and end at
8/16/48/192 kHz, source bounds and valid composition. M5 and Linux release suites
pass 13/13 (58.23 s and 63.21 s respectively, under concurrent evaluation load).
The actual recorded click renders in seven directions and baseline. Browser
workers also render all seven directions in Chromium and WebKit. The corrected
cohort is rendered from a fresh freeze; failed attempts remain available.

The speech-timing extension produced 54 native-validated proposals across 60
source/style plans; six retained the original crops. Clean hooks, event schedules
and instrumental tracks are preserved. These optional proposals do not replace
the frozen baseline; their word-boundary accuracy and musical benefit remain
**NOT RUN**.

Commit `e798f8b` adds the response-summary tool, which validates frozen IDs, ratings and baseline pairs,
rejects duplicate/incomplete judgments, reports per-clip means/uncertainty and
keeps source types separate for recognition. Three distinct reviewer IDs are
not treated as verified independence. Blank forms yield **NOT RUN**. See the
[collection and summary workflow](evaluation-batch.md). No study ratings were
created; algorithm tests use disposable, labelled fixtures.
