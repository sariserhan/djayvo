# R1 continuation — private phrase-response pairs

**R1 overall: PARTIAL.** A musician can now keep a source phrase alongside a
replayable instrument response. This extends [live takes](r1-instrument-capture.md)
and reuses the existing phrase recorder/importer. It does not train a model,
automatically mix the phrase into the response, or establish musical quality.

## Try it locally

Open <http://127.0.0.1:3000/studio/dj.html#instruments> or
<http://127.0.0.1:4173/dj.html#instruments>.

1. In the prepared-performance area above the instruments, consent to recording
   and record/import a 2–5 second phrase. Preparing Deck A is optional for pairing.
2. Enable instruments. Under **Keep an instrument take**, give capture permission
   and separately check **Include the current phrase with this take**.
3. Record your instrument response, release notes to keep their tails, then stop.
4. Play the response and download all four files: take WAV, musical actions,
   source phrase WAV and phrase-response link JSON.

The capture still records dry instruments before tone/echo/faders. The source
is a separate mono WAV, not an added voice track. Leaving the inclusion box
unchecked produces the original two-file instrument-only take, even if a phrase
is loaded. No source is automatically uploaded or saved to the library.

Deleting/replacing a source, withdrawing phrase/capture/pairing permission,
or deleting the take discards the paired take from the tab. Replacing a source
requires a fresh pairing checkbox. Late asynchronous hashing cannot restore
discarded files. A rejected replacement keeps the old phrase, as before.
Already-downloaded copies remain on the user's device and require separate deletion.

## Implementation and format

- `apps/web/performance-session.js`: exposes the current consented source and
  its capture/import origin, with an identity-based validity check. Successful
  replacement/deletion notifies the capture UI.
- `apps/web/instrument-take.js`: freezes source identity and musical context at
  the user's start request; gates inclusion independently; rechecks consent and
  the request token after asynchronous work; creates/revokes four download URLs.
- `apps/web/phrase-pair.js`: strict `1.0-phrase-response` envelope, source encoding,
  byte hashes, bounded canonical WAV checks and existing take validation.
- `apps/web/keyboard.js`, `dj.js`, `dj.html`: connect the existing source and
  keyboard components and add accessible, theme-matched controls. No new engine,
  dependency, server route, storage, analytics or paid service.
- `apps/web/tests/phrase-pair.test.js` and `tests/instrument-take.mjs`: invalid
  contracts/audio, actual downloads/replay, default exclusion, source replacement,
  consent withdrawal during source hashing, and context-freezing coverage.
- `apps/web/tests/saved-mixes.mjs`: exact accessible-name selectors fix an
  existing ambiguous match between the header and footer DJ workspace links.

The pair contains only:

- Fixed format version, `training_authorized: false`, `review: "unreviewed"`.
- Source WAV hash, frames, 48 kHz mono format, `microphone`/`imported_file` origin,
  and `user_attested_local_pairing` permission.
- SHA-256 of the exact downloaded musical-actions JSON bytes. That existing
  validated trace binds its response WAV and shared-engine WASM hashes.
- Nullable `context_at_start`: user-confirmed tempo in milli-BPM, tonic MIDI,
  major/minor mode, four beats/bar and Deck A's first downbeat in seconds.

There are no names, local paths, transcripts, device IDs or private samples in
the JSON. The source WAV is the existing decoder's normalized PCM16 output,
not the original imported file. An unconfirmed context is `null`; a confirmed
context is a user declaration, not known harmonic ground truth. Later edits
do not relabel an earlier take. Context is a snapshot at the start request,
**not** a measured source-to-response alignment or the live Deck A beat position.

`verifyPhrasePair(pair, sourceWav, traceBytes)` checks shape, bounds, source
header and both hashes, then validates the original live-take contract.
`replayTake`/`scripts/replay_live_take.mjs` separately verify actual response PCM.
The existing live-take and offline demonstration schemas/policy hashes remain
unchanged. Browser pairs are **not** admitted to the offline training exporter.
Hashes prove integrity relationships, not authorship, legal clearance or quality.

## Validation — 2026-10-20

Environment: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Node 22.23.1,
Playwright 1.61.1; Chromium 149.0.7827.55 and WebKit 26.5.
Existing shared-engine WASM retained, no C++ recompilation.

| Gate | Result | Evidence |
| --- | --- | --- |
| Web unit tests | PASS | 54/54, including four pair-contract tests |
| Browser phrase/response capture | PASS | Seven flow checks in each browser; actual private downloads |
| Event/audio replay | PASS | Both unpaired and paired responses replay byte-identically against their own accepted-event traces; max/RMS PCM16 difference 0 |
| Source context/consent | PASS | Default exclusion, replacement, permission removal, source-hash race and frozen context |
| Desktop/mobile UI | PASS | 1440×1000 / 390×844; inspected screenshots, no horizontal overflow; mobile uses vertical scrolling |
| Runtime/security | PASS | No app console errors or external requests in capture tests; security policy unchanged |
| Prepared-session regression | PASS | 39 Chromium checks: A/C audio, generation/cancellation, simulated microphone, saved mixes, permission withdrawal and offline reload |
| Existing local website | PASS | Seven served assets match source bytes; actual phrase → pair → playback → delete flow at port 3000 |
| Static bundle/offline manifest | PASS | 38 audited files, no private audio/test files in public bundle |
| Source decoder parity | PARTIAL | Same 154,142 frames at 48 kHz; max cross-browser PCM16 difference 4, RMS 0.3592079824, 15,508 differing samples |
| Dataset rights | PARTIAL | Explicit local-use attestation; no verified expert/training clearance |
| Expert corpus / human quality | NOT RUN | Automated fixture/input only in new pairing evidence; n=0 listener ratings |
| Physical mic/MIDI / hardware latency | NOT RUN | Automated input does not establish physical device behavior |
| Current Linux / iPhone parity | NOT RUN | This increment executed browser/WASM on M5 |
| Model training / paid compute / public release | NOT RUN | No training, spend, push or deployment |

The two browser performances have different command-arrival times; exact
replay is a within-take comparison, not a claim that separate live performances
are identical. The source-decoding difference comes from the existing browser
decode/resample path. Both exported normalized sources are hash-bound exactly.
No tolerance was loosened and no original fixture was regenerated.

Two WebKit screenshot-tool stylesheet warnings are isolated in its report;
they are not application errors. Browser-plugin discovery failed twice with
`unsupported call: tool_searchtool_search_tool`; the existing authorized
repository Playwright workflow was used. The first context test tried to fetch
a blob under `connect-src 'self'` and failed; the corrected test downloads the
file through the user-facing link. CSP was preserved.
The first prepared-session run reached 31 passing checks, then stopped at an
ambiguous old `DJ workspace` selector matching header and footer links. Both
callers now request the exact accessible name; the full 39-check rerun passed.
Initial failure logs are retained with the successful evidence.

## Reproduce and inspect

```sh
cd apps/web
npm test
cd ../..
node apps/web/tests/instrument-take.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/instrument-take.mjs
node apps/web/tests/session.mjs
python3 scripts/verify_web_bundle.py
node scripts/replay_live_take.mjs renders/instrument-take-chromium-6wA2qD/paired-response.json /tmp/jamloom-paired-replay.wav
```

Replay uses exclusive creation: choose a new output path if it already exists.
Browser tests use isolated loopback servers and fresh profiles. Static JS/HTML
and offline manifests were refreshed in both existing local bundles, preserving
the site's navigation additions and existing WASM; no compiler cache regenerated.
The existing Next production server needed restarting to discover newly added
public modules (`instrument-take.js` and `phrase-pair.js` initially returned 404).
After restarting, all seven checked source files returned 200 with matching
bytes, and an actual browser capture/pair/play/delete flow passed on port 3000.
The server remains running. A full Next build was **NOT RUN** for these static
studio changes; this local restart is not a public deployment.

Playable artifacts:

- [Chromium source](../renders/instrument-take-chromium-6wA2qD/source.wav),
  [instrument response](../renders/instrument-take-chromium-6wA2qD/paired-response.wav).
- [WebKit source](../renders/instrument-take-webkit-GT8zwB/source.wav),
  [instrument response](../renders/instrument-take-webkit-GT8zwB/paired-response.wav).
- Both directories also contain `pair.json`, `paired-response.json`, ordinary
  `take.wav`/`take.json`, context-snapshot examples, reports and screenshots.

These short automated notes test capture/replay, not creative musical responses.
Source duration 3.211292 s. Response durations 0.474667 s (Chromium) / 0.434667 s
(WebKit), sample peaks −12.272 / −12.273 dBFS. No full-scale PCM samples.
Audio stays ignored by Git; committed evidence is metadata/tests/screenshots.
[Evidence inventory and waveform measurements](evidence/r1-pairs/artifacts.json).

## Remaining R1 work

Full-mix/stem and automation capture, sample-edit annotations, bar-position
alignment, independently reviewed permissioned expert demonstrations, robust
corpus deduplication and stratified splits remain. A private checkbox is not
training consent. Next work should stay within R1; R2/R3 training still requires
its authorization and data/listening gates. Neither specification was modified.
