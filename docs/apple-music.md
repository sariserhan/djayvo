# Native Apple Music favorites

Jamloom 0.6.0 adds **Music DNA → Import Apple Music favorites → Connect & load favorites**. Review the list, then tap **Add favorites**. The fixed bottom action remains visible for large libraries. Existing names and musical preferences are preserved; matching names are deduplicated and the total stays within 5,000.

MusicKit requests system permission only after Connect. It supplies authorization on device for the Apple Music API library songs and artists endpoints. Requests extend `inFavorites` and include catalog metadata; only explicitly starred items are selected. Pagination stays on Apple's HTTPS API and the correct library endpoint. Each pass checks up to 100 pages and can resume; network failures retain the preview. Stop or Cancel does not change saved preferences. Names outside the supported length/format are counted and skipped. Imported names are saved atomically only after Add.

No Apple Music audio or artwork is copied. Names and available genres remain on device until the existing explicit account-save or cloud-creation consent. Apple credentials and MusicKit tokens are not sent to Jamloom. The website accepts `apple-music` metadata in the same profile format, preserving genre provenance.

MusicKit App Service is enabled in Apple Developer for Jamloom's existing `com.djayvo.app` identity and team `BA24C6W48D`. The historical bundle identifier preserves installations and local data; the product and App Store name are Jamloom. Automatic token generation means no MusicKit private key is shipped in the app. `NSAppleMusicUsageDescription` explains the access request.

Validation: parser/URL boundaries, explicit authorization, pagination, network retry, cancellation, duplicate/capacity handling, saved-profile preservation, native UI and website profile validation. See the [current ledger](completion-followthrough.md) for physical and real-account evidence. Tests use synthetic metadata; they do not substitute for an actual Apple Music library import.

Apple references: [automatic token generation](https://developer.apple.com/documentation/musickit/using-automatic-token-generation-for-apple-music-api), [library song attributes](https://developer.apple.com/documentation/applemusicapi/librarysongs/attributes-data.dictionary), [library artist attributes](https://developer.apple.com/documentation/applemusicapi/libraryartists/attributes-data.dictionary).
