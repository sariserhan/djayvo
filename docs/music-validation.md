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

The active run and per-case results are preserved in
`renders/music-validation-20261023/report.json`. Finished/rejected takes are
uploaded after each case. Resume only after the prior process has stopped; the
runner verifies original inputs and never rerenders finished cases. A terminal
case whose publication was interrupted is published idempotently on resume.
All subsequent broad tests use local compute, not additional Runpod generation.

## Vocal variety

New DNA and Improvise plans choose among eight generic vocal characters: female
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
