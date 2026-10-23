# Music DNA collections, privacy and credits — 2026-10-22

**PASS: local implementation and technical verification. PARTIAL: released product.**
Implementation commit: `9220cf7`.
The owner approved starting prices of **1 credit public / 2 credits private**.
This increment adds the collection and reservation flow; it does not enable
hosted generation or real credit purchases. Basic/Pro acceptance is unchanged.

## What the listener gets

Open <http://127.0.0.1:4247/music-dna>:

- **Your songs:** account-owned successful songs, including private songs.
- **Community songs:** successful songs explicitly approved for public sharing.
- **Made with Music DNA:** all nine existing completed songs, without special URL
  parameters. The two early songs without style checks are labelled experiments.

Each card supports playback and download. Audio stays stopped until requested,
and starting one player pauses the others. Checked examples and the owner's
songs retain feedback controls. Sharing does not grant training permission;
another listener cannot opt someone else's song into training.

Public is the initial sharing choice, with an unchecked publication permission.
Private costs more and requires the signed-in owner even for a direct audio,
plan or download URL. Public responses omit the favorite list, account identity
and interpretation notes. Withdrawal removes public access for free while
preserving owner access; already downloaded copies cannot be recalled.

## Credits and recovery

The implementation reuses the existing signed quote, wallet, lots, reservation
and settlement ledger. The quote binds the owner, normalized favorites and
visibility. The UI shows the starting price before submission and requires an
additional acceptance if a cost-based quote is higher. No silent extra charge.

Reservation and song-row creation share one database transaction. Repeated
identical request IDs reuse the reservation; changed parameters cannot reuse it.
Only successful, validated audio becomes completed and public after settlement.
Failure or cancellation releases all reserved credits. An interrupted settlement
can be retried without charging twice. Owner collection/readiness reads recover
terminal worker receipts and abandoned starts. The worker has its own 15-minute
process-group deadline, independent of the website's timer.

**Local rehearsal limit:** current quote economics use a modeled $0.05 cost cap
and the existing 50% margin calculation, not a measured hosted invoice. It is
not a production provider integration or production price certification. Live
provider accounting and a durable hosted worker remain release requirements.

## Configuration and migration

`JAMLOOM_DNA_CREDITS_SANDBOX=true` works only with a loopback application,
loopback Postgres, configured verified accounts, existing sandbox credit lots
and `JAMLOOM_DNA_SINGER_ROOT` pointing to the configured local Mac singer.
It does not enable paid checkout. See [environment template](../apps/site/.env.example).
Migration `0016_dna_songs.sql` adds the owner-bound jobs and publication consent.
It has been applied and replayed only in disposable local test databases.
No production migration, upload, deployment, paid inference or new training
was performed. The listening server on port 4247 exposes the existing examples;
it has no account database attached and therefore cannot charge or generate.

## Verification

Retained receipts: [evidence](evidence/music-dna-sharing-credits/).

| Check | Status | Evidence and boundary |
|---|---|---|
| Site tests | PASS | 62 tests; request/process/feedback and existing product regressions |
| Wallet and real Postgres | PASS | 22 tests; atomicity, duplicate submissions, 1/2 pricing, refunds, private access, withdrawal, crash recovery and training permission |
| Real HTTP, auth and wallet browser flow | PASS | Chromium/WebKit, two verified accounts, actual Postgres and process orchestration; synthetic audio worker, not singer quality evidence |
| Existing nine songs | PASS | Both browsers, 120 seconds each, muted playback/seek/range/download, responsive 1280/390/320 layouts, zero axe violations; human listening NOT RUN in this increment |
| Favorite picker, recovery and feedback | PASS | Browser fixture regressions; existing consent, cancellation and saved-list preservation |
| Python DNA regressions | PASS | 20 tests |
| Migration over existing private audio | PASS | Historical audio retained byte-for-byte; duration/replay and owner-isolation regression |
| Actual worker deadline | PASS | One-second deadline terminated the dedicated process group; failed status, no audio generated |
| Build and public bundle audit | PASS | No new runtime dependency |
| Hosted generation / production migration / real credit checkout | NOT RUN | Existing release gates remain closed |
| Broader musical and native-language acceptance | PARTIAL | Earlier owner approval stands; this increment adds no human listening evidence |

Reproduce from `apps/site` using Node 22: `npm test`, `npm run build`,
`npm run audit:bundle`; with a disposable loopback Postgres administrator URL in
`JAMLOOM_TEST_DATABASE_URL`, run `npm run test:wallet` and
`node --import tsx tests/dna-commerce-browser.mjs`. The latter creates and drops
its own database, uses local email verification, and removes synthetic audio.
For the existing audio run `tests/dna-song-live.mjs` with the IDs in
[the example manifest](../assets/manifests/dna-examples.json) supplied through
`JAMLOOM_DNA_SONG_IDS`; keep `JAMLOOM_DNA_RENDER` unset.

The product should not yet be described as fully released. The new local
collection/credit scope is complete; hosted execution, cost-backed paid release,
public operations and broader musical acceptance remain separate work.
