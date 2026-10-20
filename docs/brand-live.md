# Public Jamloom identity and tracker connection

2026-10-19 (America/New_York).

The owner reported the public website still displayed Djayvo. The earlier
VisitorPing deployment intentionally used the existing production source plus
only its installation patch, leaving the approved rename unpublished. That was
the direct cause of the old public identity, not a failed local rename.

## Scope

Publish the approved Jamloom rename (`a317fed`) on the existing production
baseline (`815b1e8`) with the VisitorPing installation. The isolated deployment
checkout keeps unrelated saved-performance/metadata-readiness features and newer
email-template work out of this release. Three cherry-pick conflicts were resolved
by keeping the older functionality and applying only its applicable name changes.
The resulting source commit is `1dac42e` in the existing detached release worktree.

Local Git remote now points to `https://github.com/sariserhan/jamloom.git`.
Vercel reconnected to the renamed repository; readback confirms `sariserhan/jamloom`,
repository ID `1423909724`, production branch `main`. [Connection receipt](evidence/brand-live/repository.json).
No Git push, environment overwrite or database change.

The first remote branding build failed because the CLI upload included the local
CMake cache with Mac-specific paths. Added `.vercelignore` to both main and the
release checkout to exclude generated build directories, copied studio outputs,
local environments and credentials. Retried from source without build cache.
[Initial failure](evidence/brand-live/deploy-first-failure.log).

## VisitorPing correction

“Tracking paused” is not proof that the owner manually disabled tracking.
The site-specific CDN initially returned that no-op script after installation, while
the provider configuration endpoint recognized the key and www origin (HTTP 200).
Provider source inspection shows the no-op response can represent account/plan,
quota or lookup state; this is not a diagnosis of the live account's exact cause.
The CDN later activated automatically and served the real tracker. Two actual
page-view requests and page-duration telemetry received HTTP 204. The authenticated
installation checker and Live Radar remain unavailable here.
No provider account settings or exclusions were changed.

A real browser check confirmed the existing `connect-src 'self'` policy blocks
`https://ingest.visitorping.com/v1/config?site=vp_QBDH92AC`.
[Before evidence](evidence/brand-live/csp-before.json). Added only that exact HTTPS
host to Next.js `connect-src`. Once the tracker activated, a second actual CSP
violation identified its `wss://realtime.visitorping.com` connection, so that exact
WebSocket host was also permitted. [Before realtime fix](evidence/brand-live/tracker-events-before-realtime.json). Nonce/strict-dynamic script protections, framing,
private caching, storage permissions and the separate offline studio CSP remain
unchanged. A regression verifies those restrictions remain present. The tracker
remains excluded from `/studio/`, where the homepage redirects.

## Validation

| Gate | Status | Evidence |
| --- | --- | --- |
| Main checkout regression | PASS | 14 tests and typecheck. |
| Isolated release regression/build/typecheck/bundle audit | PASS | 10 tests, production build and 16-client-file secret audit; [build log](evidence/brand-live/build.log), [receipt](evidence/brand-live/checks.json). |
| Repository remote and Vercel link | PASS | Same GitHub repository ID, renamed URL and production branch read back. |
| Public branding, PWA and engine module loading | PASS | [Live browser receipt](evidence/brand-live/public-browser.json): three Jamloom titles/wordmarks, stable PWA identity, renamed WASM loads, auth 200. |
| Provider activation and browser event delivery | PASS | Tracker activated; page_view for Account and Music and page_duration receive HTTP 204. This is transport acceptance, not Live Radar confirmation. |
| Realtime connection and CSP | PASS | Final [event receipt](evidence/brand-live/tracker-events.json): HTTP 101 WebSocket handshake, two page views HTTP 204, no console errors or CSP violations. |
| Production deployment | PASS | `dpl_BHKeoadgrSP2SXyeUfBJHZFXt886`, aliased to `www.jamloom.com`; [log](evidence/brand-live/deploy.log). |
| Dashboard installation check and Live Radar | NOT RUN | No authenticated dashboard connection. |
| Overall tracker readiness | PARTIAL | Provider is active and browser page events are accepted; dashboard confirmation still required. |

Existing offline installations may retain the old cached name until their normal
service-worker update activates. Close all studio tabs and reopen online; do not
clear browser storage, which would erase local recordings. PWA identity and saved
library keys remain unchanged.

## Reproduce the public checks

With the existing site dependencies installed, from the repository root:

```sh
node docs/evidence/brand-live/verify-brand-live.mjs
node docs/evidence/brand-live/verify-tracker-live.mjs
```

These create automated test visits and overwrite their evidence receipts.
They do not log into accounts or prove that Live Radar rendered the events.
For the final human gate, open Account and Music in a private window, complete any
required consent, and confirm both paths in Live Radar. The homepage's offline
studio intentionally remains untracked. Do not clear saved browser recordings.
