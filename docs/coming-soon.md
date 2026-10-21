# Public coming soon — 2026-10-21

The public site now defaults to a branded coming-soon screen. The existing
homepage, DJ decks and other product features remain intact for the verified
owner's server session. No database state, deployment settings or live accounts
were changed by this implementation.

## Scope

- `lib/coming-soon.ts` and `proxy.ts`: default-on launch flag, explicit recovery
  routes, branded HTTP response and real Better Auth admin bypass. Anonymous,
  ordinary, unverified and suspended users cannot preview product pages. Forged
  headers/cookies/query flags do not bypass the gate. Auth failure stays closed.
- `public/coming-soon.css`: adaptive visual launch page, decorative record sleeve,
  actual contact/support links and admin sign-in; no fake player or signup form.
- Existing VisitorPing key/integration is retained once on the launch page.
  Its scoped CSP allows only the existing tracker and ingestion endpoints;
  existing account/studio policies are unchanged.
- Product URLs redirect to `/`; product APIs and signup return 503. Recovery,
  contact/support/legal pages, admin endpoints and existing signed callbacks retain
  their own authentication/validation. This is a launch screen, not a replacement
  for per-route authorization or offline asset access control.
- Preview responses use private/no-store caching. The launch response varies by
  Cookie; Next manages its own RSC Vary header on normal preview routes. No-store
  on the actual admin HTML response was checked, followed by an anonymous request
  that received coming soon, not the preview.
- Sitemap is dynamically limited to the public homepage while closed. Setting
  `JAMLOOM_COMING_SOON=false` and redeploying reopens the normal routes. Missing or
  malformed values keep the gate on. Dashboard shows launch status separately
  from maintenance mode. Paid release gates are unchanged.

Uses the existing request gate; the response behavior follows
[Next.js Proxy guidance](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
Context7 and the Browser Node REPL were unavailable in this tool environment;
current official docs and the repository's authorized Playwright workflow were used.

## Evidence

| Gate | Result | Evidence |
|---|---|---|
| Unit checks | PASS | [30 tests](evidence/coming-soon/unit.log), including default-on config, recovery allowlist, no spoofed bypass and responses |
| Production build | PASS | [Build log](evidence/coming-soon/build.log) |
| Real auth and launch/browser flow | PASS | [Chromium 149.0.7827.55 / WebKit 26.5](evidence/coming-soon/browser.json), disposable PostgreSQL and actual production server |
| Verified admin preview | PASS | Actual sign-in, full homepage, DJ deck media playback; clearing session restores launch screen |
| Unverified/suspended/ordinary user exclusion | PASS | Real local session and user-state changes; forged cookie/query/header denied |
| Responsive/accessibility | PASS | 1440, 390, 320 widths; no horizontal overflow; axe WCAG 2 A/AA and 2.1 AA; desktop/mobile screenshots inspected |
| Coming-soon off regression | PASS | [Complete existing landing-browser flow](evidence/coming-soon/regression.log), both browsers, actual WASM generation/upload/review/playback, plus typecheck and bundle audit |
| Provider analytics collection, physical phones, screen reader | NOT RUN | External requests blocked in browser tests; no provider/live-device claim |
| Production deployment / public verification | NOT RUN | No push, deploy or hosted environment mutation |
| Musical quality / paid releases | FAIL / unchanged | Existing quality failure retained; this task does not reopen sales |

Browser captures are at
`/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-coming-soon-zKB05C/`
(`chromium-1440.png`, `chromium-390.png`, `chromium-320.png`, WebKit equivalents).
Temporary databases and test mail were removed afterward.

During verification, a relative redirect URL caused Next to return 500; it now
uses an absolute same-origin URL and the browser checks pass. Next's own RSC Vary
header supersedes proxy Vary on preview pages, so the implementation preserves
framework headers and verifies private/no-store rather than depending on Cookie
Vary there. An initial test-fixture ProcessEnv typing error was also corrected.

## Reproduce / activate

From `apps/site`: `npm test`, `npm run build`, `npm run typecheck`,
`npm run audit:bundle`. Set `JAMLOOM_TEST_DATABASE_URL` to a disposable **127.0.0.1**
Postgres admin target and run `npm run test:coming-soon-browser`; it starts port
4227, seeds only local accounts, checks default-on access and tears down the server
and database. `npm run test:landing-browser` starts its isolated port 4226 server
with coming soon off to check the underlying product.

Deploy the commit to activate on the public site. No new database migration is
introduced, but existing admin/auth schema and configuration remain prerequisites
for bypass. See [owner activation instructions](OWNER_HANDBOOK.md#public-coming-soon-mode).
