# Jamloom 0.6.0 release packet

Status: **PARTIAL — prepared for owner review, not submitted to Apple.** Bundle `com.djayvo.app`, version 0.6.0, build 5. The historical bundle ID preserves existing installations; the product name is Jamloom.

## Reviewable listing draft

**Name:** Jamloom  
**Subtitle:** Record, remix and mix music  
**Category:** Music  
**Support:** https://www.jamloom.com/support  
**Privacy:** https://www.jamloom.com/privacy  
**Contact:** support@jamloom.com

Record a short phrase and turn it into a musical preview. Load your own tracks into two DJ decks, shape the mix with the crossfader, and explore performance pads and effects. Save your creations locally and share a WAV through Files or another app you choose.

Jamloom adapts its controls for iPhone portrait, landscape and iPad layouts. Music DNA keeps your favorite tracks, preferred language and musical choices together. Connect Apple Music to preview and import starred song and artist names from your library. Optional cloud creation shows its availability and asks for consent and a price confirmation before starting. Cloud creation and credit purchases are not publicly available in this candidate.

Use recordings and music you have permission to process. Local creation works without an account. An account is required for cloud features. Spotify playback, import and AI ingestion are not included.

**What's new:** Apple Music starred song and artist import with explicit permission and review; shared professional landscape DJ deck; native cloud Music DNA flow with language choice, catalogue search and up to 5,000 favorites; quote confirmation, interrupted-request recovery and verified private audio downloads; improved saved-profile loading.

## Reviewer notes

Start with local Improvise and DJ Deck; these do not require sign-in. Microphone capture starts only after Record and system permission. An imported recording is also supported. Open DJ Deck and rotate to landscape to see both decks and the mixer. Load cleared tracks through Music. Playback stops on backgrounding or when leaving the deck.

Music DNA supports local favorites and instrumental previews. Its cloud button deliberately reports unavailable while the public service is gated. Purchases are disabled in this binary. Do not describe these unavailable services as released functionality in final metadata. No reviewer credentials are embedded in source or this packet; configure a dedicated verified review account only when a final submission is authorized.

The signed development archive is not proof of App Store distribution signing, upload, processing, review approval or public availability.

## Privacy answers for review

No tracking or advertising. Apple Music authorization and library requests occur on device; only reviewed names and available genres are stored, with no audio or artwork copied. Imported preferences leave the device only through the existing explicit account sync or cloud-creation flows. The native manifest declares account-linked email, user ID, user content, audio and purchase history for app functionality. Local recordings/previews stay local; explicit cloud creation uploads the selected recording or favorite metadata. Account profile sync is explicit. Private generated audio uses authenticated access and temporary signed storage URLs. The native app does not include an analytics SDK. Exported copies remain under the destination app's control.

These are draft answers grounded in the current code. Reconcile them with the deployed website, service providers and actual retention rules before submission. In particular, account deletion currently requires support; a suitable in-app account-deletion initiation flow remains a release blocker. Deleting local data or a Music DNA profile does not delete the account.

## Remaining external gates

- Jamloom App Store Connect draft (6826480059) and three consumable product records now exist, with English localizations and draft USD prices ($9.99, $24.99, $49.99). Availability, review metadata, sandbox account and signed receipt/notification delivery remain unfinished. Existing local StoreKit tests do not prove Apple sandbox delivery.
- Distribution signing/export, App Store screenshots in required sizes, final privacy/age/content-rights answers, reviewer access and owner submission approval.
- Actual iPad and Duo, headphones/Bluetooth/MIDI routes and unplugged battery measurements. Simulator and injected fold geometry cannot substitute for these.
- Independent listening and novice Academy observations where required by the product release gates. Owner Academy acceptance already exists; do not ask for that same acceptance again.

Technical screenshots: [native Music DNA](evidence/project-completion-20261023/native-dna-cloud.png), [owner-accepted iPhone deck](evidence/project-completion-20261023/iphone-pro-studio-landscape.png). These are evidence captures, not a completed App Store screenshot set.

Apple references checked: [privacy details](https://developer.apple.com/app-store/app-privacy-details/), [server verification library](https://github.com/apple/app-store-server-library-node). Original master specification is unchanged.
