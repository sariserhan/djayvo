# Optional offline web studio

2026-10-18. **Local offline implementation: PASS. Full specification: PARTIAL.**

Open **Privacy & credits → Keep studio available offline** while online. After
setup succeeds, reopen the studio. Import/record and generate locally as before.
**Remove offline studio** removes the cached app and instruments; saved mixes
remain in the separate browser library. No installation happens before this
explicit opt-in. Download important mixes because browser cleanup/eviction can
remove local storage.

## Implementation and privacy boundary

A generated service worker contains an exact public-asset allowlist, byte lengths
and SHA-256 hashes. It verifies the entire downloaded version before installation
succeeds. No runtime request is added to the cache. Source recordings, generated
WAVs, account pages, API responses, query-bearing requests and non-GET requests
are excluded. The site edition is scoped to `/studio/`; the standalone edition
uses its own root. Neither version reads credentials for asset downloads.

A failed install removes only its incomplete cache. A complete cached version
can be reused without redownloading. Each asset is bounded at 16 MiB, each build
at 24 MiB, with at most two builds per scope while an update waits. Activation
removes older caches belonging to that studio scope, preserving unrelated caches.
Asset download is bounded by a 60-second install timeout. Cache misses verify
expected bytes before returning them, so an evicted old asset cannot silently
be replaced by a different version. Browser quota failures do not delete mixes.

Updates follow the browser's waiting lifecycle. There is no forced activation,
page reload or takeover of an existing page; close all studio tabs for a waiting
update to take over. The Next.js preparation step regenerates hashes after its
Account navigation substitution, and its audit checks the generated worker too.
No manifest, home-screen installation, new library dependency or public hosting
was added in this pass.

The regression run also caught a WebKit media resource error. Preview/library
cleanup previously revoked URLs while players still referenced them. Players
now pause, detach and release their resources before URL revocation. A focused
probe recorded two violations before the fix and zero afterward; the normal
browser runner now detects this ordering throughout its flow.

## Gate ledger

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Unit tests | PASS | 12 tests; deterministic generated worker, extra-file/symlink/size rejection, complete-cache reuse, existing bounds/library/novelty checks |
| Offline lifecycle, nested studio | PASS | Nine checks each in Chromium, WebKit and Firefox: opt-in, corrupt initial download, scope, offline creation/play/export, corrupt update, waiting update, cache bound, activation and removal |
| Standalone root studio | PASS | Five checks in Chromium; root allowlist excludes simulated account/API endpoints, offline creation and scoped removal |
| Ordinary studio regression | PASS | Chromium 20, WebKit 18, Firefox 18 checks; all seven styles, consent/import/cancel, persistence, recovery, deletion, playback/download and request privacy |
| Media cleanup | PASS | Attached-URL probe FAIL before / PASS after; browser regression reports no app console/page errors |
| Public bundle / site copy | PASS | Static allowlist, licenses, unchanged WASM and regenerated site-specific offline hashes |
| Responsive controls | PASS | 390×844 mobile dialog inspected; no horizontal overflow; ordinary desktop 1440×1000 flow retained |
| Event frames / PCM | PASS | Engine/WASM unchanged from the seven exact Firefox/native comparisons in [web recovery](web-recovery.md); no fresh native render is claimed |
| Fresh native / sanitizer run | NOT RUN | This change only touches web lifecycle/build tools; prior C++ evidence remains scoped to its recorded revision |
| Physical browser mic, installed Safari, mobile hardware | NOT RUN | Automated imported fixture and Chromium fake microphone remain separate from real capture/device validation |
| Human listening / M1 | NOT RUN | No new ratings; muted playback does not establish musical quality |
| Home-screen installation / public hosting / release | NOT RUN | Cache support is not installation or deployment evidence |

[Machine report](evidence/offline-studio/report.json),
[unit tests](evidence/offline-studio/unit-tests.log),
[bundle audit](evidence/offline-studio/bundle.json),
[site audit](evidence/offline-studio/site-audit.log),
[mobile screenshot](evidence/offline-studio/offline-mobile.png).
All generated audio and disposable browser artifacts remain under ignored,
fresh `renders/web-*-offline-*` / `renders/web-*-ui-*` folders. Source/fixture/master
hashes are retained in the machine report; existing recordings were not replaced.

Actual environment: Apple M5 arm64, macOS 26.7.1 (25G241), Node 22.23.1,
Playwright 1.61.1; Chromium 149.0.7827.55, WebKit 26.5 and Firefox 151.0.
The browser plugin's execution runtime and Context7 tools were unavailable.
The existing disposable Playwright workflow was used. The cache lifecycle tests
serve the actual prepared public bundle on a fresh loopback port; account/API
routes in that server are test responses, not live authentication verification.
The server is actually shut down during offline reload, generation, playback and
download. This is server-disconnection evidence, not a physical network-switch,
installed-app or deployed Next.js test. No paid/cloud service or owner browser
profile is changed.

## Investigated failures

- Browser offline emulation still allowed service-worker update requests in two
  engines, and WebKit reported an internal navigation error. The tests now shut
  down the actual test server instead. Initial failures remain in the evidence.
- An asynchronous `waitForFunction` predicate returned a Promise object before
  the condition became true in the installed runner. The test modified files
  during an unfinished install and reported misleading update/cache failures.
  The retained `cache-trace.log` shows an incomplete download being rejected.
  Bounded polling now awaits the actual condition; all three engines pass. The
  earlier inference that a *completed* cache had been deleted was not established.
- WebKit's ordinary flow logged `WebKitBlobResource error 1`. The independent
  URL-lifecycle probe established revocation before detachment; cleanup now uses
  the safe order. The failing log and before/after probe are retained.

## Reproduction

```sh
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
npm --prefix apps/site run studio:prepare
npm --prefix apps/site run audit:bundle
npm --prefix apps/web test
DJAYVO_BROWSER=chromium node apps/web/tests/offline.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/offline.mjs
DJAYVO_BROWSER=firefox node apps/web/tests/offline.mjs
DJAYVO_BROWSER=chromium DJAYVO_OFFLINE_ROOT=1 node apps/web/tests/offline.mjs
# Normal UI runner uses the existing localhost:4173 server:
DJAYVO_BROWSER=chromium node apps/web/tests/browser.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/browser.mjs
DJAYVO_BROWSER=firefox node apps/web/tests/browser.mjs
```

The offline runner starts/stops its own disposable loopback server, preserves
failure artifacts and does not modify the running owner's server. Build and
removal checks never touch IndexedDB mixes outside a disposable test context.

API references checked: [service-worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers),
[registration and scope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register),
[Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
