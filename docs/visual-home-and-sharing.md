# Visual homepage and creation visibility — 2026-10-21

The homepage now leads with a playable two-deck mixer and a community listening
section, followed by five compact product links. New online saves default to
public. Public visibility still requires the creator's sharing permission and
an independent review; it does not publish an old recording or a local preview.
The owner selected a **25% private-generation premium**, rounded up to whole credits.

## Delivery and boundaries

- `apps/site/app/mini-deck.tsx` reuses `apps/web/mixer.js`. The two cleared practice
  tracks have actual play/pause, cue, crossfade, master gain and a live waveform.
  Disc movement follows playback, stops for reduced-motion users, and is not a
  pretend scratch control. No autoplay. Starting community playback pauses the
  mini decks; leaving the page closes their audio context. CC0 credits link to
  the existing source pages. These recordings are not labeled user creations.
- `apps/site/app/community.tsx` requests the newest eight approved, ready,
  non-deleted tracks through the existing catalogue. It refreshes every minute
  while visible and on visibility changes, and uses the existing persistent
  player. Empty and unavailable states are truthful; no fake artists, songs,
  plays or listening endorsements were inserted.
- `apps/web/index.html` and `app.js` offer public/private before local rendering.
  This is a preference for the later online save, not permission to upload.
  Completed mixes link directly to `/library`; the existing IndexedDB library
  supplies the hash-verified WAV. Only the session/file identifiers pass through
  sessionStorage. Legacy sessions without a choice retain private defaults.
  Sign-in returns pending saves to the library.
- `apps/site/app/library/controls.tsx` shows the choice, upload permission and
  (for public saves) public credit, description, mood and separate sharing
  permission. Private metadata never enters the public feed. Existing private
  saves and original recordings remain untouched. Local preview/export/save
  currently cost **0 credits**; this is stated before confirmation.
- `audio-validation.ts`, `private-audio.ts` and `catalogue.ts` share publication
  validation. Finalization atomically queues the consented public listing with
  verified audio. Idempotent retries cannot change its visibility/credit or
  resurrect a withdrawn listing. Review, reports, withdrawal and deletion retain
  their existing controls. The verified owner can review others' submissions
  from the admin dashboard; self-approval remains forbidden.
- `wallet.ts` reserves an additional `ceil(baseCredits / 4)` for explicitly
  private cloud jobs. Successful settlement captures the premium on actually
  captured base credits. Failed/cancelled jobs release the privacy premium;
  existing base-cost reconciliation is unchanged. Changed visibility invalidates
  a reused quote. Original credit lots, margin checks, cost ceilings, frozen
  wallets, single-job limits and verified-owner exemption remain enforced.
  Old reservations retain their prior economics. New reservations default to
  public pricing; a billing record alone is never publication permission.
- Migration `0012_creation_visibility.sql` adds nullable publication intent,
  recent-publication indexing, reservation visibility/premium and per-lot premium
  allocations. It does not publish or reprice existing records. No previous
  migration or master specification was rewritten.

**Paid cloud generation remains closed.** Its quote/confirmation and generation
release workflow must consume the stored visibility and show the final credit
quote when that product is authorized. This change does not enable paid AI,
commercial reuse, training permissions or automatic live charges. Withdrawing a
public track remains free. Already downloaded audio cannot be recalled; existing
signed playback links can survive withdrawal for up to one minute.

## Gates and evidence

| Gate | Result | Evidence |
|---|---|---|
| Production build, typecheck and public-bundle audit | PASS | [Build](evidence/visual-home/build.log), [site checks](evidence/visual-home/site-tests.log); 24 client files scanned, no server secrets |
| Site + real disposable Postgres regression tests | PASS | 26 unit + 29 account/audio/catalogue + 14 wallet/worker + 8 admin + 11 Academy = 88 tests |
| Existing browser-engine unit regression | PASS | [80 tests](evidence/visual-home/web-tests.log) |
| Bounded latest feed and exact ordering | PASS | [Final catalogue run](evidence/visual-home/catalogue-final.log): latest eight out of 101 query fixtures; private/pending/withdrawn/deleted exclusion |
| Actual mini-deck audio and controls | PASS | [Chromium/WebKit](evidence/visual-home/browser.json): nonzero PCM RMS, endpoint channel gains 0 / 0.5600000024, master silence, cue reset, context closed on navigation |
| Actual local render → private save | PASS | Both browsers render the existing synthetic speech fixture through WASM, persist the private choice, return from real sign-in to the pending save, retrieve verified WAV from IndexedDB, upload/finalize through the real local API |
| Public save → review → homepage → playback → withdrawal | PASS | Both browsers, real Next.js/Better Auth/Postgres/local audio store; missing sharing consent prevented saving, hidden audio returned 404, approved audio played, withdrawal removed feed entry on refresh |
| Responsive and automated accessibility | PASS | Chromium 149.0.7827.55 / WebKit 26.5; widths 1440, 390, 320, no horizontal overflow; WCAG 2 A/AA and 2.1 AA axe scans of homepage and library; screenshots inspected |
| Live private premium charging | PARTIAL | Reservation/capture/release accounting tested locally; paid generation stays disabled, no real provider transaction |
| Hosted migration, R2 regression and deployment | NOT RUN | No hosted database mutation, provider upload or deployment this turn |
| New listener/physical-device evaluation | NOT RUN | Automated PCM checks are not a musical-quality verdict; no new music quality claim |
| Existing AI musical-quality release requirement | FAIL | Prior owner listening rejection retained unchanged |

All browser community tracks were explicitly labeled **synthetic workflow
fixtures**, on a disposable local database subsequently removed. The approved
fixture tests check the review software; they do not constitute human review or
permission evidence for a real song.

Screenshot evidence is outside the repository at:
`/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-landing-P3cGvm/`.
Files include `chromium-home-1440.png`, `chromium-home-390.png`,
`chromium-home-320.png`, their WebKit equivalents, and community-fixture captures.
The committed browser JSON preserves the measured results after temporary image
cleanup. No older WAVs or original fixtures were regenerated/deleted.

## Failure found and corrected

A real production-bundle browser test initially got HTTP 503 for private audio
instead of the expected 404. Cached services crossed Next route bundles with
separate `AudioError` constructors, so `instanceof` misclassified the intentional
404. A stable symbol brand now recognizes only real branded Error instances
across those constructors. A duplicated-module unit test and both complete browser
runs pass. Audio was never disclosed by this failure. An initial test also compared
an unnormalized canonical URL and a global review-count fixture; those assertions
were corrected to compare normalized URLs and the intended track's reviews.

## Reproduction and activation

Use Node 22 and a disposable loopback PostgreSQL target. Never run destructive
integration tests against the hosted `.env.local` database. Set `DATABASE_URL`,
`BETTER_AUTH_URL` and `JAMLOOM_LOCAL_OUTBOX` to local test values for integration
checks, plus `JAMLOOM_TEST_DATABASE_URL` for wallet/admin/Academy/browser suites.
The suites create and remove uniquely named local databases.

From `apps/site`, run `npm test`, `npm run test:integration`, `npm run test:wallet`,
`npm run test:admin`, `npm run test:academy`, `npm run build`,
`npm run typecheck`, `npm run audit:bundle`, and `npm run test:landing-browser`.
From the repository root: `node --test apps/web/tests/*.test.js`.
The browser test launches a production server on loopback port 4226, blocks external
requests, uses local mail/audio, and tears down its database/server afterward.

Before deployment, apply reviewed pending migrations **0011 and 0012** to the
intended Neon branch, deploy matching code, preserve private R2 configuration,
and enable the existing catalogue switch only when moderation is staffed.
See [owner actions](OWNER_HANDBOOK.md#homepage-and-public-creations).
The screenshot fixture is not a seed catalogue: real users must submit their own
permitted mixes and a different reviewer must approve them.
