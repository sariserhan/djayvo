# Public Performance Studio — 2026-10-23

Owner decision: show the complete studio before purchase. Basic accepts personal
music for free; visitors can try Pro using included sample music; Pro v1 remains
$49 once for advanced controls with personal music.

## Delivered

- `/dj-studio` → **Open Studio** → `/studio/dj.html`, without account or purchase.
  Homepage/product/Pro/coming-soon entry copy now describes the free choices.
- **Basic:** two decks, local files and saved mixes, cue, jog seeking, speed,
  track loops, EQ, channel/master/crossfader controls, tone and echo.
- **Pro demo:** advanced controls with the ten existing checksum-verified CC0
  practice tracks. Four-second excerpts also demonstrate sampler and phrase
  loading. Personal imports, microphone capture and saved-source restores require
  Basic or paid Pro as appropriate. All tool sections remain visible.
- **Paid Pro:** existing verified account entitlement unlocks personal sources and
  the Aurowall catalogue. Checkout, signed native licenses and server-side partner
  access remain protected. The browser's local feature gates are not tamper-proof DRM.
- Mode selection persists within the tab. Switching loaded sessions asks before
  clearing unsaved work; stored banks/sets remain intact and deletion stays free.
- Offline Pro access still renews for up to 30 days. Expired/refunded/signed-out
  access falls back to demo rather than blocking the entire console or deleting
  saved music. Existing offline builds update through their normal waiting lifecycle.

## Verification

Flow: anonymous product page → Open Studio → two sample tracks and Pro tools →
Basic personal-track playback → paid UI fixture → revoked fixture → free demo.

| Check | Status / evidence |
|---|---|
| Public navigation, page identity, nonblank content, no runtime errors | PASS, real localhost Chromium and WebKit |
| Two sample decks, playback, beat controls, sampler and four-second phrase | PASS, real assets and browser audio paths; speakers muted |
| Basic local import, mixing and disabled Pro controls | PASS, including dispatched-event restriction and mode persistence |
| Paid and revoked UI states | PASS, controlled access-response fixtures; no purchase writes |
| WCAG A/AA scan | PASS, expanded demo controls in both browsers |
| Desktop/mobile rendering | PASS, 1440×1000 and 390×844; no page overflow; screenshots inspected |
| Real service-worker offline demo and Basic local loading | PASS, Chromium |
| Access policy, verified sample identity, offline renewal/expiry/revocation, sampler/recovery regressions | PASS, 9 Node tests |
| Coming-soon and metadata checks | PASS, 6 site tests |
| License integrity, purchase isolation and reversals | PASS, 6 checks with disposable real PostgreSQL and mocked Stripe responses |
| TypeScript and audited WASM/public bundle preparation | PASS |
| Fresh Stripe provider purchase, physical routing/listening, desktop packaging, website deployment | NOT RUN |

[Browser receipt](evidence/studio-access/browser.json).
Screenshots and raw browser output:
`/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-studio-access-MMtPrE`.
The in-app Browser runtime was unavailable (no execution tool); local Playwright
used the owner's existing fallback authorization.

Reproduce from repository root:

```sh
node apps/site/scripts/prepare-studio.mjs
node --test apps/web/tests/studio-access.test.js apps/web/tests/offline-cache.test.js apps/web/tests/practice-library.test.js apps/web/tests/sampler.test.js apps/web/tests/studio-recovery.test.js
node apps/site/tests/studio-access-browser.mjs
```

Site checks run from `apps/site`: `npm run typecheck`, and
`node --import tsx --test tests/coming-soon.test.ts tests/metadata.test.ts`.
`tests/pro.test.ts` additionally requires `JAMLOOM_TEST_DATABASE_URL` pointing to
an isolated loopback PostgreSQL server; it creates and drops its own database.
No migration, paid service activation or publication was needed.
