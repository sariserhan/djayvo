# Native song and artist discovery

Jamloom 0.7.0 puts **Music DNA → Search songs and artists** first. Suggestions appear automatically after a short typing pause, using the same public iTunes catalogue service as the website. Neither a Jamloom login nor an Apple Music account is needed. Tap a song or artist to add and save it locally; existing favorites and genre metadata are retained. Clearing or changing the query cancels stale searches.

The optional **Import Apple Music favorites → Connect & load favorites** flow is also retained at the owner’s request. Review the list, then tap **Add favorites**. The fixed bottom action remains visible for large libraries. Existing names and musical preferences are preserved; matching names are deduplicated and the total stays within 5,000.

MusicKit requests system permission only after Connect. It supplies authorization on device for the Apple Music API library songs and artists endpoints. Requests extend `inFavorites` and include catalog metadata; only explicitly starred items are selected. Pagination stays on Apple's HTTPS API and the correct library endpoint. Each pass checks up to 100 pages and can resume; network failures retain the preview. Stop or Cancel does not change saved preferences. Names outside the supported length/format are counted and skipped. Imported names are saved atomically only after Add.

No Apple Music audio or artwork is copied. Names and available genres remain on device until the existing explicit account-save or cloud-creation consent. Apple credentials and MusicKit tokens are not sent to Jamloom. The website accepts `apple-music` metadata in the same profile format, preserving genre provenance.

MusicKit App Service is enabled in Apple Developer for Jamloom's existing `com.djayvo.app` identity and team `BA24C6W48D`. The historical bundle identifier preserves installations and local data; the product and App Store name are Jamloom. Automatic token generation means no MusicKit private key is shipped in the app. `NSAppleMusicUsageDescription` explains the access request.

Validation: parser/URL boundaries, explicit authorization, pagination, network retry, cancellation, duplicate/capacity handling, saved-profile preservation, native UI and website profile validation. See the [current ledger](completion-followthrough.md) for physical and real-account evidence. Tests use synthetic metadata; they do not substitute for an actual Apple Music library import.

Apple references: [automatic token generation](https://developer.apple.com/documentation/musickit/using-automatic-token-generation-for-apple-music-api), [library song attributes](https://developer.apple.com/documentation/applemusicapi/librarysongs/attributes-data.dictionary), [library artist attributes](https://developer.apple.com/documentation/applemusicapi/libraryartists/attributes-data.dictionary).

The owner clarified that catalogue autocomplete was the intended request and does not have an Apple Music account. Personal-library import therefore remains NOT RUN with a real account; do not ask the owner to repeat that unavailable check.

## YouTube Music playlists

**Music DNA → Import YouTube Music playlist** accepts a public or unlisted playlist link, including `music.youtube.com` links. Check playlist reads all pages (up to 5,000 items) and uses the same exact catalogue matching as the website. Review matched songs, then Add matched songs. Only iTunes catalogue names and genres are saved; raw video titles, video URLs, audio and artwork are not added to the profile. Unmatched entries link back to YouTube for review. Private playlists and signing into a personal YouTube Music account are not supported by this flow.

Catalogue quotas show a waiting message and pause requests; Stop preserves progress in the open sheet. Continue retries from the last completed item. Closing the sheet discards the preview. Add is available only after every page/item has been checked, and the merge is atomic, deduplicated and preserves existing preferences. An import that would exceed 5,000 favorites is rejected without changing the saved profile.

Spotify import remains disabled because its current [developer policy](https://developer.spotify.com/policy) prohibits the requested AI ingestion/profiling. Credentials alone do not authorize that use. Account-free catalogue search remains available.
