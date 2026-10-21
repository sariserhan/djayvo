# Durable rental shutdown and recovery

2026-10-21. **Implementation PARTIAL; local verification PASS; provider execution NOT RUN.**
No instance was created, destroyed or contacted during this work. Sales remain closed.

The new operator-only watchdog closes a gap in the initial queue: a worker's own
termination claim cannot settle a bound cloud rental. The durable record in
`0009_generation_rentals.sql` must contain independent destruction confirmation and
final all-in cost evidence first. Existing local rendering remains available.

## State and ownership

1. A trusted launcher calls `GenerationWatchdog.prepare` with the active lease and
   approved Vast account ID **before** creating anything. This persists a unique
   `jamloom-job-<reservation UUID>` label. Creation is not implemented here.
2. Lost heartbeats, cancellation or deadlines move the job to `stopping`. Capacity
   stays occupied. Neither worker nor watchdog creates a replacement rental.
3. The watchdog verifies the authenticated account, traverses every inventory
   page and matches the exact persisted label/instance. Duplicate labels, changed
   identities, incomplete pages, outages and wrong credentials cannot prove absence.
4. It persists instance identity and destruction intent before DELETE. Successful
   deletion is only a request result. A subsequent complete inventory must show
   the known instance absent before destruction is recorded as confirmed.
5. If creation returned no ID and no instance has ever been observed, absence is
   ambiguous: keep the reservation held. Never treat that situation as a free run.
6. A trusted invoice reconciler records the actual all-in cost and SHA256 of retained
   evidence. There is no provider invoice ingestion yet. Cost/evidence replay must
   match exactly. Worker or client assertions are not an accounting source.
7. Terminal expired/cancelled work settles once through the existing lot ledger.
   Over-cap cost stays held; the watchdog does not charge extra credits. A crash
   after terminal evidence but before settlement is recoverable on another pass.

The sweep uses a Postgres advisory lock, so overlapping supervisors cannot race
through the same rental. Preview mode performs database reads only. Provider
responses are bounded to 1 MiB with 10-second request deadlines; inventories cap at
1,000 records and require stable totals. Logs contain job IDs and fixed statuses,
not lease tokens, credentials, provider bodies, email addresses or audio.

## Commands and operator actions

Use Node 22 and a separate ignored local test env, as in the [owner handbook](OWNER_HANDBOOK.md).

```sh
npm --prefix apps/site run test:wallet
# After starting the command from apps/site with the intended env:
npm run generation:watchdog
```

The first command includes real disposable local-Postgres tests and mocked provider
responses. The second prints a read-only preview, even when a Vast key exists.
Do not interpret an empty preview as account-wide verification: it means this
database currently has no jobs requiring watchdog reconciliation.

The mutating form is deliberately operator-only:

```sh
# Only after explicit approval of the database and bound disposable rentals:
# export JAMLOOM_WATCHDOG_TARGET='<database-host:port>/<database-name>'
# npm run generation:watchdog -- --apply
```

`VASTAI_KEY` must be supplied privately for apply mode. The database target must
match exactly. This command may irreversibly destroy matched instances; it was
**not run against Vast**. Existing research rental records are not automatically
imported or targeted. The production launcher, trusted invoice feed, independent
supervised scheduling, alerts, image/environment review, validated output upload
and full normal-completion lifecycle remain integration work.

An externally supervised invocation must run independently of inference and the
web request lifetime. A sleeping host or provider outage can prevent deletion;
this implementation is **not a provider-enforced spending guarantee**. Do not
enable paid jobs until actual shutdown and billing behavior have been measured.

## Recorded checks

| Gate | Result | Evidence |
|---|---|---|
| Complete inventory, account match, malformed/duplicate pages and delete response | PASS | `vast-provider.test.ts`, `all-tests-watchdog.log` |
| Durable creation intent, lost create/delete response and restart | PASS | `generation-watchdog.test.ts`, real isolated Postgres |
| Cancelled, unbound, duplicate-label, changed-label and over-cap holds | PASS | Same test; unrelated rental never targeted |
| Cost-evidence replay and crash between stop/settlement | PASS | Same test; original-lot accounting retained |
| All site tests | PASS | 64 tests, 0 failures, 0 skipped |
| TypeScript/root production build | PASS | `typecheck-watchdog.log`, `npm-build-watchdog.log` |
| Local preview migration and read-only CLI | PASS | `local-preview-migration-watchdog.log`, `watchdog-preview.log` |
| Real Vast termination/invoice and hosted scheduling | NOT RUN | No provider operations, approval or spending |

The first run exposed an outdated migration-count assertion; the broader run found
a separate preference test assuming gapless SQL sequences. Rejected concurrent
writes can consume sequence values. The corrected test verifies one successful
writer, monotonic revision, owner isolation and stale-edit rejection. Failed logs
are retained alongside the final passing run.

Official contracts checked at implementation: [Vast account identity](https://docs.vast.ai/api-reference/accounts/show-user),
[paginated inventory](https://docs.vast.ai/api-reference/instances/show-instances),
[irreversible instance deletion](https://docs.vast.ai/api-reference/instances/destroy-instance).
Context7 tools were unavailable; official documentation was used directly.
