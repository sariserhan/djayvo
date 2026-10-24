# Improvise completion work — 2026-10-23

**PASS: local implementation, technical qualification and owner listening. FAIL: hosted candidate qualification (two of four completed); PARTIAL: diagnosis. Website deployment excluded.**

The owner requested all four remaining items: lyric polish, broader recordings/styles, fresh complete generation and updated hosted-worker verification. Website deployment remains excluded.

The shared lyric writer now uses short conversational replies grounded in the recording, instead of requiring longer rhyming verses. It uses the existing pinned planner, asks for 12–45 words, and permits 12–60 words across four to eight lines after validation. Decorative symbols are removed; instrument directions, prose and malformed output fail a bounded format check with one repair attempt. Plans retain a check version/pass count. Existing saved plans remain readable and Music DNA is unchanged.

An initial two-pass editor still produced unrelated filler. A separate model review incorrectly accepted it, so neither is used as a quality gate. Simpler direct instructions produced contextually relevant question/dance/Turkish replies in the local probe. This improves guidance and format reliability; it cannot guarantee that every generated lyric is natural. The owner approved the four final complete songs below.

Local checks and reproduction are under [evidence/improvise-finish](evidence/improvise-finish). The fresh runner uses actual transcription, drafting, singing, separation and automatic arrangement. The broader matrix uses retained songs across all 23 styles and six audible inputs plus silence: the authorized owner phrase, synthetic English voices, Turkish speech, noisy speech and generated claps. Synthetic fixtures are technical tests, not diverse human speaker acceptance. All audio stays local and originals are preserved.

The prepared hosted trial reuses the existing guarded runner with `--improvise-completion`: four songs (reggae/jazz/EDM/acoustic), 30/35/40/45 seconds, one worker, 20 minutes, conservative $3 budget. It uses a synthetic spoken WAV, temporary R2 objects and an isolated local Postgres database with test credits, verifies source-inclusive receipts, downloads outputs and disables workers/cleans storage. Owner approved this $3 cloud trial; worker publication is within the owner's request to perform the listed work. No website deployment or live purchases.

## Expanded matrix and regression checks

**PASS:** Final 138 audible mixes (six inputs × 23 styles), plus 23 silence rejections. The first run failed for claps in drum and bass, DJ and lo-fi because short transients were not offered independently. The selector now retains short percussion in bounded 400 ms excerpts; all 23 percussion reruns pass without loosening overlap or peak limits. Input files and surrounding song PCM remain unchanged. Initial failures remain in the evidence.

**PASS:** 11 singer-plan tests, 17 arranger tests, 9 studio-flow tests and 12 worker tests. TypeScript passes. The first database command lacked the required isolated test URL; rerunning against verified localhost Postgres passes all 16 configuration/receipt/integration tests, including failed-generation refunds, privacy, recovery and credit isolation. No production database changes.

## Final local verification

**PASS:** Four fresh complete recording-to-song runs using the final concise writer: reggae 33 s, jazz 39 s, EDM 45 s, acoustic 30 s. Actual ASR, planner, singer, separation and automatic arrangement ran; no cached songs/transcripts. Each retained the original recording, stayed below peak limits and preserved surrounding PCM. Local elapsed times were approximately 135–164 seconds per song. Turkish input receives an English sung reply; this is not a Turkish-singing test.

**PASS:** All 23 real planner style probes after fixing one rap repair instruction. The initial rap result contained a sung ad-lib in parentheses; explicit repair instructions now preserve its words without parentheses. Twenty-two cases passed directly, rap passed its one allowed repair. Initial failure evidence is retained. This repair-hint wording does not affect the four fresh takes, which all passed without repair.

**PASS:** 142 final real audio receipts (138 matrix plus four fresh songs) satisfy website checks and reject wrong source hashes. All eight local review players pass actual muted playback in Chromium and WebKit, single-player behavior, lyric disclosure, automated accessibility, 1280/390 px overflow and runtime-error checks. Mobile screenshot inspected. Browser execution tooling is unavailable; used the owner's previously approved local Playwright fallback. The first browser checks stalled after six paused downloads on the simple local server; switching clips now explicitly releases the previous preview download and restarts that preview. This affects only the local review packet.

Review: http://127.0.0.1:4249/improvise-finish/ . **PASS, owner listening:** “All four sound good and make sense” for the first four cards, covering singing, recording blend and lyric meaning. Exact audio hashes are recorded in [owner-feedback.json](evidence/improvise-finish/owner-feedback.json). This approval is sample-specific, not a claim about every future input. Review builder and browser harness: `/tmp/jamloom-improvise-finish-review.py` and `/tmp/jamloom-improvise-finish-browser.mjs`; screenshots `/tmp/jamloom-improvise-finish-{chromium,webkit}-{1280,390}.png`.

Final hosted candidate: `b6cd6a4`, run `40047696253`, overlays exactly the three changed scripts on the previously qualified immutable runtime image `sha256:83a00c568cb48f24e27811c901ac941643aee3352f2a0239c5b071120af58780`. All other runtime source/manifests were verified unchanged. Canonical main retains the full Dockerfile for dependency/model rebuilds. Intermediate full builds were cancelled, not reported as passed. The completed cloud trial used the approved four requests and stayed inside its one-worker/20-minute envelope. No additional paid requests have been submitted.

## Hosted qualification and interrupted-session recovery

**PASS:** Linux image build `40047696253` published the verified immutable image `sha256:acca37c030f1926915b37dc8ac7e7e9a6121935c71cac8faedf9c539b7853246`. Template update preserved environment and disk settings with workers disabled. The initial trial preflight rejected the stereo/48 kHz synthetic fixture before activating a worker or submitting any generation. Its single temporary R2 object and isolated database were removed. The fixture is now normalized to the same mono/16 kHz PCM16 format as browser uploads; the harness invokes the existing source validator before uploading and preserves the original exception during cleanup. An assert check rejects the old fixture and accepts the normalized fixture; TypeScript passes. The paid trial finished; its results follow.

**FAIL, hosted candidate qualification:** Jazz (35 s) and acoustic (45 s) completed with verified source-inclusive receipts and locally downloaded audio. Reggae and EDM failed with `private@singer_studio.py:223`; that wrapper location does not identify the underlying cause. The original [trial result](evidence/improvise-finish/cloud/2026-10-24T01-11-15.765Z/trial-result.json) is retained unchanged. Startup took 247 seconds; observed execution times were about 64–80 seconds per request. Neither a local reproduction nor a diagnostic-only image proves these hosted failures are fixed.

**PASS, settlement and shutdown:** Both failed requests returned all 50 test credits. Jazz consumed three of its five quoted credits; acoustic consumed two of five. The harness incorrectly expected the full quote to be consumed; it now checks actual-cost settlement using the existing credit allocator. The independent [credit review](evidence/improvise-finish/cloud-credit-review.json) passes all four balances and zero remaining reservations. All ten temporary storage objects and the isolated trial database were removed. Provider billing was not yet populated in the trial evidence; no final invoice amount is claimed.

**PASS, recovery:** The previous immutable worker image was [restored](evidence/improvise-finish/worker-rollback.json). A fresh read-only [endpoint check](evidence/improvise-finish/worker-recovery-check.json) confirms both worker limits are zero, no workers/jobs are active, and the prior image remains selected. The interrupted local parity run is preserved under `renders/improvise-finish-cloud-parity-20261023`; it has no completion receipt and is **NOT RUN to completion**.

Worker diagnostics in `f8bec64` identify the inner Improvise stage/source location without exposing exception messages, lyrics or signed URLs. All 13 worker contract tests pass. TypeScript and five economics tests pass; all 16 cloud configuration/receipt/Postgres checks also pass against a disposable localhost database ([rerun log](evidence/improvise-finish/cloud-recovery-tests.txt)). Diagnostic-only image build [40049256838](https://github.com/sariserhan/jamloom/actions/runs/40049256838), commit `d7cd979`, was already running when the session closed and now passes. The immutable diagnostic image is `sha256:bce682ad6f43be90e13a246fe280a29ec78dc063456c2d37c1d2190dd96c669f` ([build receipt](evidence/improvise-finish/diagnostic-worker-build.json)). It overlays only the handler on the failed candidate, so it is for investigation and is not a qualified replacement.

A resumed local run uses the same normalized synthetic source, female singer, 30 s reggae/40 s EDM durations and enabled voice conversion. Fresh random seeds and the Mac inference backend differ from the hosted run. Reproduce with `.venv-singer/bin/python docs/evidence/improvise-finish/cloud-parity.py renders/improvise-parity-new-run`; outputs are exclusive and original recordings remain unchanged. **PASS:** reggae (30 s, 185 s elapsed) and EDM (40 s, 241 s elapsed) both completed with converted singer `af_bella`, source-inclusive arrangements, unchanged surrounding PCM, bounded peaks and matching audio hashes. [Exact results](evidence/improvise-finish/local-cloud-parity.json). **NOT RUN:** listening for these two new files. The hosted failure was not reproduced, and its cause remains unknown.


## Prepared next hosted trial

**NOT RUN, additional paid trial:** The image update and existing `--improvise-completion` harness both pass dry-run checks. The proposal is one more four-song diagnostic trial using the same synthetic source and durations, capped at $3, one worker and 20 minutes, with independent shutdown, credit verification and temporary-storage cleanup. Select the diagnostic digest only for the trial; restore the prior qualified image if any song fails. This does not deploy the website or enable customer purchases. The original four-request approval is consumed; `AGENTS.md` requires explicit approval for new paid compute.

After approval, from the repository root:

```sh
node docs/evidence/improvise-finish/update-worker.mjs ghcr.io/sariserhan/jamloom/music-worker@sha256:bce682ad6f43be90e13a246fe280a29ec78dc063456c2d37c1d2190dd96c669f --apply
```

Then from `apps/site`:

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres \
JAMLOOM_TRIAL_IMAGE=ghcr.io/sariserhan/jamloom/music-worker@sha256:bce682ad6f43be90e13a246fe280a29ec78dc063456c2d37c1d2190dd96c669f \
node --import tsx scripts/cloud-song-trial.ts --improvise-completion \
  --source ../../renders/improvise-finish-20261023/sources/cloud-normalized.wav --apply
```
