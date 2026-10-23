# Public service recovery — 2026-10-23

**PASS locally.** This supersedes the service errors recorded during the public
135-song gallery change. Website deployment remains owner-controlled.

## Changes

- Stored DNA/Improvise collections can be read without enabling the local
  generation sandbox. With no account service configured, collection GETs
  explicitly report unavailable rather than falling through to the generator.
  Configured anonymous “Your songs” requests ask for sign-in; private-song,
  withdrawal, billing-mode and generation protections remain in place.
- The local `.env.local` now enables the existing R2 and catalogue switches;
  the development server was restarted at `http://127.0.0.1:4235`. Configured
  public collections are read from the existing database. No rows were written
  and no schema change was needed. Disabled catalogue listings report an
  explicit unavailable state; database failures are not converted to empty success.
- The homepage uses `assets/manifests/aurowall-public.json`: 72 previously
  reviewed music objects, public titles/IDs/sizes and `cdn.aurowall.com` URLs.
  The shared player accepts these exact allowlisted ID/URL pairs. No S3 listing,
  Pro check or `/api/aurowall` request occurs for homepage playback. Refresh the
  reviewed manifest when the partner catalogue changes; no audio is bundled.
- Public CDN requests currently lack `Access-Control-Allow-Origin`. Normal
  media-element playback works directly, but the Pro deck's fetch/decode path
  still needs the existing same-origin streaming proxy. Its access controls,
  byte limits and musical curation remain unchanged. No remote CORS changes.
- VisitorPing loads only on `jamloom.com` and `www.jamloom.com`, checked in the
  browser before adding the script and from the request URL for coming-soon HTML.
  Localhost, loopback and preview domains issue no tracker requests.

## Verification

- **PASS:** 77 site unit tests, including public-only analytics, all 72 manifest
  entries against the existing curation validator, and renderer-independent
  stored-song collections with anonymous-owner isolation. `npm test`.
- **PASS:** `npm run build` and `npm run audit:bundle`; 33 client files checked,
  no server secrets. Build log: `/tmp/jamloom-public-services-build.log`.
- **PASS:** real public CDN byte ranges for all 72 files, exact expected object
  lengths and 206 responses; `/tmp/jamloom-aurowall-public-check.json`.
- **PASS:** configured local DNA public/mine, Improvise public, and latest
  catalogue GETs return 200. Public collections are currently empty; mine
  prompts anonymous users to sign in. No fake account or public-song rows added.
- **PASS:** unconfigured catalogue self-check returns explicit unavailable
  metadata for collection GETs while protected operations remain closed.
- **PASS:** approved local Playwright fallback, Chromium 1280px and WebKit 390px:
  home → choose House → muted direct CDN playback → seek 30s → close → Music DNA.
  72 options, 135 generated examples still present, signed-out account prompt,
  working public collections, no autoplay/overflow/framework errors, no console
  errors or HTTP failures, zero partner API and VisitorPing requests.
  `/tmp/jamloom-public-services-browser.mjs`, `.json`, screenshots
  `/tmp/jamloom-services-{chromium,webkit}.png`. Browser runtime was unavailable.
- **NOT RUN:** deployment, production analytics receipt, new song generation,
  authenticated Pro deck requalification or every-track full listening. The
  unchanged deck proxy is not claimed to have been retested in this increment.
