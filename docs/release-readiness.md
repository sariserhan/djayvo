# Release readiness

**Overall: PARTIAL. Publication and monetization: NOT RUN.** The owner authorized
local implementation through the specification on 2026-10-18. This is not owner
release approval and does not remove the master specification's quality gates.

| Gate | Status | Evidence or remaining action |
| --- | --- | --- |
| Original/cleared instruments | PASS | 53 pinned CC0 acoustic samples, 14 original electronic samples; existing offline asset audits; full notices bundled and visible in app |
| Reference/private material exclusion | PASS | App sources only include the original core bank; Release excludes the Debug speech fixture; private recordings/reference music remain under ignored paths |
| Local privacy implementation | PARTIAL | Opt-in recording, visible capture state, no network SDK, backup exclusion, local deletion, WAV-only sharing and privacy manifest implemented; owner Release recording/playback passed; route/interruptions and fuller permission checks remain |
| Public privacy/support material | PARTIAL | [Policy draft](privacy-policy-draft.md) prepared; owner entity/contact/public URL/effective date and review remain |
| iOS compilation and tests | PARTIAL | [Current run](ios-instant-remix.md); physical device, supported-OS matrix, accessibility and sustained tests are distinct gates |
| Content/share safeguards | PARTIAL | Permission affirmation and share reminder; no hosted feed/accounts/uploads. Public content moderation/report/removal obligations need product/legal/App Review review before release or community features |
| Musical quality | PARTIAL | Prototype owner acceptance only; club v8 and formal M1 comparisons still lack ratings |
| Beta and demand | NOT RUN | No fabricated testers, retention, enjoyment, share intention or market demand |
| Store listing/signing/review | NOT RUN | No submission, listing, distribution archive or App Store approval; owner must approve concrete release candidate |
| Paid services/paywall | NOT RUN | No paid service, provider, entitlement or purchase code; premature without quality/demand and a selected business model |

## Concrete release candidate checklist

1. Use an accepted engine revision with formal M1 observations and a frozen asset
   inventory. Preserve failed styles and source/reviewer exclusions.
2. Run the app tests on supported physical phones. Test microphone allow/deny,
   Settings revocation, 2/5-second capture, imports/corrupt files, trims, each
   style, cancellation, relaunch, interruptions, headphones/Bluetooth/speaker,
   share-to-Files, deletion, low storage, large text and VoiceOver.
3. Record generation p50/p95, peak memory, CPU, thermal state and battery change
   during repeated foreground generation/playback. Run unplugged idle/control
   comparisons; simulator wall time is not device battery evidence.
4. Review the compiled Release bundle's assets, notices, privacy manifest and
   actual API/dependency inventory. The manifest declares in-app timing and
   app-container/user-selected-file metadata reasons. No tracking/collection is
   declared for this local implementation; re-audit after adding any SDK.
5. Complete public policy/support details and age/rights disclosures, then review
   current store rules. Current Apple guidance requires accurate metadata,
   tested builds, privacy disclosures and safeguards for generated/user content;
   this document does not certify compliance or predict approval.
6. Invite only authorized beta testers and use appropriately consented sources.
   Obtain actual quality and product feedback. Opt-in performance diagnostics
   must exclude raw recordings/transcripts; no analytics SDK is added merely to
   fill a checklist.
7. Prepare a signed archive and reviewable listing/screenshots/privacy answers.
   Obtain the owner's release approval as the final publishing step.

Apple sources checked for this preparation:
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/),
[required API reasons](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype).
The original master specification remains unchanged.
