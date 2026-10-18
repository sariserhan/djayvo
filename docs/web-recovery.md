# Browser recovery and Firefox validation

2026-10-18. **Technical gates: PASS. Full specification: PARTIAL.**
One malformed stored file previously threw during library loading or verification,
preventing healthy mixes from being displayed. Loading now leaves malformed entries
for validation, withholds the damaged session, and continues showing healthy ones.
No stored recording is modified or silently deleted. Explicit delete-all still
removes withheld data. The [initial failing regression](evidence/web-recovery/initial-library-failure.log)
is retained.

Both browser runners now explicitly select Chromium, Firefox or WebKit and reject
unknown names before launch. Previously anything other than `webkit` silently
launched Chromium. UI tests now use fresh artifact directories, preserving prior
runs and recordings. The expanded test exercises all seven musical styles and
malformed IndexedDB entries alongside a healthy, playable session.

## Actual checks

| Gate | Status | Evidence / scope |
| --- | --- | --- |
| JavaScript regression tests | PASS | 10 tests, including malformed-file recovery and unknown-browser rejection |
| Chromium workflow | PASS | 20 checks, including existing synthetic microphone capture/revocation |
| WebKit workflow | PASS | 18 checks; screenshot-only CSP tooling warnings retained separately |
| Firefox workflow | PASS | 18 checks in Firefox 151.0, not Chromium labeled as Firefox |
| Page, controls, console | PASS | Correct title/content, enabled-state checks, keyboard dialog dismissal; zero app console/page errors |
| Import / trim / all styles | PASS | Supplied fixture, exact two-second trim, cancellation, three takes/club/funk/call-response/hybrid |
| Saved audio and privacy | PASS | Play/download/reload; source and consent not persisted; scoped/all deletion, ten-session bound, malformed and hash-tampered sessions withheld without deletion |
| Request privacy | PASS | Same-origin GET requests only in all three tested flows; no audio upload |
| Firefox/native agreement | PASS | Seven byte-identical WAVs; exact plan decisions/event frames; maximum/RMS PCM differences both zero |
| Responsive rendering | PASS | Desktop 1440×1000 and mobile 390×844; overflow assertion; Firefox desktop and WebKit mobile screenshots inspected |
| Static/site studio audits | PASS | Rebuilt studio, copied into local site public directory, checked public files/notices and exclusion of secrets/private audio |
| Physical browser mic / installed Safari / mobile hardware | NOT RUN | Disposable automated browsers are not hardware or owner listening evidence |
| Musical quality / formal M1 listening | NOT RUN | No new listening judgments or submitted ratings |
| Production release | NOT RUN | No deployment, account changes, emails, spend or publication |

[Machine report](evidence/web-recovery/report.json),
[Firefox PCM/event comparison](evidence/web-recovery/firefox-comparison.json),
[Chromium](evidence/web-recovery/chromium-report.json),
[WebKit](evidence/web-recovery/webkit-report.json),
[Firefox](evidence/web-recovery/firefox-report.json),
[unit tests](evidence/web-recovery/unit-tests.log),
[bundle audit](evidence/web-recovery/bundle.json).

Actual machine: Apple M5 arm64, macOS 26.7.1 (25G241), Node 22.23.1,
Playwright 1.61.1; Chromium 149.0.7827.55, WebKit 26.5, Firefox 151.0.
The Browser plugin is listed but its required Node REPL execution tool is absent
from tool discovery; the repository's disposable Playwright workflow was used.
Context7 tools were also unavailable; browser setup used the official
[Playwright browser documentation](https://playwright.dev/docs/browsers).
Firefox was installed as a test browser, without changing the owner's browser
profile or `~/mlx-env`.

The native comparison uses preserved `renders/feedback-reverb-20261018` fixture
references and actual Firefox worker outputs under
`renders/web-firefox-engine-u13krD`. The engine/WASM is unchanged:
`6ba7bc68a0237018dfde3a84e4e28036d045b1899e8c98d811166ccfca3c3354`.
No C++/sanitizer rerun was needed for this JavaScript recovery change. The prior
13-suite M5/Linux and sanitizer evidence remains scoped to its recorded revision.
Firefox single worker trials took 11.738 s for three takes and 4.450–6.238 s for
single styles; these were concurrent with UI testing, not isolated p95 benchmarks.

## Reproduce

```sh
npm --prefix apps/web test
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
npm --prefix apps/site run studio:prepare
npm --prefix apps/site run audit:bundle
# Keep python3 scripts/web_serve.py running on localhost:4173.
DJAYVO_BROWSER=firefox node apps/web/tests/browser.mjs
DJAYVO_BROWSER=firefox node apps/web/tests/browser-render.mjs
# Repeat the UI runner with chromium and webkit.
```

The runner prints each fresh output folder. Compare exported `mix.STYLE` artifacts
with the existing `scripts/compare_portability.py`/`compare` function. For the
reference folder above, three original styles use `fixture.STYLE`; other styles
use `STYLE.STYLE`. Test reports identify the actual browser version. Only
Chromium uses a synthetic fake microphone; other browser runs import the supplied
fixture. Muted playback verifies transport, never musical quality.

[Desktop evidence](evidence/web-recovery/firefox-desktop.png) and
[mobile evidence](evidence/web-recovery/webkit-mobile.png) show readable controls,
all style choices and saved playable mixes without clipping. Original recordings,
the supplied fixture and the immutable master retain their recorded SHA-256s.
