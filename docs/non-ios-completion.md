# Remaining non-iOS implementation — 2026-10-21

**Overall PARTIAL.** Owner order: finish the remaining product work, then iOS,
then launch operations. This checkpoint implements local work and preserves the
quality, hardware, paid-compute and publication gates. It changes no master
specification, production data, source recording or released remix default.

## Implemented

**Composition recovery — PASS technically; musical benefit NOT RUN.** An isolated
source-groove experiment derives kick/bass rhythm from the supplied phrase rather
than applying the same accompaniment across sources. Five matched pairs retain
the same renderer, instruments, tempo, duration and mix; sources, clean anchors,
stems and frozen controls remain available. Exact 512/113-frame replay and
loudness matching pass. Nineteen Q0 tests pass. The renamed repository now resolves
historical fixture paths without rewriting their provenance or skipping hashes.
Local artifacts: `renders/q0-source-groove-20261021/`, including the concealed
listener packet. The owner's source remains private. This is an experiment, not
a promoted remix default. Prior owner musical rejection remains **FAIL**.

**Music DNA — PASS local synthesis; overall PARTIAL.** The existing preference
notebook now renders original instrumental audio using shared C++17/WASM, with
tempo, energy, instrument selection, three directions, novelty and approximately
30–180 seconds. Forms contain an idea, conversation, contrast, developed return
and resolution. The latest two variations can be auditioned separately, downloaded
with their score/report, and marked preferred locally. Cancellation, timeout and
failed generation preserve earlier previews. Song notes are not fetched or sent
to the composer; no reference fingerprint, training consent or learned model is
invented. Preferences still sync through the existing private, revision-checked
account API. Voice requires the separate consented improvisation flow.

**Generation — PASS local rehearsal; provider execution NOT RUN.** A signed,
five-minute account/input-bound quote shows the exact credit reservation, including
the rounded private-creation premium. Reservation uses the same purchase-lot
allocation logic as quotation and rejects changed credit amounts. Accepted jobs
become claimable only after their source is stored. A bounded local process uses
the existing native renderer, heartbeat, cancellation, checksum validation,
private library and idempotent settlement. The account form polls actual status.

A completed render records its path, checksum and modeled cost before storage
finalization. If saving fails, the reservation stays held; a subsequent worker
invocation retries the same output without another render. Damaged files fail
closed. Cancellation during recovery withdraws any partially published private
asset and settles once. A crash before the database receives that receipt still
requires inspection of the private working directory; jobs are never blindly
requeued. Costs here are modeled CPU rehearsal costs, not GPU invoices. No paid
provider or R2 write was performed.

The form and worker require loopback configuration, local audio storage and
`JAMLOOM_GENERATION_SANDBOX=true`; hosted generation remains unavailable. Source
inputs currently use the existing 2–5 second PCM16/score contract, and the private
library uses its existing 20–40 second stereo output contract. Expanding either
contract requires corresponding validation and quality evidence.

**Purchase accounting — PASS sandbox contracts.** Credit fulfillment now requires
the authoritative charge's expanded balance transaction and tax instead of an
estimated processor fee. Missing, mismatched, disputed or refunded evidence is
held. The support/refund reserve remains explicitly provisional. Unused credits
from held/refunded lots are removed with append-only ledger entries; cancelled
jobs cannot return those credits to a spendable balance. Wallet holds remain
until reconciliation. Partial-refund policy, dispute reversals, actual invoices,
merchant tax decisions and live charges are not claimed complete. Stripe describes
the asynchronous fee-evidence case in its [expansion documentation](https://docs.stripe.com/expand/use-cases)
and the amount/fee/net fields in [balance transactions](https://docs.stripe.com/api/balance_transactions/object).

**DJ controls — PASS bounded local implementation; professional release PARTIAL.**
An explicit “Enable beat controls” action prepares imported tracks of 2 seconds–5
minutes within 128 MB decoded. They gain continuous pitch, beat loops/jumps,
declared-grid alignment and rolls which return to the uninterrupted timeline.
Key lock is explicitly unavailable in this mode. Ordinary native playback retains
its 20-minute limit. Linear, smooth and quick-cut crossfader curves keep coherent
summed gain bounded; the default is unchanged. Existing automation records the
resulting actual channel gains.

Optional recovery stores A/B audio, positions, cues, loops, EQ, tone/echo, faders
and curve locally, at most 100 MB. It saves transactionally every five seconds
and restores paused after permission confirmation and integrity validation.
Interrupted or failed saves retain the last coherent set. It excludes online-only
Aurowall audio, phrase C, live instruments and unsaved recordings. It does not
grant rights, upload media or guarantee browser storage durability. Download
recordings separately; delete recovery through its explicit control.

## Verification and retained limits

Evidence lives in [evidence/spec-completion](evidence/spec-completion/).
The core suite passes all 17 tests, including all instrument masks, deterministic
block sizes and a real 180-second composition; the composer also passes ASan/UBSan.
All 107 web tests, 37 site tests, 14 wallet/queue/provider tests, the real local
worker/recovery test and 19 Q0 tests pass. Chromium/WebKit new flows and the broader
Chromium DJ/offline regression pass. Native and both browsers produce the same
fixed-request WAV checksum. Production build, typecheck and public-bundle audit
pass. These receipts identify the specific checked layers. Browser audio is muted downstream of the measured graph.
Screenshots and private generated WAVs are retained at the paths in those receipts.
Failed browser attempts are retained separately from final passes.

No human musical acceptance, manual screen-reader acceptance, physical MIDI,
headphone cue, actual macOS capture/routing/latency, hosted HTTPS pairing, new
provider execution, Linux execution or deployment was performed in this increment.

## Still required before declaring the specification complete

1. **Musical quality FAIL / new trial NOT RUN:** listen to and rate the preserved
   comparisons, including recognizability, groove, realism, variety and replay
   value; revise the composer based on that evidence. Human checks remain deferred
   by the owner. This checkpoint cannot close M1 or approve learned production AI.
2. **Professional DJ PARTIAL:** true scratch, benchmarked key lock/time stretch,
   advanced reverb/phaser/flanger, verified separate headphone cue and broader
   session/scene recall are not implemented by this batch. The full-product spec
   requires benchmark and real-test evidence before advancing advanced effects
   and four decks; two decks remain the supported minimum. Earlier strict live
   deadline failures in [live-deadline](live-deadline.md) and [worklet-load](worklet-load.md)
   are not erased by these functional browser checks.
3. **Music DNA PARTIAL:** licensed catalog disambiguation, metadata-backed taste
   inference and learned personalization need permitted data and quality evidence.
   Current references are explicit notes with unknown audio attributes; local
   preference marking does not train a model.
4. **Generation PARTIAL:** actual provider cost/invoice reconciliation, GPU/model
   deployment and R2 result recovery remain unexecuted. Local synthesis and
   deterministic recovery implement the spec's fallback, not cloud completion.
5. **Live Source and Academy PARTIAL:** preserve prior local/native/Academy checks;
   hosted pairing, actual capture/routing, human mini-set/accessibility and physical
   endurance remain open. This batch does not claim new evidence for them.
6. **iOS NOT RUN here, then launch operations NOT RUN here:** explicitly deferred.
   No push, publication, commercial enablement or new paid compute occurred.

## Reproduction

Use Node 22 and a disposable loopback PostgreSQL database. Never point test suites
at the configured hosted database. No new migration is required.

```sh
npm --prefix apps/web test
npm --prefix apps/site test
npm --prefix apps/site run typecheck
npm --prefix apps/site run test:wallet
npm --prefix apps/site run test:generation-local
cmake -S . -B build-finish -DCMAKE_BUILD_TYPE=Release -DPython3_EXECUTABLE="$PWD/.venv-q0/bin/python"
cmake --build build-finish -j4
ctest --test-dir build-finish --output-on-failure
npm run build
cd apps/site
node tests/spec-completion-browser.mjs
node --import tsx tests/generation-http.mjs
```

Database tests require `JAMLOOM_TEST_DATABASE_URL` on `127.0.0.1`; the test-created
databases are dropped afterward. `generation:local` is a one-shot worker under
the explicit local flag. Retain its work directory until output recovery and
reconciliation are complete. Queued cancellation removes its staged source. Failed-job working directories,
failed cleanup retries and production retention still need the deferred operational
policy.
