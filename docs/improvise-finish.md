# Improvise completion work — 2026-10-23

**PARTIAL: local qualification in progress. NOT RUN: new worker cloud qualification.**

The owner requested all four remaining items: lyric polish, broader recordings/styles, fresh complete generation and updated hosted-worker verification. Website deployment remains excluded.

The shared lyric writer now edits its draft before singing, checking conversational meaning, grammar, forced rhyme and unrelated filler. It uses the existing pinned planner; no new service or dependency. A bounded format check permits four to eight sung lines, 25–85 words and optional Verse/Chorus headings. One format repair is allowed; malformed output fails before singing. Plans retain a draft hash and editor-pass count, without treating model review as human approval. Existing saved plans remain readable and Music DNA is unchanged.

Local checks and reproduction are under [evidence/improvise-finish](evidence/improvise-finish). The fresh runner uses actual transcription, drafting, singing, separation and automatic arrangement. The broader matrix uses retained songs across all 23 styles and six audible inputs plus silence: the authorized owner phrase, synthetic English voices, Turkish speech, noisy speech and generated claps. Synthetic fixtures are technical tests, not diverse human speaker acceptance. All audio stays local and originals are preserved.

The prepared hosted trial reuses the existing guarded runner with `--improvise-completion`: four songs (reggae/jazz/EDM/acoustic), 30/35/40/45 seconds, one worker, 20 minutes, conservative $3 budget. It uses a synthetic spoken WAV, temporary R2 objects and an isolated local Postgres database with test credits, verifies source-inclusive receipts, downloads outputs and disables workers/cleans storage. Owner approved this $3 cloud trial; worker publication is within the owner's request to perform the listed work. No website deployment or live purchases.

## Expanded matrix and regression checks

**PASS:** Final 138 audible mixes (six inputs × 23 styles), plus 23 silence rejections. The first run failed for claps in drum and bass, DJ and lo-fi because short transients were not offered independently. The selector now retains short percussion in bounded 400 ms excerpts; all 23 percussion reruns pass without loosening overlap or peak limits. Input files and surrounding song PCM remain unchanged. Initial failures remain in the evidence.

**PASS:** 11 singer-plan tests, 17 arranger tests, 9 studio-flow tests and 12 worker tests. TypeScript passes. The first database command lacked the required isolated test URL; rerunning against verified localhost Postgres passes all 16 configuration/receipt/integration tests, including failed-generation refunds, privacy, recovery and credit isolation. No production database changes.

**PASS:** 140 actual receipts checked so far (138 final matrix mixes plus the first two fresh songs), including original-source/output binding and rejection of wrong source hashes. This count will be refreshed after the remaining fresh songs finish.

Worker build `40045642751` was cancelled to include the percussion fix. Final candidate `321295e` builds on the website-disabled `codex/runpod-setup` branch under run `40045670271`. Cloud approval is recorded; no Runpod worker has been started yet.
