# Release follow-through — October 24, 2026

Owner: “do all those” after the five-item release priority list. This authorizes implementation, release metadata, distribution signing and TestFlight upload; it does not authorize public App Store release, live billing or a new unbounded paid trial.

| Work | Status | Evidence / next action |
|---|---|---|
| In-app account deletion initiation | PASS local implementation; operational completion PARTIAL | Native and web confirmation submit directly to the private support queue; recent verified session required, owner bound, concurrent retries deduplicated. The receipt says request received, not account deleted. Actual deletion is reviewed manually; completion process and timing must be confirmed before public release. Disposable Postgres test, 103 site tests, types/build/bundle and native AccountTests pass. No customer account was deleted. |
| Cloud jazz balance | PARTIAL | Local regression proves the old lower gain bound rejected safe attenuation of a loud converted vocal. Quiet source, silent conversion, excessive amplification, length and finite checks remain guarded. Eight vocal identity and fourteen worker boundary tests pass. The old hosted failure had no gain metrics, so this is a candidate correction, not proof of the hosted cause. Owner approved the two-request $6 plan; worker image is building, and no paid run has started. |
| Apple/TestFlight | PARTIAL | Signed 0.8.0 (12) archive/export and physical installation pass. Two updated physical iPhone UI cases pass. Data Collection is published and verified; age-rating answers are saved. Xcode upload is running. Existing distribution identity and App Store API access verified. No App Store review/public release. |
| Apple sandbox receipts | NOT RUN | Two existing US Sandbox Apple Accounts are available. Owner confirmed device sandbox sign-in; signed purchase, server verification and refund notifications remain required. Public purchase UI remains disabled. |
| Human/hardware/retention evidence | PARTIAL | Existing owner acceptance retained. Independent listeners and unavailable devices cannot be inferred. Read-only storage observation still finds the probe; provider expiry is October 24, 2026 at 11:09:40 PM America/New_York. |

[Prepared bounded trial](evidence/release-completion-20261024/qualification-plan.json). Earlier evidence: [completion ledger](completion-followthrough.md).

## Music DNA alignment

Removed manual energy, tempo, surprise and instrument controls, catalogue ratings/weights, and the separate local composition entry. The phone now uses the web-style favorite list, automatic local saving, practice-track additions and the shared song service. Account-free suggestions, optional YouTube and Apple Music imports, language selection, credit review and explicit consent remain. Historical profile fields and existing recordings remain readable; saved instrumental previews remain playable. The updated UI passed on physical iPhone; build 12 adds the matching privacy manifest. See the validation section below.

## Apple Data Collection — PASS

All eight data types are configured and published; reload confirms “Published a few seconds ago by Serhan Sari.” Email, audio, support, favorites/content, account ID, purchases and coarse country are account-linked; the search cache is unlinked. No advertising/tracking is declared. Favorites/content, country and account ID also declare product personalization. The native manifest and bundle verifier match these answers. [Structured receipt](evidence/release-completion-20261024/app-privacy.json), [saved page](evidence/release-completion-20261024/app-privacy-published.txt), [screenshot](evidence/release-completion-20261024/app-privacy-published.png). This publishes privacy responses, not the app.

## Native alignment validation

**PASS:** two physical iPhone UI checks (live account-free suggestions and favorites add/remove/relaunch) with a finalized result bundle; [summary](evidence/release-completion-20261024/ios-0811-iphone-tests.json), [screen](evidence/release-completion-20261024/music-dna-iphone.png). Seven simulator unit tests and three UI cases pass, but Xcode stalled finalizing the simulator result, requiring termination: **PARTIAL simulator artifact**. Existing profiles and recordings remain compatible. Build 12 only adds the privacy manifest changes to the verified build 11 UI. Signed 0.8.0 (12) archive/export, bundle audit and physical installation pass; subsequent launch encountered the phone lock. No extra unlock request required for the already-passing UI.

TestFlight upload: `altool` exited 139 without uploading a build; App Store API confirmed zero builds afterward. The supported Xcode archive-upload path is now running. Processing is not yet confirmed.
