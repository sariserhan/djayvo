# Hardware deck design and music curation

2026-10-21. Local implementation, browser gates, deployment and full hosted CI **PASS**.

The owner's supplied controller screenshot and [Tribe XR](https://www.tribexr.com/)
inform the physical materials, not a copied controller layout. Jamloom uses its
own graphite chassis, lime/violet deck identities, stationary machined rims,
grooved inner discs, recessed displays and beveled pads. No vendor artwork or new
rendering dependency was added. Existing audio transport and native sliders remain.

Homepage platters now use the same play/pause handler as their transport buttons.
Studio and Academy retain jog seeking, cue, EQ, pitch, crossfade and fullscreen.
Hover highlights the control frame without moving its hit area; visible keyboard
focus, reduced motion, 44px transport/pitch targets and responsive layouts remain.
A final fullscreen review found the lower rim overlapping the seek hint; 12px
clearance fixes it, with both browser suites and screenshots refreshed.
This is visual depth, not simulated scratching or additional decorative controls.

## Aurowall selection

The shared server validator permits reviewed music folders in both the listing
and streaming routes. **72 tracks remain**, from the original 94. The 22 excluded
categories are aurora, breathing, brown-noise, chakra, deep-calm, deep-focus,
dream, fireplace, forest, healing, meditation, mindfulness, prayer, quran, rain,
spiritual, thunder, underwater, waves, white-noise, winter and zen.

Regional music (including Arabic, India and Turkey) remains, as do music genres
such as ambient and rainy jazz. Excluded old IDs return 404. New folders require
review. This is category-based selection, not transcription or full listening of
each recording. No bucket objects, permissions or settings were changed; partner
links and rights disclosures remain. No partner audio was copied into Git.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Production build, TypeScript, client secret audit | PASS | [Build](evidence/deck-hardware/build.log), [typecheck](evidence/deck-hardware/typecheck.log), [audit](evidence/deck-hardware/bundle.log); unchanged WASM hash |
| Site and web unit tests | PASS | [35 site](evidence/deck-hardware/unit.log), [102 web](evidence/deck-hardware/web.log); allowlist/invalid-object checks |
| Actual R2 listing, range/seek, curated IDs and offline fallback | PASS | [Chromium/WebKit results](evidence/deck-hardware/results.json); 72 entries, representative House playback, removed IDs rejected, existing CC0 fallback |
| Homepage/studio/Academy interactions | PASS | Real play/pause/cue, jog keyboard and pointer drag, fader arrows, expanded/fullscreen enter/exit, Academy shared-clock playback and stop |
| Layout/accessibility | PASS | Homepage 1440/390/320; studio 1440/820/390/320; axe, hover/focus, reduced motion, simulated touch at 390×844 |
| Audible output/autoplay | PASS | All test output muted with `silent-audio.mjs` and Chromium mute flag; playback requires explicit action; no user Dia session or OS volume changed |
| Production deployment | PASS | Runtime `c308eea`; [READY deployment](evidence/deck-hardware/deployment-inspect.log), [exact CSS/JS hashes and public HTTP gates](evidence/deck-hardware/production-http.json); existing coming-soon/sales/quality gates retained |
| Full hosted CI | PASS | [Run 39676250203](https://github.com/sariserhan/jamloom/actions/runs/39676250203), final runtime `c308eea`: website, Academy, Linux/macOS normal and sanitizer builds, iPhone compilation and cross-platform comparison; [receipt](evidence/deck-hardware/ci.json) |
| Physical device, manual accessibility and listening | NOT RUN | Human checks deferred; simulated touch is not physical hardware evidence |

Browser checks use the local production build at `http://127.0.0.1:4233`, real
read-only Aurowall R2 credentials, launch gating disabled only in the test process,
and an empty mock for the unrelated community catalogue. The in-app browser runtime
was unavailable, so the existing Playwright runner provided browser evidence.
Authenticated hosted playback is not claimed. Screenshots were visually reviewed:
[full studio](evidence/deck-hardware/chromium-fullscreen.png),
[homepage hover](evidence/deck-hardware/chromium-mini-hover.png),
[320px studio](evidence/deck-hardware/chromium-dj-mobile.png),
[WebKit studio](evidence/deck-hardware/webkit-fullscreen.png).

Reproduce from `apps/site` with ignored R2 env values:

```sh
npm run build
npm run typecheck
npm run audit:bundle
npm test
node --test ../web/tests/*.test.js
node --env-file=.env.local --import tsx tests/aurowall-browser.mjs
```

Source changes are limited to existing deck components/styles, waveform colors,
the shared Aurowall validator and its existing tests. No schema or billing changes.

Implementation `47da857` and final spacing fix `c308eea` are deployed as
`dpl_2wrBTU3JiKwkFtki5HjeTmpEHaXY`, aliased to `https://www.jamloom.com`.
The final spacing fix passed a fresh production build, bundle audit and both
complete muted browser suites. Site/web unit evidence covers unchanged logic
from `47da857`. Follow-up release documentation does not change runtime code.
