# Expired account record cleanup

2026-10-18. **Local implementation: PASS. W09 / full specification: PARTIAL.**

`auth:cleanup` removes at most 500 expired sessions and 500 expired verification
records per invocation, using indexed expiry scans and row locks that skip busy
records. Each table's batch commits independently; a later failure is retryable.
It retains active records, user identities, password credentials, tracks and audio.
The CLI requires `--apply` and an exact `DJAYVO_CLEANUP_TARGET`; otherwise it prints
only the non-secret target without connecting or deleting. Output is counts only.

Migration `0005_auth_expiry.sql` adds expiry indexes without changing applied
migrations. `db:usage` now includes expired counts, rate-limit rows, pending audio
deletion and pending catalogue review. Better Auth retains responsibility for its
limiter pruning. No unverified-account purge, backup erasure or automated schedule
is claimed. Deletion enables normal PostgreSQL space reuse; it does not promise
an immediate smaller file or lower bill.

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Unit / real isolated PostgreSQL checks | PASS | [29 checks](evidence/auth-cleanup/tests.log); 1,001 expired rows per table, 500-row bound, locked-row skipping, concurrent retry and active-record preservation |
| Production build / TypeScript | PASS | [Build](evidence/auth-cleanup/build.log), [types](evidence/auth-cleanup/types.log) |
| Target preview and local migration | PASS | [Dry run](evidence/auth-cleanup/dry-run.log), [migration](evidence/auth-cleanup/migration.log); isolated existing localhost database only |
| Local cleanup execution | PASS | [Counts](evidence/auth-cleanup/run.log); zero expired records in the actual development database |
| Local database use | PASS | [Usage](evidence/auth-cleanup/usage.json): 8,821,783 bytes (8.41 MiB), zero users/tracks/sessions, 26 rate-limit records |
| New browser/UI run | NOT RUN | No UI/request-path changes; preceding two-browser account/catalogue reports retained |
| Event-frame / waveform comparison | NOT RUN | No audio or engine changes |
| Hosted scheduler / capacity / free-tier costs | NOT RUN | Local size does not establish Neon compute/transfer or R2/Vercel/Resend budgets |
| Human listening / phone / release | NOT RUN | Existing evidence boundaries unchanged |
| Full specification | PARTIAL | Quality/model/device/live-provider gates remain open |

Environment: Apple M5, macOS 26.7.1, Node 22.23.1, PostgreSQL 16.14.
Commands and retention limits are in the [site README](../apps/site/README.md).
The master specification, supplied fixture, private owner source and `~/mlx-env`
remain unchanged. No hosted service was provisioned or contacted by cleanup.
