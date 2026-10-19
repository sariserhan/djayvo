# Bounded browser audio wake-up

2026-10-19. Continuation of [local-file playback reliability](media-preload.md).

The prior playback timeout began only after `AudioContext.resume()` completed.
A never-settling resume promise could therefore leave manual Play, prepared A/C
or instrument preparation waiting indefinitely. The new browser regression
[failed before the fix](evidence/audio-resume/before-chromium.log): no error or
retry state appeared within 15 seconds. This was controlled fault injection,
not a claim that a particular OS route naturally produced that failure.

All five production resume call sites now use one helper in the existing audio
module. It rejects after ten seconds, clears its timer on success or failure,
and rejects a completed resume if the context is still suspended. Existing
request/consent guards remain in place. A timed-out request cannot later schedule
its deck, prepared buffer or instrument bank when the underlying promise settles.
The browser's resume operation itself is not cancellable; this change bounds the
application's wait. Browser background throttling can delay timers.

A related note race is fixed: if a key is released and pressed again while its
first wake-up is pending, that old request's failure can no longer release the
new note or replace its status. Manual playback still has its separate ten-second
media-start deadline after waking audio. These are recovery deadlines, not latency
claims. Existing Stop/Pause All controls remain available during deck startup.

## Scope and gates

Changes reach manual A/B starts, prepared A/C starts, instrument-bank preparation,
and keyboard/MIDI note wake-up. Browser-host code only; no new dependency, UI
control, API service or audio algorithm. The master, shared C++/WASM, supplied
synthetic speech fixture and owner recordings remain unchanged.

Final gates are recorded in [the summary](evidence/audio-resume/summary.json).

| Gate | Status | Evidence boundary |
| --- | --- | --- |
| Before-fix regression | FAIL | Injected unresolved resume leaves manual A waiting beyond 15 seconds |
| Unit validation | PASS | 41 tests; success, suspended result, synchronous/asynchronous errors, timeout, late resolve/reject and retry |
| New wake-up/retry and stale-note browser regressions | PASS | All four Mac/Linux Chromium/WebKit runs reach and pass these checks; later Linux WebKit failures are separate |
| Mac Chromium/WebKit and Linux Chromium studio | PASS | 46 checks each, including actual audio, desktop/tablet/mobile and disconnected operation |
| Linux WebKit complete studio | FAIL | First run rejects a valid reload; fresh container passes that interaction but later crashes after 38 checks |
| Mac prepared A/C and Linux Chromium prepared session | PASS | 29 checks each; A/C timeout, cancellation, retry and late completion checked |
| Linux WebKit prepared session | PARTIAL | 28 checks pass; this build lacks MediaRecorder, so synthetic microphone capture is NOT RUN |
| Offline PCM and event-frame preservation | PASS | 44 regression WAVs byte-identical; max absolute/RMS error zero; recorded echo frames and prepared timing match baselines exactly; fractional echo targets have at most 0.474 frame rounding error. This includes WAVs produced before the failed Linux studio run |
| Public bundle and local copies | PASS | Audited public assets; no private audio or credentials |
| Physical microphone/MIDI, route recovery, acoustic latency, venue endurance | NOT RUN | Fault injection and virtual audio cannot establish device behavior |
| New listening, learned model, musical quality | NOT RUN | No new listening rating or model promotion |
| Full specification / production | PARTIAL | Existing quality, hardware and release gates remain open |

The first Linux Chromium prepared run failed at file selection because its
isolated mount omitted the test phrase. That **FAIL (test setup)** receipt is
retained. The reproduction script now copies the unchanged, already-consented
phrase, as the earlier Linux session workflow did; no synthetic fixture is
regenerated. See [setup record](evidence/audio-resume/linux-setup-note.txt).

Two Mac WebKit prepared-session attempts timed out on initial navigation,
before loading a track or constructing the audio graph. Those setup failures are
retained separately from the new wake-up fault-injection checks. The test now creates the audio page
only after the capability simulation closes, instead of retaining an idle page
through that preflight. Both Mac browsers pass with this ordering; Linux Chromium
also uses it. Linux WebKit's completed prepared run used the earlier ordering.
No navigation deadline or audio assertion was relaxed. Precise native cause is
**PARTIAL**. Initial Linux
WebKit manual reload failed with a native unsupported-operation error after rapid
rate changes, while Deck B continued. The fresh container with decoder logging passes that reload but later
crashes after the context-interruption check. Its 2 GiB limit was reached, with
7,766 memory-limit events and no OOM kills; memory pressure is an observed
condition, not an established cause. The failure reporter itself also rejected
when evaluating the dead page, losing the original thrown error; that reporter
now tolerates an unavailable page. All completed checks and the full decoder log
are retained; no complete Linux WebKit studio PASS is claimed. The raw log's
receipt/hash is in the summary. Native-media repeatability and venue reliability
remain **PARTIAL**. The earlier HTTP active-rate failure is not rerun here.

## Reproduce

```sh
node --test apps/web/tests/*.test.js
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
npm --prefix apps/site run studio:prepare
DJAYVO_BROWSER=chromium node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
DJAYVO_BROWSER=chromium node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
sh docs/evidence/audio-resume/linux-run.sh
python3 docs/evidence/audio-resume/measure.py LINUX_ARTIFACT_DIR [RETRY_DIR]
```

The Linux script reuses the previously installed isolated VM/image, mounts public
app/test files and its output directory only, disables networking and restores
the initial VM state. Only the already-consented test phrase is copied into its
local output mount; no home directory, environment files or credentials are
mounted, and no audio leaves the computer. The
summary links playable WAVs and exact receipt hashes. Unit tests control timers;
browser suites exercise the real ten-second deadline. Prepared tests retain
both pending-stop and consent-withdrawal cases in addition to timeout/retry.

The flow under test is: rights/consent → load/prepare → inject an unresolved audio
wake-up → visible failure and usable retry → real playback → late old completion
without a duplicate start. Instruments also exercise release/repress and late
failure on the same key. Existing responsive, console, signal, effects, MIDI and
server-disconnected checks remain required.

Browser plugin execution was unavailable after tool discovery; the existing
Playwright fallback was used under the owner's actual browser/portability testing
authorization. Mac: Apple M5, 16 GiB, macOS 26.7.1 (25G241), Node 22.23.1,
Playwright 1.61.1. Linux: Ubuntu 24.04.4 ARM64, kernel 6.8.0-117,
Node 24.17.0, PulseAudio 16.1 with a 48 kHz software sink; cached image
`djayvo-browser-audio:1.61.1`. Browser versions are captured in each receipt.
This does not validate physical Intel Linux, installed Safari or phone behavior.
No native C++/sanitizer rerun was needed for this host-only change; no paid compute,
push or deployment was performed. `~/mlx-env` is untouched.


The local studio is served at `http://127.0.0.1:4173/dj.html` and
`http://127.0.0.1:3000/studio/dj.html`; [served hashes](evidence/audio-resume/served.json)
match the delivered files. Page identity, meaningful content, interaction state,
responsive overflow and screenshots pass in the three complete studio runs.
No app console errors were recorded in those completed runs; the crashed run
has no complete console-health receipt. Known WebKit screenshot-time stylesheet
CSP warnings remain listed. The Mac Chromium desktop screenshot was visually
inspected; no framework error overlay was visible.

Both isolated containers were removed and the initially stopped VM was stopped
again; Docker context remains `desktop-linux`. See [initial cleanup](evidence/audio-resume/linux-initial-cleanup.log)
and [fresh-run cleanup](evidence/audio-resume/linux-retry-cleanup.log). The first
wrapper had a recorded shell-source editing mistake after its suites, so its
exit code and missing memory counters are not used as test proof; see the setup
note. The saved reproduction scripts pass `sh -n`.

## Run receipts

- [mac-chromium-dj: PASS, 46 completed checks](../renders/dj-chromium-TSnFOX/report.json).
- [mac-chromium-session: PASS, 29 completed checks](../renders/session-chromium-SepXST/report.json).
- [mac-webkit-dj: PASS, 46 completed checks](../renders/dj-webkit-l4yxAk/report.json).
- [mac-webkit-session: PASS, 29 completed checks](../renders/session-webkit-ujxhLJ/report.json).
- [linux-chromium-dj: PASS, 46 completed checks](../renders/audio-resume-linux-Pko79o/dj-chromium-LlLq3T/report.json).
- [linux-chromium-session: PASS, 29 completed checks](../renders/audio-resume-retry-1eqVcO/session-chromium-03pXyh/report.json).
- [linux-webkit-dj: FAIL, 38 completed checks](../renders/audio-resume-retry-1eqVcO/webkit-dj.log).
- [linux-webkit-session: PARTIAL, 28 completed checks](../renders/audio-resume-linux-Pko79o/session-webkit-V2F6wU/report.json).

Rendered studio: [desktop](../renders/dj-chromium-TSnFOX/desktop.png), [mobile](../renders/dj-chromium-TSnFOX/mobile.png).
