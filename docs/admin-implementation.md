# Owner administration and support — 2026-10-21

Jamloom now has server-authorized owner administration, a private support/contact
inbox, branded notifications and replies, maintenance/banner controls, billing
mode selection and credit-exempt owner reservations. Existing audio functionality,
Neon, Better Auth, R2, Resend, Vercel and Vast integrations are preserved.

The live account `serhan.sari@yahoo.com` was created through the existing public
Better Auth signup flow, using an undisclosed randomly generated initial password.
A password-reset request was accepted; the owner confirmed both setup emails
arrived and verified the address. Read-only Neon checks confirmed account existence
and `emailVerified=true`. No password or verification token was retained in evidence.
This is account creation, **not deployment of the new admin application**.

## Gates and evidence

| Gate | Result | Evidence / boundary |
|---|---|---|
| Owner account and email verification | PASS | [Account evidence](evidence/admin/owner-account.json), owner-reported email arrival and database verification |
| Owner-only server authorization | PASS | Unverified/ordinary/anonymous/foreign-origin requests denied; [tests](evidence/admin/test-admin.log), [browser HTTP checks](evidence/admin/browser.json) |
| Owner credit exemption | PASS | No credit lots/ledger debits; actual costs and ceilings retained, duplicate reservation and frozen-wallet protections tested |
| User suspension and restoration | PASS | Real login/session revocation, owner self-lockout rejection, queued job cancellation and returned credit reservation |
| Contact/support inbox and replies | PASS | Actual browser form → database → owner inbox → reply → branded local email; revision replay, body validation and rate limits tested |
| Signup and message email templates | PASS | All new mail uses existing responsive Jamloom logo/footer HTML + plain text; local outbox delivery and escaping tested |
| New hosted notification delivery / scheduled retry | NOT RUN | Requires deployment and scheduler; existing owner setup emails arrived, but that does not prove the new deployed notification hooks |
| Maintenance and banner | PASS | HTTP 503/Retry-After, signups paused, owner recovery/support/webhook access retained; plain-text escaping; Next site and raw studio notices |
| Test/live selection and entitlement isolation | PASS | Dashboard selects modes with separate configuration; signed fixtures verify event environment and test purchases cannot grant live access |
| Real Stripe sandbox/live charges and refunds | NOT RUN | Local SDK/signature fixtures only; no real charges, purchases or mode changes on production |
| Paid product release | FAIL | Existing musical-quality failure remains; generation disabled. Academy complete-course sales also remain held |
| Automated regression suite | PASS | 83 site/database tests plus 80 web tests, no skips or failures |
| Production build / typecheck / bundle audit | PASS | [Build](evidence/admin/build.log), [typecheck](evidence/admin/typecheck.log), [secret/static-bundle audit](evidence/admin/audit-bundle.log) |
| Actual browser layout/accessibility | PASS | Chromium and WebKit, widths 320/390/1440, zero axe violations on admin/contact/support pages; responsive email screenshots |
| Hosted migration / dashboard deployment | NOT RUN | Only disposable loopback test databases migrated; no hosted schema migration, push or deployment |
| Overall activation | PARTIAL | Code and local gates pass; migration, deployment, notification provider check and scheduled retry remain |

## What changed

- `apps/site/migrations/0011_administration.sql`: owner controls, append-only
  admin audit, suspension, credit exemption, tickets/replies, rate bounds and a
  leased notification outbox. Existing applied SQL and original master unchanged.
- `lib/admin-access.ts`, `admin-page.ts`, `admin-store.ts`, `site-settings.ts`:
  exact verified owner identity, per-request authorization, bounded inputs,
  optimistic settings/reply updates, parameterized queries and audit records.
- `app/admin/`: site controls, searchable users, inbox/thread/reply UI and billing
  overview. All reads are server authorized; no client-provided role assignment.
- `app/contact/`, `app/support/`, footer links and `api/contact`: guest-capable
  forms, durable transaction-bound notification, sender ownership never inferred.
- `lib/notifications.ts`, auth hooks, `api/notifications`: signup/contact/reply
  outbox and leased retries. No separate unbranded email renderer introduced.
- `proxy.ts`, `app/site-banner.tsx`, `apps/web/site-announcement.js`: maintenance
  gating and escaped banners. Account recovery/support and signed payment
  reconciliation remain available; active/offline audio is not remotely stopped.
- `wallet.ts`, guarded auth session reads: suspension checks and owner exemptions
  while retaining compute accounting, one active job, per-job/daily ceilings,
  frozen-wallet holds and worker shutdown reconciliation.
- `billing-mode.ts`, Academy payments/routes/store/pages: separate test/live
  credentials, environment-bound webhooks and purchases. Mode changes cannot turn
  test receipts into live entitlements. Release gates remain false.
- Config examples, bundle audit, privacy disclosure, TODO and owner handbook.

User controls operate real account state. Refund issuance stays in the actual
Stripe dashboard; verified webhook reconciliation updates entitlements. There is
no fake refund button, arbitrary credit minting, impersonation or deletion UI.
No new runtime dependency was installed.

## Reproduction

Use Node 22 and the repository's existing separate loopback PostgreSQL environment.
Set `JAMLOOM_TEST_DATABASE_URL` to that loopback connection. Integration tests also
need loopback `DATABASE_URL`, a localhost `BETTER_AUTH_URL`, a test auth secret and
`JAMLOOM_LOCAL_OUTBOX`; they assert local transport and never send real mail.
Do not load the hosted credentials as the test database target.

From `apps/site`:

```sh
npm run typecheck
npm test                    # 23/23
npm run test:admin          # 8/8
npm run test:wallet         # 13/13
npm run test:academy        # 11/11
npm run test:integration    # 28/28
npm run build
npm run audit:bundle
npm run test:admin-browser
```

From the repository root:

```sh
node --test apps/web/tests/*.test.js  # 80/80
```

Test logs and screenshots are under `docs/evidence/admin/` (under 1 MiB).
Browser tests run a production Next server on port 4225 and create/drop only their
own disposable loopback database. Temporary verification emails and credentials
are removed afterwards. Stripe fixture secrets are deliberately nonfunctional.
The in-app Browser/Node REPL tools were unavailable in this session; tests used the
repository's installed Playwright workflow with actual Chromium and WebKit.

Browser testing found and corrected a disappearing settings-save confirmation.
Contact/support render dynamically so their hydration honors the existing nonce
CSP on direct visits. Existing security headers and VisitorPing integration remain.

## Operational limits and next actions

See [Owner handbook — Administration](OWNER_HANDBOOK.md#administration-messages-and-owner-account--2026-10-21)
for migration order, exact environment names, webhook URLs and retry scheduling.
Deploy **after migration 0011**, then verify `/admin` with the owner account and
exercise real support/signup notifications. No deployment or live billing was
performed here. A billing mode selection is not a musical-quality or sales release.

Notifications are durable and retried; provider acceptance is not inbox delivery,
and crash recovery can produce duplicates outside provider idempotency retention.
No automatic scheduler was provisioned. Direct mailbox replies are not imported
into the database inbox; website forms and dashboard replies are. Long-term ticket
retention and inbound email ingestion remain explicit operational decisions.

The original master, musical benchmarks, recordings and Q0 failure are preserved.
No claim about musical quality follows from these administration tests.
