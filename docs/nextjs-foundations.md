# Next.js loading, recovery and caching — 2026-10-21

Jamloom remains on Next.js 16.4.2 App Router, React 19.3.1 and the existing Vercel
architecture. No dependency or database changes. Master specification unchanged.

## Implemented

- `app/loading-state.tsx` and `route-state.css`: shared responsive skeleton,
  screen-reader status, hidden decorative shapes and reduced-motion support.
- `loading.tsx` in account, admin, library, catalogue, playlists, review and
  Academy learn/progress/checkout/success. These cover asynchronous route work;
  client-fetched homepage music and Academy progress also use the skeleton.
  Progress actions are unavailable until the initial load resolves.
- `app/not-found.tsx`: branded 404 with home/support navigation; existing `notFound()`
  checks retained. No root loading boundary, so unknown public routes can return
  a real HTTP 404 before streaming.
- `app/error.tsx`: recoverable render/server failures, without displaying raw
  exception messages. Uses the installed Next.js `retry()` API to re-fetch and
  re-render, rather than only resetting client error state.
- `app/global-error.tsx`: independent HTML/body, title, noindex and CSS for root
  layout/provider failures, using the same recovery UI. It does not require the
  failed root layout or music-player provider.
- `app/robots.ts`: correct Next.js filename (not `robot.ts`); private/account,
  API, raw studio and gated Academy paths excluded. Coming-soon mode permits
  the landing page and legal pages; product paths remain excluded.
- Existing `app/sitemap.ts` retained and clarified. Runtime launch setting selects
  homepage-only or public product/guide/level URLs, all on www.jamloom.com.
  No invented last-modified timestamps or private/user-recording URLs.

## Cache decisions

| Surface | Policy | Reason |
|---|---|---|
| Marketing pages, guides, product pages, Academy level descriptions | Existing Next Full Route Cache / build-time static generation | Source-controlled public content; deployment updates it |
| Hashed Next JS/CSS | Existing framework immutable asset caching | Next manages content hashes and invalidation |
| Repeated admin layout/page authorization | React `cache()` within one server render | Avoid duplicate session/owner reads without sharing identities across requests |
| Account, admin, wallet, purchases, personal library, playlists, progress | Dynamic with existing private/no-store responses | Per-user authorization and current balances/entitlements |
| Catalogue and playback grants | Existing dynamic/no-store | Preserve withdrawals and short-lived access grants |
| Robots and sitemap | Request-time dynamic | Build promotion must respect runtime coming-soon configuration |
| Maintenance/billing controls | Existing bounded settings cache and mutation invalidation | No new stale authorization or billing cache |

No blanket `use cache`, persistent auth/data cache or Cache Components migration:
those would conflict with the current dynamic/CSP and immediate revocation paths.
The existing static strategy is already appropriate for source-controlled public
content. Robots rules are crawler guidance, not an authorization mechanism.

## Reproducible checks

From `apps/site`, with Node 22.23.1 on PATH:

```sh
npm test
npm run build
npm run typecheck
npm run audit:bundle
npm run test:framework-browser
```

For the real session regression, set `JAMLOOM_TEST_DATABASE_URL` to an authorized
**loopback** PostgreSQL instance, then run `npm run test:coming-soon-browser`.
The script refuses non-loopback hosts and creates/drops its own disposable database.
Never substitute the hosted `.env.local` database in destructive tests.

Framework tests start the actual production app on 127.0.0.1:4231 with accounts
unconfigured, and a disposable Next production fixture on 4230. The fixture copies
our exact loading/error/404 components, adds deliberate delayed/throwing routes,
then deletes itself. No fault-injection route or switch ships in Jamloom. Requests
in the browsers are limited to the two local origins. No hosted email or payment.
The launch/session test uses 127.0.0.1:4227 and disposable local credentials.

| Gate | Status | Evidence |
|---|---|---|
| Unit tests | PASS | 31 tests, zero failures; runtime launch-mode robots/sitemap checks included |
| Production build, typecheck, client-secret/bundle audit | PASS | Next production output; existing WASM hash preserved |
| Actual site missing routes | PASS | Unknown nested/top-level/guide/Academy-level URLs return HTTP 404; home recovery works |
| Actual homepage and Academy fetch loading | PASS | Delayed responses show skeletons; correct empty/sign-in states replace them |
| Streaming loading and HTTP 500 | PASS | Disposable production fixture with copied components; real delayed/throwing Server Components |
| Client/server/global retry | PASS | Trigger client error, clear server/root-layout fault, click Try again, observe recovered content |
| Responsive/accessibility | PASS | Chromium 149.0.7827.55 and WebKit 26.5; 404 at 1440/390/320 px; axe WCAG 2 A/AA and 2.1 AA for 404/error/global; reduced motion |
| Console/UI health | PASS | Actual site has no uncaught page errors; expected deliberate fixture exceptions only; no dev overlay |
| Cache and authorization isolation | PASS | Prerender manifest assertions; real owner/member/owner admin requests; public/forged/unverified/suspended access checks |
| Coming-soon regression | PASS | Actual owner sign-in/deck playback; clearing session closes preview; sitemap homepage only |
| Vercel deployment and CDN behavior | NOT RUN | Local production servers only |
| Manual screen reader, physical mobile devices | NOT RUN | Automated browser checks only |

Machine-readable results and command logs: `docs/evidence/nextjs-foundations/`.
Screenshots and deliberately failing fixture server logs remain in the temporary
evidence directory printed by `test:framework-browser`.

Browser plugin setup was blocked because its required JavaScript execution tool
was not exposed; used the existing Playwright fallback. Context7 tools were also
unavailable. Checked installed Next.js types and official documentation:
[loading](https://nextjs.org/docs/app/api-reference/file-conventions/loading),
[errors/retry](https://nextjs.org/docs/app/api-reference/file-conventions/error),
[404](https://nextjs.org/docs/app/api-reference/file-conventions/not-found),
[robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots),
[sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap),
[caching](https://nextjs.org/docs/app/guides/caching-without-cache-components),
[request memoization](https://react.dev/reference/react/cache).

## Limits

App Router uses error boundaries, not a Pages Router `pages/500.tsx`. Before
streaming starts, missing/failed pages can return 404/500; after a response has
started, Next may render the corresponding fallback with HTTP 200 (and noindex
for not-found). Route-handler JSON errors and proxy maintenance/coming-soon
responses retain their existing status codes and recovery behavior. Offline
static DJ pages have their own existing lifecycle and are not React routes.

No cloud changes, release toggle changes, paid generation, training or audio
quality claims. Existing Q0 FAIL and paid-generation hold remain unchanged.
