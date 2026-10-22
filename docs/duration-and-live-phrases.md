# Wider recordings and continual phrases — 2026-10-21

This continues local commit `6faebff`. The wider recording/output contract and
continual phrase capture are implemented. **Overall specification PARTIAL:** the
owner's musical-quality rejection remains FAIL. Human listening, real microphone
calibration, physical latency/routing and provider/model acceptance remain open.
iOS remains deferred, with launch operations last. Neither immutable specification
was edited. No publication, hosted migration, live charge or paid execution occurred.

## Duration contract

Voice studio can select 1–15 seconds and request approximately 15, 30, 45 or 60
seconds of original music. The CLI accepts every integer from 15 through 60 using
`--duration-seconds`. Arrangements end on whole bars and remain within 15–60 seconds;
requested and actual duration can differ. Long inputs retain a selected unpitched,
forward hook of at most five seconds, with other source events available to the
planner. This is a bounded acoustic heuristic, not verified semantic or word alignment.

Default callers retain the original 2–5 second source / 20–40 second arrangement
contract. Existing scores and the original WASM/C entry points remain supported.
New scores use `1.8-remix` and require `requested_seconds`; legacy scores cannot
carry that field. Source hashes, consent, render bounds and exact import replay
remain validated. Prepared Deck C still uses its existing 2–5 second phrase contract.

Browser persistence, private WAV validation, local generation inputs, upload sizes,
account controls and database constraints now support the wider bounds. Migration
`0013_audio_duration.sql` widens constraints without rewriting or deleting audio.
The isolated database test upgrades an existing library, verifies its original
bytes, checks repeated migration, then stores the 15/60-second boundaries and
replays 1/15-second source scores through the actual native worker. Owners cannot
read each other's tracks. The hosted database has not been migrated.

## Continual phrase cycle

Prepared A must be playing, its musical context confirmed, voice permission granted,
and headphone use explicitly checked. Start continual phrases then repeats:

1. Listen for signal above the fixed energy threshold; retain at most five seconds.
2. End after a half-second quiet region once at least two seconds are captured, or
   at the five-second cap. Disable the input track while processing the response.
3. Normalize off the audio callback, then use the existing validated WASM director.
   Play the response on the shared clock's next available bar.
4. After C ends, return the capture buffer and listen for another phrase.

There is no microphone monitoring, overlapping capture during C, unbounded queue,
model execution in the callback or automatic upload. The worklet reuses one bounded
PCM buffer; constructors, resampling, encoding and music generation run outside its
process callback. Stop explicitly ends worklet processing and releases its capture buffer.
Transfer messaging still has browser runtime overhead; this is
not a hard real-time guarantee. The endpoint is energy-based, not speech recognition.
Noise, weak speech, headphone leakage and word boundaries require physical calibration.
The mode is not continuously listening while preparing/playing a response.

Stop, Stop C, stopping/ending A, deleting/revoking the phrase, device changes,
interruption and page hiding terminate capture and pending generation. A permission
request that resolves after cancellation immediately closes its new tracks. One minute
without a completed phrase stops listening. Headphone confirmation is reset on stop;
scenes do not persist or restart this mode. Each new phrase replaces the temporary phrase and C. Save C while it is ready
or use the mix recorder to retain the performance; saved library entries are unchanged.

## Validation

The reproducible receipts live in `docs/evidence/duration-completion` and
`docs/evidence/live-phrases`. Browser automation is muted downstream of the measured
signal. Synthetic microphone streams test application behavior, not real microphones.

| Gate | Status | Evidence |
|---|---|---|
| Native core and legacy integration | PASS | 17 test groups; 84 custom source/style/duration plans; fixed historical worker WAV replay unchanged |
| Address/undefined behavior sanitizers | PASS | All 17 native groups; 556.59 seconds, plus final sanitizer CLI checks rejecting explicit 0/14/61-second requests |
| Web / site unit tests | PASS | 122 web, 39 site; includes endpoint boundaries, callback-size independence, reusable transfers and output bounds |
| Private storage / local worker | PASS | Existing-row migration, boundaries, native replay, ownership and repeated migration |
| Chromium / WebKit duration UI | PASS | 1/15-second inputs, 15/60-second requests, native/WASM/score replay identity, paused saved reload, narrow layouts and axe |
| Chromium / WebKit continual phrases | PASS | Actual worklet endpoints, real WASM response, bar-aligned C, automatic second capture, disabled input during C, stop/late permission/denial/device change/revocation, narrow layouts and axe |
| Manual prepared-session regression | PASS | 40 checks each in Chromium/WebKit, including real server-disconnected loading, consent/cancellation, saved bytes and audio continuity |
| Production build, typecheck, public bundle | PASS | Node 22 build, TypeScript and asset/secret audit |
| Browser timing qualification | PARTIAL | Final Chromium run has two timestamp anomalies but zero independent PCM discontinuities; WebKit has zero of either. No physical deadline or venue claim |
| Human musical quality | FAIL / NOT RUN | Earlier rejection stands; new listening deferred |
| Physical capture, headphone isolation, latency, venue reliability | NOT RUN | Synthetic browser input is not hardware evidence |
| Hosted migration, iOS, launch operations | NOT RUN | Explicitly deferred |

## Reproduce and release preparation

Use Node 22. From the repository root:

```sh
cmake -S . -B build-finish -DCMAKE_BUILD_TYPE=Release
cmake --build build-finish -j 4
ctest --test-dir build-finish --output-on-failure
node --test apps/web/tests/*.test.js
npm --prefix apps/site test
npm --prefix apps/site run build
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
```

From `apps/site`, run `node tests/duration-browser.mjs` and
`node tests/live-phrases-browser.mjs`. The isolated database test is
`node --import tsx --test tests/duration.test.ts` with
`JAMLOOM_TEST_DATABASE_URL` pointing explicitly to disposable loopback PostgreSQL.
It creates and removes only its uniquely named database. The sanitizer build uses
`-DJAMLOOM_SANITIZERS=ON` in its own build directory.

Apply migration 0013 during the separately authorized hosted rollout before exposing
extended online saves. Do not restore the narrower database constraints if any
15–20 or 40–60 second assets exist: retain the widened schema when rolling back
application code. Do not delete user audio to make a rollback fit.

Browser validation also caught and repaired a 320-pixel duration-select overflow,
a WebKit label-contrast issue, and device changes arriving during capture startup.
The startup race has a focused lifecycle regression, including delayed permission
and module completion; no test permission is treated as a real hardware check.

The manual-session regression initially stopped on an outdated test selector:
partner-catalogue links made `#saved-mixes a` ambiguous. The test now selects the
existing “Manage in Voice studio” link by its accessible name. That failed receipt
is retained. The next run completed all functional checks but reported missing
optional site APIs from its standalone static server. It now uses the same empty
Aurowall/announcement fixtures as the existing DJ regression, keeping all other
runtime errors strict. After disconnect, only network errors tied to those two
optional API URLs are classified and retained as expected warnings. WebKit
screenshots retain the caret; the existing screenshot-scoped CSP warnings are
still recorded, rather than treated as application stylesheet acceptance. Those fixtures do not prove hosted API or offline account
synchronization. No application navigation behavior was changed for the test.

WebKit secure-origin control of the native companion remains limited by its
loopback policy; the native-controls fallback and prior PARTIAL gate remain.

The remaining specification gates are human musical acceptance and M1 prerequisites
for learned production AI, physical/device/venue qualification, actual provider bills
and recovery, and the explicitly deferred iOS/release work. Four decks are a
conditional extension; the required two-deck surface is implemented. Local catalogue
inference and saved output preferences are not learned personalization.
