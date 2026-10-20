# Jamloom live R2 setup and validation

2026-10-19 local / 2026-10-20 UTC. The owner supplied the runtime object keys
and temporary Cloudflare management token in ignored `apps/site/.env.local`.
The existing Neon database and Vercel hosting choices remain unchanged.

## Applied configuration

The management API confirmed bucket `jamloom-audio`, Standard storage, ENAM
location, default jurisdiction. Public `r2.dev` access was already disabled and
there were no custom domains; both remain private. The bucket initially had no
CORS configuration (GET returned 404/code 10059) and only the default seven-day
multipart abort rule.

Applied the committed production CORS policy for **https://jamloom.com** only:
GET/PUT/HEAD, Content-Type/Range request headers and the required exposed response
headers. Added `jamloom-temporary-uploads-1-day`, deleting only **uploads/** objects
after 86,400 seconds. Preserved the default multipart rule. No deletion rule
matches **masters/**. Both settings were read back and matched exactly.
[Before/after receipt](evidence/r2-live/bucket-settings.json).

No DNS, deployment, database, app enablement flag, recording or master-spec changes
were made. Keys and signed URLs are absent from committed evidence. The client
bundle audit now also checks the temporary `CLOUDFLARE_API_TOKEN` value.

## Reproduce the provider test

With authorized bucket credentials in `apps/site/.env.local`:

```sh
JAMLOOM_R2_TEST_BUCKET=jamloom-audio npm --prefix apps/site run test:r2 -- --apply
```

This opt-in test requires an exact bucket acknowledgement and the existing
Playwright Chromium/WebKit installations. It uses the actual application storage
adapter, a 20-second synthetic stereo test tone, and random UUID object names.
It temporarily enables R2 inside the test process only, makes no database calls,
and deletes/verifies absence of its own staging/master objects in `finally`.
It makes real provider requests and consumes a small amount of the account's
operation/transfer allowance. Do not add it to unguarded default CI.

The browser test intercepts only a minimal HTML shell at
`https://jamloom.com/r2-provider-test`; R2 traffic is real. It establishes browser
CORS behavior and decoding from that origin, **not deployment, DNS/TLS, account
authorization, physical audio playback or the complete hosted save workflow**.

## Gates

| Gate | Result | Evidence/limit |
| --- | --- | --- |
| Management access and private bucket settings | PASS | API reads, writes and exact readback; public access disabled, no custom domain. |
| Actual signed PUT and SDK GET | PASS | WAV bytes match SHA-256 through the application adapter. |
| Signed Content-Type and Content-Length enforcement | PASS | Altered requests return 403 and leave original bytes unchanged. |
| Master copy, range playback and download | PASS | Exact bytes; 206 ranges; private cache control and attachment filename. |
| Upload lifecycle and saved-master retention configuration | PASS | Rule readback and actual `x-amz-expiration` on staging only. |
| Unsigned and expired access | PASS | Unsigned request rejected with 400/InvalidArgument; expired PUT with 403. |
| Late staging overwrite isolation | PASS | Master bytes remain identical after staging is rewritten. |
| Chromium and WebKit CORS / audio decode | PASS | Real signed browser uploads, range GET, 20-second stereo decoding; foreign origin cannot read response. |
| Test cleanup | PASS | Every run's random staging and master objects deleted; signed GET returns 404 afterward. |
| Local regression/build/typecheck/client-secret audit | PASS | 10 unit tests, source production build, TypeScript and 16-file bundle audit. |
| Actual age-triggered lifecycle deletion | NOT RUN | Cannot infer asynchronous provider expiry from rule/header checks. |
| Hosted account-to-Neon-to-R2 workflow and cross-account authorization | NOT RUN | Provider test makes no account/DB calls; no new claim about complete hosted workflow. |
| Scheduled reconciliation and cost/load validation | NOT RUN | Existing cleanup command still needs a hosted scheduler and usage monitoring. |
| Vercel production environment/deployment and Resend | NOT RUN | No deployment or email provider changes; public account release remains pending. |
| Overall production readiness | PARTIAL | Bucket and provider adapter validated; outstanding hosted gates remain. |

Final provider run: **10/10 gates PASS**, Node v22.23.1.
[Provider log](evidence/r2-live/provider-final.log),
[unit log](evidence/r2-live/unit.log), [build log](evidence/r2-live/build.log),
[typecheck](evidence/r2-live/typecheck.log),
[bundle audit](evidence/r2-live/bundle-audit.log).

The initial provider run failed a test assumption: unsigned access returned
400/InvalidArgument instead of the expected 403. Access was denied. The test now
accepts the observed R2 error response while still requiring denial;
all its test objects were cleaned up. [Initial log](evidence/r2-live/initial-unsigned-status.log).
The subsequent run passed all nine then-existing checks; the final run additionally
validated expiry headers. [Intermediate log](evidence/r2-live/provider.log).

The temporary management token is not needed by the running app and may now be
revoked. Keep runtime object keys restricted to `jamloom-audio`; do not enable the
public app until the remaining hosted gates are resolved. Musical quality was
not assessed; the test tone is not a speech fixture or generated music sample.

References: [CORS API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/cors/methods/update/),
[lifecycle API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/lifecycle/methods/update/),
[asynchronous expiry behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
