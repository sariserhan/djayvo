# Local music validation — 2026-10-23

**PARTIAL:** Broad musical and language quality is still being evaluated. Working
rendering, metadata support and an automated style score do not establish native
lyrics, pronunciation, distinct vocal identity or universal genre fidelity.

## Current evidence

- **PASS, bounded first-try startup:** The approved additional $1 cloud trial
  accepted its first submission without manual retry, prewarming or later scaling
  changes. Iron Roots passed all four style windows. Execution: 67.570 seconds;
  provider queue: 227.434 seconds. Worker capacity returned to zero, temporary
  storage and disposable database removed, no held credits. [Receipt](evidence/song-validation/startup-receipt.json).
- **PASS, actual storage and local website:** `/listening` lists completed test
  takes only after R2 upload, full checksum download and range playback pass.
  Both accepted and style-rejected takes are retained and labelled. Raw source
  audio, private favorite lists and plans are not published. The owner must deploy
  the website changes before this gallery exists on the deployed site.
- **PASS, owner musical reactions:** Iron Roots and Bicicleta en la Lluvia received
  positive reactions. The exact Bicicleta take was not identified. The French
  example sounds good to the owner, who speaks English and Turkish, not French.
  [Original feedback](evidence/song-validation/owner-listening.json).
- **PARTIAL, Turkish:** The owner accepts the music, but correctly flags the
  invalid title Günden Gündüye. Its gallery title is now **Günden Güne**. The
  preserved original written chorus uses “günden günde”; correcting the display
  does not repair the existing sung audio. Future lyric-writing instructions now
  explicitly check natural grammar, suffixes, idioms and real words. This is not
  a proven grammar checker or a substitute for native listening.
- **FAIL, Spanish style reliability:** The original research harness accidentally
  rendered the same seed twice. That evidence is corrected; two actual new seeds
  yielded 1/4 and 0/4 matching windows. No thresholds were weakened. Musical appeal
  and the uncalibrated classifier's decision remain distinct. [Correction](evidence/song-validation/experiment-correction.json), [distinct runs](evidence/song-validation/latin-distinct.json).

## Coverage and genres

`scripts/evaluate_music_coverage.py` runs the existing production pipeline locally
on the Mac GPU, sequentially, with a 15-minute per-case bound. It covers all 50
language settings, all 25 DNA genre families and all 23 Improvise styles in 73
cases. This is not a full language-by-genre cross-product or proof of every
subgenre. Music DNA includes jazz, blues, country, reggae, hip-hop, dance, ambient,
electronic, classical, funk, indie, Afrobeats, amapiano, reggaeton, flamenco,
Arabic traditions, South Asian traditions, lo-fi, experimental and regional folk,
alongside heavy rock, rock, Latin and pop. Broad family grouping still loses
some subgenre specificity.

The completed run and per-case results are preserved in
`renders/music-validation-20261023/report.json`. Finished/rejected takes are
uploaded after each case. Resume only after the prior process has stopped; the
runner verifies original inputs and never rerenders finished cases. A terminal
case whose publication was interrupted is published idempotently on resume.
All subsequent broad tests use local compute, not additional Runpod generation.

**Final baseline result: PARTIAL — 57/73 completed, 16 failed, 111 takes published.**
All 23 Improvise styles completed. Of the 50 DNA cases, 34 completed, 11 failed
the unchanged style check, and five failed lyric-plan validation (Czech, Korean,
Latin, Urdu and Chinese). These are real remaining reliability defects, not
proof that all supported languages work. No timeouts or publication failures.
This run predates reference-guided casting. [Per-case summary](evidence/song-validation/coverage-summary.json).

## Vocal variety

The first caption-only approach chose among eight generic vocal characters: female
alto, mezzo, soprano and textured mid-range; male bass, baritone, tenor and
textured mid-range. Casting uses the song seed independently of language. DNA
casting no longer relies on the lyric model repeatedly choosing the same gender;
Improvise preserves an explicitly requested male/female choice. Stored character
selection survives a style retry. Existing saved plans retain their old captions.
No artist names, voice clones, pitch-shifting or robotic effects are introduced.

All voice descriptions and essential style/language controls fit the singer's
512-character text limit across all families and language settings. The existing
variant harness now supports `--voices`: four real performances with the same
English lyrics, genre, tempo and seed, changing vocal character. Each completed
take is stored in R2 and listed on `/listening`. This is a generation comparison,
not isolated stems; changing conditioning can also change the backing music.
All four real 120-second City Lights takes completed, passed 4/4 style windows and were verified in R2. [Comparison receipts](evidence/song-validation/vocal-comparison.json).

**Owner result: FAIL for vocal distinctness.** The owner reports all four still sound like the same singer. Eight descriptions are not eight verified singers. A local follow-up used the pinned model's separate audio-reference input with two earlier, receipt-bound synthetic singers. The owner subsequently accepted both new auditions: “Different singers, both natural.” This supersedes the failed caption-only approach for new local plans.

Audible distinctness and naturalness require listening; these are directions for
one model, not eight independently verified singer identities.

## Verification and remaining boundaries

41 focused Python checks pass and cover profile selection, explicit gender, legacy plans,
retry preservation, caption bounds, variation receipts and safe batch resumption.
The gallery passed desktop/mobile Chromium and WebKit playback, filtering,
seeking, download checksums and overflow checks. 74 site unit tests, fresh typecheck and production build pass. All four new vocal samples played and sought successfully in muted Chromium/WebKit browser checks; the corrected Turkish title is visible. [Vocal playback receipt](evidence/song-validation/vocal-browser.json). [Browser receipt](evidence/song-validation/browser.json), [Python checks](evidence/song-validation/python-tests.txt), [site checks](evidence/song-validation/site-tests.txt). Vocal comparison receipts are recorded alongside this report when finished. Website/worker publication remains owner-controlled.

The hosted feedback collector currently has zero eligible consented ratings.
Owner chat reactions are recorded as review evidence, not silently converted to
training consent or invented training data. The 07:00 provider bucket now reports $0.14823597110807896; 08:00 remains pending. [Read-only provider receipt](evidence/song-validation/provider-audit.json) confirms workers and jobs remain zero. Native-language review and broad quality acceptance remain open.


### Audio-reference follow-up

The pinned runtime and its [official reference documentation](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/Tutorial.md)
expose a separate global acoustic-reference input. It can guide vocal timbre but
also accompaniment/mixing; it is not a guaranteed singer-identity control.
`scripts/singing_response.py --reference-singer` is a local-MPS research option
only. It accepts a 30-second generated singer under `renders/` with a matching
model/weight/audio receipt and no previous source conditioning or trained adapter.
It refuses private/favorite recordings and rechecks provenance after inference.
The explicit research override is not exposed through a web API. New local DNA
and Improvise plans now select the two accepted references automatically. CUDA
workers retain their previous behavior until reference assets are packaged and
the worker update is authorized and qualified.

The follow-up holds City Lights lyrics, tempo, seed and corresponding caption
constant, adding the earlier unconditioned `hiphop-female` or `reggae-male` synthetic
render as a reference. Whole-mix references may affect genre; the ordinary style
check remains unchanged. Each finished trial is preserved in the listening gallery with its actual result.
These two auditions establish an accepted starting pair, not a broad voice pool.


Reproduce locally, with no other singer process holding the GPU lock:

```sh
JAMLOOM_INFERENCE_DEVICE=mps HF_HUB_OFFLINE=1 .venv-singer/bin/python scripts/evaluate_dna_variants.py --source renders/music-dna-songs/1efec7e67eac4fba84953291f68ed7da --output renders/vocal-reference-repeat --seed 9102400 --reference-singers renders/singing-response-20261022/hiphop-female renders/singing-response-20261022/reggae-male
```

The publication step requires Node 22 on PATH and the existing operator R2
configuration. This command intentionally stores the authorized test songs; it
does not deploy the site or publish a worker image.

**Follow-up result:** Both real 120-second reference-guided takes completed, passed all four style windows and were stored in R2. Exact baseline cases/captions/seeds match, runtime logs confirm reference processing, and both output hashes differ from their controls. These technical facts establish that the reference input was exercised. The owner separately confirms distinctness and naturalness for this pair. 42 focused Python tests passed at that stage. [Trial evidence](evidence/song-validation/vocal-reference-comparison.json). Owner listening: PASS for distinctness and naturalness of these two English pop versions; other genres and languages remain unqualified.

Both new trials also passed muted Chromium/WebKit mobile playback and seeking, with no page errors. [Browser evidence](evidence/song-validation/reference-browser.json).


### Accepted local singer selection — 2026-10-23

New local plans save an accepted reference ID, independent of language and
matching the selected gender. The matching caption profile stays consistent
with the audition. A genre retry keeps the same reference. Old saved plans
remain unchanged; research comparisons explicitly remove automatic casting.
The singer verifies both original audio and generation-receipt checksums before
and after rendering. Changed or missing assets fail visibly rather than silently
falling back to the failed caption-only approach. Only the two owner-accepted
synthetic references are selectable; favorite tracks and user recordings cannot
be used as singer references through this flow.

**Local assets required:** the two original `renders/singing-response-20261022`
singer folders remain preserved and are not committed as large audio binaries.
No trained weights, website deployment or hosted worker change is part of this
increment. New candidates remain research-only until reviewed.


### Four further auditions

Four additional receipt-bound synthetic references produced distinct output
files on the same City Lights lyrics, seed, tempo and pop direction. They are
stored in R2 and shown as **City Lights · new singers · voice 1–4**. Reference
processing appears in all four runtime logs. Auditions 1, 2 and 4 passed the
unchanged style check (4/4, 4/4 and 3/4 windows); audition 3 failed (2/4). This
confirms why whole-mix references must be checked for accompaniment drift.
These are four *candidate references*, not four accepted singer identities.
**Owner result: FAIL for four distinct singers.** The owner hears 1/2 as the same singer and 3/4 as the same singer. Whether these differ from the original accepted pair is not established. All four remain outside the automatic pool.
[Hashes, provenance, style scores and publication receipts](evidence/song-validation/new-singers.json).

51 focused Python checks pass, including accepted-reference pins, gender,
missing/changed assets, legacy/CUDA behavior, retry identity, independent
research comparisons and bounded audition batches.
[Check output](evidence/song-validation/accepted-voice-tests.txt).


### Isolated-vocal follow-up

The original male candidate sources used different caption characters (tenor
and textured mid-range), but the owner still heard their City Lights outputs as
the same singer. A second controlled comparison uses the already-separated
vocals from these same two synthetic references. Lyrics, seed, tempo and target
caption stay unchanged. This tests removal of accompaniment from the reference;
it does not assume that separation creates a new singer identity.

The research-only `--reference-vocals` option verifies the original synthetic
receipt, pinned separator, source checksum, stem checksum, sample count and
finite audio before converting the existing stem to PCM. Its receipt preserves
both original and stem provenance; all files are rechecked after inference.
Estimated stems may contain instrumental bleed. The automatic two-voice pool
continues using the owner-accepted whole-reference method.


**Automatic local generation: PASS, technical.** Fresh normal-pipeline jobs for
both products completed without a reference CLI override: the two-minute DNA
song selected voice-1 and passed the style check; the 30-second Improvise reply
selected voice-2 and produced its user-input arrangement. All three audio files
were verified in R2 and added to the gallery. These new outputs still require
listening; acceptance of the earlier pair is not transferred to every new song.
[Normal-path receipts](evidence/song-validation/accepted-local-casting.json).
[Four-candidate muted Chromium/WebKit playback](evidence/song-validation/new-singers-browser.json).


**Isolated-vocal result: PASS, technical; FAIL, perceived singer variety.** Both City Lights
follow-ups completed using the separated vocal input, passed the style check
(4/4 and 3/4 windows), and were verified in R2. Their saved musical cases exactly
match the two prior male candidates; the reference representation is the changed
input. They appear as **City Lights · isolated singers · voice 1–2**.
[Receipts and comparison](evidence/song-validation/isolated-singers.json).
The owner still hears the same singer. Neither is added to the accepted pool.
Removing the backing from these references did not solve voice identity.
A separate local singing-voice-conversion approach is being investigated.


### Direct identity conversion

The isolated-reference comparison also failed owner distinctness. A separate
local Seed-VC singing-conversion trial now provides three 30-second **Disco ·
voice identity 1–3** comparisons using synthetic stock-voice targets, the same
musical source, no pitch shifting and matched vocal level. All three completed
on the Mac and passed verified R2 storage. The owner accepts all three as natural,
hears voice 1 as different and voices 2/3 as alike: two perceived groups, not three
accepted singers. Normal-generation integration and broader musical coverage
remain open. [Method, pins, results and limits](vocal-identity.md).
