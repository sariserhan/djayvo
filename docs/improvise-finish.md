# Improvise completion work — 2026-10-23

**PARTIAL: local qualification in progress. NOT RUN: new worker cloud qualification.**

The owner requested all four remaining items: lyric polish, broader recordings/styles, fresh complete generation and updated hosted-worker verification. Website deployment remains excluded.

The shared lyric writer now uses short conversational replies grounded in the recording, instead of requiring longer rhyming verses. It uses the existing pinned planner, asks for 12–45 words, and permits 12–60 words across four to eight lines after validation. Decorative symbols are removed; instrument directions, prose and malformed output fail a bounded format check with one repair attempt. Plans retain a check version/pass count. Existing saved plans remain readable and Music DNA is unchanged.

An initial two-pass editor still produced unrelated filler. A separate model review incorrectly accepted it, so neither is used as a quality gate. Simpler direct instructions produced contextually relevant question/dance/Turkish replies in the local probe. This improves guidance and format reliability; it cannot guarantee that every generated lyric is natural. New listening remains necessary.

Local checks and reproduction are under [evidence/improvise-finish](evidence/improvise-finish). The fresh runner uses actual transcription, drafting, singing, separation and automatic arrangement. The broader matrix uses retained songs across all 23 styles and six audible inputs plus silence: the authorized owner phrase, synthetic English voices, Turkish speech, noisy speech and generated claps. Synthetic fixtures are technical tests, not diverse human speaker acceptance. All audio stays local and originals are preserved.

The prepared hosted trial reuses the existing guarded runner with `--improvise-completion`: four songs (reggae/jazz/EDM/acoustic), 30/35/40/45 seconds, one worker, 20 minutes, conservative $3 budget. It uses a synthetic spoken WAV, temporary R2 objects and an isolated local Postgres database with test credits, verifies source-inclusive receipts, downloads outputs and disables workers/cleans storage. Owner approved this $3 cloud trial; worker publication is within the owner's request to perform the listed work. No website deployment or live purchases.

## Expanded matrix and regression checks

**PASS:** Final 138 audible mixes (six inputs × 23 styles), plus 23 silence rejections. The first run failed for claps in drum and bass, DJ and lo-fi because short transients were not offered independently. The selector now retains short percussion in bounded 400 ms excerpts; all 23 percussion reruns pass without loosening overlap or peak limits. Input files and surrounding song PCM remain unchanged. Initial failures remain in the evidence.

**PASS:** 11 singer-plan tests, 17 arranger tests, 9 studio-flow tests and 12 worker tests. TypeScript passes. The first database command lacked the required isolated test URL; rerunning against verified localhost Postgres passes all 16 configuration/receipt/integration tests, including failed-generation refunds, privacy, recovery and credit isolation. No production database changes.

**PASS:** 140 actual receipts checked so far (138 final matrix mixes plus the first two fresh songs), including original-source/output binding and rejection of wrong source hashes. This count will be refreshed after the remaining fresh songs finish.

Worker build `40045642751` was cancelled to include the percussion fix. Intermediate candidate `321295e` builds on the website-disabled `codex/runpod-setup` branch under run `40045670271`. Cloud approval is recorded; no Runpod worker has been started yet.

The intermediate image build was also cancelled after the lyric probes exposed filler. Final worker candidate `e6fea69` contains the simpler writer, decorative-symbol cleanup and short-percussion selection. Four new local end-to-end takes are running against this exact logic; earlier takes are retained and are not substituted for final-code qualification.

## Final local verification

**PASS:** Four fresh complete recording-to-song runs using the final concise writer: reggae 33 s, jazz 39 s, EDM 45 s, acoustic 30 s. Actual ASR, planner, singer, separation and automatic arrangement ran; no cached songs/transcripts. Each retained the original recording, stayed below peak limits and preserved surrounding PCM. Local elapsed times were approximately 135–164 seconds per song. Turkish input receives an English sung reply; this is not a Turkish-singing test.

**PASS:** All 23 real planner style probes after fixing one rap repair instruction. The initial rap result contained a sung ad-lib in parentheses; explicit repair instructions now preserve its words without parentheses. Twenty-two cases passed directly, rap passed its one allowed repair. Initial failure evidence is retained. This repair-hint wording does not affect the four fresh takes, which all passed without repair.

**PASS:** 142 final real audio receipts (138 matrix plus four fresh songs) satisfy website checks and reject wrong source hashes. All eight local review players pass actual muted playback in Chromium and WebKit, single-player behavior, lyric disclosure, automated accessibility, 1280/390 px overflow and runtime-error checks. Mobile screenshot inspected. Browser execution tooling is unavailable; used the owner's previously approved local Playwright fallback. The first browser checks stalled after six paused downloads on the simple local server; switching clips now explicitly releases the previous preview download and restarts that preview. This affects only the local review packet.

Review: http://127.0.0.1:4249/improvise-finish/ . Owner listening requested for the first four cards; no approval invented. Review builder and browser harness: `/tmp/jamloom-improvise-finish-review.py` and `/tmp/jamloom-improvise-finish-browser.mjs`; screenshots `/tmp/jamloom-improvise-finish-{chromium,webkit}-{1280,390}.png`.

Final hosted candidate: `b6cd6a4`, run `40047696253`, overlays exactly the three changed scripts on the previously qualified immutable runtime image `sha256:83a00c568cb48f24e27811c901ac941643aee3352f2a0239c5b071120af58780`. All other runtime source/manifests were verified unchanged. Canonical main retains the full Dockerfile for dependency/model rebuilds. Intermediate full builds were cancelled, not reported as passed. The final cloud trial remains within the approved $3/four-song/one-worker/20-minute envelope.
