# Pro v1 completion — 2026-10-22

**PASS: implementation, sandbox commerce, signed Mac candidate. PARTIAL: public release and qualification.** The owner approved **$49 USD once for Pro v1** and confirmed LG speakers only, without a MIDI controller or separate headphones. Basic remains free. Paid generation, Academy sales, iOS distribution and unrelated launch gates remain closed.

## Implemented

- Hosted Stripe Checkout uses the existing verified account, a server-verified one-time $49 price, automatic tax and idempotency. Paid access requires authoritative paid/captured payment state; signed callbacks, duplicate events, refunds, disputes and account suspension reconcile in Postgres. Pro never grants generation credits or Academy access.
- Signed Ed25519 activation files enable the packaged Mac app. Sandbox purchases cannot activate a release. Online startup renews 30 days of offline access; confirmed revocation clears renewal. Checks never interrupt an active set. The web studio checks account access; its saved offline copy expires after 30 days and renews online. Known refunded/signed-out browser access is removed from the current cached deck.
- Existing accounts show Pro receipt history. Pro, pricing, official downloads, terms and navigation explain the Basic/Pro split. A personal Pro v1 license includes v1 updates on the owner's compatible Macs and web, excluding generation and public-performance rights. Refund requests go to support within 14 days; statutory rights are unaffected.
- The shared sampler now records initial voices plus start/stop controls. Offline reconstruction includes trim, pitch, looping, gains and mixer effects. Old receipts without sampler control history fail explicitly. Exact original master reproduction remains subject to the existing decoder/DSP-history and clock-discontinuity limitations.
- The signed Mac app has activation/account/renewal controls in Settings, persistent banks/settings, sandboxed local assets and a separate update feed. Packaging derives its version from package.json. The release helper checks notarization, staple and Gatekeeper before producing a hash-bound installer/feed.

## Evidence

[Reproducible reports](evidence/pro-v1/):

| Gate | Status / observed evidence |
| --- | --- |
| Real Postgres payment/admin regressions | PASS, 15 checks, disposable loopback database |
| Actual Stripe hosted test purchase | PASS, declined card, test success, signed callback, duplicate delivery, wrong owner, sandbox license and actual test refund; no real funds moved |
| Browser cached entitlement | PASS, paid offline access, expiry, renewal and refund redirect |
| Signed packaged activation | PASS, absent/tampered/expired/sandbox files rejected; valid owner file accepted, mode 0600, relaunch persistence, provider outage and revoked renewal |
| Packaged audio / persistence | PASS, dual decks, PCM signal, rotating platter, knobs, AudioWorklet, sampler banks, WAV/control replay and stopped relaunch, muted output |
| Cross-browser sampler replay | PASS, Chromium/WebKit, identical repeat PCM |
| Apple release candidate | PASS, Pro 1.0.0, Developer ID, notarization c78dfcd1-84a0-457c-8261-8f60542557e9, staple and Gatekeeper |
| One-hour Pro runtime | FAIL, initial run stopped after 1842 seconds of passing samples. Cause unknown; diagnostic rerun in progress, no endurance pass claimed |
| Public candidate installer/feed | PASS, published candidate, fresh public download, matching SHA-256, signature, staple and Gatekeeper |
| Actual upgrade | PASS, 0.1.0 downloads the public signed 1.0.0 installer, installs and automatically relaunches; reopening the isolated profile retains activation, settings and a stopped sampler bank |
| Hosted CI | PASS, all eight jobs in run 39854460446, including Mac/Ubuntu sanitizer builds, desktop, Academy, website and comparison |
| Production deployment/catalogue | PASS, GitHub main 6ac7ca0; public pages, unpaid denial, signed renewal, 72 authorized tracks and ranged audio; Chromium/WebKit desktop/mobile discovery with zero scoped axe violations. Sales remain disabled pending endurance |
| Pro owner speaker listening | PASS, new signed-app two-track/crossfade check on LG Ultra HD; owner reports “Audible and clean” |
| Actual MIDI / separate headphone output | NOT RUN; owner has neither device |
| Physical cable unplug | NOT RUN, explicitly deferred |
| Real live payment charge | NOT RUN; sandbox coverage does not assert live settlement |

Two earlier desktop replay attempts observed two recorder clock discontinuities and correctly refused reconstruction. A subsequent diagnostic run and the final signed-app run passed with zero. No engine fix or zero-glitch certification is claimed; failed evidence remains in `renders/pro-desktop-iibzTJ` and `renders/pro-desktop-CiGieR`.

## Production preparation

Read-only Neon audit verified all 12 existing migration hashes. Only additive `0014_pro_licenses.sql` was applied transactionally under the existing database authorization; unrelated pending `0013_audio_duration.sql` was left untouched. Test/live Stripe products, prices and mode-specific webhooks were created for Pro; both account configurations report payments/payouts enabled and tax settings active. The pinned signing key matches the server key. Vercel production configuration is installed with **PRO_SALES_ENABLED=false** pending release verification. No direct CLI deployment is used.

Ignored credentials: `apps/site/.env.pro-billing`, `.env.pro-license`; private signing material never belongs in Git. The activation file is a bearer credential; keep it private. Revocation of a disconnected previously issued license can take up to 30 days. These checks are access controls, not an unbreakable DRM claim.

## Repeat / maintain

Run the existing site/web tests plus `tests/pro.test.ts` with an isolated loopback `JAMLOOM_TEST_DATABASE_URL`. `apps/site/tests/pro-provider.mjs` requires test Stripe credentials and uses disposable local Postgres; it performs only sandbox purchases/refunds. Build the site before this test. `apps/desktop-pro/tests/activation.mjs` requires a signed packaged executable and an owner activation token in its environment. Never log the token. The actual packaged suite is `tests/app.mjs`; `tests/endurance.mjs` runs for a real hour with physical output muted.

Sign with the existing Developer ID, run `script/prepare_pro_release.sh` against the directory containing the app, retain the notarization/hash reports, then publish the versioned ZIP and `pro-updates/releases.json` only after checks. Preserve `com.jamloom.pro` and its local profile through updates. Basic's public 0.4.0 installer and Sparkle feed remain separate.

The public candidate is at https://github.com/sariserhan/jamloom/releases/tag/pro-v1.0.0; sales remain disabled. Browser purchase-page QA passes Chromium/WebKit at 1440/390 px with zero scoped axe violations (homepage → Pro → sign-in). The Browser runtime tool was unavailable, so the existing Playwright workflow was used; screenshots/report are in `/tmp/jamloom-pro-page-qa`. Updated web unit suite: 143 PASS.

Added the missing Pro account control for preparing/removing the web offline copy, reusing the bounded existing service worker. Actual sandbox provider/browser test repeats PASS through that visible control. The updater relaunch drops test-only CLI arguments; after observing the new process, the harness stops that process and explicitly reopens the same isolated profile for persistence assertions. It does not claim test-profile CLI arguments survive Squirrel relaunch.

Native CoreMIDI virtual-source verification passes through the signed packaged app: real macOS MIDI input enumeration/permission, instrument PCM, CC learn/pickup/master changes and note-off. This is software-to-software native routing, not physical controller qualification.

Signed Pro 1.0.0 is installed in `/Applications/Jamloom Pro.app`. The prior 0.1.0 app and owner profile were preserved in ignored `renders/pro-owner-install-backup-20261022`; activation is private. No owner recording or bank was removed. Production read-only verification is reproducible with `apps/site/tests/pro-hosted.mjs` and `JAMLOOM_PRO_LICENSE_FILE`; it makes no charge.
