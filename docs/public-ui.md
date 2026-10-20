# Public UI refinement

2026-10-19 (America/New_York). Scope: the owner's request to make the public
Jamloom UI sharper and adaptive. The master specification is unchanged.

The voice studio now separates capture and musical direction into aligned
sections. Shared typography, waveform framing, logo treatment, form fields,
focus states and spacing carry through the account and catalogue pages. The DJ
workspace retains its A/B colour coding with larger controls and responsive
transport/instrument layouts. Narrow screens stack sections without hiding
controls. The catalogue player reserves room for the footer when open.

No dependencies, audio algorithms, consent rules, data formats, credentials,
tracking exclusions or security policies changed. The empty catalogue does not
invent tracks. The existing synthetic speech fixture was imported unchanged.

## Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Root production build | PASS | [Build log](evidence/public-ui/build.log): native/WASM preparation and Next.js production compile |
| TypeScript and unit checks | PASS | Main: typecheck and 14 tests. Isolated release: typecheck and 10 tests. Different counts reflect previously excluded email changes. |
| Public bundle/secret audit | PASS | [Audit](evidence/public-ui/bundle-audit.log), 16 client files |
| Responsive layout | PASS | [56 cases](evidence/public-ui/responsive.json): Chromium and WebKit; four routes at 320, 390, 768, 1024, 1440 and 1920px widths, plus 900×480 landscape; no horizontal page overflow |
| Dropdown rendering | PASS | [12 focused cases](evidence/public-ui/dropdowns.json): native selects retain selection with full-height painted controls in Chromium/WebKit at 320, 390 and 1440px |
| UI interactions | PASS | Both engines: consent gating, keyboard privacy dismissal/focus return, direction selection, real WAV import/clear, required account fields and catalogue filter navigation |
| Player/footer layout | PASS | 320, 390 and 1440px in both engines; presentation-only populated player/error state, no account or catalogue data created |
| Voice audio regression | PASS | [21 Chromium checks](evidence/public-ui/studio-chromium.log): generation, playback, WAV download, persistence, invalid input, cancellation and synthetic microphone flow |
| DJ audio regression | PASS | [47 Chromium checks](evidence/public-ui/dj-chromium.log): stereo mix, EQ/effects, transport, shared-C++ worklet, synthetic MIDI, offline audio and recovery |
| Live Vercel release | PASS | [Ready production receipt](evidence/public-ui/deployment.json), [Vercel build](evidence/public-ui/vercel-build.log), [public browser checks](evidence/public-ui/public.json): four routes in Chromium desktop/WebKit mobile, consent controls, dropdown appearance, auth HTTP 200 and apex redirect |
| Analytics transport and security | PASS | [Two page views HTTP 204, realtime HTTP 101](evidence/public-ui/tracker-events.json); no console errors or CSP violations; studio stays untracked |
| VisitorPing dashboard collection | NOT RUN | Test installation/Live Radar unavailable; transport alone does not establish dashboard collection |
| Physical phones/tablets and installed Safari | NOT RUN | Browser viewport/WebKit simulation is not device evidence |
| Human acceptance of this visual update | NOT RUN | Owner review remains open |
| Musical quality | NOT RUN | UI/audio regression tests do not establish musical quality |

## Reproduce

```sh
npm run build
cd apps/site
npm run typecheck
npm test
npm run audit:bundle
./node_modules/.bin/next start --hostname 127.0.0.1 --port 4300
```

In a second terminal from the repository root:

```sh
node docs/evidence/public-ui/responsive.mjs
(cd apps/web && npm run test:browser && npm run test:dj)
node docs/evidence/public-ui/public.mjs
```

The responsive check writes screenshots and its receipt into a fresh ignored
`renders/public-ui-*` directory. Local tracking requests are fulfilled with an
empty script to avoid sending local test visits. Public verification uses the
actual website and tracker. Local tools: Node 22.23.1, Next.js 16.4.2,
Playwright 1.61.1, macOS 26.7.1 (25G241).

The first visual test asserted mouse-click focus restoration in WebKit, where
buttons are not focused by clicking. It now opens the dialog with the keyboard
to check keyboard focus accurately. A rapid navigation run also surfaced WebKit
errors from interrupted Next prefetches; waiting for each page's network to
settle produced zero page errors. No application/security setting was weakened. Live screenshot review then caught
WebKit painting compact native select widgets inside larger boxes. CSS-only
select styling fixes their appearance while retaining native semantics.

## Publication scope

Release source: `d752251` (UI commits `26165a6`, `d752251`), based on the existing public release `1dac42e` in
`build-visitorping/source`. Only this UI patch was applied; unrelated local
features were not included. No GitHub push was performed. The main checkout
contains the same UI changes plus the project's existing local work.

Final production deployment: `dpl_FjCrGHQFdRhR9dognSFeaxa3HAfH`,
[www.jamloom.com](https://www.jamloom.com), with [isolated build URL](https://site-oo0xgaapp-ssari.vercel.app).

Reviewed public screenshots: [desktop studio](evidence/public-ui/desktop.png),
[mobile studio](evidence/public-ui/mobile.png),
[mobile catalogue](evidence/public-ui/catalogue-mobile.png).
