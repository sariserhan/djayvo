# Hardware deck design and music curation — 2026-10-21

**PASS:** Original hardware-inspired homepage/studio/Academy surfaces, stable hover/focus outlines and 72 curated Aurowall music tracks. Excluded 22 religious/wellness/nature/noise categories; old IDs return 404. Muted Chromium/WebKit playback, cue, jog, faders, fullscreen, responsive/axe, simulated touch and reduced motion pass; build/typecheck/bundle audit, 35 site and 102 web tests pass. **PARTIAL:** Deployment pending. Human checks deferred; bucket untouched and release gates retained. [Report](deck-hardware-and-curation.md), [TODO](../TODO.md).

# Inline payments and Aurowall music — 2026-10-21

**PASS:** Inline Stripe test checkout and verified receipt, 94 owned Aurowall recordings at initial integration (now 72 curated music tracks) with explicit playback, online DJ selection and linked partnership. Actual test decline/refund/repurchase/disputes and muted Chromium/WebKit R2 playback pass. **PASS:** Runtime `a06151f` deployed READY; hosted public gates and permanent webhook purchase/refund verified. Full CI run `39673854024` passes, including website/Academy, Linux/macOS sanitizer builds and cross-platform comparison. Signed-in hosted music UI was not rerun; actual R2 browser evidence uses the local production build. Sales/quality holds remain; no storage writes or real charges. [Report](inline-payments-aurowall.md), [tracker](../TODO.md).

# Academy continuation — 2026-10-21

The verified owner preview is deployed at `c74ad49` behind coming-soon; full
hosted CI passes. Owner access preserves prerequisites and creates no payment
receipt. Chromium/WebKit access, account isolation, axe and delayed-network checks
pass. Assessment sampling now begins after server attempt creation.

Permanent Aurowall test/live keys, separate catalogs and enabled webhooks are
configured. Actual hosted test purchase/refund passes with access withdrawn and
no generation-credit change. A real live non-payment event reached production;
no live charge was created. Live tax settings are active; zero active registrations
were reported, leaving merchant obligations and real payment acceptance open.
The existing notification retry endpoint runs every five minutes; authentication
and scheduled invocation pass. The empty outbox does not prove mailbox delivery.

Silent recording endurance is now **PASS for all ten local browser cases**:
Chromium and WebKit each completed 2-minute, two 5-minute, 30-minute and 60-minute
recordings, downloads, assessments and account saves. Both hour recordings stop
automatically. All ten hashes match their receipts; decoded durations agree within 0.5 seconds,
with zero unresolved timestamp gaps, no clipping and no sustained silence. The
longest quiet interval is under 4.57 ms. Full-duration final receipts report zero clock stalls;
the short Chromium cue/restart regression separately exercises three classified
stalls. All 101 web tests and full hosted CI pass at `c74ad49`.

Earlier Chromium failures remain preserved. Direct diagnostics established a
single stale worklet timestamp followed by exact catch-up; the corrected detector
separates this bounded pattern from real or unresolved gaps, which still fail.
No encoded audio is repaired. Provenance identifies each capture's server/static
revision; these are local production-build checks, not physical listening or an
exact deployed full-stack endurance test. The same runtime commit is deployed
READY, with fresh coming-soon, closed-checkout and private/no-store HTTP checks.

Human checks are explicitly deferred by the owner. The earlier first-lesson
acceptance remains qualitative; mini-set, musical judgment, manual accessibility,
physical output/cue and venue checks are not passed. Sales remain closed.
[Current release evidence](academy-release-checks.md).

Earlier checkpoints below preserve their original results and dates; the current
report supersedes their pending migration, deployment, CI and recruitment statuses.

# Earlier Academy release checkpoint — 2026-10-21

**PASS:** Full hosted CI at `19ae151`, production migrations 0006–0012 with all
12 hashes verified, and production deployment `b4e03e5` behind coming-soon.
Owner accepts the first lesson: “yes it is good enough for now,” using Dia on a
MacBook Air with an external speaker. Owner-only testing replaces recruitment.
**PARTIAL:** Actual 2/5-minute recordings pass in Chromium/WebKit; 30/60-minute
runs were interrupted to stop unwanted audible playback; actual Stripe test-mode purchase/reversal/dispute checks PASS. Mini-set owner feedback, musical
annotations, sustained physical output, manual accessibility and commercial
configuration remain open. Aurowall is authorized for test/live billing;
sales remain closed. [Current report](academy-release-checks.md).

# Academy completion in progress — 2026-10-21

**PASS:** Shared-clock course playback, first crossfade/account synchronization and offline playback in Chromium/WebKit; 96 web tests and 12 Academy/database tests. **PARTIAL:** 20 lessons across all six stages, end assessments and bounded long set recording implemented; broad and focused final Chromium/WebKit checks PASS; both corrected 126-second mini-sets PASS. Original recorder PCM/privacy/lifecycle regressions PASS in Chromium/WebKit. Recorder startup is explicitly warmed before acknowledging capture; Chromium short and 126-second captures have zero timestamp gaps. The long assessment correctly rejected 32-second silent tails in the old teaching excerpts. Corrected v2 exports reset trimmed timestamps before fades and pass full-duration silence/peak checks; originals and failing evidence are preserved. Full-duration 5/30/60-minute endurance, actual novices, physical audio/venue, payment providers and deployment remain **NOT RUN**. Track increments ACA-019–022 in [TODO](../TODO.md).

# Public coming soon — 2026-10-21

**PASS:** Coming-soon mode defaults on. Only the verified, non-suspended owner
can preview product routes; other users see the launch page. Login/recovery,
support/contact and existing signed callbacks remain available. Public signup and
product APIs are closed, sitemap is homepage-only, and admin responses are
private/no-store. Thirty unit tests, build, typecheck, public bundle audit,
Chromium/WebKit login/deck/logout, responsive/axe checks and flag-off homepage
regression pass. **NOT RUN:** Deployment and live verification. No new schema or
paid-release changes. [Report](coming-soon.md).

# Visual homepage and creation visibility — 2026-10-21

**PASS:** Working mini DJ decks, compact visual landing page and latest reviewed
community feed. New saves default public with explicit sharing permission;
private/legacy mixes stay out of public listings. Direct browser-mix saving,
review/playback/withdrawal, exact 25% premium accounting, 88 site/DB + 80 web tests,
build, typecheck, bundle audit and Chromium/WebKit audio/responsive/axe checks pass.
Fixed production-bundle AudioError identity mismatch discovered in real route tests.
**PARTIAL:** Private cloud-generation pricing is implemented in the ledger; paid
creation remains closed and free local previews/saves incur no credits.
**NOT RUN:** Hosted migrations 0011/0012, R2 regression, deployment and new human
listening. Existing Q0 musical-quality **FAIL** is unchanged.
[Report and reproducible evidence](visual-home-and-sharing.md).

# Owner administration — 2026-10-21

**PASS:** Verified owner account created for serhan.sari@yahoo.com; owner confirmed
setup email arrival and Neon readback confirms verification. Admin controls,
suspension/session revocation, credit exemption with cost caps, maintenance/banner,
private contact/support inbox and branded notification/reply outbox implemented.
83 site/database tests and 80 web tests pass, as do build, typecheck, bundle audit,
Chromium/WebKit and responsive/axe checks. Test/live mode selection preserves
receipt isolation and release holds.
**NOT RUN:** hosted migration 0011, admin deployment, new hosted notification
workflow, scheduler and real payment-provider transactions. Q0 remains **FAIL**;
paid generation remains disabled. [Report](admin-implementation.md).

# Ten-track practice library — 2026-10-21

**PASS:** Expanded the public selector from 3 to 10 distinct CC0 artist recordings
(25 minutes, 30.2 MB audio). Source licenses/hashes and all artist credits retained.
Original three tracks and Academy fixtures are byte-identical. 80 unit tests,
production build, Chromium/WebKit playback of all ten tracks online and after
stopping the test server pass. Responsive and axe checks pass. Offline bounds
now explicitly allow 64 MiB; studio is 58.6 MB and free Academy pack is 61.7 MB.
**NOT RUN:** human enjoyment, physical venue and deployment; paid generation
remains disabled. [Report](practice-library-ten.md).

# Public practice library — 2026-10-21

**PASS:** Three downloaded CC0 artist recordings wired into actual A/B decks,
with source/license credits, checksum validation and consent-safe replacement.
80 unit tests, production build, Chromium/WebKit playback/accessibility and
stopped-server offline playback pass. Fullscreen regression passes at nine sizes.
**NOT RUN:** listener suitability, physical venue and deployment. Original lesson
tracks, master and AI musical-quality FAIL remain unchanged.
[Report and reproduction](practice-library.md).

# Full-product watchdog follow-up — 2026-10-21

**PARTIAL:** Durable rental/account identity and guarded Vast shutdown watchdog are
implemented. **PASS:** 64/64 site/local-DB tests, TypeScript and root production build.
**NOT RUN:** real provider calls/deployment/invoice ingestion. No money spent.
Bound rentals require provider absence and cost evidence before credit settlement;
unknown creation, conflicts, provider outages and over-cap costs remain held.
The ten-source audit preserves 87 full-scale samples in the original claps input;
zero full-scale samples applies to rendered outputs, not all originals.
[Details](generation-watchdog.md), [implementation report](full-product-implementation.md).
Earlier checkpoint: `efa13be3c4b1ba73a86bbd116353088ad4246c54`.

# Jamloom: M0 continuation evidence

Current full-product directive — 2026-10-20/21: **overall PARTIAL; paid release FAIL / closed.**
[Implementation report](full-product-implementation.md), [STATUS](STATUS.md) and
[owner handbook](OWNER_HANDBOOK.md) supersede earlier local-work pauses while
preserving every failed musical gate. Added four product routes/SSR home,
local live capture/FX, explicit Music DNA local and private account preferences,
wallet/payment safety, durable signed jobs, account views, iOS taste and gated
StoreKit client, metadata/guides and an expanded ten-input audio baseline.

Actual validation: site/account/payment/queue 60 tests; C++ 15 tests; web baseline
73 tests; 12 iOS simulator tests; Chromium/WebKit public routes and existing
DJ audio regressions; 13 zero-violation axe scans. All those technical checks
**PASS**. Real local job → C++ 32-second WAV → private disk/playback → ledger
settlement **PASS**, zero external spend. Full `npm run build` **PASS**.
Ten inputs produced 66 source/master/stem WAVs; no clipping. Structural audit
finds bass/drum reuse across same-style inputs despite distinct whole-plan keys.
That is not a quality success. Earlier Q0 owner rejection remains **FAIL**.

Hosted provider purchases/generation, native companion, new physical-device
and 60-minute venue checks **NOT RUN**. Native account sync, refund/proceeds
reconciliation, real worker termination and taste-driven music remain unfinished
implementation, not just missing keys. No deployment, production migration,
new paid compute, training or private-media publication occurred. Historical
Night Current feedback later was “okay it is not bad”; this does not validate an
improviser or authorize a repeated song template.


Historical owner direction — 2026-10-20: **Improvisation/Q0 was paused.**
[Night Current](night-current.md) is a standalone 2:01, 140 BPM bass instrumental,
arranged locally from existing original generated material with recorded CC0
snare accents. WAV/MP3, mix buses, edit frames and provenance retained.
Render, decoding, file hashes, Downloads copies, HTTP seeking and Chromium/WebKit
player checks **PASS**. Human listening **NOT RUN**; musical alignment **PARTIAL**
pending listening to the estimated beat grid. No new spending, training or
production changes. Q0's historical rejection below remains unchanged.

Final Q0 review — 2026-10-20: **Musical recovery FAIL; full requirement
coverage PARTIAL.** The owner rejected the latest 4211 owner-speech pair as
“Both still bad.” The final report records every requested step, implementation,
playable output, measurement, license finding and unresolved issue. Fresh
verification passes for 732 retained file hashes, 25 five-condition exports
and five latest candidate exports. No new audio, numeric ratings, model training,
production promotion or later milestone. Independent study and an accepted
creative control remain open. [Final Q0 report](q0-final-report.md).
Earlier checkpoints below retain their historical statuses.

Earlier priority — 2026-10-20 (now paused):
[Q0 musical quality recovery](q0-quality-recovery.md) is **PARTIAL**.
Five frozen real-input baselines, stems, instrument probes, optional local SFZ
tests and an isolated expression-only comparison are available. Subsequent owner
review rejects all three packets: current owner acceptance is **FAIL**.
Human causal ranking and formal comparative improvement remain **NOT RUN**.
No production engine, dashboard, master or learning addendum changes.

Latest cached-deployment repair — 2026-10-20:
[SDK cache recovery](deploy-cache.md): Git build `41fd759` failed when its SDK
clone collided with an incomplete restored tools directory. Regression reproduction
and recovery/preservation checks **PASS**; local build and audit **PASS**. Fix
`66031e3` passes the production retry with the same build cache enabled, plus
live Chromium/WebKit page/auth checks and byte-identical valid WASM downloads.
The deployment-specific runtime error query returned no errors. Git rollout is
**PARTIAL** until the local fix is pushed; remote main remains `41fd759`.
No master, audio algorithm, data, credential or infrastructure configuration changes.

Latest public interface refinement — 2026-10-19:
[Sharper responsive UI](public-ui.md). Main build/typecheck/14 tests and bundle
audit **PASS**; 56 Chromium/WebKit layout cases plus keyboard, consent/import,
form/filter and simulated player layout checks **PASS**. Chromium voice (21) and
DJ (47) regressions **PASS**, including offline audio. Twelve additional dropdown
checks **PASS**. Scoped Vercel deployment and live desktop/mobile browser checks
**PASS**; auth, tracker transport and security checks remain green. Physical devices and owner visual acceptance
remain **NOT RUN**; no new musical-quality claim.

Latest public branding and tracker connection — 2026-10-19:
[Public Jamloom release](brand-live.md). Local remote and Vercel Git integration
now use `sariserhan/jamloom` with the same repository ID. Approved branding is
live on the public studio, DJ workspace and account page; unrelated local features
stay out.
Browser evidence confirmed VisitorPing's configuration fetch was blocked by CSP;
only its exact ingestion HTTPS and observed realtime WebSocket origins were added. Main 14 tests/typecheck and
release 10 tests/build/typecheck/secret audit **PASS**. Provider activated
automatically; two page views and page duration received HTTP 204, realtime
handshake HTTP 101, and final browser console/CSP checks pass. Dashboard
Test installation and Live Radar remain **NOT RUN**. See the report for receipts.

Latest website analytics installation — 2026-10-19:
[VisitorPing](visitorping.md) **PARTIAL**. Single Next.js layout integration for
`vp_QBDH92AC`; static offline studio remains untracked and CSP is unchanged.
Build, 13 unit tests, typecheck, secret audit and local browser deduplication
**PASS**. Scoped production deployment and public browser checks also **PASS**:
correct key, one load across two pages, untracked studio and auth still 200.
Initial cached deployment failed; retry without cache succeeded. Provider serves
a paused script; collection, dashboard installation
check and Live Radar remain **NOT RUN** pending provider enablement and review.

Latest canonical domain validation — 2026-10-19:
[www origin](www-origin.md): production template, exact Better Auth trusted origin,
email fixtures and live R2 CORS aligned to `https://www.jamloom.com`. Thirteen
unit tests, 54 browser email layout cases, ten live R2 checks, build, typecheck
and client-secret audit **PASS**. Existing production release redeployed with the
current environment: auth recovers from 503 to 200; www accepts the synthetic-cookie
origin probe and foreign origin returns 403. Apex-to-www redirect **PASS**.
Localhost stays unchanged; unpushed source was not published. Hosted signup/reset
and actual email delivery **NOT RUN**; overall readiness **PARTIAL**.

Latest branded email templates — 2026-10-19:
[Responsive emails](email-templates.md) **PASS (local template scope)**. Shared
HTML/plain-text layout includes Jamloom logo, website palette, footer, safe action
buttons and fallback links for every app email. Verification/reset callbacks are
wired; 13 site tests, 54 Chromium/WebKit layout cases, build, typecheck and secret
audit pass. Actual inbox-client rendering and provider delivery remain **NOT RUN**;
overall email readiness **PARTIAL**. No emails sent or deployment changed.

Latest email configuration — 2026-10-19:
[Resend setup](resend-setup.md) **PARTIAL** overall. Sending key present; owner
confirms domain Verified. Account emails now use `hello@jamloom.com` with
Reply-To `support@jamloom.com`, matching the owner's receiving-mailbox policy.
Eleven unit tests, production build, typecheck and client-secret audit pass.
API domain inspection is restricted by the send-only key;
actual sends, inbox/reply delivery and hosted signup/reset remain **NOT RUN**.
Local outbox behavior remains unchanged; no emails were sent.

Latest R2 setup — 2026-10-19 local / 2026-10-20 UTC:
[Live private storage](r2-live.md) **PASS (bucket/provider scope)**. Production
CORS and uploads-only lifecycle applied and read back; public access remains
disabled. Ten live checks pass, including signed header/expiry enforcement,
byte-exact transfer, Chromium/WebKit CORS and audio decoding, retention headers,
and test-object deletion. Ten unit tests, build, typecheck and client-secret audit
pass. Actual age-triggered expiry, hosted reconciliation, complete authenticated
production workflow and Resend remain **NOT RUN**; overall production **PARTIAL**.
No database, deployment or app enablement changes. Initial assertion failure and
its correction are retained in the report.

Latest production domain preparation — 2026-10-19:
[jamloom.com and private R2 setup](production-domain.md) **PASS (local configuration)**:
production template targets `https://jamloom.com` and `jamloom-audio`; exact-origin
dashboard CORS and least-privilege credential instructions are prepared. Ten site
tests, production build, typecheck and bundle audit pass. Live domain deployment,
R2 access/CORS/lifecycle/cleanup and Resend delivery remain **NOT RUN**; production
readiness **PARTIAL**. Local settings, recordings and master remain unchanged.

Latest product rename — 2026-10-19: **Jamloom** is the official product name.
See [rename scope and validation](jamloom-rename.md). Historical evidence below
retains its original names, paths, receipts and observations; it is not fresh
validation of the renamed build. Use the current README for build commands.

Latest manual deck start repair — 2026-10-19:
[Metadata readiness](media-readiness.md) **PASS (bounded start ordering)**:
Play waits for the actual deck metadata before asking the native decoder to play;
the existing deadline, cancellation and progress checks remain. Three new unit
regressions fail against the old helper and pass with the fix. The report records
browser/build/PCM gates and all intermediate failures. Broader Linux WebKit
transport reliability stays **PARTIAL** after an intermittent cue mismatch and
2 GiB container OOM failures; a larger functional-test container does not qualify
that smaller memory budget. Physical audio, listening, production and hosted
service gates remain open. Master, engine and source recordings are unchanged.

Latest local product increment — 2026-10-19:
[Save and reuse performances](saved-mixes.md) connects generated C to the existing
browser library and loads verified saved mixes into A/B. Explicit local saving,
quota recovery, duplicate prevention, permissions, integrity checks and shared
Voice studio deletion are covered. Offline fragment navigation and WebKit select
clipping are repaired. R2 and Resend remain deferred at the owner's request;
cloud synchronization, full session recall and production/listening gates remain
open. See the report for exact PASS/PARTIAL/FAIL/NOT RUN receipts, including the
unresolved Linux WebKit manual-deck check. The master and source recordings are
unchanged.

Latest deployment-build repair — 2026-10-19:
[Clean website build](vercel-clean-build.md) **PASS (local build scope)**.
Fresh Amazon Linux 2023 x86_64 and Mac source builds compile both WASM engines
before auditing/copying them. Missing SDK/CMake/Python are isolated locally.
Seven site unit tests per platform and bundle audits pass; seven browser render
WAVs/plans/event frames match exactly, PCM differences zero. Initial failures
and fixes are retained in the report; CI regression job added. Actual Vercel
redeployment and remote CI **NOT RUN**; overall production remains **PARTIAL**.

Latest Neon setup — 2026-10-19:
[Neon setup and evidence](neon-setup.md) **PASS (Postgres scope)** under the owner's
explicit init/deploy authorization for the existing production branch. Five
migrations rehearsed then applied; build, seven unit tests, typecheck, secret
bundle audit and nine Chromium checks pass. Real browser registration,
verification, sign-in, isolated library reads and sign-out use Neon. Test records
and rehearsal branch removed; initial rate-limit cleanup failure and repair
retained. Local email outbox is used: Resend/R2/Vercel deployment **NOT RUN**.
Website remains at http://localhost:3000; previous local DB/audio retained.
Overall production **PARTIAL**; master, audio and quality gates unchanged.

**Current authorization — 2026-10-18:** The owner's latest “continue with the
spec, finish everything” supersedes the earlier console-only increment and
M0a review stop for remaining local implementation. Continue the browser musical
improviser and available specification work without per-step approval; preserve
local changes, recordings, evidence and the immutable master. The
[prepared A + C session](prepared-session.md) connects the local phrase director to the mixer.
Human quality, actual hardware/venue evidence and M1 prerequisites for production
learned AI remain required. Phone and hosted-infrastructure work remain paused;
new paid compute, publication and monetization still need explicit authorization.


Latest bounded audio wake-up — 2026-10-19:
[Audio resume recovery](audio-resume.md) **PASS (recovery scope)**: all five
production resume sites have a ten-second deadline; late failures cannot release
newer notes. Mac/Linux each pass 41 unit checks. Mac Chromium/WebKit and Linux
Chromium pass 46 studio checks each. Linux WebKit passes the new recovery checks
but its complete studio gate is **FAIL**: valid reload rejection, then a fresh-run
browser crash. Precise cause remains **PARTIAL**. Mac and Linux Chromium prepared
sessions pass 29 checks each; Linux WebKit is **PARTIAL**, with 28 PASS and two
capture checks **NOT RUN**. All 44 offline WAVs are byte-identical; recorded event
frames match baselines (fractional echo targets within 0.474 sample frame).
Physical latency, venue and new listening **NOT RUN**; specification/production
**PARTIAL**. Master, recordings and shared engine preserved; local copies updated
and isolated Linux containers/VM stopped. See report for retained setup failures.

Previous local-file playback repair — 2026-10-19:
[Preload, routing and transport transitions](media-preload.md) **PASS (bounded
technical scope)**: connect before loading, use metadata preload, coalesce pitch
changes after pause and fade the native input to prevent post-pause effect refill.
All four Mac/Linux Chromium/WebKit runs pass 43 studio checks; 38 unit checks per
platform pass. Mac prepared A/C sessions pass 29 checks in each browser after
isolating the missing-recorder test context; failed setup runs are retained.
All 34 offline WAVs are byte-identical; echo frames and prepared timing agree
exactly, with no missing signal frames in the measured A/C sessions. Linux WebKit completes 60 strict restart cycles and 45 local-file
active-rate cycles. HTTP active-rate control remains **FAIL**; precise native
cause and historical screenshot-freeze repeatability **PARTIAL**. Physical
latency, venue and new listening **NOT RUN**. Overall specification/production
**PARTIAL**. Master, recordings and shared engine unchanged; local bundles
refreshed and isolated Linux services stopped afterward.

Previous browser playback reliability — 2026-10-19:
[Bounded manual starts and native-media restart diagnostics](media-restart.md)
**PASS (recovery scope)**: stuck/never-resolving starts report failure and restore
controls; cancellation and late-result handling preserve newer playback and the
other deck. Mac Chromium/WebKit and Linux Chromium each pass 42 studio checks;
Mac/Linux each pass 34 unit tests. All 24 WAVs are unchanged and measured echo
frames agree exactly. Linux WebKit startup/restart remains **FAIL**, reproduced
outside Djayvo in a fresh container without memory-limit events; precise cause
**PARTIAL**. Rejected restart workarounds and initial harness/test failures are
retained. Physical latency, venue and new human listening **NOT RUN**. Master,
recordings and DSP unchanged; local bundles refreshed and Linux services stopped.

Previous shared-engine optimization — 2026-10-19:
[Precomputed common interpolation coefficients](interpolation-table.md) **PASS
(technical)**: empty-cache sampled-note setup avoids the common filter calculation.
Mac/Linux 15/15 suites, sanitizer, exact coefficients, 75 unchanged WAVs per
platform, 1,170 old/new WASM note cases, 11 remix comparisons and four browser
captures pass. All compared PCM and event frames agree exactly. Native load
has no observed deadline misses this run; three browser timing screens still
**FAIL** (3–10 ms). Overall live/production readiness **PARTIAL**; physical latency,
venue and musical quality **NOT RUN**. Master and recordings preserved; local
bundles refreshed and isolated Linux services stopped.

Previous shared-engine optimization — 2026-10-19:
[Reuse unchanged interpolation coefficients](interpolation-cache.md) **PASS
(technical)**: sampled voices reuse only an exactly matching cutoff table,
reset all note state and recompute on change. Mac/Linux 15/15 suites, sanitizer,
756 regression cases, exact before/after voice samples, 75 unchanged WAVs per
platform, 11 remix WASM comparisons and four actual browser captures pass.
Repeated note setup improves; total stress throughput is similar and cold starts
still compute coefficients. Browser timing screens **FAIL** (3–8 ms readings);
precise deadline/outlier cause and production remain **PARTIAL**. Physical
latency, venue and new listening **NOT RUN**. Updated local bundles audited;
master/recordings preserved; Linux test services stopped afterward.

Previous browser audio-host evidence — 2026-10-19:
[Production instrument AudioWorklet](worklet-load.md) **PASS (functional scope)**:
sixty-second Mac/Linux Chromium and WebKit runs, exact native reference PCM,
all 1,920 command frames, zero captured sample/timestamp gaps. Six captures,
playable excerpts and 30 Mac / 4 Linux unit checks retained. Coarse timing
screens **FAIL** (3–13 ms readings versus 2.667 ms); precise deadline/cause
**PARTIAL**. Chromium underrun snapshots report zero; WebKit API **NOT RUN**.
Physical latency, full-session/venue and new listening **NOT RUN**. DJ14/DJ17,
M1 and production remain open. Engine/master/recordings unchanged; isolated
Linux container removed, VM stopped and default Docker context preserved.

Previous actual audio-host evidence — 2026-10-19:
[macOS output callback](audio-callback.md) **PASS (bounded technical scope)**:
60 real seconds on the M5's DisplayPort output route, 5,625 callbacks at 512
frames/48 kHz, exact offline PCM and command-frame agreement, no sample-time
gaps or counted C++ allocations. Longest measured callback 4.262 ms against
10.667 ms. Self-tests, sanitizer and focused live suite pass. Prior 128-frame
benchmark failures remain **FAIL**; cause and full live readiness **PARTIAL**.
Browser AudioWorklet, acoustic loopback, microphone latency, venue endurance
and new listening **NOT RUN**. Engine, recordings and master unchanged.

Previous local timing evidence — 2026-10-19:
[Live instrument load and deadlines](live-deadline.md): **PASS** for 600 virtual
seconds per run, 32 simultaneous voices, 60 identical programs, exact Mac/Linux/
WASM PCM and command frames, native allocation checks and focused live tests.
**FAIL** for the strict offline no-overrun gate: initial Mac, first Linux and
Node WASM runs exceed 2.667 ms; clean reruns do not erase those observations.
Cause **PARTIAL**; actual browser AudioWorklet, physical latency, venue endurance
and musical benefit **NOT RUN**. Production remains **PARTIAL**. This adds
reproducible diagnostics and playable instrument output; production engine,
recordings, training candidates and master remain unchanged.

Latest renderer improvement — 2026-10-19:
[Bounded active vocal processing](active-vocals.md) **PASS (technical)**:
keep at most 16 active triggers, expire at measured frame boundaries and preserve
summation order. Mac/Linux suites, sanitizer, 75 byte-identical old/new/cross-OS
WAVs and 11 WASM comparisons pass. Dense/echo plans and 129-event scheduling
regression validate full-pool reuse, original output and allocation-free processing.
Dense/echo offline renders improve by 2.16–2.39× on M5 and 1.90–2.14× on Linux;
sparse medians are slightly slower (2.9%/1.0%), so no general speedup is claimed. Live/device
latency and new musical quality **NOT RUN**; full production remains **PARTIAL**.
No new training, rental, upload or change to the listening comparisons.


Previous shared-engine fix — 2026-10-19:
[Offset-resistant vocal pause detection](chop-offset.md) **PASS (technical)**:
48 controls, actual Mac/Linux 15/15 suites, sanitizer, 107 exact cross-OS WAVs,
17 WASM comparisons and 11 saved-score replays. All 65 original owner/fixture
WAVs remain identical. Source PCM and waveform edge selection are preserved.
One of 20 licensed speech inputs changes crops; fresh club comparisons exist,
but new word-boundary accuracy and musical preference are **NOT RUN**. Frozen
study and prior reviews intact; local web engine rebuilt/audited. Overall
quality/production **PARTIAL**; no model training, upload or paid compute.


Previous shared-engine fix — 2026-10-19:
[Sustained-note period selection](pitch-period.md) **PASS (technical)**: later
period multiples no longer win merely by fitting the integer sample grid.
180 known-tone combinations, Mac/Linux suites, sanitizer, 74 exact cross-OS WAVs,
six saved-score replays and 12 WASM comparisons pass. All 65 original owner/
fixture WAVs stay identical. Four of 20 licensed speech inputs select a different
tonic; fresh comparisons exist, but speech F0 accuracy and musical preference
are **NOT RUN**. Frozen study and pending reviews preserved; rebuilt local web
engine; no model training or paid compute. Overall quality/production **PARTIAL**.


Latest local musical experiment — 2026-10-19:
[Phrase articulation candidate](phrase-articulation.md) **PASS (technical)**:
five tests, four controlled pairs, eight Mac/Linux plan imports, 40 exact WAVs,
unchanged voice/bass/drum stems and note attacks, 16 matched HTTP-decoded review
files. Listen at `http://127.0.0.1:4196/review/`, including piano-only versions.
Piano durations follow phrase spacing; no new learned behavior or quality claim.
**NOT RUN:** human preference, candidate browser/device checks and promotion.
Default engine, sources and previous reviews preserved; no paid compute. C13 and
broader musical quality remain **PARTIAL**. No further preferences were inferred.


Previous shared-engine fix — 2026-10-19:
[Offset-resistant phrase analysis](analysis-offset.md) **PASS (technical)**.
Remove constant electrical offset from analysis only, retaining original PCM,
raw levels and gain rules. The control recovers 15 source attacks instead of
six distorted detections. Mac/Linux 15/15 suites, ASan/UBSan, 70 exact cross-OS
WAVs, six saved-score replays and 12 native/WASM comparisons pass; 65 original-
input WAVs remain unchanged. Rebuilt/audited local web engine. **NOT RUN:** new
human quality, physical microphone and rendered-browser interaction. Overall
music/production **PARTIAL**; no new rental, training or quality-gate promotion.
[Full measurements](evidence/analysis-offset/measurements.json).


Previous local training follow-up — 2026-10-19:
[Adapter effect and split audit](style-adapter-effect.md) **PASS (technical)**:
five tests, 16 matched-checkpoint comparisons, 64 train/holdout pairs, exact
agreement with prior diagnostic results, four playable reference crops and
preserved originals/models. Blood Club bass/funk remain strongly correlated
with the matched base. Two waveform windows cross the train/holdout split;
independent source-group split **FAIL**. Perceptual interpretation **PARTIAL**;
independent generalization, human preference and musical improvement **NOT RUN**.
No new training, rental, upload or production change.


Latest training execution — 2026-10-19: [Blood Club GPU trial](blood-training-run.md)
**PASS (technical)**: 16 clips, verified 80/160-step adapters, 13 retrieved WAVs,
exact base repeat, 38 local regression tests and confirmed rental/key cleanup.
Fixed decimal checkpoint-name loading and resumed without retraining or another
rental. Four matched A/B/C groups: `http://127.0.0.1:4195/review/`. No strong
training-waveform matches; repeated passages remain. Dataset/pairing and novelty
**PARTIAL**; independent generalization, human preference and production release
**NOT RUN**. No checkpoint promoted. Observed debit $0.124824; final billing
**PARTIAL**. Originals, master, previous adapter and C++ engine preserved.


Prior contour experiment — 2026-10-19: the owner deferred streaming-library integration
and prioritized musical intelligence and training quality. [Source-contour
research](source-contour.md) produced four matched pairs and passed Mac/Linux/
WASM technical checks. Owner response: **“No clear difference.”** Audible-benefit
promotion **FAIL**; owner listening **PARTIAL**. The candidate patch and audio
are retained as research; the original engine and local studio were restored.
That contour experiment did not train a model or use paid compute. Its formal
quality remained **NOT RUN**. The later Blood Club run above adds style-training
evidence; paired source/response data and independent evaluation remain missing.


Latest local validation: [Linux browser portability and recording fallback](linux-browser.md).
**PASS (technical):** Linux ARM64 Chromium prepared session (29 checks), WebKit
imported-phrase/playback/offline paths (28 checks), explicit unavailable-recording
UI on both studios, and native Mac Chromium/WebKit capability controls.
**PASS:** Chromium manual decks (40 checks); 22 exact Mac/Linux piano WAV
comparisons and matching event frames.
**FAIL:** Linux WebKit manual startup/repeat; software-sink diagnostics still fail.
Two focused restart candidates failed and were not applied.
**PARTIAL:** Linux WebKit session overall: its build lacks MediaRecorder; two
capture checks are **NOT RUN**. DJ14/DJ17 reliability and full specification remain
**PARTIAL**. Physical Intel Linux, microphone/MIDI, latency, venue and formal
listening evidence remain **NOT RUN**.

Previous local implementation: [Cancellable prepared playback](start-cancellation.md).
**PASS (technical):** visible pending A/C starts, usable Stop during resume,
protected retries and pending-preview consent cleanup; 26 unit / 56 final session
checks, integrated/offline browser flows, exact event frames and ten unchanged
piano WAVs. Fifteen further WebKit manual-loop sequences pass.
**PARTIAL:** original intermittent startup/loop failures (DJ17/DJ14) remain
unexplained; full specification. **NOT RUN:** new native/Linux browser, physical
latency, formal listening and venue readiness.

Previous local implementation: [Rhythmic C echoes and reset timing](beat-echo.md).
**PASS (technical):** tempo subdivisions, manual/MIDI restoration, requested delay
retention after mid-ramp clearing; 26 unit, 80 DJ and 50 session checks, integrated/
offline controls and playable WAVs. Independent PCM counter replaces unreliable
timestamp-only dropout inference; original failures and calibration retained.
**PARTIAL:** startup repeatability (DJ17), manual loop reliability (DJ14) and full
studio. **NOT RUN:** formal listening, physical timing and venue readiness.

Previous local implementation: [Performance C tone and echo](performance-effects.md).
**PASS (technical):** C preview/bar-entry effects, three additional MIDI Learn
controls, cleared voice echoes and accurate preview-stop status; 80 DJ/46 session
and 24 unit checks, integrated/offline audio and playable PCM comparisons.
**PARTIAL:** full studio and unexplained WebKit manual-loop timeout (DJ14), despite
15 additional passing cue/jog/rate sequences and two full passing WebKit runs.
**NOT RUN:** physical MIDI/microphone/latency, Linux browser, formal listening and venue.

Previous local implementation: [MIDI Learn](midi-learn.md).
**PASS (technical):** 23 bounded CC targets with pickup, manual rearm and safe
input lifecycle; 80 final DJ/38 session checks, 24 unit checks and integrated/
offline audio evidence. **PARTIAL:** studio and intermittent WebKit whole-track
loop reliability (DJ14); failed receipt retained despite successful final/isolated
reruns. **NOT RUN:** physical MIDI, latency, Linux browser, formal listening and venue.

Previous local implementation: [Deck tone and echo](deck-effects.md).
**PASS (technical):** independent A/B controls including prepared A, mute-safe
routing and cleared delay buffers; 70 DJ/38 session browser checks, 23 unit checks,
exact echo frames, playable WAVs and offline/integrated desktop/mobile evidence.
**PARTIAL:** full studio. **NOT RUN:** new native/Linux browser execution,
physical latency, formal listening and venue endurance.

Previous local implementation: [Major/minor prepared performances](session-modes.md).
**PASS (technical):** 288 context plans, actual Mac/Linux tests, eight exact
Mac/Linux/WASM event/PCM comparisons, unchanged historical minor outputs and
major-mode browser generation with safe context changes. **PARTIAL:** full live
studio. **NOT RUN:** new formal listening, physical timing and venue readiness.

Previous local implementation: [MIDI instrument input](midi-input.md).
**PASS (technical):** opt-in input selection, velocity, channel sustain and drum
mapping, safe switching/disconnect/permission races, real worklet output and
cached operation. Chromium/WebKit synthetic-port and integrated-site evidence
is retained in the report. **PARTIAL:** DJ06 and full studio. **NOT RUN:** physical
MIDI controllers, round-trip latency, Linux browser and musical-quality acceptance.

Previous local implementation: [Prepared A + C session](prepared-session.md).
**PASS:** context-bound C++ phrase responses, absolute bar scheduling, prepared
Deck A playback plus C preview/entry/fader/stop, opt-in capture/import, cancellation
and local failure handling. Reproducible native/browser/offline evidence is in the
linked report. **PARTIAL:** full live/production studio. **NOT RUN:** formal
listening, physical microphone/output latency and venue endurance for this path.

For completed development, open tasks and future milestones, use the
[development tracker](../TODO.md). This file retains the detailed evidence record.

Recorded 2026-10-17, America/New_York. The owner authorized continuing without
per-step approval, then requested a Mac handoff after finishing Linux work. The
master specification is unchanged. The original M0a record is
[m0a-report.md](m0a-report.md), with its initial Git commit `02d0e18`.

**Current Apple M5 and Linux arm64 technical checks: PASS. Overall M0: PARTIAL.**

Previous local implementation: [Talk bass and extra percussion](talk-bass.md).
**PASS:** original shared-core formant bass, four new pads, local pipe-reference
measurements, Mac/Linux 15/15 suites each, sanitizer, PCM agreement, 48 DJ browser
checks, 19 unit and 40 voice regressions. Playable demos retained locally.
Exact artist rig identification **PARTIAL**; reference listening, musical quality,
physical latency and venue readiness **NOT RUN**. Full studio remains **PARTIAL**.

Previous local follow-up: [Instrument tone and echo](instrument-effects.md).
**PASS:** real tone/echo controls, 46 two-browser DJ checks, 19 unit checks,
40 voice regressions, playable dry/echo piano WAVs, offline reload and integrated
site verification. Browser timing/waveform measurements are retained; native
and Linux browser execution this increment are **NOT RUN**. Full workflow remains
**PARTIAL**; musical quality, hardware latency and venue acceptance **NOT RUN**.

Previous local implementation: [Performance console and live instruments](dj-console.md).
**PASS:** 88 piano keys, nine melodic patches/two drum kits, real deck transport,
EQ, pitch/cue/loop and instrument controls; native Mac/Linux and WASM comparison
with identical PCM; playable palette retained locally. **PARTIAL:** full DJ/AI
workflow and live timing. **NOT RUN:** human reference-quality acceptance,
physical latency, Linux browser, venue endurance and production release.
The master, supplied speech fixture, owner source and x/y/z originals are unchanged.

Historical local follow-up: [Waveform diagnostics](style-waveform-diagnostics.md).
**PASS:** calibrated training-excerpt scan (40 pairs; no flags), repetition and
two-seed measurements, three tests and preserved artifacts. Sixteen repeated
windows occur in the second bass seed across base/adapter; musical significance
is unassessed. Copying/variety assessment **PARTIAL**; human quality, independent
holdout and production **NOT RUN**. Owner “continue” is not a listening rating.
No new rental or model promotion; concealed review unchanged.

Latest model research, 2026-10-18: [Completed adapter trial](style-training-retry.md).
**PASS:** owner-approved replacement GPU, corrected decode headroom, five selected
clips preprocessed, 250 optimizer steps, finite/nonzero adapter, nine retrieved
WAVs, exact base repeat, four changed level-matched pairs, two-browser playback
and rental/key cleanup. Review: http://127.0.0.1:4193/review/ . Observed combined
cost $0.193221; final billing **PARTIAL**. **PARTIAL:** provisional dataset/content
readiness; automatic detailed labels were inconsistent and discarded. **NOT RUN:**
human quality, independent holdout, learned source-response
behavior and production advancement. C07/full specification remain **PARTIAL**.
Master, original references, initial candidates, supplied fixture and owner voice
are preserved; z and owner microphone audio stayed local. Initial host SSH
**FAIL** and recovered training path errors remain in the evidence.

Latest engine work, 2026-10-18: [Source phrase development](source-motif.md).
Call & Response preserves chronological source rhythm/energy accents in two-bar
answers and develops the return, leaving more vocal space. **PASS:** M5/Linux
14/14 release suites each, 65 exact cross-OS WAVs, 21 native/WASM comparisons,
five old-score replays, seven unchanged styles and two-browser review playback.
Four private matched pairs: http://127.0.0.1:4192/review/ . Owner reports After
feels “More connected” (**PARTIAL** informal listening); formal/reference quality
**NOT RUN**, C06/full specification **PARTIAL**. Sanitizer details remain
in the linked report. Master, existing recordings and frozen cohort preserved.

Latest owner reference research, 2026-10-18: [x/y/z analysis](reference-xyz-analysis.md).
Full-file signal measurements, four CLI safeguards and three exact measurement
reruns **PASS**. Direct listening **NOT RUN**. The owner's requested direction
is to develop the source phrase into an original composition; current finite
grooves/forms and limited onset motifs leave that goal **PARTIAL**. Report maps
the planner gaps and next source-led development checks. No engine, frozen cohort,
source recording or master specification changed; no new musical-quality claim.

Latest local evaluation workflow, 2026-10-18: [Blinded listening form](listening-review.md).
Verified packet copies now include a private browser questionnaire with blank
judgments and two compatible CSV downloads. **PASS:** 21 packaging checks, 2/2
affected CTest suites, ten synthetic browser workflow checks and real licensed
packet play/seek in Chromium/WebKit. Five audio copies are byte-identical; all
483 frozen form rows remain blank. Actual observations, M1 and musical quality
**NOT RUN**; full specification **PARTIAL**. Local ready page: http://127.0.0.1:4191.

Latest local lifecycle fixes, 2026-10-18: [Catalogue recovery](catalogue-withdrawal.md).
Unavailable playlist entries are removable without exposing former metadata;
withdrawn reports stay archived; new reports invalidate stale decisions; reviews
resolve only their displayed ten concerns. **PASS:** 33 unit/integration checks,
22 catalogue browser checks, 20 account regression checks, build/types/bundle.
No DSP/audio changes. Live providers, human listening and phone **NOT RUN**;
W11/full specification **PARTIAL**. Test content remains synthetic and local.

Latest local maintenance, 2026-10-18: [Expired-auth cleanup](auth-cleanup.md).
Target-guarded batches remove expired sessions/verification records, skip locked
rows and preserve active accounts. Migration 0005 adds expiry indexes. **PASS:**
29 unit/integration checks, build/types, local migration and guarded execution;
local database is 8,821,783 bytes with no user accounts or saved tracks after
fixture cleanup. **NOT RUN:** hosted scheduling/provider capacity and cost proof.
W09/full specification remain **PARTIAL**.

Latest local web implementation, 2026-10-18: [Reviewed catalogue and playlists](reviewed-catalogue.md).
Separate publication consent, revision-bound independent review, search/filtering,
track pages, persistent player, private playlists and report/withdrawal controls
are implemented locally. **PASS:** 28 unit/integration checks, 16 catalogue browser
checks plus 20 account regression flows, build/types/bundle checks. Public WAVs
match uploaded bytes exactly. **NOT RUN:** actual permission/quality reviews,
live provider/publication and moderation operations. W11/full spec **PARTIAL**.
Synthetic test approvals were removed; no owner recording was published.

Previous local web implementation, 2026-10-18: [Private account audio](private-account-audio.md).
Explicit private saves, validated metadata-free WAVs, quotas, playback/download,
removal and retryable cleanup now exist. **PASS:** 20 unit/integration checks,
Node 22 build, Chromium/WebKit ten flows each, byte-identical stored/downloaded
mixes and unchanged studio bundle. Live R2/Neon/Resend, cleanup scheduling and
new listening **NOT RUN**; W10 and full specification **PARTIAL**. Hosted services
and phone work remain paused; only the isolated local database/files were changed.

Latest local research validation, 2026-10-18: [Research input validation](research-input-validation.md).
Optional speech/voice tools now reject constant offsets; the speech worker also
rejects empty/short decoded buffers before inference. **PASS:** 11 unit tests,
existing crop integration, all 42 existing comparison WAVs and six event plans
unchanged (maximum/RMS difference zero), and identical M5 owner/fixture speech
estimates. New Linux/device execution and listening **NOT RUN**; earlier model
platform agreement remains **FAIL**. Full specification **PARTIAL**.

Latest engine validation, 2026-10-18: [Constant-offset input rejection](dc-input-validation.md).
The silence gate now rejects constant electrical offsets and subthreshold
variation without altering source samples or accepted arrangements. **PASS:**
M5/Linux 13/13, 12 rejected controls on each, 16 exact before/after and cross-OS
WAVs, 23 unchanged frozen cohort outputs, seven exact Chromium/native renders
and 59 browser workflow checks. Final M5 ASan/UBSan affected suites: **PASS**,
3/3 in 200.55 seconds. **Human listening NOT RUN; full specification PARTIAL.**

Latest web continuation, 2026-10-18: [Optional web installation](web-installation.md).
Relative manifest identity/scope, original icons and a user-triggered installation
flow now work at the root and `/studio/`. **PASS:** 38 offline/manifest checks,
20 Chromium workflow checks, 14 unit tests and public/site bundle audits.
**NOT RUN:** physical OS installation/launch, microphone, new listening and
release. Full specification **PARTIAL**; music engine and protected audio unchanged.

Previous web continuation, 2026-10-18: [Optional offline studio](offline-studio.md).
Explicit offline storage now verifies a bounded public bundle; account/API/audio
requests stay outside the cache. Corrupt installation/update, waiting activation,
cache bounds and removal preserve saved mixes. **PASS:** 32 offline checks across
root/site scopes, 56 ordinary browser checks, 12 unit tests and public bundle
audits. WebKit resource cleanup now detaches players before revoking audio URLs.
**NOT RUN:** physical microphone, home-screen installation, human listening and
release. Full specification: **PARTIAL**; C++/WASM unchanged.

Previous web continuation, 2026-10-18: [Browser recovery and Firefox validation](web-recovery.md).
Malformed stored entries no longer hide healthy mixes; damaged data is retained
until explicit deletion. **PASS:** ten JavaScript tests, 20 Chromium / 18 WebKit /
18 Firefox workflow checks, all seven Firefox/native WAVs and event frames exact
(max/RMS error zero), rebuilt public bundles and privacy audits. Browser selection
now rejects unknown engines and retains each run in a fresh folder. **NOT RUN:**
physical browser microphone and human listening. Full specification: **PARTIAL**.

Previous evaluation continuation, 2026-10-18: [Licensed multi-source evaluation](licensed-evaluation.md).
Twenty distinct public-license speech speakers, three public-domain non-speech
recordings and a separate synthetic silence control are acquired with hashes
and attribution. The wider test found rejection of energetic short transients;
commit `6912218` adds bounded context without changing ordinary speech decisions.
M5/Linux 13-suite release checks and seven-direction browser/native comparisons
**PASS**. The corrected cohort has 276 mixes and 69 blank blinded packets, 69/69 accepted
attempts per style, plus three expected synthetic-silence rejections. All 92
first-seed M5/Linux mixes/events agree exactly (max/RMS PCM error 0); retained
before-fix counts were 66/69 per style. Full M5 ASan/UBSan **PASS**, 13/13 (633.11 s); actual Mac smoke 13/13
(44.99 s). Summary-tool tests pass on M5/Linux; all 483 real packet form rows are
blank and ignored. Independent listening, word-boundary accuracy and formal M1 remain
**NOT RUN**; production/full specification remain **PARTIAL**.

Previous effects/analysis continuation, 2026-10-18: [Reverb](feedback-reverb.md) and
[optional word timing](word-timing.md). **PASS:** M5/Linux current release 13/13,
actual Mac smoke, 91 exact cross-platform WAVs/events, unchanged default/vocal
controls and browser playback. **PASS:** M5 ASan/UBSan 12/12 (480.40 s; snapshot
before the Python word-timing suite). CPU speech analysis runs locally on M5
and Linux; owner frame boundaries agree, but synthetic model estimates differ
(**FAIL** exact model agreement). Crop proposals preserve clean hooks and timing.
**NOT RUN:** timing accuracy and human listening. **PARTIAL:** production/full
specification. New tools and model are optional local research, not bundled.

Previous instrument continuation, 2026-10-18: [Sustained instruments and broader arrangement variety](sustained-instruments.md).
Original organ/pad/lead voices, versioned plans/import/stems, accurate bank reports
and wider reggae/experimental/club harmony/groove are implemented. **M5 release
and actual smoke, Linux release, 93 exact cross-platform WAVs, 42 exact saved-score
replay WAVs and seven-style browser agreement: PASS.** Full M5 ASan/UBSan: **PASS**,
12/12 suites (531.68 s), with final band-edge core/provenance rechecks. Eight matched private
before/after pairs retain full clean hooks. **Human listening: NOT RUN; production
and full specification: PARTIAL.** Existing recordings, fixture and master preserved.
No model, upload, rental, deployment or new phone execution.

Previous instrument continuation, 2026-10-18: [Recorded guitar and articulated strums](guitar.md).
78 pinned CC0 note recordings provide normal/staccato, two normal dynamics and
alternate takes; funk/hybrid now use alternating strums. Plans, strict import,
validation, stems, completion verification and bundled notices include guitar.
**M5/Linux release 11/11, 90 exact cross-OS WAVs, 30 unchanged other-style WAVs,
unchanged owner voice stems, seven-style WASM and full browser flow: PASS.**
Final M5 ASan/UBSan: **PASS**, 11/11 suites (461.89 s).
Eight matched before/after pairs are prepared. **Listening: NOT RUN; full spec:
PARTIAL.** At this checkpoint organ/pad/lead remained open; the continuation above implements them. Later effects/quality/release gates remain open.
No cloud use, reference-track sampling, model, deployment or phone execution.

Previous creative continuation, 2026-10-18: [Call-response, hybrid and repeat checking](creative-strategies.md).
Both new directions, strict plan replay and local web persistence are implemented.
**M5/Linux release 10/10, actual Mac smoke, 80 exact cross-OS WAVs, 30 preserved
legacy WAVs, seven styles in Node/Chromium/WebKit, seven web unit groups and full
UI/retry flows: PASS.** Final ASan/UBSan: **PASS**, 10/10 suites. Eight matched owner takes retain two clean hooks each.
**Listening: NOT RUN; specification/production quality: PARTIAL.** No upload,
model, phone work, paid resource or deployment. Details and first failed UI-test
attempt are retained in the linked report.

Previous composition continuation, 2026-10-18: [Funk and web integration](funk.md).
A distinct syncopated grammar now uses the existing sampled instruments, seed
variation and phrase-timed responses. CLI/C ABI, schemas, completion verification
and local web generation/save/reload/download support it. **M5/Linux release
10/10, 64-seed structural checks, 50 exact cross-OS WAVs, 25 unchanged legacy
WAVs/scores/events, six-style plan replay, five-style WASM and Chromium/WebKit
user flows: PASS.** Four matched owner mixes are ready; **new listening: NOT RUN;
full specification: PARTIAL.** Final M5 ASan/UBSan passes 10/10 suites.
No paid service, audio upload, device work, deployment or new assets.

Latest timeline continuation, 2026-10-18: [tempo maps and mix automation](timeline.md).
Native scheduling, voice/echo timing, stems, versioned export/import, schemas and
Python preparation now share the new timeline. **M5/Linux release 10/10, WASM
12 core groups plus four default styles, 90 invalid-plan cases, 40 exact cross-OS
WAVs, 25 unchanged legacy WAVs and Chromium/WebKit playback: PASS.**
Four private comparisons are ready. **Human listening: NOT RUN; E12 and full
specification: PARTIAL.** Default app arrangements are unchanged. No model, cloud
call, phone work or deployment. The current smoke reference is
`renders/arrangement-linux/timeline-20261018/fixture`. **Final M5 ASan/UBSan
10/10 and the actual Mac smoke script: PASS.**

Latest arrangement continuation, 2026-10-18: [hip-hop composition variety](hiphop-diversity.md).
The previous engine fails the new structural regression: seeds share one harmonic
cycle. The revised shared planner selects chord/rhythm/swing choices and develops
the return. **M5/Linux release 10/10, 64-seed structural audit, 45 identical cross-OS
WAVs, unchanged voice/other styles, old-score replay, four-style WASM agreement
and matched browser audition: PASS.** Final-source M5 ASan/UBSan also passes
10/10 suites. Four owner pairs are ready; **new listening: NOT RUN;
E13 and production quality: PARTIAL.** No learned director, cloud call, phone
work or publication. The immutable master, supplied fixture and owner source
remain unchanged. This phase used smoke reference
`renders/arrangement-linux/hiphop-diversity-20261018/fixture`.

Latest effect continuation, 2026-10-18: [selective tempo echo](vocal-echo.md).
Optional 1.2 plans add three fading stereo repeats to selected fragments, with
native clean-hook clearance, compiled voice limits and finite-tail checks.
**Mac/Linux release and M5 sanitizer 10/10 each, 70 invalid-plan cases, 25 exact cross-OS owner WAVs,
unchanged clean hooks, default WASM and Chromium/WebKit playback: PASS.**
Four private comparisons are ready. This is a finite repeat effect, not a
continuous feedback/reverb implementation or learned creative judgment.
**E04: PARTIAL; new human listening and production acceptance: NOT RUN.**
The master, supplied fixture and owner source are unchanged; no cloud call or
publication. Detailed sanitizer results and versions are in the linked evidence.

Latest engine continuation, 2026-10-18: [independent voice pitch and timing](voice-transforms.md).
Bounded 1.1 plans, offline cached transforms and four private owner comparisons
are implemented. **Four-rate technical tests, strict import/schema limits, exact
Mac/Linux event plans and 20 WAVs, unchanged clean hooks, default WASM regressions
and Chromium/WebKit playback: PASS.** A three-pulse probe retains attacks with
at most 4 ms displacement; it is not an intelligibility result. A reproduced
32-bit WASM resampling overflow is fixed. **E03: PARTIAL; human listening and
production acceptance: NOT RUN.** Default arrangements remain unchanged; no
model, cloud call, phone work or public deployment. Preserved inputs and versions
are recorded in the linked evidence.

Latest engineering continuation, 2026-10-18: [offline plan import and fallback](plan-import.md).
The CLI accepts bounded `1.0-remix` JSON with explicit caller consent and matching
source/request identity, native musical/sample limits and a limited tonal check.
Malformed plans fail by default; opt-in fallback records the decision and runs
the same rule planner. **Five-style exact round trip, 50 rejected candidates,
actual owner replay, M5/Linux release and M5 sanitizer tests (10/10 each), 20 identical cross-OS
WAVs and WASM regressions: PASS.** No model, cloud call, new quality result or
public deployment. Source freezing includes the new CLI header. M2 is **PARTIAL
for this offline prerequisite only**; model integration/benchmark stays **NOT RUN**
behind M1. [Full specification status](spec-status.md) explicitly records remaining
features as well as missing listening/device/release evidence.

Latest local research, 2026-10-18: [selective voice over GPU instrumentals](voice-research.md).
Owner reports the instrumentals are “getting better” and requests human voice
sometimes, with context-dependent creative choices. Six club/hip-hop arrangements
now combine the existing consented source with retrieved beds, leaving roughly
75–78% of their scheduled duration without voice events. Controls, stems and
matched instrumental-only playback accompany them. **Source fidelity, exact
event/WAV repeatability, six regression tests and Chromium/WebKit playback: PASS.**
This uses local energy/grid heuristics, not learned musical judgment. **Prior
GPU owner feedback: PARTIAL; new mix listening, beat alignment, word clarity and
formal quality: NOT RUN.** No new rental, cloud voice transfer, training or app
integration. Master/fixture/owner source hashes are unchanged. C03–C05 track
technical delivery and the remaining creative-quality work separately.

Latest separate model research, 2026-10-18: the owner-funded, $10-bounded
[Vast music trial](cloud-music-trial.md) ran ACE-Step 1.5 on one RTX 3090.
**GPU execution, ten 30-second outputs, verified retrieval, waveform checks and
rental cleanup: PASS.** Warm direct generation took 2.447–2.492 s; the two
planning-LM cases took 23.189/26.344 s. The same-seed repeat is byte-identical;
other seeds produce measured waveform differences, not proven musical variety.
Observed debit is about $0.09; final invoice reconciliation is **PARTIAL**.
**GPU owner listening: PARTIAL** (informal “getting better” feedback); **formal
listening, Stable Audio comparison, cloud speech processing, production
integration and M1/M2 advancement: NOT RUN.** Only original text briefs left
the machine; the master, supplied fixture, owner source and Mac ML environment
remain unchanged. C01/C02 in the tracker separate technical completion from
the outstanding human evaluation.

Latest web implementation, 2026-10-18: [accounts foundation](web-accounts.md)
adds the Next.js shell, Better Auth email/password, verification/reset via a
Resend adapter, generated auth migrations and owner-scoped private track metadata.
**Local build, Postgres lifecycle/security checks, Chromium/WebKit flows and
bundle audit: PASS. W09: PARTIAL. Live Neon/Resend, R2, catalogue and deployment:
NOT RUN.** Final tests run on Node 22 with a separate local Postgres cluster and
captured test email. The existing studio, DSP, supplied speech fixture, master
and owner's recordings are preserved. No new musical-quality claim.

Latest platform design, 2026-10-18: owner accepted Vercel, Better Auth, the Next.js
shell, R2 and private generation plus a reviewed public catalogue, then selected
Neon PostgreSQL Free with no paid database upgrade without approval.
[ADR 0002](decisions/0002-web-platform-auth-and-storage.md) records relational
records in Postgres and audio in R2, with explicit cloud save,
direct transfers, validated immutable assets and separate catalogue approval.
At the design checkpoint, implementation was NOT RUN; the local account slice
above supersedes that implementation status. **Architecture/technology selection:
PASS; hosted integrations, budget validation, provisioning and deployment: NOT RUN.**
Tasks W08–W11 track the remaining work.

Latest priority change, 2026-10-18: the owner requested the web version first
and paused further phone work. [Browser Instant Remix](web-instant-remix.md) now
implements local capture/import, trim, three takes/club, playback, regeneration,
atomic browser persistence, WAV download and confirmed deletion. The same engine
runs as WebAssembly in a worker. Chromium and WebKit generate all four styles with
exact native-Mac plan/event agreement and zero waveform differences. Automated
desktop/mobile flows pass; fake microphone automation is separate from physical
capture and listening. The supplied fixture, owner PCM and master hashes remain
unchanged. **Web technical checks: PASS. Overall web acceptance: PARTIAL.**
No public deployment, new quality cohort, learned AI or production-quality claim.

Latest continuation, 2026-10-18: [native iOS Instant Remix](ios-instant-remix.md).
The app adds consented capture/import, trim, worker rendering, three styles/club,
playback, regeneration, persistent favorites, WAV sharing and scoped deletion.
A confirmed mobile worker stack overflow is fixed without changing DSP: the
voice pool allocates once at construction. Current M5 release/sanitizer and Linux
arm64 suites pass 9/9 each; 15 WAVs and all compared plans/event frames are exact.
Simulator and physical iPhone/Mac comparisons also have three byte-identical
masters each, with exact plans/event frames and zero PCM error.
Six final integration tests passed on the actual iPhone 14 Pro, including exact
two-second decimal trim regressions. A ten-test simulator smoke and final
three-test UI rerun pass. A follow-up signed Release launch and physical home-screen
inspection pass. The owner confirms recording, generation and playback work;
normal app metadata shows three styles completed in 1.830 s. Earlier locked
launch and UI-automation initialization failures are retained. The iPad simulator
completed its generation/playback/save/relaunch/share flow. Physical UI automation
failed to enable in two attempts. Three optimized phone trials average 1.828 s
for all three styles with peak physical memory at most 55,953 kB. Exact attempts and evidence are
in the [iOS gate ledger](ios-instant-remix.md). **M3: PARTIAL.**
Formal M1/model/live/public-release gates remain open. The new owner phone smoke
recording is not part of the frozen formal evaluation cohort; a diverse cleared
cohort and independent listening panel are still missing.

Previous continuation, 2026-10-18: [club refinement v8](club-refinement.md).
The owner requested all three areas: bass/drums, transitions and vocal clarity.
The electronic bank and balance are revised, build/return accents changed, and
club selects longer pause-ended crops without near-duplicate overlap. Both full
voice statements remain. A confirmed stem-export bug is fixed: instrument takes
now match the master's event IDs. New four-style exports reconstruct within two
PCM16 steps when no limiting engages; previous three-style masters are unchanged.
Nine suites pass on M5 release/sanitizers and actual Linux arm64 (10 foundation +
15 remix groups). Current club and legacy fixture plans/event frames agree,
with byte-identical cross-OS WAVs. The private thirteen-player v7/v8 comparison
passes muted browser playback. No hearing or listener judgment is inferred.
**Bass/drum, transition and vocal listening: NOT RUN. Production quality: PARTIAL.**
See [current measurements](evidence/club-refinement/report.json).

Previous musical continuation: [original electronic club direction](club-direction.md).
The new explicit `club` strategy adds 14 original electronic one-shots, kick
ducking, a 140 BPM build/drop/break/return and three differently opened
36-second owner mixes. Nine suites pass on M5 release/sanitizers and Linux arm64
(10 foundation + 13 remix groups), with final metadata regressions also passing.
Four club masters/eight stems match byte-for-byte across OSes; plans/event frames
agree exactly. All 15 checked v4 owner WAVs remain unchanged. Both full voice
hooks match within 0.0000242 PCM error. Eight matched local players have passed
muted browser playback; this supplies no listening evidence.

**Club listening/reference similarity: NOT RUN. Production quality: PARTIAL.**
Master specification, supplied speech fixture and original recordings remain
unchanged. The v4 frozen pilot is historical; it does not evaluate club. See
[the current report](evidence/club-direction/report.json) and [tracker](../TODO.md).

Previous continuation: [reproducible evaluation preparation](evaluation-batch.md).
Eight suites pass on M5 release/sanitizers and Linux arm64. A frozen local pilot
contains one owner source × three styles × three seeds, three baselines and
three blind packets. Distinct block/answer IDs prevent different seeds from
reusing response codes. All nine candidate WAVs, plans and event frames match
retained v4 outputs exactly. No audio-engine algorithm changed.

The owner confirmed no additional consented clips are available. Dataset and
preregistration are **PARTIAL**; reviewer assignment, formal listening and M1
quality are **NOT RUN**. Permission remains owner-only. See the
[current preparation report](evidence/evaluation-preparation/report.json).

Previous engineering checkpoint:
The latest [workflow revision](workflow-hardening.md) adds cancellable exports
with completion hashes and collision protection, native extensible WAV import,
and one-command local M4A conversion/render/listening preparation. Seven suites
pass on M5 release/sanitizers and Linux arm64 (10 foundation + 12 remix groups).
Current plans/event frames match exactly; six masters and twelve fixture stems
are byte-identical. Fifteen owner WAVs also exactly preserve v4 audio. All 33
representative offline benchmark renders pass. CI configuration and local recipe
checks are **PASS**; hosted CI is **NOT RUN**. See the
[current report](evidence/workflow-hardening/report.json).

The owner replied “they are fine” to the specific v4 piano/drum comparison
question: **PASS** informal feedback received/accepted; production realism is
**PARTIAL**, and formal M1 evaluation is **NOT RUN**. There are no invented
per-style scores, timestamps or recognition observations. The new M4A session
page has three browser-tested players; its listening remains **NOT RUN**.

Previous musical checkpoint:
The latest [instrument articulation revision](instrument-articulation.md) adds
three recorded piano dynamics and two takes per piano pitch/drum hit: 53 pinned
CC0 recordings. M5 release/sanitizer and Linux release each pass 7/7 suites
(10 foundation + 11 remix groups). Fresh fixture/owner plans and event frames
match; six masters and twelve fixture stems are byte-identical across Linux/M5.
Nine voice mixes, twelve stems, a new baseline and a sixteen-file matched
comparison page are ready. At that checkpoint v4 listening was **NOT RUN**;
the subsequent owner feedback is recorded above. Instrument realism and
production quality remain **PARTIAL**. See the historical [v4 report](evidence/instrument-articulation/report.json).

The previous [vocal boundary revision](vocal-boundaries.md) adds sustained quiet
endings and attack pre-roll with a bounded fallback. Its code and all earlier
recordings remain preserved. V2 owner acceptance was provisional, not a formal
listening result for subsequent revisions.

The preceding [arrangement revision](arrangement-review.md) added breaks and
returns, nearby chord inversions, softer-note tone filtering, instrumental early
reflections and 80 ms vocal clearance. Its renders and evidence are preserved.

Earlier acoustic checkpoint (superseded technically by the revision above): M0b/M0c
code and three complete recordings exist. Both the supplied synthetic speech
and one owner-consented human recording now render successfully. Human-recording
listening is **PARTIAL**: the owner accepts it as a start but reports awkward
experimental passages and game-like timbres, and requests more varied openings.
Recognition ratings remain **NOT RUN**. See [voice-trial.md](voice-trial.md).
The new [acoustic revision](acoustic-review.md) replaces oscillator instruments
with cleared note recordings, lowers piano registers, simplifies experimental
motifs, and varies the opening. Native release and sanitizer CTest are **PASS**
(7/7 each). Listening to this revision and its Linux/Mac comparison are **NOT RUN**.
Actual Apple M5 execution is now **PASS**, with the local results in
[mac-portability.md](mac-portability.md). M1 evaluation tools and a pilot are ready, without
claiming human evidence. At that historical checkpoint no iPhone UI existed;
the current app is documented above. AI models, training and live mode remain absent.

| Gate | Status | Evidence |
| --- | --- | --- |
| Linux release build | PASS | Current aarch64 Debian 12 container, GCC 12.2; physical Intel rerun NOT RUN |
| C++ unit tests | PASS | Current Mac/Linux: 10 foundation + 17 remix test groups |
| C ABI | PASS | Compiled-C render, bounded errors, ABI and additive cancellation/retry checked |
| End-to-end tests | PASS | Current Mac/Linux: CTest 10/10 including both asset banks, evaluation preparation and plan import |
| ASan/UBSan | PASS | Current echo revision: ten suites, no findings |
| Evaluation preparation | PASS | Frozen actual one-source/three-seed pilot; nine unchanged candidate WAVs, distinct codes and blank ratings |
| Dataset/preregistration | PARTIAL | Owner has no additional clips; diverse cohort and reviewer assignments missing |
| Input decoding/bounds | PASS | PCM16/24/32, float32 and validated extensible variants; original owner WAV accepted; corruption/layout/precision/padding rejected |
| Safe export/cancellation | PASS | Complete marker/hashes, exclusive publication, rollback, real SIGINT/SIGKILL, existing files/symlinks and stale locks preserved |
| Local M4A workflow | PASS | Actual owner input converted locally; three mixes/twelve stems, provenance and browser page; source unchanged |
| Offline performance | PASS | 33 verified renders across 11 representative cases; [trials](evidence/workflow-hardening/benchmark.json) |
| CI preparation | PASS | Pinned four-job build matrix and local cross-OS control; no private audio uploaded |
| Hosted CI execution | NOT RUN | Workflow remains local; no hosted run/push |
| Resampling | PASS | Identity, duration, round trip, above-Nyquist rejection |
| Analysis controls | PASS | Energy, phrases, onsets, coarse tone pitch; not a speech-recognition claim |
| Clean hook preservation | PASS | Source waveform retained within gain/edge-fade/PCM tolerances |
| Source-driven arrangement | PASS | Changed input rhythm changes chops and melodic response |
| Three independent strategies | PASS | Different tempi, bass/drum/piano grammars and vocal treatment at the same seed |
| Crop/event validation | PASS | No out-of-source reads; clean hook, overlap, release, duration and numeric constraints |
| Master and stem output | PASS | Current v8: three 36-second owner mixes, four owner stems, fixture master/stems, score/frame trace/report |
| Audio bounds/headroom | PASS | Current club: 12 decoded master/stem WAVs; zero full-scale samples, finite engine output, silent final 100 ms |
| Determinism | PASS | 48 kHz speech remixes byte-identical at 512/113 blocks; 16 kHz integration repeats too |
| Formal export schemas | PASS | Preinstalled jsonschema 4.19.2 validates M0a/all remix exports; rejects recorded-kind without consent |
| Dependencies/assets | PASS | No third-party DSP runtime; 53 pinned CC0 acoustic recordings plus 14 original electronic one-shots; notices/hashes retained |
| Master specification | PASS | Original SHA-256 unchanged |
| Consented human recording technical render | PASS | One owner-supplied 4.862 s source; three masters and 12 stems decoded; [trial](voice-trial.md) |
| Human speech recognition by listeners | NOT RUN | No actual listener observations |
| Owner listening | PARTIAL | Earlier prototype accepted as a start; club v7/v8 listening NOT RUN; production quality remains open. Earlier concerns: awkward experimental passages, game-like timbres and repetitive openings |
| Revised vocal spacing on M5 | PASS | Release + sanitizer CTest 6/6; duplicate chop starts and clean-hook overlaps removed; `evidence/vocal-spacing/` |
| Revised arrangement Linux/Mac comparison | PASS | Prior v8 fixture/owner: 27 exact WAVs; current stack-fix rerun: 15 exact fixture WAVs, exact plans/events; actual phone/Mac: three exact masters |
| M0d Apple M5 execution | PASS | Native arm64 release and ASan/UBSan 6/6 each; exact plans/event frames and byte-identical Linux/Mac masters; [evidence](evidence/m0d/report.json) |
| M1 blinded quality gate | NOT RUN | Frozen one-owner pilot prepared; requires diverse cleared sources and actual blinded reviewers |
| M2 constrained director | PARTIAL | Offline import/fallback prerequisite PASS; quality baseline and model director benchmark NOT RUN; separate [pretrained trial](cloud-music-trial.md) has GPU timing/memory evidence |
| M3 iPhone/device | PARTIAL | Native app, simulator flows and six actual iPhone integration tests; current limitations in [iOS evidence](ios-instant-remix.md) |
| M4 live work | PARTIAL | [Research protocol](live-research-protocol.md) defined; implementation/real-time measurements NOT RUN |
| M5 production preparation | PARTIAL | [Privacy/release preparation](release-readiness.md); publication/monetization NOT RUN |

The first sanitizer pass exposed a test-harness allocation/deallocation mismatch:
the allocation counter replaced throwing `new` but omitted the nothrow form used
by `stable_sort`. Matching overloads fixed it; checks were not disabled. The
initial failing log is retained as `evidence/m0/sanitizer-initial-failure.log`.
Final [release](evidence/m0/release-tests.log) and
[sanitizer](evidence/m0/sanitizer-tests.log) logs supersede that run.

## Recordings and measurements

Original input: `renders/fixtures/synthetic-speech.wav`, generated from the original
project phrase, 3.21129 s at mono 22.05 kHz. It is explicitly **not a person’s
recording**. Input SHA-256:
`c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`.

| Master | BPM | Duration | Decoded sample peak | RMS L / R, dBFS |
| --- | --- | --- | --- | --- |
| `renders/m0/remix.hiphop.wav` | 96 | 32.000 s | -7.02432 dBFS | -25.98990 / -26.80066 |
| `renders/m0/remix.reggae.wav` | 80 | 32.000 s | -6.74673 dBFS | -26.00094 / -27.09516 |
| `renders/m0/remix.experimental.wav` | 124 | 32.96775 s | -7.05592 dBFS | -25.08490 / -25.64241 |

All are stereo PCM16 at 48 kHz, including two-second release space. None reaches
the master limiter’s knee. RMS includes the tail and is not integrated LUFS or
true peak. Full source is heard from the beginning, then cropped/arranged calls
and instrumental responses enter. Per strategy, `.piano.wav`, `.bass.wav`,
`.drums.wav`, and `.vocals.wav` share the exact timeline. Each also has
`.score.json`, `.events.tsv`, and `.report.json`.

`renders/m0/remix.baseline.wav` is the repeated original-loop comparison control.
`renders/listening-pilot/listener/` contains four anonymized, RMS-matched WAVs,
the source, blank ratings, and pairwise comparisons. Organizer keys stay outside
the listener folder. No listener IDs or ratings have been invented.

[Decoded measurements](evidence/m0/decoded-audio.json),
[all artifact hashes](evidence/m0/artifacts.json),
[48 kHz comparison self-test](evidence/m0/linux-comparison-selftest.json),
[integration evidence](evidence/m0/integration-validation.json),
[schema check](evidence/m0/schema-validation.json), and
[machine-readable gates](evidence/m0/report.json) retain the observations. The
Linux comparison explicitly leaves the Apple M5 gate NOT RUN.

## Reproduction and next machine

With CMake on PATH (here: `export PATH="/tmp/djayvo-build-tools/bin:$PATH"`):

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 4
ctest --test-dir build --output-on-failure
./build/djayvo_remix --input renders/fixtures/synthetic-speech.wav --synthetic-fixture --output renders/m0/remix --style all --stems
```

The prepared synthetic input travels in `dist/djayvo-mac-handoff.tar.gz` with Git
history and the Linux reference masters. See
[mac-agent-handoff.md](mac-agent-handoff.md) for verified transfer and
`sh scripts/mac_smoke.sh`. A self-contained signal fixture can also be recreated
with `python3 scripts/make_fixture.py`; the speech generator is optional. For
real recordings, pass `--consent` only with permission to process that input.

## Owner reference analysis

The owner supplied `down.mp3`, `question.mp3` and `blood_club.mp3` in Downloads.
Full-file signal analysis and 15 current level-matched audition files are **PASS**; interpretation is
**PARTIAL**, and direct listening is **NOT RUN** because this session cannot hear
audio. Strong section-to-section bass/level/width changes suggest arrangement
contrast deserves attention alongside timbre. The resulting engine changes are
documented in [arrangement-review.md](arrangement-review.md); no training was
performed. See [reference-analysis.md](reference-analysis.md) for measurements,
selected timestamps, reproduction, and the local audition package.

## Remaining limitations

The acoustic bank is mono and sample-based, with discrete piano layers and
seeded piano/drum takes; bass remains single-layer. The owner accepts v4 piano
and drums, but there are no formal ratings of realism or layer transitions.
No formal perceptual evaluation exists. Analysis is energy/onset/autocorrelation DSP with sustained quiet-boundary selection but
optional unverified word-time estimates but no reliable semantic labels. Pitch may have octave errors.
Varispeed couples pitch/time and can alias (current generated chops use rate 1).
Finite instrumental early reflections, bounded independent pitch/time transforms
and opt-in three-repeat tempo echoes exist. Transforms use opt-in 1.1 plans and echoes use 1.2, without formant correction or
human acceptance; bounded opt-in instrument feedback reverb now exists. Tempo maps and mix automation are implemented. Offline CLI JSON import and
explicit rule fallback are now implemented; provider-connected AI planning is
absent. Silence is explicitly rejected. Mixing is fixed per grammar,
with smooth clean-hook ducking; the soft-knee stage can color overloads.

WAV is PCM16 without dither, capped by RIFF size. Stems preserve master event IDs and instrument takes. Independent quantization
and nonlinear processing still prevent a promise of exact master reconstruction. The renderer is allocation-free in tests but not a live
device certification. Exports are synchronous and cancellable, with staged
publication and a completion marker; power-loss durability is not certified.
Run the C ABI off the UI/audio thread. Public C++ buffers are caller-owned and
must remain immutable during rendering. Current native app/library and simulator
privacy checks are recorded separately in the iOS report; live, battery and
physical route/session coverage remain unverified.

Next: audition the validated Mac renders, collect consented source clips,
and use the preregistered [evaluation protocol](evaluation-protocol.md) to find
musical defects. Improve from those observations before model experiments. The
handoff carries all work needed to continue without per-step permission pauses.

## 2026-10-20 — R0 improvisation foundation

**Implementation complete; overall evidence PARTIAL. Stop for review.** Added the
35-operation taxonomy, architecture/C++ type mapping, versioned plan envelope,
fail-closed five-record synthetic provenance ledger, rule-planner adapter,
inspector/diff and executable evaluation harness. Three arrangements from the
preserved phrase replay with identical PCM and instrument event frames at block
sizes 512/113. M5 native CTest: 15/15 PASS; R0 boundary/timing suite: 11 tests PASS.

The original Mac smoke command exits 1 because the retained M0 reference has older
arrangements/instruments; that historical comparison remains FAIL. Fresh Mac
outputs versus current R0 outputs are byte-identical, PASS. This is Mac/Mac,
not new Linux evidence; Linux/WASM/iPhone execution is NOT RUN for R0. Human
quality/recognizability is NOT RUN (n=0), with blank blinded review materials.
No master-specification changes, new native runtime dependency, paid service,
third-party ingestion or model training. [Full R0 report](r0-report.md) and
[architecture](improvisation_architecture.md). R1 requires separate authorization.

## 2026-10-20 — project storage cleanup

**PASS:** Removed 42 disposable Next.js/deployment-copy/Emscripten/iOS build-cache
directories (2.96 GiB inventoried). Replaced 1,557 byte-identical audio copies with
independent APFS copy-on-write files, sharing 8.36 GiB of duplicate content while
preserving every recording path, contents, owner, permissions and timestamps.
All replaced files were SHA256-verified. This uses separate inodes, not hard links;
future edits remain independent. Stopped seven obsolete audition/review servers.

Free disk increased from approximately 8.8 to 19 GiB, with other project builds
running concurrently. The current studio on port 3000 returns HTTP 200; the
preserved fixture, pinned R0 engine/policy and 26 latest export artifacts verify
unchanged. No source changes, audio deletion, credential/environment removal or
database changes. Subsequent builds can regenerate caches. Complete local cleanup
audit: ignored `build-cleanup-20261020/`; compact [receipt](evidence/storage-cleanup/report.json).
Full builds were not rerun because this was storage-only maintenance. R0's review
stop and its outstanding human/cross-platform evidence are unchanged.

## 2026-10-20 — owner-authorized retirement of older WAV versions

**PASS:** The owner subsequently authorized deleting older WAV versions,
superseding blanket retention of generated historical audio. Deleted 6,789
identified engine exports, stems and historical listening candidates (40.66 GiB
logical data). Original recordings/input files, reference and instrument assets,
M0 smoke-test control files, and current R0 final examples/fixtures remain. Files
with uncertain provenance were left untouched. No Downloads files were changed.

The project now reports approximately 10 GiB, including 7.1 GiB in `renders`,
versus 51 GiB before retirement; system free disk is approximately 66 GiB.
Copy-on-write sharing and concurrent system activity mean logical removed bytes
are not equal to a measured physical free-space delta.

Preserved scores/reports and a compressed per-file path/size/SHA256 inventory.
Renamed 1,202 affected completion records to `.retired-export.json` so they cannot
be mistaken for currently complete exports. Historical review pages and old
replay comparisons may require regeneration before use. Current R0 exports
(26 artifacts), Mac smoke exports (26 artifacts), the preserved speech fixture
and all five dataset records validate; studio on localhost:3000 returns HTTP 200.
No source or milestone implementation changed, and no full rebuild was run.
[Retirement receipt](evidence/storage-cleanup/audio-retirement.json).

## 2026-10-20 — R1 offline musical demonstration capture

Under the owner's continuation of model development after R0 review/cleanup,
implemented a local offline edit interface and state/action/next-state dataset
format. **PASS:** six action kinds reuse the existing C++ importer/renderer;
invalid edits fail before publication; immutable revisions preserve initial
plans, accepted edit order/timestamps, source/rights/engine/policy hashes and
actual render receipts. Existing R0 contracts and original specification remain
unchanged. Private file permissions and exclusive output creation preserve data.

**PASS:** consent/evidence/expiry/withdrawal and split-leakage rejection checks,
including cross-ledger exact arrangement leakage. Export revalidation reads
current rights and re-renders the final plan; withdrawing permission invalidates
old exports. Exports remain evaluation-only regardless of declared training
opt-in. Software checks declarations and hashes; human legal review is separate.

**PASS:** 14 new regression tests and 11 existing R0 tests. Actual M5 output:
one 32-second PCM16 stereo WAV, −7.899 dBFS sample peak, no full-scale samples;
blocks 512 and 113 give identical WAV/event traces and zero PCM difference.
All 304 instrument on/off event frames match independent rational scheduling.
Only one new final WAV is retained; scratch render audio is deleted automatically.

**PARTIAL:** R1 overall. Six exported decisions belong to one automated synthetic
session, not expert musicians. In-studio live MIDI/capture integration, real
permissioned expert traces and a diverse stratified corpus are unfinished.
**NOT RUN:** human quality (n=0), new Linux/WASM/device execution, model training,
third-party ingestion and paid compute ($0). No changes to web/iPhone/C++ audio,
no new dependencies and no push/deploy. No claim of improved musical quality.
[Full guide and exact evidence](r1-demonstrations.md).

## 2026-10-20 — R1 private live instrument takes

**PASS:** Connected opt-in demonstration capture to the browser's existing
keyboard/touch/MIDI/drum controls and actual shared-engine AudioWorklet output.
Capture records only accepted commands at engine-relative sample frames, including
talk-bass shaping and effective sustain release timing. Private WAV/action
downloads, playback and deletion work; consent withdrawal, lost focus, audio
interruption or engine failure discard incomplete takes. Fixed 30-second and
4,096-event limits; recording off by default; no upload, training permission or
persistent storage implied.

**PASS:** 50 web unit tests, Chromium/WebKit capture flows at 1440×1000 and
390×844, 47 Chromium DJ regressions and public bundle/offline-manifest audit.
Each actual captured browser WAV replays byte-for-byte using its accepted-command
trace and pinned shared-engine WASM; max/RMS PCM16 error zero. Two known WebKit
screenshot-tool stylesheet warnings are retained separately; app errors and
external requests are absent. The old two-audio-element test was narrowed to
the actual A/B deck players after the new take preview exposed that assumption.

**PARTIAL:** R1 overall. This captures instruments before channel effects/volume;
source microphone pairing, full-mix/automation context and a reviewed expert
corpus remain. **NOT RUN:** model training, human musical quality, physical MIDI,
hardware latency, sustained live capture deadlines, current Linux/iPhone parity
and public deployment. Both specifications, existing recordings, C++ engine and
security policies remain unchanged. Existing local website/standalone studio
assets refreshed without compiler-cache regeneration.
[Full report and reproducible evidence](r1-instrument-capture.md).

## 2026-10-20 — R1 private phrase-response pairing

**PASS:** Added separate opt-in to retain the existing 2–5 second consented
phrase with a dry instrument take. Four local downloads bind source WAV,
response WAV, accepted musical commands and a strict versioned pair record by
hash. Source origin and confirmed context at the start request are explicit;
unconfirmed context is null. No original filenames, device identities, upload,
library persistence or training authorization is inferred. Source replacement,
deletion or consent withdrawal discards the pair, including pending hash results.
Existing instrument traces, offline exporter and shared engine remain unchanged.

**PASS:** 54 unit tests, seven capture flow checks each in Chromium/WebKit,
desktop/mobile screenshots, 39 Chromium prepared-session regression checks,
static bundle audit and actual localhost capture/pair/playback/delete. Both
ordinary and paired instrument responses replay byte-identically; max/RMS PCM16
error zero. Original synthetic fixture and both specifications retain their hashes.

**PARTIAL:** Browser normalization of the same 22.05 kHz fixture produces equal
48 kHz frame counts but max PCM16 difference 4 and RMS 0.3592079824. This existing
decode/resampling difference is recorded, not treated as exact source parity.
Two WebKit screenshot-tool CSP warnings remain isolated; app errors are absent.

An initial context test's blob fetch was blocked by existing CSP; changed the
test to use the actual download link. An existing ambiguous saved-mixes navigation
selector stopped the first broad run after 31 checks; narrowed both selectors and
the complete 39-check rerun passed. The long-running local Next server initially
404ed new modules, so it was restarted; seven served assets then matched source
bytes and the actual website flow passed. No security settings or production
deployment changed. Failure logs and successful evidence are retained.

**PARTIAL:** R1 overall; full-mix/automation capture, source-to-response timeline
alignment, reviewed expert demonstrations and stratified corpus remain.
**NOT RUN:** physical microphone/MIDI, hardware latency, new Linux/iPhone runs,
human musical quality, full Next rebuild, model training, paid compute and public
release. No claim that these short automated test notes improve musical quality.
[Full report, WAVs and reproducible commands](r1-phrase-response.md).

## 2026-10-20 — R1 private studio mix recording

**PASS:** Added separate permission-gated capture of the actual stereo mixer
output after channel effects/faders and limiting. Decks A/B/C and instruments
are included; live microphone input and independent preview players are excluded.
Playback routing stays intact when recording starts/stops/fails. Bounded
30-second AudioWorklet buffer, local WAV/receipt downloads and preview/delete;
no upload, persistent save or inferred training permission. Permission/source
changes and interruptions discard pending recordings, including late hash results.

**PASS:** 59 unit tests (including 44.1/48 kHz buffer caps); six flow checks each
in Chromium/WebKit; seven existing instrument/source-pair checks; 48 Chromium
DJ regressions, including real recording/playback after the server is stopped.
Both browsers reach the actual 30-second automatic limit. Static bundle audit,
desktop/mobile screenshots and actual localhost record/play/delete pass.
New modules initially returned 404 from the long-running local Next server;
restarting the existing build made them available, without public deployment.

**PASS:** Four-input mixer probe captures stereo float32 exactly against each
browser's rendered destination, including gain/effect changes, limiting and mute.
Max/RMS capture error zero; encoded WAV hashes identical within each probe.
**PARTIAL:** cross-browser mixer identity. The async offline stop is serviced
at different boundaries (36,096 Chromium / 48,000 WebKit frames); common-prefix
max/RMS difference is 2,158 / 12.9221764230 PCM16 units. This is recorded separately
from capture accuracy; no sample-accurate UI-stop or physical latency claim.

An initial recorder-error injection exposed a cleanup handler that did not fire.
Changed to the existing instrument rack's explicit event-listener pattern;
both browser reruns prove cleanup/retry while native instruments keep sounding.
Cancellation now acknowledges buffer release before the controller closes the
port; final browser tests observe that closure. A secondary WebKit test listener
missed the terminal event, so its observer was corrected and the timeout retained.
Initial failures retained. Two WebKit screenshot-tool CSP warnings are isolated;
app errors/external requests absent. Original fixtures, specifications, native
engine and security policy unchanged.

**PARTIAL:** R1 overall; complete automation/source provenance, aligned stems,
permissioned expert demonstrations and reviewed stratified dataset remain.
**NOT RUN:** live-mix deterministic replay, human musical quality, physical
mic/MIDI/latency/venue checks, new Linux/iPhone runs, full Next rebuild, model
training, paid compute and public release.
[Full report, playable probes and exact evidence](r1-mix-recording.md).

## 2026-10-20 — R1 mixer gain/EQ schedule capture

**PASS:** Private WAV-linked `1.0-mix-gain-automation` download. Shared scheduling
captures A/B/C/rack effective gains and six deck EQ targets only after the audio
API accepts them; original 5 ms smoothing retained. Initial requested targets and
rounded context-frame schedules remain distinct from actual PCM application and
native instrument-event acknowledgements. Bounded 4096 actions; overflow discards
the control trace while preserving WAV/audio. Existing consent, cancellation,
source replacement and deletion lifecycle also removes controls.

**PASS:** 63 unit tests; eight capture checks each on Chromium 149.0.7827.55 /
WebKit 26.5; 48 Chromium DJ checks including actual disconnected capture and
control download; 41-file bundle audit and source-identical localhost assets.
Desktop/mobile inspected. Eleven initial VM harness failures from the new import
were fixed without changing their behavioral assertions. Actual UI mutes align
with scheduled frame offsets after smoothing; capture/destination PCM differences
remain exactly zero within each browser. Cross-browser common-prefix max/RMS
2,158 / 12.9221764230 PCM16 units remains **PARTIAL**. Both real timed captures
reach 1,440,000 frames. M5 16 GiB / macOS 26.7.1 / Node 22.23.1 / Playwright 1.61.1.

**PARTIAL:** Overall R1; full effect/transport replay, hash-linked source rights,
aligned stems and expert-reviewed demonstrations remain. Private captures are
not training authorization. **NOT RUN:** human musical-quality evaluation,
physical latency/MIDI/venue, new Linux/iPhone execution, full Next rebuild, model
training, paid compute and deployment. Immutable specs, fixture and native WASM
unchanged. [Report, playable probes and exact evidence](r1-mix-automation.md).

## 2026-10-20 — R1 mixer effect/reset capture

**PASS:** Private `2.0-mix-automation` capture adds tone, echo amount, exact delay
spacing and buffer-reset operations on A/B/C/instruments to gain/EQ schedules.
Initial requested effect targets are frozen. V1 downloads still validate.
Controls share the 4096-event cap. Partial effect scheduling/graph failures now
invalidate the whole trace while keeping the WAV and reporting its incompleteness;
original errors still propagate. Timing represents scheduling arguments, not a
sample-level graph acknowledgement. Existing consent/deletion/privacy preserved.

**PASS:** 67 unit tests; ten recording checks each in Chromium/WebKit; 48 DJ
checks including actual disconnected capture; 39 prepared-session checks. Seventy-
five echo positions across all channels and C beat divisions are within one sample
frame (maximum 0.4736221401). Capture versus destination PCM max/RMS difference is
zero in each browser. Actual 30-second capture caps pass. Desktop/mobile inspected;
41-file bundle audit and localhost source-byte checks pass. Initial test input
175 ms violated the manual slider's 10 ms step; corrected to 170 without relaxing
production behavior. Initial failure logs retained.

**PARTIAL:** Cross-browser reference max/RMS 2158 / 12.9222712904 PCM16 units;
previous-run WebKit reference is identical and Chromium differs at eleven channel
samples by at most one unit. No cause or bit identity asserted. R1 still needs
transport/source provenance, aligned stems and reviewed expert demonstrations.
**NOT RUN:** Human musical quality, physical latency/MIDI/venue, new Linux/iPhone
runs, native/Next rebuild, model training, paid compute or deployment. M5/macOS
26.7.1, Playwright 1.61.1, Chromium 149.0.7827.55/WebKit 26.5; Node 22.23.1 for
all final checks (initial orchestrated runs resolved Homebrew Node 26.3.0; final
runs pin the existing project executable, no environment changes). Immutable specifications, fixture and
native WASM preserved. [Report and reproducible evidence](r1-effect-capture.md).

## 2026-10-20 — R1 private loaded-source inventory

**PASS:** Separate `1.0-mix-sources` download links exact loaded A/B files,
generated C WAV, normalized planner phrase and native instrument engine to the
recorded mix WAV. Bounded snapshots retain source changes/unloads. No filenames
or audio payloads; rights verification and training authorization remain false.
Sequential hashing starts after capture, with a ten-second deadline. Failed,
cancelled or late hashing cannot revive deleted exports or discard the ready WAV.

**PASS:** 73 unit tests, 12 recording checks each in Chromium/WebKit, 48 DJ
checks including actual disconnected capture and 40 prepared-session checks.
Exact C/phrase/A fingerprints validated against downloaded/worker-input bytes.
Capture/destination PCM difference is zero within both browsers. Both timed caps
reach 1,440,000 frames. Forty-two-file bundle audit, seven source-identical
localhost assets and desktop/mobile inspection pass. No app runtime errors.

**PARTIAL:** Initial concurrent Chromium timed capture reports two context clock
discontinuities; isolated rerun passes all 12 checks with zero and the same timed
WAV hash. Prepared-session probe reports two context clock anomalies, but zero
independent signal-frame gaps and silent blocks. Cross-browser common-prefix
max/RMS differences are 2,158 / 12.9221898224 PCM16 units. These results establish
neither physical glitch-free performance nor identical browser DSP. Overall R1
still needs transport, complete provenance/rights, aligned stems and reviewed
expert demonstrations.

**NOT RUN:** Human musical quality, physical latency/MIDI/venue, new Linux/iPhone,
full native/Next rebuild, model training, paid compute or deployment. M5 / 16 GiB /
macOS 26.7.1 / Node 22.23.1 / Playwright 1.61.1, Chromium 149.0.7827.55 and WebKit
26.5. Specs, synthetic fixture and native WASM hashes preserved.
[Report, playable probes and retained evidence](r1-source-inventory.md).

## 2026-10-20 — R0 portability closure and actual owner quality rejection

**PASS:** Existing stopped Colima Linux VM restored for fresh native execution,
then stopped again to release memory. Actual M5 and Linux arm64 container each
pass 15/15 native groups; 11 R0 tests rerun on Mac. Current Mac smoke command
passes using its existing explicit R0 reference override. All three R0
arrangements match on Mac, Linux, Chromium and WebKit: identical decisions, 1,002
instrument-event rows per target, and WAV bytes (maximum/RMS error zero).
Historical M0 comparison remains **FAIL** because its musical decisions differ;
no reference recordings or tolerances replaced.

**FAIL:** Owner listening acceptance of the four original R0 candidates.
Feedback: all sound awkward and robotic in voices and instruments. One
qualitative reviewer, no invented recognition scores or preference statistics.
The packet uses synthetic speech; inspection shows no vocal pitch/stretch/reverse
transforms, so those cannot explain this set via those effects. Fixed-grid bass
and drum parts, limited instrument articulation and arrangement behavior require
listening-led investigation. These observations are not proven causal findings.

**PARTIAL:** Overall R0 acceptance. A separate natural-voice diagnostic uses the
owner's previously consented speech with the unchanged engine, at
`http://127.0.0.1:4196/`; it is not an improved model or accepted musical result.
**NOT RUN:** Independent listener study, natural-voice packet quality, physical
Intel/iPhone, Linux Python R0 harness (jsonschema absent), fresh WASM compilation,
model training, paid services or deployment. No production code, specs or
original recordings changed. [Report and exact evidence](r0-validation-followup.md).

## 2026-10-20 — Q0 baseline, instrument audit and expression diagnostic

**PASS:** Five authorized real inputs exported with original PCM, frozen plans,
event data, drum/bass/harmonic/vocal stems and final WAVs. Fourteen unchanged
instrument probes and eight optional SFZ probes are playable. All eight SFZ
replays match exactly; one-shot drum short/long probes are identical.
Five C expression renders match byte-for-byte across 512/113 block sizes.
All 3,400 A/C instrument event rows agree with independently calculated frames.
Eight Q0 tests and three focused native groups pass. A/C listening copies
measure −23.01 to −22.99 LUFS, with no quality score inferred from levels.

**PARTIAL:** Audit identifies a measurable short drum-release truncation,
limited recorded velocity layers, fixed-grid parts and repeated component
patterns. It does not establish the main audible cause. Two pairs share
component events, not whole arrangements; keys and some melodic timing do
respond to input. The offline expression prototype uses coordinated shifts,
existing accents/ghost strokes, gate articulation and phrase dynamics.
New fills and richer melodic phrasing remain open.

**PASS:** GMD public-license/checksum review and descriptive analysis of 1,138
constant-tempo 4/4 MIDI files, keeping the official splits separate. Twelve
files excluded and listed. No training or profile fitting. Existing CC0 samples
verified before SFZ use; sfizz remains a separate local tool with retained
Apple Silicon/Clang compatibility changes. Shipping notice assembly,
integration and additional target execution remain **NOT RUN**.

**PARTIAL:** Chromium/WebKit form, decoding, mobile layout and local download
checks pass. HTML reviewer-code validation was fixed. Headless WebKit playback
clock stalled; physical playback/listening remains **NOT RUN**. Synthetic UI
ratings were deleted and are not study data.

**NOT RUN:** Controlled full-mix B/D/E, composition intervention, Q0 listener
improvement, fresh Linux/iPhone/WASM audio execution, paid services, training
or deployment. Overall Q0 remains open pending diagnosis and controlled
listening; the user's success criterion is not claimed. The engine and all
existing plans, recordings and immutable specifications were preserved.
[Detailed findings, local audio links, commands and evidence](q0-quality-recovery.md).

## Q0 owner review — current candidate set rejected

**FAIL:** Owner acceptance of the baseline, A/C expression comparison and
native/SFZ instrument probes. Exact feedback was “still bad,” followed by
“All of them” when asked which of the three pages it covered.
This is one real qualitative reviewer; no numerical scores, per-file playback
claims, relative preference or causal explanation are inferred.
The earlier pre-review NOT RUN statements above remain historical.

**PARTIAL:** Overall Q0 implementation. Existing technical results remain valid,
but they do not establish musical improvement. Do not promote these candidates
as accepted quality improvements. **NOT RUN:** Independent listener study,
full B/D/E and a new composition intervention. No audio, plans, engine or
benchmarks changed while recording feedback.
[Exact response and scope](evidence/q0/owner-feedback.json).

## Q0 continuation — five controlled conditions

**PASS:** Five sources now have A/B/C/D/E mixes. The isolated native candidate
changes only drum release; A/B and C/D plans/events and non-drum stems match.
E preserves intact vocal calls, removes short chops and introduces recurring
source-rhythm answers. Ten Q0 tests, three native test groups, 8,216 independent
event-frame checks and 20 exact block-size replays pass. All 25 listening
mixes are within 0.04 LU of −23 LUFS; maximum true peak is −5.08 dBTP.
All five C master WAVs still match the rejected expression packet exactly.

**PARTIAL:** Overall Q0, instrument realism, composition acceptance and browser
playback. Browser form/decode/download checks pass, with the known headless
WebKit clock limit. **FAIL:** Previous owner acceptance remains rejected.
**NOT RUN:** New owner/independent comparison, fresh Linux/iPhone/WASM execution
and professional-quality validation. The production engine, master, existing
plans and recordings remain unchanged. No training, spending or deployment.

[New private review](http://127.0.0.1:4200/);
[changes, limits, evidence and commands](q0-five-arm-trial.md).

## Q0 five-condition rejection and reference reassessment

**FAIL:** Owner acceptance of the new five-condition packet. The owner called
the output “very robotic and bad quality” and requested reference listening to
f/x/y/z/down/question/blood_club in Downloads. Exact feedback is retained with
packet identity; no numeric scores or per-file listening are inferred.

**PASS:** All seven source hashes checked; six match prior full-file analyses.
New full-file signal analysis of f and current owner A/E masters completed using
the existing analyzer. **PARTIAL:** Code-grounded gap analysis: most timbres,
style/form rules and clean-voice ducking survived the rejected intervention.
**NOT RUN:** Direct agent listening, musical reference annotation or proof of a
dominant perceptual cause. No audio-perception tool is available in this session.
No engine changes, new renders, training, uploads or spending in this reassessment.

[Findings and next controlled experiment](q0-reference-reassessment.md).

## Q0 original score and palette study

**PASS:** Twenty native mixes and 100 stems from five authorized inputs, with
four fixed-score conditions: acoustic/hybrid bass-drums by grid/authored
expression. An original form introduces harmony, preserves two intact voice
calls, develops a source-rhythm piano motif, uses recorded muted guitar,
coordinates bass/kick and resolves with space. No production engine changes.
All 20 block-size replays match; 8,680 event rows have zero frame errors;
all mixes match −23 LUFS within 0.02 LU, with maximum true peak −4.13 dBTP.
Eleven Q0 tests and all three instrument asset checks pass.

A first partial batch exposed original 16 kHz source versus 48 kHz analysis
coordinates; fixed and regression-tested without resampling or changing files.
That batch remains INCOMPLETE and is not listening evidence.

**PARTIAL:** Q0 overall and browser playback (known headless WebKit clock limit).
**FAIL:** Prior owner acceptance remains unchanged. **NOT RUN:** New listener
acceptance, musician approval and fresh Linux/iPhone/WASM execution. No training,
reference-audio incorporation, paid services, deployment or dashboard redesign.

[Private review](http://127.0.0.1:4201/);
[score design, files, limitations and reproducible evidence](q0-authored-study.md).

## Q0 padded vocal boundaries and phrase-length call sections

**PASS:** Five copied-plan candidates preserve original recordings, complete-source
clips and all 372 inventoried files of the prior score study. The new transform
unions measured activity with analyzed phrases, adds 120 ms padding and falls
back to the full source below 99.5% retained energy. Responses move together to
bar boundaries. Only quiet hats in removed call bars are dropped; note loss or
sustained-note truncation is rejected. The owner's response starts at 8.571
instead of 10.714 seconds, retaining 99.9844% of original PCM energy.

Five masters, 25 stems and five exact 512/113 replays completed on M5.
All 4,292 control/candidate event rows agree exactly. Thirty decoded WAVs have
no full-scale samples; all masters have zero limiter interventions. Ten mixes
match −23 LUFS within 0.01 LU, maximum true peak −6.34 dBTP. Twelve tests pass.
Chromium/WebKit form, decode, mobile width and partial-rating downloads pass.

**PARTIAL:** Q0 overall and physical browser playback (known headless WebKit
clock limitation). **FAIL:** Prior owner acceptance remains rejected.
**NOT RUN:** New listener acceptance, quiet-word completeness, direct agent
audition and fresh Linux/iPhone/WASM execution. Activity/energy measurements
do not prove musical improvement. Instrument palette, production engine and
specifications remain unchanged. No training, spending or later milestone.

[Private review](http://127.0.0.1:4202/);
[full experiment, gates and reproducible evidence](q0-phrase-form-study.md).

## Q0 instrument dynamics and independent vocal integrity

**PASS:** Reproduced a guitar layer discontinuity: at velocity 84 → 85, all 80
48 kHz pitch/take pairs lose 2.56–17.46 dB of first-half-second RMS energy.
An isolated sampler copy attenuates the medium layer at 26 root/take points.
Across 160 guitar cases at 16/48 kHz, the maximum absolute half-second step
falls to 0.54 dB. Forte samples, muted guitar and piano remain identical.
Six matched guitar pairs and two raw controls were rendered; eight candidate
WAVs replay exactly. All 16 before/after probes decode without full-scale PCM.
Three existing native regression programs and 12 Q0 tests pass. All 78 guitar
assets and pinned CC0 evidence verify.

The independent owner vocal oracle reconstructs 1,560,000 frames from original
source PCM, crop positions, pan/normalization and fades with zero differing
samples. Consent, hash, overwrite and spurious-sample negative tests pass.
This is waveform-integrity evidence, not intelligibility or naturalness.

**PARTIAL:** Instrument recovery and Q0 overall. The candidate changes soft
guitar level; attack/body differences remain. **NOT RUN:** Full-mix calibration
acceptance, direct/physical listening and fresh Linux/iPhone/WASM execution.
Chromium controls, twelve audio decodes, clock, mobile width and key isolation
pass; other browser/device execution is not inferred. **FAIL:** Earlier owner
acceptance unchanged. No production change, training, spending or later milestone.

[Instrument diagnostic](http://127.0.0.1:4203/);
[findings, calibration risks and reproducible evidence](q0-guitar-layer-study.md).

## Q0 guitar calibration in full arrangements

**PASS:** Five fixed phrase-form plans rendered through the pinned experimental
sampler, producing five masters, 25 stems and five exact block-size replays.
All scores/events remain unchanged; 4,244 control/candidate instrument rows
have zero frame errors. All twenty non-guitar stems are byte-identical.
Independent subtraction explains each master change by guitar alone within
one PCM16 unit. Thirty WAVs decode without full-scale samples; zero master
limiter interventions. Ten mixes match −23 LUFS within 0.01 LU, peak −6.34 dBTP.
Thirteen Q0 tests pass, including rejection before linking changed artifacts.
All 107 inventoried prior-control files remain unchanged.

The calibration lowers guitar RMS by 4.26–9.30 dB in these arrangements. This
establishes a mix-balance risk, not better instrument realism. No compensating
track gain was added; that would also affect the unchanged muted guitar.

**PARTIAL:** Overall Q0 and browser playback (known headless WebKit clock limit).
**NOT RUN:** New musical/mix acceptance, physical audition and fresh
Linux/iPhone/WASM execution. **FAIL:** Earlier owner acceptance remains rejected.
The user's continuation is not recorded as listening feedback. Production,
specifications, source recordings and prior controls remain intact.

[Private full mixes](http://127.0.0.1:4204/);
[results, gates, risks and reproduction](q0-guitar-mix-study.md).

## Q0 guitar dynamics with existing-mix preservation

**PASS:** An isolated sampler uses the ordinary guitar recording at higher
velocities while retaining gain/filter response and muted samples. All 160
guitar boundary steps become positive, approximately 0.15 dB. Piano and muted
probes, soft-note prefixes and all five previous WAV/score/event exports are
unchanged. Eight probe replays, three native regression groups and 14 Q0 tests
pass.

One copied owner plan introduces twelve intentional guitar velocity edits,
six above 84. Both samplers render the same accent score. Two masters and ten
stems are exported; candidate replay at blocks 512/113 is exact. All 1,278
instrument event rows have zero frame error. Non-guitar stems match; the master
difference is explained by guitar within one PCM16 unit. Guitar RMS rises
2.336 dB. Listening mixes both measure −23.00 LUFS, peaks −7.62/−7.70 dBTP.
Twenty-eight raw audio files decode without full-scale samples; native masters
report zero limiting/nonfinite samples. Chromium checks pass for both pages.

**PARTIAL:** Q0 recovery. The candidate removes the separate recorded forte
timbre; it is not promoted. Preserved existing mixes cannot demonstrate an
improvement. **NOT RUN:** New musical acceptance, physical/direct listening,
fresh other-browser/Linux/iPhone/WASM execution. **FAIL:** Earlier owner
acceptance unchanged. Specifications, production and prior plans remain intact;
no spending, training or later milestone.

[Private accent pair](http://127.0.0.1:4206/);
[isolated probes](http://127.0.0.1:4205/);
[results, gates and reproduction](q0-guitar-single-study.md).

## Q0 completion audit, V2 performance expression and WASM execution

**FAIL:** The owner heard the 4206 guitar-accent pair and replied “Neither is
substantially better.” This is retained against its exact packet identity;
no equal-quality claim or numeric scores are inferred.

**PASS:** `q0_performance.py` extends the isolated plan transform with melodic
arrival/release, bass/kick accent relationships and guarded genre-specific
transition pickups. Existing groove, gates, ghost strokes and deterministic
shared timing remain. Five A/B/C/D/E blocks now render with V2 expression:
twenty candidate masters and their stems, twenty exact 512/113 replays, 8,264
zero-error instrument event rows. Independent inspection decodes 112
masters/stems without full-scale samples; native reports have zero limiting or
nonfinite samples. A/B and C/D changes remain isolated to drums. Twenty-five
listening WAVs measure −23.05 to −22.99 LUFS, maximum true peak −4.91 dBTP.
Sixteen Q0 tests and all three native regression groups pass.

**PASS:** Fresh Emscripten 6.0.1 execution of all five final-condition plans in
Node 22.23.1. WAVs are byte-identical to native, maximum/RMS PCM error zero,
1,432 exact event rows. The missing local SDK binaries were restored; the
unsupported native hard-link publication path was replaced only in the
experimental probe with the existing low-level render API. Failure logs are
retained. No production code or atomic-publication behavior changed.

**PASS:** A packet/hash-bound listening-results validator handles real ratings,
paired source-level descriptive differences and notes, rejecting stale,
duplicate, malformed or incomplete submissions. Current output: zero ratings,
**NOT RUN**. Seven sample-attack threshold measurements separate envelope
behavior from event-clock evidence without claiming perceived latency.

**PARTIAL:** Overall Q0 and browser playback; Chromium/WebKit form/decode checks
pass but physical listening and the known headless WebKit clock limitation
remain separate. **NOT RUN:** New full-packet musical acceptance, independent
panel, Linux/iPhone/AudioWorklet execution. Substantial recovery is not
demonstrated, so Q0 is not closed. No training, spending, release or later milestone.

[Current private review](http://127.0.0.1:4207/);
[requirement-by-requirement completion review](q0-completion-review.md).

## Q0 Linux portability and independent-review preparation

**PASS:** Started the existing stopped project Colima VM/container, built the
frozen isolated Q0 decay renderer using GCC 12.2.0 on Debian 12 aarch64, and
passed all three native regression groups. All five E plans rendered actual
WAV/score/event/report/receipt exports. Their WAVs are byte-identical to Mac,
with maximum/RMS PCM error zero and 1,432 exact instrument-event rows.
No threshold changed. The container and VM were stopped again; the active
Docker context remains `desktop-linux`. No images/packages or cloud compute
were acquired. The repository mount was read-only.

**PASS:** Prepared a separate four-source review packet from the existing
licensed LibriSpeech/laughter sources. Twenty matched mixes plus four original
recordings retain exact hashes. Private owner voice, its HTML section and its
audio URL are absent; its source request returns 404. Attribution is retained,
and the organizer key is outside the served directory. Chromium/WebKit forms,
decode, blank/partial ratings and local download checks pass. Seventeen Q0
regression tests pass, including explicit permission/license exclusion cases.

**PARTIAL:** Overall Q0 and browser physical playback; headless WebKit clock
limitation remains. **NOT RUN:** Independent panel, new musical acceptance,
physical Intel Linux/iPhone/AudioWorklet execution. The owner's latest answer
“continue” is work authorization, not a quality vote. Prior guitar improvement
judgment remains **FAIL**. No publication, messaging, training or production
promotion occurred.

[Independent-review preview](http://127.0.0.1:4208/);
[private owner comparison remains unchanged](http://127.0.0.1:4207/);
[execution details, gates and reproduction](q0-linux-review-followup.md).

## Q0 final local checkpoint: listening workflow and evidence

**PASS:** Reproduced and fixed a form/import mismatch: an incomplete six-score
candidate could download but was rejected by the results validator. Shared
review controls now focus the missing score without clearing answers.
Completed candidates, blank unheard candidates and notes alone remain supported.
Seventeen regression tests pass. Chromium/WebKit checks pass for both private
and licensed-only pages, including privacy boundaries and no external requests.

**PASS:** Fresh form-only copies at 4209/4210 preserve the 4207/4208 audio,
candidate order and packet identities. All 54 WAV entries use hard links to
unchanged files, avoiding duplicate audio storage. Original comparisons remain
intact. Existing native/WASM inventories and five exact Linux/Mac outputs
were reverified; no new engine execution is claimed for this form-only change.

**PARTIAL:** Q0 overall and physical browser playback. **FAIL:** Prior owner
improvement judgments. **NOT RUN:** New full-packet listening verdict,
independent panel and physical target checks. The actual musical success
criterion remains unmet; implementation/report delivery does not close it.
No new musical experiment, training, spending, publication or production
promotion. [Consolidated final review](q0-completion-review.md#final-local-checkpoint--2026-10-20).

## Q0 composition development after the full-packet rejection

**FAIL:** The owner rejected 4207/4209, naming Candidate 1 as worst and saying
the other instrument sounds were okay but creativity was poor across the music.
Exact feedback is bound to the frozen packet; no numeric scores are inferred.

The next intervention therefore keeps the instrument palette, native renderer,
mix settings, tempo and duration fixed. `q0_development.py` uses the source's
rhythm and uncertain relative pitch for a recurring motif, an intact clean
call, padded adjacent-word hooks from existing offline estimates, related
harmonic returns, rhythmic diminution, intentional rests and a cadence.
Laughter uses the explicitly authored pitch fallback and no guessed word hook.
No training, new inference or production code changes.

**PASS:** Five corrected pairs and stems, five exact block-size replays,
3,034 exact control/candidate event rows, 28 independently decoded masters/stems
without clipping, limiting or nonfinite samples. Ten matched mixes measure
−23.05 to −23.00 LUFS, maximum true peak −5.03 dBTP. Seventeen expanded tests
pass. A first draft crowded out developed notes; the corrected version reserves
hook/answer space. A later final-score audit found that one of the six intended
reggae notes was still removed by the rest pass; see the correction below.

**PASS:** Actual new Node/WASM and Linux ARM64 execution produce five
byte-identical WAVs relative to Mac, with 1,602 exact candidate event rows.
Three Linux native test groups pass. The local container/VM were stopped again,
without changing the active Docker context. Chromium/WebKit review controls
pass. **PARTIAL:** Physical browser playback and overall Q0.
**NOT RUN:** New listening preference, independent panel and physical
Intel/iPhone/AudioWorklet execution. No professional quality claim or promotion.

Preliminary CC0 drum/bass research was stopped before building/integrating it
after the owner clarified that composition was the priority. Its downloaded
source cache stays ignored; no new samples enter these renders.
[New private comparison](http://127.0.0.1:4211/);
[full report, evidence, source files and reproducible commands](q0-source-development.md).

## Q0 final performed-motif correction

**PASS:** Reproduced a missing reggae melody note after expression/rest
processing. The planner now fits the full developed rhythm before the pause
and links each motif event to the final score. Eighteen tests pass, including
three groove profiles, seeded depths and simulated post-processing note loss.
Four cohort plans are identical; only the corrected reggae source was rendered.
Native block replay, Node/WASM and actual Linux ARM64 match exactly, with 168
exact instrument event rows. Three Linux native test groups pass. Six
master/stem WAVs decode without clipping or limiting.

The first stem-isolation assertion failed: global note IDs seed sample takes
and small gain differences, so adding the organ note also changes bass/drum
PCM despite unchanged score data. All differences are measured and disclosed;
the engine remains unchanged. Historical comparisons, including 4211, remain
frozen. No new listening judgment, professional-quality claim or training.
**PARTIAL:** Overall Q0. **FAIL:** Latest prior owner acceptance.
**NOT RUN:** New musical acceptance and physical-device checks.
[Report and reproducible correction](q0-motif-completion.md).


## DJ Academy checkpoint — 2026-10-21

**PARTIAL:** Added the fifth feature to the existing app: two actual-deck exercises,
first-crossfade challenge, contextual coaching, voluntary Free Jam, versioned
server-checked progress, offline introduction and separate $79.99 sandbox pass.
The six-stage course outline is not a completed professional curriculum.

**PASS:** Production build/TypeScript, 78 web tests, 75 site/database tests,
15 baseline core tests; Chromium/WebKit actual audio/keyboard/identity/progress
flows and existing product regression. Two CC0 practice tracks and real browser
WAV captures have reproducible hashes and measurements. Owner initially could not
find permission/preparation; after moving the actual checkbox next to loading,
owner confirmed: “Yes, I can start the music now.” This verifies preparation only.

**PARTIAL:** Both captured WAVs report one clock discontinuity, despite no measured
clipping or exact silence. Cause and physical reliability remain unproven.
**NOT RUN:** Full human fade, enjoyment, novice cohort, upper-level assessments,
actual hosted Stripe transaction, hosted migration/deployment. No live charge or
spending. AI quality **FAIL** and paid generation disabled remain unchanged.
[Implementation, evidence and exact next steps](ACADEMY_IMPLEMENTATION.md).


## Physical deck presentation — 2026-10-21

**PASS:** Shared Academy/standalone console now groups real jog platters and
transport/pads around the existing EQ/channel/crossfade mixer; live playback
indicators, responsive faders, accessible keyboard operation and reduced motion.
The coach no longer covers the equipment. Build, 78 web tests, audited bundle and
Chromium/WebKit layout/audio interaction checks pass. **NOT RUN:** Owner visual
acceptance, physical touch-device validation and deployment. Existing curriculum,
recorder-clock and musical-quality gaps remain. [Evidence](deck-presentation.md).

Full DJ regression also PASS in Chromium/WebKit, including synthetic MIDI,
disconnected playback and hash-verified recorded PCM; physical controller and
venue certification remain NOT RUN.


## Adaptive fullscreen studio — 2026-10-21

**PASS:** Native fullscreen entry/exit in Chromium and WebKit; actual media
continues playing. Wide screens place existing C beside A/B, compact laptop
controls fit the tested 1366×768 viewport, and phones retain scrollable controls.
Coaching can fold after preparation and returns on exit. Denied/missing fullscreen
uses an explicit expanded-page fallback; Escape/focus and lesson state checks pass.
Build, 78 unit tests and the public/offline bundle audit pass.
**NOT RUN:** Physical monitor changes, touch-device/native OS Escape validation,
manual screen readers and deployment. No new audio deck or paid service.
[Reproducible evidence and layout limits](studio-fullscreen.md).

Existing DJ regression: **PASS**, 48 checks in each browser including offline
instrument/mix capture. An initial WebKit start-state assertion failed during the
parallel run, then passed on rerun without audio-engine/assertion changes; its
cause remains unconfirmed and evidence is retained.


## Next.js loading, recovery and caching — 2026-10-21

**PASS:** Shared route/client-fetch skeletons; custom 404, recoverable server
errors and standalone root-layout error page; Next retry actually re-fetches.
Public content stays prerendered; private data stays dynamic; admin checks are
memoized only per render. Launch-aware robots/sitemap preserve gated access.
31 unit tests, production build/typecheck/bundle audit, Chromium/WebKit actual
site and isolated fault-fixture checks, axe, responsive checks and real local
owner/member cache-isolation/coming-soon regression pass.
**NOT RUN:** Deployment/CDN, physical devices and manual screen readers.
Existing audio-quality FAIL and paid-generation hold unchanged.
[Report and evidence](nextjs-foundations.md).
