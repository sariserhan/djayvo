# Optional web installation

2026-10-18. **Implementation and local browser checks: PASS. Full spec: PARTIAL.**

Open **Privacy & credits → Add Djayvo to your device**. When a browser supplies
an installation offer, **Install Djayvo** opens that browser's prompt. Otherwise
the page explains the browser-menu options. The app never prompts automatically,
and accepting a prompt is not reported as completed installation until the browser
reports completion. Dismissal and failures leave the studio usable.

The manifest has a stable, relative identity, scope and start URL. The standalone
build opens `/index.html`; the site build opens `/studio/index.html`, keeping
account routes outside the studio scope. Original waveform icons include 192/512
PNG manifest icons with the mark inside the maskable safe area, a 180px Apple icon
and an SVG favicon. Regenerate PNGs with `node apps/web/tests/build-icons.mjs`
using the existing pinned Playwright Chromium. No new dependency or engine change.

Installation and offline storage are separate choices. Users must explicitly
enable **Keep studio available offline**, including in a newly installed app if
needed. Installed apps may have separate browser storage; download important
mixes before switching. No automatic library transfer, upload, account access,
microphone access or persistence guarantee is implied. Removing the offline
cache still preserves mixes. OS uninstall/storage eviction behavior is not tested.

## Evidence

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Build and public asset audit | PASS | 21 files, 14,382,254 bytes; notices, no private files, unchanged WASM; site copy audited |
| Unit checks | PASS | 14 tests including install offer/dismiss/accept/error/completion and standalone state; prompt events are simulated, not OS installation |
| Manifest, icons and offline lifecycle | PASS | 38 checks: Chromium 11, WebKit 10, Firefox 10 at `/studio/`; Chromium 7 at `/` |
| Chromium installability diagnostics | PASS | Parsed manifest and browser installability diagnostics contain no errors at both scopes |
| Ordinary browser regression | PASS | 20 Chromium checks: all seven styles, capture consent/cancel, playback/download, persistence, recovery and deletion |
| Responsive presentation | PASS | 1440×1000 and 390×844 screenshots inspected; mobile installation instructions fit without horizontal overflow; icon inspected |
| App runtime errors | PASS | No page errors in the four installation/offline runs; ordinary Chromium workflow also checks console errors |
| Offline render/play/export | PASS | Actual disposable server stopped; imported supplied fixture, generated three styles, played muted audio, sought and downloaded WAV; manifest also available offline |
| Event frames / waveform | PASS | WASM hash unchanged from prior exact seven-style native/Firefox comparisons; fresh PCM comparisons NOT RUN |
| Physical installation and launch, mobile recording/routes | NOT RUN | Browser diagnostics and simulated events do not establish physical OS behavior |
| Independent listening / M1 | NOT RUN | No new listening observations or production-quality claim |
| Deployment / release | NOT RUN | Loopback tests only; infrastructure and phone work remain paused |

[Machine report](evidence/web-installation/report.json),
[unit log](evidence/web-installation/unit-tests.log),
[bundle audit](evidence/web-installation/bundle.json),
[site audit](evidence/web-installation/site-audit.json).
The four JSON reports alongside these retain check names, browser versions and
zero-error diagnostics. Screenshots: [desktop](evidence/web-installation/install-desktop.png)
and [mobile](evidence/web-installation/install-mobile.png).

Actual environment: Apple M5, macOS 26.7.1 (25G241), Node 22.23.1, Playwright
1.61.1, Chromium 149.0.7827.55, WebKit 26.5 and Firefox 151.0. Disposable browser
contexts use fresh loopback ports and copies of the built bundle; the owner's
browser profile and recordings are untouched. The Browser skill was read but its
required execution tool was unavailable; the existing authorized Playwright
workflow supplied validation. Context7 was also unavailable. API guidance came
from [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
and [the install-offer event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).

## Reproduction

```sh
sh scripts/web_build.sh
node apps/site/scripts/prepare-studio.mjs
node --test apps/web/tests/*.test.js
node apps/web/tests/offline.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/offline.mjs
DJAYVO_BROWSER=firefox node apps/web/tests/offline.mjs
DJAYVO_OFFLINE_ROOT=1 node apps/web/tests/offline.mjs
python3 scripts/verify_web_bundle.py
# With the existing loopback studio server on localhost:4173:
node apps/web/tests/browser.mjs
```

All generated audio remains ignored under fresh `renders/` directories. Master,
supplied fixture and owner source hashes match the previous evidence. No native
or sanitizer rerun: C++ and WASM bytes are unchanged. W07 remains **PARTIAL**
until real installed-app/device and release evidence exists.
