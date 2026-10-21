# Academy release checks — 2026-10-21

Overall **PARTIAL**: Academy remains an owner preview behind coming-soon; sales
are closed. The owner authorized Aurowall for test/live billing, replaced the
recruited cohort with owner-only testing, then explicitly said **“Defer human
checks for now.”** That deferral does not manufacture course or hardware results.

| Gate | Result | Evidence / limit |
|---|---|---|
| Course implementation | PASS | 20 runnable lessons, six stages, prerequisites and recorded assessments. [Completion report](academy-completion.md). |
| Owner preview | PASS | Verified active owner can access course lessons without a fabricated purchase; prerequisites remain enforced. Ordinary/unverified/suspended users denied. Chromium/WebKit UI, axe and delayed-network sync checks pass. [Evidence](evidence/academy-owner-preview/browser.json). |
| First lesson acceptance | PASS, qualitative | Owner: “yes it is good enough for now.” Dia / MacBook Air / external speaker. No numeric scores, unaided timing or mini-set outcome supplied. |
| Hosted CI | PASS | Full `5374350` website, Academy/admin, Linux/macOS sanitizer ON/OFF and PCM comparison matrix passes. [Receipt](evidence/academy-release/current-ci.json). [Runtime run](https://github.com/sariserhan/jamloom/actions/runs/39635511331). The later operations/evidence commit `0cc730d` also passes the full matrix: [latest receipt](evidence/academy-release/latest-ci.json), [run](https://github.com/sariserhan/jamloom/actions/runs/39636464448). |
| Production schema / recovery | PASS | Reviewed additive migrations 0006–0012 applied transactionally; all 12 hashes verified. Private pre-migration backup actually restored in disposable PostgreSQL 18. [Migration](evidence/academy-release/migrations.json), [schema](evidence/academy-release/schema-audit.json), [restore](evidence/academy-release/restore.json). No production rollback or role/ACL recovery claimed. |
| Production deployment | PASS | `5374350`, `dpl_66PEqiWaMuJo4RGMkcfrv2kDozBM`, [Jamloom](https://www.jamloom.com). Coming-soon and private/no-store boundaries remain intact. [Receipt](evidence/academy-release/current-deployment.json), [build](evidence/academy-release/current-deploy.log). |
| Silent recording endurance | PARTIAL, running | Corrected real-time two/five-minute checks pass; final thirty/sixty-minute runs are still running. Output-isolation preflight proves captured signal with zero final speaker samples. [Isolation](evidence/academy-endurance-silent/speaker-isolation.json). Physical output is NOT RUN. |
| Actual Stripe test scenarios | PASS | Hosted Checkout, decline, purchase, refund before/after grant, repurchase, duplicate replay and won/lost disputes through the local HTTP app. [Provider receipts](evidence/academy-provider/provider.json). |
| Permanent deployed test payments | PASS | Actual test purchase granted one sandbox receipt to the verified owner; the actual refund webhook withdrew access. No CLI forwarding and no generation-credit change. [Hosted receipt](evidence/academy-hosted-provider/provider.json). |
| Permanent live provider configuration | PASS, no charge | Separate permanent key/catalog/secret and enabled endpoint; live tax settings active. A real Stripe live product-metadata event reached the deployed handler; no purchase rows changed. [Delivery](evidence/academy-release/live-webhook-delivery.json), [configuration](evidence/academy-release/permanent-billing-active.json). This is not a live payment test. |
| Notification retries | PASS, mechanism | Existing Pro project, five-minute schedule, generated secret, unauthorized 401/authenticated 200, subsequent scheduled request observed. Empty outbox; no email sent. [Schedule](evidence/academy-release/notification-cron.json), [HTTP](evidence/academy-release/notification-cron-http.json), [observed invocation](evidence/academy-release/notification-cron-observed.json). Mailbox delivery is NOT RUN. |
| Human course/music/hardware/accessibility | PARTIAL, deferred | First lesson accepted; mini-set, phrase/downbeat/key judgment, physical endurance, separate cue output, screen reader and venue checks are NOT RUN and deferred by owner. No cohort claim. |
| Commercial activation | NOT RUN | Sales closed. Real-payment settlement/refund, merchant registration obligations, terms/refund policy, actual fees/economics and deferred course acceptance remain open. Paid generation retains its separate musical-quality FAIL. |

## Bugs exposed and fixed

- Owner preview originally passed the site gate but could not enter paid lessons.
  It now reuses the verified active administrator check; financial entitlement
  queries and receipts retain their strict purchased meaning.
- Coaching collected samples before the account-attempt request completed. A
  delayed request could cause a valid local check to fail server timing validation.
  The test reproduced the failure; sampling now begins after attempt creation,
  and Chromium/WebKit pass the delayed-request regression.
- A five-minute wall wait produced a 298.28-second Chromium recording under load.
  The harness now waits for measured audio duration. The recorder still stops at
  3,600 measured seconds, with a bounded five-minute wall-clock grace period and
  unchanged 96 MiB memory guard. Focused regression proves delayed clocks can reach
  the audio cap and stalled recordings still hit the wall deadline.
- The shared Aurowall account can have unrelated direct charges. Their refunds
  have no Academy Checkout session, and legacy charges may have no PaymentIntent.
  These are now ignored safely; ambiguous session matches still fail for retry.

Earlier audible long runs were stopped when the owner reported nonstop music.
The first silent run exposed the short capture and was stopped after reproduction
so it would not compete with the corrected runs. Its completed files, failure,
and interruption record remain under
`docs/evidence/academy-endurance-silent/superseded/` and
`build-academy-endurance-silent/superseded/`. The intermediate worktree Chromium
run was also superseded after exposing delayed-attempt sync; its WebKit lanes
continue. No interrupted hour is counted as completed evidence.

The first silent WebKit hour reached 3,600 measured seconds, but the harness
incorrectly required the Stop button to remain enabled during automatic
finalization. It closed the page before downloading; this is not a completed-hour
PASS. The harness now waits for the download after automatic stop and still
requires the full receipt, zero gaps and saved assessment. Both hour checks are
restarting on final static assets. The failed report and screenshot are preserved
under `evidence/academy-endurance-silent/superseded/automatic-cap-transition/`.

## Permanent billing

Authorized account: Aurowall, `acct_1TxA3vDlEXWDEeHO`. Both products are active,
one-time USD 79.99, tax exclusive, with `jamloom_product=academy-complete`.

| Mode | Product | Price | Endpoint |
|---|---|---|---|
| Test | `prod_VTzQzUCZg1ycGm` | `price_1UT1RrDlEXWDEeHO14x5otG7` | `we_1UT2HDDlEXWDEeHOpSh8zNfJ` |
| Live | `prod_VU0Hye8ICGD4Y8` | `price_1UT2HEDlEXWDEeHOvTlDIDVe` | `we_1UT2HEDlEXWDEeHOZdfVxJHC` |

Endpoints are `https://www.jamloom.com/api/academy/stripe?mode=test` and
`?mode=live`, with different signing secrets. Both subscribe only to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`.
The temporary `product.updated` subscription used for the non-payment live
probe was removed and the original filter verified.

The owner supplied permanent keys as Vercel secrets. A hosted read-only audit
verified both account identities before mutation. Catalog preparation briefly
created then disabled endpoints until signing secrets were installed and the
configured deployment passed signature checks. Newly created webhook secrets
were returned in RSA-OAEP encrypted receipts; private key and decrypted values
stay in ignored private files. Existing Stripe keys were never printed or
exported from Vercel. The owner's local environment also contains valid permanent
keys and was used for the subsequent explicit provider checks.

Stripe live tax settings are active after the owner's update. The course uses
`txcd_20060058` (self-study web-based training). The account reported **zero active
tax registrations**; configuration is not a determination of merchant obligations.
The synthetic US test address was not copied to live settings. Real fees,
settlement, refund costs and lifetime support economics remain unmeasured.
`academySalesReleased=false` and `paidGenerationReleased=false` remain unchanged.

The deployed test created a sandbox financial receipt for the existing verified
owner via the authorized server operations command. The purchase and refund were
real Stripe test events delivered directly to the production handler. No owner
browser login was fabricated, and no learning progress was written. The refunded
sandbox receipt remains as audit history; strict purchased access is false again.

## Teaching audio and recovery

The artist labels both excerpts 120 BPM in the
[CC0 publication](https://opengameart.org/content/free-rhythm-game-music-pack-2).
`scripts/review_academy_grid.py` now also searches onset periodicity without
receiving that BPM label. Synthetic 100/120 BPM and silent-signal self-checks pass.
The real excerpts have half/double-tempo ambiguities, so independent musical tempo,
downbeats, phrases and keys are not confirmed. [Candidate measurements](evidence/academy-release/grid-candidates.json)
are **PARTIAL**, not production annotation changes. Human review is deferred.

Keep the private production backup at
`build-academy-release/before-academy-20261021.dump` (0600); metadata is in
[backup.json](evidence/academy-release/backup.json). Production target remains the
authorized Neon `misty-cherry-32516479`, branch `production`. No user recordings
or existing financial history were deleted.

## Reproduction and remaining work

Build before starting endurance; do not replace an active server's `.next` output.
The runner defaults to silent downstream output isolation. Tests seed access and
prerequisites only in a disposable loopback database; those rows are not learner
outcomes. Actual recordings, assessments and account saves are exercised.

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres npm --prefix apps/site run test:academy-endurance
.venv-analysis/bin/python scripts/measure_academy_endurance.py --silent
.venv-analysis/bin/python scripts/review_academy_grid.py
```

`JAMLOOM_BROWSER=chromium` or `webkit` selects one browser; `short` runs the
2/5/5/30-minute lane, `half` reruns only thirty minutes, and `hour` the automatic cap. `JAMLOOM_ENDURANCE_PORT` and
`JAMLOOM_SITE_TEST_ROOT` isolate concurrent builds. Raw captures remain ignored.
Set `JAMLOOM_AUDIBLE_TEST=1` only for a separately arranged physical listening
window. No such window is active now.

Provider scripts have explicit guards and mutate real provider **test** objects
or a non-payment live catalog field. They must not run as ordinary CI tests.
`academy-hosted-provider.mjs` requires `JAMLOOM_HOSTED_ACADEMY_TEST=1` plus the
approved production database, test key and catalog. `academy-live-webhook.mjs`
requires `JAMLOOM_LIVE_WEBHOOK_TEST=1` and the approved live account; it never
creates a charge. Normal builds never invoke `prepare-academy-billing.mjs`.

Remaining automated work: finish/decode the in-flight long recordings. Remaining deferred/owner work: course mini-set and music review,
manual accessibility and physical output/cue/venue observations, merchant
registration/terms/refund/fee review, real payment acceptance and explicit paid
launch. Recruitment and more secret-key setup are not current blockers.
