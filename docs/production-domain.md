# Jamloom production domain and private audio

2026-10-19. The owner reports owning `jamloom.com` and creating the R2 bucket
`jamloom-audio`. Canonical app origin: **https://jamloom.com**. Hosting remains
Vercel; Neon stores account/track metadata; R2 stores private audio. Resend is
still deferred. The master specification and historical schema identities remain
unchanged.

## Production configuration

Use [the production variable template](../apps/site/.env.production.example) in
Vercel's **Production** environment. Fill secrets privately; do not overwrite
local `.env.local` or use production data/keys in previews. The existing auth
configuration takes its base URL and sole trusted origin from `BETTER_AUTH_URL`.
The existing storage adapter and CSP take their bucket host from the R2 variables.
No runtime hostname rewrite is necessary.

Add `jamloom.com` and `www.jamloom.com` to the existing Vercel project; redirect
`www` to `https://jamloom.com`. Use the exact DNS records Vercel assigns to that
project, then verify HTTPS and the redirect. Do not guess an IP or change
Cloudflare nameservers. Domain changes require a deployment with the matching
production origin. Authentication still requires configured Resend and a verified
sender before public registration works; `hello@jamloom.com` is only a proposed
sender until verified. Keep search indexing and catalogue gates unchanged.

## Credentials needed

Keep keys out of chat and Git. Store runtime keys in ignored
`apps/site/.env.local` for authorized setup checks and later in Vercel Production;
leave the local app origin unchanged. Do not enable R2 for general local use
against the production bucket. No `NEXT_PUBLIC_*` secrets.

1. **App credential:** Cloudflare dashboard → R2 → Overview → Account Details →
   Manage API Tokens → Create Account API token. Name it
   `jamloom-production-audio`, choose **Object Read & Write**, and select only
   **jamloom-audio**. Save its **Access Key ID**, **Secret Access Key**, and the
   account's **Account ID** as `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
   `R2_ACCOUNT_ID`; set `R2_BUCKET=jamloom-audio`. Copy the bucket's S3 endpoint
   too (not secret) so its jurisdiction can be checked. The current adapter
   supports the default `https://<account-id>.r2.cloudflarestorage.com` endpoint;
   a restricted-jurisdiction bucket needs an adapter/CSP adjustment before use.
2. **Temporary setup credential:** a separate Cloudflare API token with
   **Account → Workers R2 Storage → Edit**, scoped to this account only. Save it
   locally as `CLOUDFLARE_API_TOKEN`. This management permission is broader than
   a bucket-scoped object key: use it only for the named bucket's settings, never
   deploy it to Vercel, and revoke it after setup. Alternatively apply the settings
   below in the dashboard yourself and omit this token entirely.

No Global API key or billing permission is needed. DNS permissions are unnecessary
for private R2. If separately automating domain DNS, use **Zone → DNS → Edit**
and **Zone → Zone → Read**, restricted to `jamloom.com`.

## Bucket settings to apply after access is available

**Update:** Bucket CORS, private access and upload lifecycle configuration have
now been verified live. See [R2 setup and provider evidence](r2-live.md).
The checklist below remains the reference; hosted scheduling and the full
authenticated production workflow are still outstanding.

- Keep public access (`r2.dev` and public custom domains) disabled. Playback uses
  short-lived signed URLs, not a public `audio.jamloom.com` domain.
- In bucket Settings → CORS Policy → JSON, use
  [r2-cors.production.json](../apps/site/config/r2-cors.production.json).
  This is **dashboard/S3 JSON**, not the Cloudflare REST API's `rules` format.
  It permits only the canonical production origin; previews and localhost need
  their own bucket/policy. CORS does not replace signed authorization.
- Inspect existing lifecycle rules first. Add an expiry rule with prefix
  **`uploads/`**, age **1 day**. Preserve other rules, including multipart cleanup.
  **Never expire `masters/` or the whole bucket**: these are saved recordings.
  Provider expiry is asynchronous, not an immediate deletion guarantee.
- Schedule the existing `npm --prefix apps/site run audio:cleanup` job in a
  server-side environment with the matching DB and object credentials. It
  reconciles database state and orphaned/deleting objects; lifecycle alone does
  not do this. The command without arguments only prints the target. Review it,
  set `JAMLOOM_CLEANUP_TARGET` to that exact `host[:port]/database`, then use
  `npm --prefix apps/site run audio:cleanup -- --apply` in the scheduler. Monitor
  its exit status and deletion counts; each run is bounded to 50 candidate rows.
  Hosted scheduling is still outstanding.
- With a controlled account and generated test WAV, validate real authenticated
  save/finalize, private playback/seek/download, cross-account denial and deletion.
  Verify browser preflight from `https://jamloom.com`, signed header enforcement,
  late staging write cleanup, and lifecycle configuration. Never log signed URLs.
  Remove only test-created records/objects. Configure usage alerts and review
  costs; application quotas are not a provider billing cap.
- Set `JAMLOOM_R2_ENABLED=true` only in the controlled validation environment
  first; enable public saving only after the above gates pass.

## Evidence and gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Production configuration and auth/storage regression | PASS | `npm test`: 10/10; production template resolves the exact trusted origin and signs the intended bucket using fake credentials, without provider calls. [Log](evidence/production-domain/unit.log) |
| Production build | PASS | `npm run build`, including source WASM preparation. [Log](evidence/production-domain/build.log) |
| TypeScript | PASS | `npm --prefix apps/site run typecheck`. [Log](evidence/production-domain/typecheck.log) |
| Client secret/bundle audit | PASS | 16 client files, no server secrets; studio assets audit passes. [Log](evidence/production-domain/bundle-audit.log) |
| Live domain/DNS/TLS and Vercel configuration | NOT RUN | No remote configuration was changed. |
| Live R2 requests, browser CORS and lifecycle configuration | PASS | Subsequently validated with supplied credentials; [live evidence](r2-live.md). |
| Actual lifecycle deletion, scheduled cleanup and full hosted workflow | NOT RUN | See the live report for the remaining gates. |
| Resend delivery | NOT RUN | Deferred. |
| Production readiness | PARTIAL | Local configuration prepared; hosted gates remain open. |

No master, audio-engine, recording, database or local credential changes. No
musical quality or physical-device assessment was performed for this configuration
change. Unit checks do not establish that the actual bucket accepts signed uploads.

## Official references

- [R2 credential types and bucket scope](https://developers.cloudflare.com/r2/api/tokens/)
- [Cloudflare API permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [R2 browser CORS and dashboard format](https://developers.cloudflare.com/r2/buckets/cors/)
- [Object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [Vercel domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
