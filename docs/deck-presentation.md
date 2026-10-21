# DJ hardware presentation — 2026-10-21

The shared Academy and standalone DJ console now uses a physical equipment layout:
metal-rimmed jog platters, recessed track displays with actual live scopes, circular
cue/play buttons, illuminated playback state, tactile faders and performance pads.
Both existing three-band EQs and channel levels now sit in the central mixer.
Effects remain available in labeled expandable panels. No controls or audio engine
were replaced. The platters still seek rather than synthesize scratching.

The Academy coach sits above the equipment instead of covering its top controls
while scrolling. The permission/loading fix and learning rubrics are preserved.
At narrow widths the equipment stacks as Deck A, mixer, Deck B. Existing keyboard
controls, native slider semantics, focus cues and reduced-motion support remain.

## Changed sources

- `apps/web/dj.html`: group existing controls into deck displays and mixer strips;
  expandable effects; remove the misleading fixed 33⅓ label from digital jogs.
- `apps/web/dj.css`: hardware materials, platter rim, transport buttons, mixer,
  fader caps, responsive layout and visible keyboard focus.
- `apps/web/dj.js`: playback indicator derives from actual deck state.
- `apps/web/academy.css`: coach no longer obscures equipment.
- `apps/site/tests/deck-presentation.mjs`: real browser regression and screenshots.
- Existing DJ, prepared-session and recording browser checks open effects panels
  before interacting; the DJ helper reopens them after offline reload as well.

## Validation

Evidence is in `docs/evidence/deck-presentation/`.

| Gate | Result | Evidence |
|---|---|---|
| Production build | PASS | `build.log`, root `npm run build` |
| Web unit tests | PASS | `web-tests.log`, 78/78 |
| Static bundle / offline manifest integrity | PASS | `bundle.json`; generated studio and offline Academy rebuilt |
| Desktop and mobile layout | PASS | Chromium/WebKit at 1440, 1024, 820, 768, 560, 390 and 320px; no page/console horizontal overflow |
| Real presentation/control flow | PASS | `browser.json`: playback, platter rotation, channel mute/restore, EQ/echo, keyboard jog, reduced motion, standalone route |
| Academy lesson | PASS | All three guest checks complete through real Play A / Play B / crossfade controls in Chromium and WebKit |
| Full DJ regression | PASS | `dj-chromium.json`, `dj-webkit.json`: real deck/instrument PCM, jog/cue/pitch, MIDI mapping, interrupted starts, disconnected playback and recorded PCM |
| Automated accessibility | PASS | Zero axe WCAG A/AA violations in both browsers; not a manual screen-reader study |
| Human visual acceptance / physical touch hardware | NOT RUN | Owner review required; screenshots are automated browser evidence |
| Production deployment | NOT RUN | Local only, no push or deployment |

The first broad DJ regression failed after an offline reload because its old test
helper attempted to fill an effect inside a closed panel. Initial failure logs
are preserved as `dj-*-initial.log`; the helper now opens that panel through its
visible summary before changing an effect. No scoring or audio assertion was
weakened. Both final full DJ runs pass. Each records 48 successful checks. WebKit retains four screenshot-time
stylesheet CSP warnings under the existing test classification; Chromium has none.
Security headers were not loosened, and no app page errors were observed. Prepared-session and dedicated recording
script interactions were updated for the same panel change; those separate full
suites were not rerun for this presentation change. The main DJ suite exercises
instrument playback and recording online/offline.

Reproduce against the running local preview:

```sh
npm run build
node --test apps/web/tests/*.test.js
python3 scripts/verify_web_bundle.py
JAMLOOM_TEST_URL=http://127.0.0.1:4224 node apps/site/tests/deck-presentation.mjs
node apps/web/tests/dj.mjs
JAMLOOM_BROWSER=webkit node apps/web/tests/dj.mjs
```

Current local preview: http://127.0.0.1:4224/academy/lessons/first-crossfade.
Refresh to load the new presentation; refreshing clears unsaved deck playback.
The standalone workspace uses the same controls at `/studio/dj.html`.

This is a presentation change. Advanced Academy curriculum, physical venue
reliability, the retained recorder clock diagnostic and musical-quality failure
remain unresolved. Paid generation and Academy sales remain closed.
