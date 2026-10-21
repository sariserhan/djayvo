# Academy release checks — 2026-10-21

Overall **PARTIAL**. The owner authorized the remaining Academy work, Aurowall
for test and future live billing, and replaced recruited novice testing with
owner-only acceptance. This report supersedes earlier “not deployed” statements;
prior reports retain the evidence and limitations of their checkpoints.

| Gate | Result | Evidence / limit |
|---|---|---|
| First lesson acceptance | PASS, qualitative | Owner: “yes it is good enough for now,” after the deployed lesson request. Dia / MacBook Air / external speaker. No completion timing, numeric scores or mini-set result supplied. |
| Course implementation | PASS | 20 lessons, six stages; [completion report](academy-completion.md). |
| Hosted CI | PASS | [Run 39626212331](https://github.com/sariserhan/jamloom/actions/runs/39626212331), commit `19ae151`: website, Academy, Linux/macOS ON/OFF and PCM comparison. [Receipt](evidence/academy-release/ci.json). |
| Production schema | PASS | Private pre-migration dump; reviewed additive 0006–0012 applied transactionally to the authorized Neon production branch; all 12 migration hashes match. [Migration receipt](evidence/academy-release/migrations.json), [audit](evidence/academy-release/schema-audit.json). |
| Backup restore | PASS | [Actual restore](evidence/academy-release/restore.json) into disposable private-socket PostgreSQL 18; accounts and five pre-migration schema receipts present. No production rollback, role/ACL restoration or point-in-time recovery claimed. |
| Production deployment | PASS, owner preview | `b4e03e5`, deployment `dpl_7wx9w27aMg95SFCJMcSpjEnPbWSR`, [Jamloom](https://www.jamloom.com). Public coming-soon remains enabled. Owner confirmed first lesson acceptable. [Build log](evidence/academy-release/deploy.log). |
| Browser endurance | PARTIAL | Actual 2- and 5-minute recordings/assessments pass in Chromium and WebKit. 30/60-minute runs interrupted immediately when owner reported nonstop speaker playback; no long-test pass. [Stop record](evidence/academy-endurance/interruption.json). |
| Actual Stripe test mode | PASS | [Provider receipts](evidence/academy-provider/provider.json): hosted Checkout, signed real webhook delivery via CLI, decline/purchase, refund before/after grant, repurchase, won/lost disputes, replay and owner isolation. Local app/disposable DB; permanent deployed webhook not tested. No live charge. |
| Human course/hardware/accessibility | PARTIAL | Owner first-lesson acceptance only; mini-set, music phrase/key judgment, sustained physical output, separate cue output, screen reader and venue remain unmeasured. No recruited-cohort claim. |
| Commercial activation | NOT RUN | Sales remain closed. Durable live secrets/endpoint, actual merchant tax/terms/fees and full course acceptance remain open. |

## CI repair

`b4e03e5` installs the web test dependencies and prepares the WASM engine before
the Academy job. The first hosted rerun exposed Ubuntu POSIX-shell SDK sourcing:
Emscripten's environment script locates itself from its current directory when
sourced by dash. `19ae151` sources it from the SDK directory, then restores the
project working directory. The shared bootstrap regression now requires that
working directory and retains partial-cache/conflict preservation checks.
The failing old behavior and passing repair were tested before the green run.

## Data and deployment

Production target is `ep-flat-hill-b4q0lix4.c-6.us-east-2.aws.neon.tech/neondb`,
Neon project `misty-cherry-32516479`, branch `production`. Backup metadata is
[retained without customer data](evidence/academy-release/backup.json). The dump
is private, ignored, permission 0600 at
`build-academy-release/before-academy-20261021.dump`; keep it for recovery.
No existing accounts, recordings or financial rows were deleted.

Deployment used a separate clean worktree at `b4e03e5` so the running local
endurance server retained its build. Vercel project is `ssari/jamloom`, root
`apps/site`. Subsequent `19ae151` changes CI/bootstrap behavior, not runtime
Academy behavior. Anonymous course access redirects to the coming-soon page;
owner authentication remains required. This is not a public paid launch.

## Teaching audio and owner evidence

The artist labels both excerpts 120 BPM in the
[CC0 source publication](https://opengameart.org/content/free-rhythm-game-music-pack-2).
`scripts/review_academy_grid.py` computes candidate beat phase from positive
35–200 Hz spectral changes and prepares metronome audition files under
`build-academy-review/`. [Candidate receipts](evidence/academy-release/grid-candidates.json)
bind source and audition hashes. This does not establish musical downbeats,
phrase boundaries, keys or independent tempo validation. Production track
annotations are unchanged. The script has a synthetic phase-offset self-check.

The [owner protocol](ACADEMY_NOVICE_STUDY.md) records the revised n=1 scope and
exact acceptance. Installed Dia is 1.53.0; the default output observed on this
Mac is LG Ultra HD, DisplayPort, stereo 48 kHz. Device inventory alone does not
prove playback quality. No microphone, face or owner recording was captured.

## Test-mode billing configuration

Exploratory UI harness checks encountered a different Stripe decline message
(“credit card”) and submitted the next form before address/tax state settled.
The runner now checks the provider's actual `card_declined` state and lets the
address form settle before submission. The final complete run passes. Earlier
repurchase timeout screenshot/text are named `exploratory-repurchase-*`; they are
not the final outcome.


Authorized account: Aurowall, `acct_1TxA3vDlEXWDEeHO`. Test product
`prod_VTzQzUCZg1ycGm`, price `price_1UT1RrDlEXWDEeHO14x5otG7`: USD 79.99,
one-time, tax exclusive. The product is marked `jamloom_product=academy-complete`.
The test tax configuration uses a clearly synthetic US address and the test-only
self-study training code `txcd_20060058`; neither is approved live merchant data.

CLI credentials expire 2026-10-26 and are held only in an ignored 0600 environment
file. They are unsuitable as durable production credentials. Do not paste secrets
into chat, reports or Git. Test outcomes cannot establish real merchant fees,
settlement, refund cost or lifetime support cost. The existing reserve model
remains an assumption, and paid generation's musical-quality FAIL remains intact.

## Reproduction

Build the site before starting tests, and do not replace its `.next` output while
endurance runs. Use Node 22 and the existing dependencies. Endurance seeds paid
access/prerequisites only inside a disposable loopback database; those setup rows
are not course-completion evidence. Actual assessment traces, recordings and
saved results are measured through the real UI/server.

```sh
JAMLOOM_AUDIBLE_TEST=1 JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres npm --prefix apps/site run test:academy-endurance
.venv-analysis/bin/python scripts/measure_academy_endurance.py
.venv-analysis/bin/python scripts/review_academy_grid.py
```

Raw long recordings stay in ignored `build-academy-endurance/`; sanitized traces,
screenshots and hashes are retained in `docs/evidence/academy-endurance/`.
An exploratory short rerun overwrote the first two elementary recordings; the
replacement repeat has its own valid capture/hash evidence in
[elementary-repeat.json](evidence/academy-endurance/elementary-repeat.json).
Original log receipts must not be represented as hashes of those replacement files.

The provider runner uses documented [Stripe test cards](https://docs.stripe.com/testing)
and [test dispute outcomes](https://docs.stripe.com/testing#disputes), including
actual provider `card_declined` state and signed reversal deliveries. Refund-before-
grant coverage deliberately delays the real signed grant at the local proxy;
the refund is processed first, then the original signed grant is forwarded.
Duplicate replays use the captured provider payload signed again locally. These
are identified separately from original deliveries. Other-account access stays
false; generation credit lots stay zero. No bank-network or live-payment outcome
is implied. `first-complete-*` retains the preceding successful run; the final run
also requires durable ingestion of each dispute-closed event before finishing.

Run the provider check only with an authorized Aurowall test key, the pinned test
catalog and an isolated loopback database. It creates actual **test-mode**
Checkout/refund/dispute objects. Browser output is muted. For this session:

```sh
JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres node --env-file=build-academy-release/stripe-test.env --import ./apps/site/node_modules/tsx/dist/loader.mjs apps/site/tests/academy-provider.mjs
```

The endurance command above is intentionally audible and now requires
`JAMLOOM_AUDIBLE_TEST=1`. Arrange a listening window before using it. The interrupted
long runs provide no completed 30/60-minute capture; six completed two/five-minute
captures decode with no clipping, nonfinite samples, clock gaps or quiet run over
200 ms. [Final endurance summary](evidence/academy-endurance/summary.json).

Remaining: owner mini-set/course acceptance; musical phrase/downbeat/key review;
30/60-minute endurance in an arranged window; manual screen reader and physical
output/cue/venue checks; permanent deployed test/live payment credentials and
webhooks; actual merchant tax/refund/fee configuration and commercial activation.
Recruitment is not required under the owner's revised scope. The first lesson is
accepted; none of these distinct unmeasured outcomes is inferred from that answer.

Retained text logs normalize trailing whitespace; raw copies remain private under
`build-academy-release/raw-logs/`. No event payloads or audio receipts were rewritten.
