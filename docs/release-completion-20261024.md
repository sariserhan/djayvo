# Release follow-through — October 24, 2026

Owner: “do all those” after the five-item release priority list. This authorizes implementation, release metadata, distribution signing and TestFlight upload; it does not authorize public App Store release, live billing or a new unbounded paid trial.

| Work | Status | Evidence / next action |
|---|---|---|
| In-app account deletion initiation | PASS local implementation; operational completion PARTIAL | Native and web confirmation submit directly to the private support queue; recent verified session required, owner bound, concurrent retries deduplicated. The receipt says request received, not account deleted. Actual deletion is reviewed manually; completion process and timing must be confirmed before public release. Disposable Postgres test, 103 site tests, types/build/bundle and native AccountTests pass. No customer account was deleted. |
| Cloud jazz balance | PARTIAL | Local regression proves the old lower gain bound rejected safe attenuation of a loud converted vocal. Quiet source, silent conversion, excessive amplification, length and finite checks remain guarded. Eight vocal identity and fourteen worker boundary tests pass. The old hosted failure had no gain metrics, so this is a candidate correction, not proof of the hosted cause. New two-request $6 plan prepared; no paid run started. |
| Apple/TestFlight | PARTIAL | 0.8.0 (10) archive and screenshots are being prepared. Existing distribution identity and App Store API access verified. No App Store review/public release. |
| Apple sandbox receipts | NOT RUN | Two existing US Sandbox Apple Accounts are available. Actual device sign-in, signed purchase, server verification and refund notifications remain required. Public purchase UI remains disabled. |
| Human/hardware/retention evidence | PARTIAL | Existing owner acceptance retained. Independent listeners and unavailable devices cannot be inferred. Read-only storage observation still finds the probe; provider expiry is October 24, 2026 at 11:09:40 PM America/New_York. |

[Prepared bounded trial](evidence/release-completion-20261024/qualification-plan.json). Earlier evidence: [completion ledger](completion-followthrough.md).
