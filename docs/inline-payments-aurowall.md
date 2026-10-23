# Inline payments and Aurowall music — 2026-10-21

**2026-10-23 update:** Homepage playback now uses the reviewed public CDN manifest directly, without the Pro API. The deck retains its same-origin decoder proxy because CDN CORS is absent. [Current behavior and verification](public-service-recovery.md).

Current music selection is **72 tracks**, after the owner requested religious and unrelated audio be removed from Jamloom. The original 94-track integration evidence below remains historical. See [deck and curation update](deck-hardware-and-curation.md).


The owner authorized inline payments, use of their Aurowall R2 songs, and linked partnership attribution. The existing public coming-soon, Academy sales and paid-generation holds remain in force. Human checks remain deferred.

## Payment behavior

Web Checkout factories now use Stripe `embedded_page` with `redirect_on_completion=never`. Academy mounts the secure form on `/academy/checkout`; no hosted-checkout URL or success/cancel redirect is returned. Redirect-required payment methods are excluded by Stripe. Closing and reopening retains the same idempotent session. Matching test/live publishable keys are required; secrets stay on the server.

Completion displays an inline receipt check. Only a signed, verified webhook grants access. The status endpoint filters by authenticated owner and selected billing environment; knowing another receipt ID reveals no entitlement. Refund/dispute holds remain authoritative. Generation checkout is still closed; its dormant factory also produces embedded sessions. Native StoreKit is unchanged.

The implementation follows [Stripe embedded Checkout](https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=embedded-page) and [no-redirect confirmation](https://docs.stripe.com/payments/checkout/custom-success-page?payment-ui=embedded-page). Installed Stripe 23 uses `embedded_page` and `createEmbeddedCheckoutPage`, with `https://js.stripe.com/endive/stripe.js`.

## Music and rights

Read-only listing found **94 MP3 tracks in 94 genre folders**. The owner states the recordings are owned and authorizes playing them on Jamloom. Titles/genres derive from object names; attribution is Aurowall. This statement is the provenance for this integration, not a new CC0 license or an independent rights audit. These recordings are separate from private user recordings and cleared offline practice assets.

- Homepage selector uses the existing music player, with explicit Play, pause, seek and Close. No autoplay or automatic partner-song queue.
- DJ Studio adds a separate Aurowall group and online-only attribution. Existing 100 MB / 20-minute deck limits remain; longer recordings can play in the homepage player. Measured examples: White Noise 1201.944 seconds, Morning Jazz 2392.584 seconds. No audio was edited to fit a limit.
- Homepage, global footer, DJ Studio and public coming-soon page link to `https://aurowall.com`.
- Only bounded two-level MP3 keys are exposed through opaque IDs. JSON/index/private paths are excluded. Browser responses omit bucket keys, ETags and credentials. Listings cache for five minutes, with a bounded paginated scan; changes appear after refresh/cache expiry.
- Same-origin streaming supports single byte ranges and cancellation. R2 ETags prevent serving a changed object against stale size metadata. No full audio buffer is held by the server. Responses remain private/no-store under the current preview gate.
- The public CDN currently lacks browser CORS. The authenticated S3 read proxy avoids changing bucket settings. It uses existing Vercel bandwidth/runtime; a reviewed direct-CDN/CORS setup is a future scaling alternative. [Vercel documents streaming responses](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) as exempt from buffered response-size limits.
- No bucket objects/settings were written, copied or deleted. No partner music was added to Git or offline caches. Missing storage configuration fails visibly while local/CC0 DJ tracks continue working.

Required environment names are documented in `apps/site/.env.production.example`: `R2_AUROWALL_ACCOUNT_ID`, `R2_AUROWALL_BUCKET`, `R2_AUROWALL_ACCESS_KEY_ID`, `R2_AUROWALL_SECRET_ACCESS_KEY`, plus separate `STRIPE_PUBLISHABLE_KEY` and `STRIPE_LIVE_PUBLISHABLE_KEY`. `R2_AUROWALL_CDN_URL` may remain configured but is not required by the S3 proxy. Vercel production variable names were confirmed present; values are never committed.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Build, TypeScript, server-secret bundle audit | PASS | `evidence/aurowall-inline/`; audit now checks Aurowall secrets too |
| Web/unit/Academy/admin transactions | PASS | 102 web, 35 site, 22 disposable PostgreSQL tests |
| Real R2 playback/seek and DJ loading | PASS | Chromium/WebKit, representative House recording; all 94 metadata entries listed. `evidence/aurowall-inline/results.json` |
| No autoplay, muted test output, unavailable-partner fallback | PASS | Both browsers; existing 10 CC0 tracks remain usable |
| Responsive and automated accessibility | PASS | 1440/390/320 widths, axe; screenshots retained. Manual screen reader NOT RUN |
| Actual embedded Stripe test transactions | PASS | `evidence/academy-inline-provider/provider.json`: decline/retry, purchase, close/reopen, refund, repurchase, delayed grant after refund, dispute won/lost, duplicate delivery, invalid signature and other-owner status isolation. Real Stripe CLI callbacks into local production build; no real funds |
| Permanent production webhook with embedded fixture | PASS | `evidence/academy-hosted-inline-provider/provider.json`: actual test purchase/refund, signed production delivery, access withdrawal and zero generation-credit delta. Isolated embedded provider fixture, not a fabricated owner browser session |
| Deployment and public gate checks | PASS | Runtime `a06151f`, Vercel `dpl_5kTu7oBYCVLYGWJDLLzhnEkg5kDR` READY and aliased to www.jamloom.com; partnership/disclosures, closed APIs and private headers verified. Hosted public mobile/axe pass |
| Hosted CI | PASS | [Run 39673854024](https://github.com/sariserhan/jamloom/actions/runs/39673854024), runtime `a06151f`: website, Academy/admin, Linux/macOS normal and sanitizer builds, cross-platform audio comparison. `evidence/aurowall-inline/ci.json` |
| Authenticated hosted music UI | NOT RUN | Real R2 streaming/browser checks use the local production build; no owner session was available for a hosted playback check |
| Human listening, every-track full listening, live money, native IAP | NOT RUN | Deferred/outside this web integration; sales remain closed |

A first provider run passed purchase/refund but failed on Stripe's opt-in checkbox click interception. Its evidence remains under `evidence/academy-inline-provider/first-attempt/`; the unpaid second session was explicitly expired. The corrected keyboard-based interaction passes the complete five-purchase suite. All successful non-disputed test charges were refunded; the disputed cases were resolved won/refunded or lost. No generation credit lots changed.

Reproduce from `apps/site`, using ignored env values and a disposable loopback database:

```sh
npm run build
npm run typecheck
npm run audit:bundle
npm test
node --test ../web/tests/*.test.js
node --import tsx --test tests/academy.test.ts tests/admin.test.ts
node --env-file=.env.local --import tsx tests/aurowall-browser.mjs
node --import tsx tests/coming-soon-browser.mjs
node --env-file=.env.local --import tsx tests/academy-provider.mjs
```

Database/provider scripts additionally require `JAMLOOM_TEST_DATABASE_URL`; the provider run requires the configured Academy test product/price IDs. Provider tests are explicit operations, not ordinary CI. Browser audio is isolated with `tests/silent-audio.mjs` and Chromium's mute flag. Tests do not modify the user's Dia session or system volume.

The implementation is committed in `5587563`; `a06151f` adds factual privacy/license disclosures and is the deployed revision. Local payment/music browser evidence covers the same functional code. The production embedded-provider fixture ran against `5587563` during the disclosure-only deployment; webhook code is unchanged. Historical evidence folders are preserved. No production schema changes were needed.
