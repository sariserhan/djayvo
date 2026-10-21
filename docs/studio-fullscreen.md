# Adaptive fullscreen studio — 2026-10-21

Use **Fullscreen studio** beside the studio title. The button exits fullscreen
as well, and browser exit events restore the ordinary page. The same controls
are available in Academy and `/studio/dj.html`.

The existing workspace enters fullscreen without cloning/reparenting media or
rebuilding the audio graph. Deck sources, playback positions, faders and lesson
state survive entry and exit. If native fullscreen is unavailable or rejected,
an explicitly labeled expanded-page view remains usable. Escape closes that
fallback. Background navigation becomes inert while expanded and returns to its
previous state on exit; focus returns to the view button.

## Screen adaptation

- **1900 CSS pixels and wider:** existing performance Deck C beside the A/B
  console and mixer; the instrument channel below A/B. C retains its own setup,
  generation, mixing and effects controls. Its long panel scrolls independently.
- **1100 pixels and wider:** compact platters, displays and mixer. Shorter screens
  get shorter pitch faders and tighter spacing while retaining control targets.
  At tested 1366×768, both transports and pad rows fit in view.
- **Smaller screens:** existing tablet/phone stacking, scrollable panels, no
  horizontal page overflow. The exit button remains visible while scrolling.
- Browser zoom changes available CSS pixels, so the layout does not assume a
  physical resolution or request permission to enumerate connected monitors.

The Academy coach stays accessible through **Show coaching**. It starts folded
only when lesson tracks are already prepared; permission/loading remains visible when
entering before preparation. Exiting restores the coach. This changes only its
presentation, not task scoring or saved progress.

There are still two file decks and the existing prepared performance channel C.
No fourth deck, new mixer bus, or fake additional deck was created.

## Sources

- `apps/web/studio-view.js`: native/full-page fallback, browser-exit synchronization,
  scroll/focus restoration, background focus isolation and coach visibility.
- `apps/web/dj.html`, `dj.js`: controls and wiring on the shared studio.
- `apps/web/dj.css`: viewport- and height-aware fullscreen layout.
- `apps/web/academy-coach.js`: stable panel ID and readiness notification, including
  when the lesson arrives after fullscreen has already been entered.
- `apps/site/tests/studio-fullscreen.mjs`: real browser/audio checks and screenshots.

The implementation follows the browser's asynchronous
[fullscreen request](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)
and [fullscreen-change event](https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event)
contracts. Context7 was unavailable in this session; primary web-platform reference
pages were used. No new dependency or relaxed security policy.

## Validation

Evidence: `docs/evidence/studio-fullscreen/`.

| Gate | Status | Evidence / boundary |
|---|---|---|
| Production build | PASS | `build.log`, root `npm run build` |
| Web unit tests | PASS | `web-tests.log`, 78/78 |
| Audited bundle | PASS | `bundle.json`, including the new module and regenerated offline hashes |
| Native fullscreen | PASS | Chromium/WebKit `fullscreenElement` verification, actual button entry/exit and browser exit-event synchronization |
| Adaptive layout | PASS | Both browsers: 3840×2160, 2560×1440, 1920×1080, 1440×900, 1366×768, 1024×768, 844×390, 390×844, 320×640 |
| Layout integrity | PASS | No horizontal root overflow; no deck/instrument overlap; wide C alignment; transports/pads visible on tested desktop sizes; exit visible while scrolling |
| Playback and lesson state | PASS | Real source URI/position and output meter survive transitions; permission/load while fullscreen and first lesson check afterward pass |
| Failure/focus/accessibility | PASS | Injected denial, missing API, Escape fallback, restored focus/background navigation; zero automated axe WCAG A/AA violations |
| Existing DJ regression | PASS | 48 checks per browser: instruments, MIDI, interrupted playback, disconnected audio and recorded PCM |
| Physical monitor changes / touch devices | NOT RUN | Viewports are automated browser dimensions, not physical monitor or phone certification |
| Native OS Escape and manual screen-reader study | NOT RUN | Native button/API exit tested; fallback keyboard Escape tested |
| Production deployment | NOT RUN | Existing local preview restarted; no push, hosted writes or deployment |

During development, the old local Next process returned 404 for the newly added
public module; restarting the preview after building resolved it. The first
wide-layout screenshot exposed grid rows shrinking beneath their contents;
max-content track sizing and explicit final rows fixed the overlap/order.
WebKit's platter sizing needed an explicit matching height to fit the laptop
controls. Final layout assertions cover these findings. Browser automation cannot
resize a native fullscreen window directly, so viewport cases exit, resize, and
re-enter; no physical monitor hot-plug claim is made.

The first parallel WebKit DJ regression observed “Ready” instead of the expected
“Starting…” immediately after a simulated stalled Play. Its failure/log are retained.
A rerun with the fullscreen test no longer running passed all 48 checks without an
audio-engine or assertion change. The cause is not established; this is not evidence
of a diagnosed/fixed audio fault. The final WebKit DJ run also retains its existing
screenshot-time CSP warnings; headers were not loosened.

Reproduce with the existing local preview running:

```sh
npm run build
node --test apps/web/tests/*.test.js
python3 scripts/verify_web_bundle.py
JAMLOOM_TEST_URL=http://127.0.0.1:4224 node apps/site/tests/studio-fullscreen.mjs
node apps/web/tests/dj.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/dj.mjs
```

The preview uses the existing loopback `jamloom_academy_preview` database, saved
local configuration and a local email outbox. No data or recording was deleted.
Existing music-quality FAIL, recorder-clock uncertainty, incomplete curriculum,
closed paid generation and closed Academy sales remain unchanged.
