# Saved performances in the DJ workspace — 2026-10-19

**PASS — bounded local save/reuse feature. Portability and production: PARTIAL.**

The owner authorized continuing local product work while R2 and Resend are
postponed. This increment connects the existing browser library to the DJ
workspace. It does not close M1, M4, production quality or venue acceptance.

## Behavior

- **Save C on this device** explicitly persists the original generated WAV, score,
  render report and event trace in the existing bounded IndexedDB library. It
  does not save Deck A, the raw phrase or mixer effects. Voice present in the mix
  is retained. No account, upload, cloud storage, email or training is involved.
- **Your saved mixes** lists verified local sessions, including older Voice
  studio sessions. Select a mix and load into A or B. Loading never autoplays;
  playing decks and prepared A reject replacement. Both file inputs and saved
  mixes use the same validated loader.
- Every load re-reads the selected record and verifies its complete artifact
  hashes. Missing/damaged data leaves the previous track intact; a permission
  withdrawal or unload invalidates pending work. Refresh hides damaged records.
- A full library retains its existing ten sessions and leaves C downloadable and
  retryable. Repeated save clicks cannot duplicate a session. Once a requested
  save begins committing, unloading or deleting the phrase does not delete the
  stored mix. The UI explains this and links to Voice studio deletion controls.
- Storage is local to this browser/origin and can be evicted. Download important
  mixes. This is not full prepared-session recall, account synchronization, an
  effects bounce, or a guarantee of durable cloud backup.

## Offline repair

The new Manage link exposed an existing service-worker defect: `index.html#mixes`
missed the exact asset allowlist and tried the disconnected server. Navigating to
`index.html` succeeded in the same controlled reproduction. The fetch handler now
removes only the fragment before matching the cache. Queries, account/API paths,
other origins and non-GET requests remain excluded, with unit coverage. The
content-hashed asset checks and update waiting behavior are unchanged.

The final mobile review also reproduced WebKit's native-select text contributing
scroll overflow after resizing. Paint containment on that control preserves its
native chooser and 44 px height while keeping the page at the viewport width.
The responsive test now takes a genuine desktop screenshot before resizing.
Ordinary overflow clipping was sufficient on Mac but failed on GTK WebKit;
focused Linux measurements reproduced 479 px document width in a 390 px viewport
and verified that paint containment restored 390 px without replacing the native
chooser. The intermediate failed checks are retained.

## Validation


| Gate | Result | Evidence |
| --- | --- | --- |
| Web unit checks | PASS | 41 on Mac and 41 on Linux; fragment allowlist/exclusion cases included |
| Next production build, site unit checks and bundle audit | PASS | Node 22 build, 7 tests; no secrets or extra studio assets in the client bundle |
| Mac prepared-session regressions | PASS | Chromium and WebKit: 39 checks each, including 10 local save/reuse checks |
| Linux Chromium prepared sessions | PASS | 39 checks, including the complete server-disconnected save/reload/load/play/delete flow |
| Linux WebKit prepared sessions | PARTIAL | 38 PASS including all new local-library checks; 2 capture checks NOT RUN because the container lacks the capture API |
| Manual DJ regressions | PASS | 46 checks each in Mac Chromium, Mac WebKit and Linux Chromium |
| Linux WebKit manual DJ regression | FAIL | 38 checks passed, then opposite-polarity media playback failed to reach the expected stereo meter level after a track replacement; cause unresolved |
| Next-hosted browser integration | PASS | Both Mac browsers: 8 existing checks plus 10 local-library checks; real downloaded WAV hashes, A/B playback and final responsive layout |
| Voice studio regression | PASS | Chromium: 21 checks including malformed records, storage bounds, privacy deletion and generation |
| Audio regression and timing | PASS | 44 deterministic piano WAVs byte-identical to the baseline: maximum/RMS normalized PCM differences 0; prepared event-frame records identical, echo rounding error at most 0.474 frame |
| Human listening, physical microphone, physical latency and venue use | NOT RUN | Automated audio checks do not establish musical quality or production readiness |
| R2, Resend and Vercel redeployment | NOT RUN | Deferred; no hosted-service changes in this increment |

[Summary and hashes](evidence/saved-mixes/summary.json),
[production build output](evidence/saved-mixes/site-build.log),
[site browser receipts](evidence/saved-mixes/site-browser.json),
[Voice studio receipt](evidence/saved-mixes/voice-browser.json),
[Linux deck failure state](evidence/saved-mixes/linux-webkit-deck-failure.json),
[reviewed screenshots](evidence/saved-mixes/screenshots.json).
The PCM comparisons use deterministic test outputs, not the independently
randomized new C performances. Saving each C is separately checked against its
actual downloaded WAV. The measured continuity windows have zero silent blocks
and zero missing PCM counter frames; this is not a physical latency guarantee.

Mac: Apple M5, 16 GiB, macOS 26.7.1, Node 22.23.1. Linux: Ubuntu 24.04.4 ARM64
inside the existing Colima VM, kernel 6.8.0-117, Node 24.17.0, PulseAudio 16.1
software sink at 48 kHz. Playwright 1.61.1, Chromium 149.0.7827.55 and WebKit
26.5; Next.js 16.4.2 and the unchanged Emscripten 6.0.1 engines. This is not a test
of physical Intel Linux or installed Safari. The 2 GiB Linux container recorded
memory-limit pressure but no OOM kills; its media failure is not explained away
or marked passed. Native C++ code was unchanged and not rerun.

A Mac WebKit manual-suite screenshot timed out during the initial concurrent
run; its isolated retry passed all 46 checks. The layout failures were reproduced
and fixed before the final integrated checks and Linux WebKit retry. Functional
Mac/Chromium receipts precede the final CSS containment adjustment; the final
Next-hosted checks cover that adjustment in both Mac browsers, and the final
Linux WebKit session covers it on Linux. Test containers and port 3001 were
removed/stopped; the initially stopped `djayvo` VM is stopped again, default
Docker context unchanged. The primary app remains at http://localhost:3000.

Final gate receipts and PCM comparisons are in [evidence](evidence/saved-mixes/).
The shared C++ sources, engine binaries, master specification, supplied fixture
and original recordings are unchanged. Browser tests use real WASM generation,
IndexedDB transactions, media playback and AudioContext measurements; microphone
streams in the suite are synthetic and are not physical input evidence.

Initial failures are retained: a test-only attempt to fetch a `blob:` URL was
correctly blocked by CSP; byte comparison now reads the real downloaded file and
observes the Blob handed to the media element, without changing CSP. The first
full offline flow then reproduced the fragment defect above. Playwright WebKit's
offline emulation rejected navigation internally; actual offline assertions use
the standalone server being shut down, while Next-hosted tests run online.
Browser-plugin Node execution and Context7 tools were unavailable after discovery;
the existing authorized Playwright fallback and primary W3C IndexedDB/Web Audio
documentation were used. No new dependencies or paid services were added.

## Reproduce

From the repository root, with project Node and existing browser tools:

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
python3 scripts/verify_web_bundle.py
DJAYVO_BROWSER=chromium node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
DJAYVO_BROWSER=chromium node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/web/tests/browser.mjs
npm --prefix apps/site run build
npm --prefix apps/site test
npm --prefix apps/site run audit:bundle
# With the local Next server already started:
node apps/web/tests/session-site.mjs
# Existing isolated Linux VM/image; networking disabled:
sh docs/evidence/audio-resume/linux-run.sh
```

The Next build was also run in the existing isolated source snapshot so the main
localhost server's build files were preserved; its public studio was refreshed
through `studio:prepare`. R2/Resend, new provider mutations, paid inference, native
and phone retesting, physical latency, listening and deployment are outside this
increment. Browser storage behavior is not musical-quality evidence.
