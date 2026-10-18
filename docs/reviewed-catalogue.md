# Reviewed catalogue and private playlists

2026-10-18. **Local implementation: PASS. W11 / full specification: PARTIAL.**

A privately saved mix can now be submitted with separate public-listening
permission, credit, description and mood. A distinct authorized reviewer must
approve the exact submission revision before it enters the catalogue. Owners
can withdraw or remove it; editing requires a new review. Public queries expose
only track ID, title, direction, duration, chosen credit, description and mood.
Account email, owner ID, object keys, hashes, consent records and review notes
are excluded. The underlying object remains private; approved listening uses
an authorized stream or a short-lived signed URL.

The website includes search, direction/mood filters, cursor pagination, track
pages, a persistent player, private playlists and signed-in concern reports.
No genuine track was published: tests used disposable accounts and a procedural
20-second tone, then removed them. That tone does not replace or regenerate the
supplied synthetic speech fixture. Owner recordings were not uploaded.

## Boundaries

- `0004_catalogue.sql` was applied only to the existing isolated local PostgreSQL.
  Existing migrations, recordings, master specification and engine are unchanged.
- Reviewer access requires a verified account and server-only email allowlist;
  no reviewer is assigned by default. HTTP review endpoints check that role.
  A reviewer cannot approve their own mix, and approval requires a listening /
  permission confirmation plus a note. This records a claim, not proof of rights.
- Submission revisions and owner locks prevent stale approval from undoing a
  withdrawal. Removing/rejecting/withdrawing a track prevents new public requests
  and hides it from playlists without deleting a privately retained original.
  Already downloaded copies and existing 60-second signed URLs cannot be recalled.
- Public listening exposes the full finished WAV, which listeners can save. It
  grants no commercial reuse or training rights. Raw voice recordings are absent.
- Playlists are private, limited to 20 per owner and 100 tracks each. Duplicate
  adds are idempotent, including when full. Only approved available tracks play.
- Reports require verified sign-in and allow at most ten distinct recent report
  rows per account. Reviewers see a bounded queue and reasons. No notifications,
  moderation SLA, escalation or external rights-claim channel is configured.
- The player survives Next.js client navigation. Full reloads and entry into the
  separate static studio reset it. Automated playback was muted.
- Hosted catalogue requires explicit enablement and remains disabled. R2,
  live providers, budgets, scheduled deletion, moderation staffing, permission
  review and human musical-quality acceptance still require release evidence.

## Checks

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Node 22 production build and TypeScript | PASS | [Build](evidence/catalogue/build.log), [types](evidence/catalogue/types.log) |
| Unit / actual PostgreSQL and local file tests | PASS | [28 checks](evidence/catalogue/tests.log), isolated databases; no mock-only SQL claim |
| Privacy / consent / independent revision review | PASS | Private/pending audio denied; ordinary users denied review; self/stale review rejected; public DTO fields asserted |
| Search / pagination / playlists | PASS | Escaped literal search, disjoint pages, owner isolation, concurrent list limits, 100-item cap and idempotent retry |
| Report / removal / withdrawal races | PASS | Public audio and playlist access revoked, private bytes retained; review/removal serialized |
| Chromium catalogue flow | PASS | [Eight checks](evidence/catalogue/chromium.json) |
| WebKit catalogue flow | PASS | [Eight checks](evidence/catalogue/webkit.json) |
| Account / private-audio regression | PASS | Ten flows each: [Chromium](evidence/catalogue/account-chromium.json), [WebKit](evidence/catalogue/account-webkit.json) |
| Page identity / content / overlay / console | PASS | Meaningful catalogue/track/playlist screens; no app runtime errors or framework overlays |
| Desktop/mobile visual inspection | PASS | 1440×1000 and 390×844; readable controls and compact player, no horizontal overflow |
| Persistent playback | PASS | Same audio element remains playing across catalogue client navigation |
| Waveform integrity | PASS | Public playback bytes exactly equal uploaded fixture; maximum/RMS PCM difference zero |
| Event-frame agreement | NOT RUN | No DSP/plan change; [bundle audit](evidence/catalogue/bundle.json) verifies unchanged studio assets |
| Actual reviewer rights / musical quality assessment | NOT RUN | Synthetic approval tests are workflow evidence only |
| Live R2 / Neon / Resend / Vercel / publication | NOT RUN | Local database/files/outbox only; no provider resource provisioned |
| Phone / physical microphone / speaker listening | NOT RUN | Owner pause and existing evidence boundaries retained |
| Full spec / release | PARTIAL | Formal M1, model, device and production gates remain open |

Environment: Apple M5, macOS 26.7.1, PostgreSQL 16.14, Node 22.23.1,
Next.js 16.4.2, React 19.3.1, Playwright 1.61.1. Browser runtime versions are
retained in the linked JSON. The Browser plugin's required execution tool was
unavailable; the existing repository Playwright workflow was used. Screenshots:
[desktop](evidence/catalogue/catalogue-desktop.png),
[mobile](evidence/catalogue/catalogue-mobile.png),
[WebKit mobile](evidence/catalogue/webkit-catalogue-mobile.png).

The first browser run failed on the console's expected HTTP 400 from a deliberately
unconfirmed approval. The harness now asserts the denied response and UI message,
records that exact expected validation error separately, and still rejects app
errors. [Initial failure](evidence/catalogue/chromium-initial.log) is retained.
WebKit screenshot synchronization injects a temporary stylesheet; its exact CSP
warning is retained only during capture. CSP was not weakened. Final review fixed
multiline descriptions/notes (while still rejecting invalid control characters)
and preserved playback on the playlist-creation navigation link.

Reproduce using the [site README](../apps/site/README.md), with the synthetic
reviewer allowlist only on an isolated test server. After the checks, temporary
reviewer access and synthetic account/catalogue data were removed. No publication
or musical-quality approval is inferred from test success.

Primary documentation used when Context7 was unavailable:
[Next.js layouts](https://nextjs.org/docs/app/api-reference/file-conventions/layout),
[client navigation](https://nextjs.org/docs/app/api-reference/components/link).
