# Improvise recording integration — 2026-10-23

**PASS: local implementation and technical audio checks. PARTIAL: musical qualification. NOT RUN: updated worker publication, hosted inference and website deployment.**

Improvise now requires the user's recorded sound in the finished arrangement. It chooses among up to four usable crops, including a whole short recording (up to five seconds), an intact recognized phrase or clause, and pause-bounded non-speech sounds. Recognized speech uses word/phrase boundaries rather than energy cuts through words. Silent or unusable input fails before song inference. Longer recordings remain preserved and supply an excerpt.

The existing owner-approved same-song A/B methods remain: play over ongoing music in a vocal gap, or replace one isolated estimated singing phrase before the singer answers. The arranger also tries returning hooks and short beat-spaced loops. It retains single calls, varies choices with a seed and recent local history, and does not force alternation. Repeats are bounded to three plays and six seconds total, leave room between calls, avoid estimated singing, protect the ending and require headroom. Source pitch and playback speed stay natural; rhythm comes from placement and repetition. Music outside all edited regions must remain bit-identical.

If the first crop cannot fit, the pipeline tries another. If none fit, the job fails rather than delivering a song without the source. The website verifies source and final-audio hashes plus bounded placement events before settlement. Invalid completed results use the existing failed-job cleanup and credit-release path. Existing saved songs are unaffected. No database migration is needed.

## Evidence

- **PASS:** 12 arranger tests, 7 studio-flow tests and 12 worker tests. Covers actual repeat mixing, beat spacing, unchanged PCM, clipping/overlap/bounds, intact source preservation, whole/non-speech input, silence rejection, retrying another crop and refusing source-free output.
- **PASS:** 16 cloud/PostgreSQL checks in a disposable local database, including omitted/mismatched source refunds, valid repeated-call settlement once, private output and temporary source cleanup. TypeScript passes.
- **PASS:** 30 actual local mixes of five existing generated songs (reggae, house, funk, acoustic pop, drum and bass), with whole and excerpt selections and all three arrangement patterns. All preserve original files and PCM outside the edits; isolated source error is at most half a PCM16 step. These are new mixes of existing performances, not fresh model-generated songs. [Machine-readable receipts](evidence/improvise-blending/renders.json), [reproduction](evidence/improvise-blending/render.py).
- **PASS:** Chromium/WebKit recording import/normalization, correct style/singer payload, no early upload, credit/public/private confirmation, queued/running/reconnect/reload, completion and cancellation; mobile overflow/accessibility and shared Music DNA recovery. Provider calls are fixtures, audio playback muted, and uploads use a synthetic WAV. [Results](evidence/improvise-blending/browser.txt).

Run the audio reproduction with `.venv-singer/bin/python docs/evidence/improvise-blending/render.py <new-output-directory>`; it refuses to overwrite existing evidence. Local outputs live in `renders/improvise-blending-20261023-final/`. Python and database logs are retained beside the report.

## Limits and release order

Estimated vocal separation and beat positions do not prove musical fit. The earlier A/B listening approval does not approve these new repeats/crops. Listening to the new mixes is **NOT RUN**. Additional styles, noisy recordings and full end-to-end new inference are not qualified by these five existing performances.

Publish the updated worker before enabling the new website completion gate. Old workers do not emit the required source-bound receipt and their results will fail/refund under the new gate. Drain in-flight Improvise jobs before switching versions. No worker image or website was published in this task, and no new paid compute was used.
