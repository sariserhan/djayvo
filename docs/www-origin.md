# Canonical www origin

2026-10-19 (America/New_York). Requested origin: **https://www.jamloom.com**.

## Changes

- Production template and regression fixtures use the canonical www origin.
  Better Auth already derives both `baseURL` and its sole `trustedOrigins` entry
  from `BETTER_AUTH_URL`; no hostname inference or wildcard trust was added.
- Email action URLs, logo URLs, footer links and local preview fixtures use www.
  Localhost configuration and local email outbox are unchanged.
- Live private `jamloom-audio` CORS now permits www plus the existing apex alias;
  all other policy fields are preserved. No public bucket access was enabled.
- Vercel Production already contained the correct URL, hello sender and support
  Reply-To. Its running deployment predates those environment edits. Redeploying
  that existing release activates the supplied settings without uploading the
  current checkout or publishing its unpushed changes. The redeploy completed
  successfully and was aliased to www; the earlier 503 is resolved.

## Verification

| Gate | Status | Evidence |
| --- | --- | --- |
| Local auth/config/email regression | PASS | 13 tests; [log](evidence/www-origin/unit.log). Exact trusted origin and safe email URLs checked. |
| Production build | PASS | [npm run build](evidence/www-origin/build.log). |
| Typecheck and client secret audit | PASS | TypeScript exits 0; 16 client files checked, no server secrets; [receipt](evidence/www-origin/final-checks.json). |
| Email layout | PASS | 54 Chromium/WebKit cases; [log](evidence/www-origin/email-layout.log), [current previews](evidence/email-templates/previews/verify.html). |
| Live R2 policy and www browser access | PASS | [Policy readback](evidence/www-origin/r2-cors.json); [10 provider checks](evidence/www-origin/r2-live.log), including real signed upload/range playback and foreign-origin denial. Test objects deleted and absence verified. |
| Vercel production origin/settings | PASS | [Sanitized environment receipt](evidence/www-origin/vercel-environment.json). No secrets included. |
| Production activation | PASS | [Redeploy receipt](evidence/www-origin/redeploy.log): existing release rebuilt with current env and aliased to www. No new checkout source uploaded. |
| Live canonical redirect and auth availability | PASS | [HTTP evidence](evidence/www-origin/live-http.json): apex 308 to www, sign-in page 200, session endpoint 200/null with private/no-store. |
| Live auth origin enforcement | PASS | Anonymous sign-out with an invalid synthetic session cookie: www returns 200; foreign origin returns 403 INVALID_ORIGIN. No real sessions modified. Cookie-free sign-out returns 200 for both origins; this probe alone does not test session CSRF protection. |
| Hosted signup, verification, reset and inbox rendering | NOT RUN | No account created or email sent for this origin check. |
| Full production readiness | PARTIAL | Auth endpoint readiness alone does not establish the complete account and private-library workflow. Existing release/quality gates remain open. |

The first R2 management GET timed out before mutation. Retrying succeeded; the
subsequent bounded CORS update was read back exactly. Initial live auth returned
503 (accounts unavailable), while apex redirected with HTTP 308 to www and the
www account page returned 200. The redeploy receipt and final HTTP checks record
that loading the current environment resolves that failure.

The deployed source remains the existing older release (including its old branding).
The current checkout changes, including branded email templates, are committed
locally; this environment activation did not publish those changes.

Master specification, audio engine, recordings and database content are unchanged.
No new dependencies, musical-quality claims or physical-device checks.
