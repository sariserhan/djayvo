# Private account audio

2026-10-18. **Local implementation: PASS. Hosted R2 and overall W10: PARTIAL.**

The account library now accepts an explicitly selected finished Djayvo WAV, with
a separate permission checkbox for storing recognizable voices. It saves privately,
plays/seeks/downloads the verified mix and lets its owner remove it. Sign-in never
uploads the browser library; raw recordings are not transferred. Local studio
copies survive account navigation, password reset, sign-out and remote removal.
Public submission and publication are still separate, unimplemented actions.

The local development adapter stores private files under ignored `build-site/`.
The library explicitly identifies this as Mac-local account storage. R2 support
is implemented with pinned AWS SDK 3.1152.0 (Apache-2.0), but disabled by default;
no hosted resource was provisioned, paid service called or real email sent.

## Contract and failure behavior

`0003_private_audio.sql` extends metadata to all seven current musical directions
and adds checksum, reservation identity, explicit storage consent and lifecycle
state. Existing migration files and existing tracks are preserved. One bounded
private asset is associated with a track; no audio bytes enter PostgreSQL.

Account/global quotas reserve twice the selected file size for staging plus final
storage before issuing an upload grant. Admission is serialized in PostgreSQL;
concurrent requests cannot independently spend the same remaining quota. Bounds:
ten pending/ready/deleting tracks and 100 MiB/account, 1 GiB total reservations,
20 new reservations/account/day, 500/day globally. Deleted reservations still
count toward the daily limit. These are initial application limits, not measured
Neon/Vercel/R2 billing limits or production capacity evidence.

Grants expire after at most five minutes, bind Content-Length and Content-Type,
and target a random staging key. The server verifies actual byte length, SHA-256,
canonical metadata-free PCM16 stereo/48 kHz WAV framing, 20–40 second duration,
nonconstant signal and absence of full-scale samples before exposing a track.
It does not classify voices, verify permission claims or infer musical quality.
R2 decoding is bounded in memory and requests have timeouts with no SDK retries.

The final key receives only checksum-bound bytes. Retry after object write/SQL
failure produces the same bytes; later rewrites of the staging key do not change
published audio. Owner locks serialize finalization, grant creation and deletion.
Removal immediately hides the mix and blocks new grants. Cleanup waits until
upload expiry plus a one-minute margin, deletes both keys and only then releases
the reservation; failures retain state for retry. Ready objects retain only their
master after staging cleanup. Account cascading deletion is restricted while
object records exist, preventing silent orphaning; a full account-deletion flow
is not implemented.

R2 release must configure and test a staging lifecycle rule and reconciliation:
a PUT already in progress can finish after URL expiry. Local deletion tests cannot
prove cleanup of such live provider races. Read grants last 60 seconds; previously
issued links and downloaded copies cannot be instantly revoked. The cleanup CLI
is target-guarded and batch-bounded, but no hosted scheduler has been provisioned.

## Validation

The flow under test: studio generation/download → sign-in → library → select WAV
and confirm storage permission → save → play/seek/download → cancel or confirm
removal → return to the unchanged local mix.

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Node 22 production build / TypeScript | PASS | [Build](evidence/private-audio/build.log); Next.js 16.4.2, React 19.3.1 |
| Unit and real PostgreSQL/storage integration | PASS | [20 checks](evidence/private-audio/tests.log), including actual disk writes and isolated test databases |
| Validation and grants | PASS | Consent/metadata/path/size/hash/WAV bounds, silent/opposite-offset and clipped inputs, streamed body bounds; offline AWS signing binds length/type and expiry |
| Isolation / quota / crash recovery | PASS | Wrong-owner access denied, concurrent reservations capped, idempotent finalization, simulated failure after object write, expired/replayed upload handling, failed deletion retry and daily limits |
| Chromium workflow | PASS | Ten checks; registration, verification, private saves, playback/seek/download/removal, auth reset/sign-out and studio preservation |
| WebKit workflow | PASS | Same ten checks; screenshot-tool CSP warnings retained separately from app errors |
| Page identity / content / overlay / app console | PASS | Correct title and meaningful library; no framework overlay, page exceptions or application console errors |
| Responsive visual review | PASS | 1440×1000 and 390×844; existing palette and accessible button styles, readable labels and no horizontal overflow |
| Transferred waveform integrity | PASS | In each browser, account playback/download bytes equal the generated WAV; maximum/RMS PCM difference zero |
| Event-frame comparison | NOT RUN | No DSP/plan changes; this is a byte-preserving storage path, with unchanged WASM hash verified separately |
| Secret / studio bundle audit | PASS | [Audit](evidence/private-audio/bundle.json); server credentials absent and studio assets preserved |
| Live R2, Neon, Resend, Vercel / cleanup scheduling | NOT RUN | Local PostgreSQL/files/outbox and offline signature checks are not live provider proof |
| Human listening / microphone / phone | NOT RUN | Prior listening and device boundaries unchanged |
| Full specification / production release | PARTIAL | Catalogue, provider validation, quality evidence and release gates remain open |

Browser evidence: [Chromium](evidence/private-audio/chromium.json),
[WebKit](evidence/private-audio/webkit.json),
[desktop](evidence/private-audio/library-desktop.png),
[mobile](evidence/private-audio/library-mobile.png).
Actual Mac: Apple M5, macOS 26.7.1; local PostgreSQL 16.14; Node 22.23.1;
Playwright 1.61.1. Browser versions and runtime versions are retained in the reports.

The Browser plugin was listed but its required Node execution tool was unavailable
after discovery. The owner's autonomous local-test authorization was used to run
the repository's installed Playwright fallback. The frontend testing and React
skills guided checks and controls. Playback was muted; no speaker quality claim.

Initial failures are retained: the direction selector's implicit label included
option text, fixed with an explicit accessible name; site-directory commands
selected Node 26, corrected to explicit Node 22. WebKit screenshot synchronization
injects a temporary `body {}` stylesheet, blocked by the studio's strict CSP.
Changing caret settings alone did not remove that warning. The final harness
classifies only that exact warning during a screenshot separately, preserves it,
and still fails on application errors. The CSP was not weakened.

## Reproduction and remaining release work

Follow [site instructions](../apps/site/README.md) for migration, local storage,
provider configuration and cleanup. Use Node 22 for build, tests and server:

```sh
cd apps/site
npm test
npm run test:integration
npm run typecheck
npm run build
npm run audit:bundle
npm run test:browser
DJAYVO_BROWSER=webkit npm run test:browser
```

Test accounts, rows and local object files are removed afterward. Browser evidence
uses fresh ignored directories; private owner recordings and frozen evaluation
packets are not uploaded or rewritten. The master and supplied speech fixture
are unchanged; `~/mlx-env` is untouched.

Before hosted use: prove actual R2 signing/CORS/seek/lifecycle behavior, account
and environment isolation, scheduled retry recovery, cost/overload controls,
provider deletion/backup policy and live auth/mail. Review rights and human-quality
evidence before release. Public catalogue, moderation and playlists are not passed
by private saving.

Primary documentation used because Context7 was unavailable:
[R2 signed requests](https://developers.cloudflare.com/r2/api/s3/presigned-urls/),
[R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/),
[AWS JavaScript S3 SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html),
[Playwright screenshot options](https://playwright.dev/docs/api/class-page#page-screenshot).
