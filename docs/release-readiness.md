# Release readiness

**Overall PARTIAL.** Website and Mac Pro 1.1 release evidence passes. Native Jamloom 0.7.0, cloud generation and credit purchases retain the separate gates below. Earlier offline-only release notes are superseded by this inventory; historical evidence remains in the linked reports.

| Gate | Status | Evidence / remaining action |
|---|---|---|
| Website and Mac Pro 1.1 | PASS | [Completion campaign](project-completion-20261023.md): published installer, actual upgrade, production checks and eight CI jobs. This does not open cloud credits. |
| iPhone professional deck | PASS for owner-tested 0.4.1 | Owner accepted the installed landscape deck. [Receipt](evidence/project-completion-20261023/ios-pro-owner-acceptance.json). |
| Native Music DNA | PARTIAL | 0.5.0 physical installation/28 tests and archive audit passed. 0.6.0 adds native Apple Music import; 19 simulator checks pass, one optional server test skipped; 19 physical iPhone and five iPad simulator checks pass; signed Release archive audit, installation and launch pass. 0.7.0 adds account-free autocomplete and public/unlisted YouTube Music playlist import; live API, native contract checks and all five final physical iPhone UI checks pass. Signed 0.7.0 (9) archive/install/launch PASS; four iPad simulator cases pass, but result finalization is PARTIAL. The owner has no Apple Music account, so actual personal-library import remains NOT RUN. [Current ledger](completion-followthrough.md). |
| Privacy and assets | PARTIAL | Existing bundle audit excludes private/test audio and verifies cleared instruments and professional studio assets. Manifest covers account/cloud data. Final store answers and account-deletion initiation remain open. |
| Cloud musical reliability | PARTIAL | Approved latest-image trial: 3/4 songs completed, jazz failed vocal-balance validation, all credits settled/refunded and cleanup/shutdown passed. Maximum-library follow-up not started under stop-on-failure rule. |
| Credit payments | PARTIAL | Stripe TEST/provider, local Apple StoreKit and ledger checks pass. Production Apple verification and live/test isolation implemented; three draft Apple products and USD prices saved; actual Apple receipts, net proceeds and activation remain open. |
| Human quality | PARTIAL | Specific owner samples and Academy product acceptance pass. Independent blinded scores, broader language/style calibration and novice mini-set observations are not replaced by automated tests. |
| Physical qualification | PARTIAL | Actual iPhone microphone/play/share and deck acceptance recorded. Physical iPad/Duo, external audio routes, unplugged battery and venue evidence remain NOT RUN. |
| Operations | PARTIAL | Email received, authenticated hosted cleanup and 10 R2 checks pass. One synthetic lifecycle probe awaits provider expiry; no real community submissions await review. |
| Apple release | PARTIAL | [Concrete listing/privacy packet](ios-release-packet.md) saved to draft Jamloom app 6826480059, version 0.7.0, manual release; distribution export, Apple processing, submission and approval remain distinct gates. |

Public generation and credit purchases must remain closed until the applicable quality, billing and owner activation gates pass. Actual proof must be retained for each PASS; no human/device/provider observation is inferred from unit tests.
