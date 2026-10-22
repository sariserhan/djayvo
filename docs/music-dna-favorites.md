# Music DNA favorite-song preferences — 2026-10-22

The owner selected Music DNA as the next product and approved making favorite-song choices affect original music. This increment connects explicit, user-confirmed musical choices to the existing local composer. It does not infer a song's sound from its title.

## Delivered

- Each favorite has selectable mood, pace, instruments and arrangement preferences, with relative importance. Apply blends conflicting moods/tempos by weight, combines chosen instruments and selects the strongest arrangement direction; a tie keeps the current direction. Unspecified dimensions stay unchanged. The resulting controls remain editable and are what the renderer receives.
- The existing ten CC0 practice tracks now have user-started audio previews and Add to favorites. Starting another preview or generated variation pauses the previous player. Source/edition/license information stays visible. Favorites also link to searches on YouTube and Spotify, opening their own sites only when clicked.
- The existing version-1 JSON profile gains optional bounded song annotations and direction. Old profiles remain valid; local and private account saves preserve new values. Removing a favorite removes its annotations. Existing authorization, revision conflicts, account isolation and deletion remain in place; no database migration.
- Native profile decoding/encoding preserves the new fields and uses the saved direction. These are compatibility changes, not a new iOS release or native song-preference editor. Preference feedback saves its selected direction with the profile.
- Composition downloads are grouped by generation rather than random seed, so a repeated seed cannot mix two exports. The renderer still receives only numeric musical settings, never titles or provider content. New annotations do not grant training permission.

## Web listening and analysis

This implementation plays already-cleared local copies of the practice catalogue. External search links neither import a playlist nor download a stream. Official Spotify embeds can provide provider-controlled playback ([Spotify documentation](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed)); YouTube policies distinguish embedded playback from prohibited download/audio separation ([YouTube guide](https://developers.google.com/youtube/terms/developer-policies-guide)). An automatic listening/analysis pipeline needs a source and rights that permit that purpose; public availability is not sufficient. No new scraping, provider login, subscription, API credential, embedding or streaming-audio analysis was added.

## Verification

- **PASS:** 44 site tests; five focused taste tests cover weighted preferences, unchanged dimensions, renderer settings, backward compatibility and malformed annotations. TypeScript, production build and public-bundle audit pass. Final build/focused tests use Node 22.23.1.
- **PASS:** Disposable local PostgreSQL + actual account HTTP flow: new profile save/load, invalid annotations rejected, cross-account denial, concurrent-revision protection and delete. No hosted data or real mail.
- **PASS:** iPhone simulator compatibility suite: eight tests passed, one existing real-account harness test skipped. Separate web HTTP tests cover account persistence. Final native build-for-testing passes without booting a simulator.
- **PASS, browser:** [Final Chromium/WebKit receipt](evidence/music-dna-favorites/browser.json): no unexpected console errors or scoped axe violations. Known blocked-analytics and CSS-prefetch warnings are recorded. Test command exercises real production-build Chromium/WebKit, muted catalogue playback, independent controls, two same-seed WAVs, decoded PCM, saved overrides, removal/deletion, three widths and scoped axe.
- **NOT RUN:** New human musical acceptance, external provider playback/import, physical iPhone use, publication/deployment. Existing musical-quality gates remain open.

Preserved local artifacts: `renders/music-dna-favorites-20261022/` (four WAVs, six desktop/mobile screenshots, receipts and logs). [Browser receipt](evidence/music-dna-favorites/browser.json), [account HTTP receipt](evidence/music-dna-favorites/http.json) and [artifact hashes](evidence/music-dna-favorites/artifacts.json) are tracked. The two same-seed examples are a 32-second gentle piano composition and a 31.14-second fast drum composition, demonstrating control changes, not listening approval.

The simulator run triggered repeated Apple `com.apple.PosterBoard` crashes at 18:45. Local crash reports identify `launchd_sim` as the parent; Jamloom tests passed. No simulator remains booted. The Apple runtime root cause was not established; no simulator reset or deletion was performed.

## Reproduce

From `apps/site`, build with Node 22 and run a local production server with `JAMLOOM_COMING_SOON=false`. Keep its port separate from other work.

```sh
node --import tsx --test tests/taste.test.ts
npm run typecheck
npm run build
npm run audit:bundle
JAMLOOM_TEST_URL=http://127.0.0.1:4247 node tests/taste-browser.mjs
JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres JAMLOOM_TEST_EVIDENCE=/tmp/jamloom-dna-http.json node --import tsx tests/product-http.mjs
```

The browser test defaults to `/tmp/jamloom-dna-browser`, suppresses physical output and blocks external requests. Blocked VisitorPing and Next CSS prefetch warnings are retained separately; unexpected console errors fail. No Spotify/YouTube playback or third-party request is needed for this test.

## Searchable favorite picker — 2026-10-22

Replaced the multiline textarea with an accessible autocomplete dropdown. Matches update on each keystroke, rank exact/prefix matches ahead of substrings, and tolerate one typo in words of four or more characters. Artist and track rows are labeled separately; saved favorites are also searchable. Accent-insensitive matching and non-Latin text are supported. Users can select with keyboard/pointer, add an unlisted name and remove a favorite with its associated annotations. Existing profile storage and composer behavior are unchanged.

Coverage is explicitly the existing ten-track practice catalogue plus saved favorites. This is not a global Spotify/YouTube catalogue search. No query leaves the device, no provider API is added, and no new payment/configuration is needed. MusicBrainz was considered but not integrated: its [official API FAQ](https://musicbrainz.org/doc/MusicBrainz_API/FAQ) directs commercial users to a commercial plan/contact. That service is not assumed authorized for this product.

Six focused tests, typecheck and production build pass. Chromium and WebKit pass at 1280, 390 and 320 pixels, with zero accessibility violations and no unexpected console errors. An initial Remove button label mismatch was corrected before the passing rerun. [Browser evidence](evidence/music-dna-search/browser.json) covers autocomplete, duplicate prevention, custom-name fallback, storage and unchanged composition flow; [artifact hashes](evidence/music-dna-search/artifacts.json) identify the raw screenshots/audio and logs under `renders/music-dna-search-20261022/`. The picker uses the [WAI-ARIA combobox interaction pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). No deployment or new musical listening acceptance.


## Live artist and song search — 2026-10-22

**PASS — local implementation, live-provider and browser verification.** Supersedes the local-only search limitation above. The owner requested live name lookup after `bey` could not find Beyoncé. The dropdown now queries Apple's public iTunes catalogue through `POST /api/music-search` after two characters and a 400 ms typing pause. Artist and song rows include provider/album labels; selections use the existing favorite storage and annotations. Local suggestions and Add by name remain available. Search does not connect Spotify/YouTube accounts, import playlists, download music/artwork, or send reference audio to an AI model. No song's audio attributes are inferred from its name.

The endpoint uses one combined artist/song request, validates query and response fields, limits result/name lengths, rejects cross-site browser requests, times out after five seconds and does not retry automatically. It forwards only the search term and fixed catalogue parameters, not cookies, account identifiers or recordings. POST keeps search terms out of our request URLs; responses are private/no-store. Names are cached without user identity for one hour, bounded to 200 entries; simultaneous identical lookups share a request. Each browser caches up to 100 result sets for five minutes, cancels superseded requests and discards stale responses. Privacy/help copy discloses this new data flow.

Apple documents approximately 20 requests per minute and recommends caching. The server enforces 20 uncached requests per rolling minute **per process**, with a friendly busy fallback. This is a local/small-deployment implementation; before multiple-instance or high-traffic launch, use a shared provider budget/cache or obtain higher-capacity catalogue access. The US storefront is used; this is a broad catalogue, not a promise of every song worldwide. No key, new dependency, paid service or deployment was added.

Sources checked: [Apple iTunes Search API](https://performance-partners.apple.com/search-api), [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [React effect cleanup](https://react.dev/reference/react/useEffect). Context7 was unavailable; official documentation was used. Apple's promotional audio/artwork is not included. MusicBrainz remains unused.

Validation commands (Node 22, from `apps/site`):

```sh
node --import tsx --test tests/taste.test.ts tests/music-search.test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
node tests/music-search-browser.mjs
```

Browser flow: Music DNA -> type `bey` -> live Beyoncé and track results -> select artist and Halo -> save/reload; then offline, rate-limit, empty-result, stale-response and local fallback checks. Browser plugin runtime could not be discovered; the existing project Playwright workflow is used for Chromium/WebKit. No audio is played, no simulator is opened, and no production data is changed. The existing composition, product and spec browser tests stub this new endpoint so their local checks cannot consume provider quota.

**PASS:** Eleven focused unit/contract tests, TypeScript, production build; Chromium and WebKit at 1280/390/320 px with live `bey` artist/track results and `halo beyonce` selection, keyboard/pointer selection, duplicate prevention, save/reload, single-character suppression, debounce/cache reuse, stale-response rejection, mocked 503/429 and empty results, local/custom fallback. Zero scoped axe violations and unexpected console errors. Initial same-origin rejection caused by Next's internal hostname was fixed with browser-facing Host validation and a regression test; the first follow-up browser test needed to recognize the intentionally deduplicated saved-favorite row. Final rerun passes. [Browser receipt](evidence/music-dna-online/browser.json), [artifact hashes](evidence/music-dna-online/artifacts.json); raw six screenshots and logs: `renders/music-dna-online-20261022/`.

**NOT RUN:** Public deployment, multiple-instance/high-volume capacity, iOS, new listening evaluation. No audio engine changes. The original broader product/spec/composition browser suites were not rerun; their new endpoint stubs were syntax-checked. Local preview: <http://127.0.0.1:4247/music-dna>.


## Automatic favorites-only composition — 2026-10-22

**PASS — local favorites-only workflow, automatic composition, browser and account verification.** Owner direction supersedes the manual annotation workflow above: the only required input is a favorites list. Removed per-song “What would you like in your music?”, mood/tempo/instrument/influence questions and the manual apply step. Main flow: add favorites -> **Make my music** -> play/download or make another variation. Local autosave is automatic; optional duration/account actions and cleared practice previews are collapsed. Old profile fields and annotations remain compatible/preserved; old liked/loved practice catalogue choices become list entries, while avoid rows remain stored without becoming favorites. Legacy feedback settings no longer control this automatic path.

Search results now retain validated source identity and genre (`primaryGenreName`) with a selected artist/track. Saved profiles optionally carry bounded `referenceMetadata` (reference, genre, source and optional provider ID). Existing profiles load without it. At composition time, missing metadata is resolved through the existing bounded search endpoint; only exact normalized artist or title-and-artist matches are accepted. Ambiguous/unmatched names remain unknown, and provider failure does not delete favorites or block a general composition. Cancellation stops lookups and rendering; stale jobs cannot replace a later composition.

`automaticTaste` combines every distinct favorite with equal influence. Genre families choose tempo, energy, playable instruments and arrangement direction for the existing native/WASM composer; these are composition heuristics, not measurements of source audio. Known labels and unresolved coverage are visible under **How we choose your sound**. Unknown-only lists use an explicitly labeled general original composition. This does not claim to understand a reference's exact groove, melody, key, harmony, instrumentation, vocal qualities or emotional meaning. No provider audio/artwork is downloaded, no model training is added, and no paid generation is enabled. Musical acceptance remains separate.

The existing JSON account profile stores the optional metadata. Migration `0015_taste_metadata_size.sql` widens its bounded JSON size check from 16 to 64 KiB; no rows are deleted or transformed. The new migration is required before deploying this account workflow. Taste requests alone permit up to 64 KiB to accommodate 20 Unicode references plus metadata/legacy annotations; all other bounded request routes retain their 16 KiB default. iOS remains deferred; older clients can still consume the ordinary profile fields but may drop the new optional metadata when resaving, which the web can resolve again.

Validation: `node --import tsx --test tests/taste.test.ts tests/taste-auto.test.ts tests/music-search.test.ts tests/config.test.ts`, TypeScript/Next build, `tests/taste-browser.mjs` for actual same-seed WAVs with different favorites, `tests/music-search-browser.mjs` for live provider lookup/persistence, and disposable-loopback `tests/product-http.mjs` for authenticated metadata persistence and large Unicode profiles. Browser plugin runtime remains unavailable; existing Playwright Chromium/WebKit checks run muted. No simulator is opened.

**PASS:** 27 unit/contract checks; TypeScript and production build; live provider metadata selection and automatic save/reload in Chromium/WebKit; full local composition flow at 1280/390/320 px with zero scoped accessibility violations or unexpected console errors. The same seed with a Classical-only list produced a 30.57-second piano WAV at 84 BPM; a Dance-only list produced a different 30.13-second bass/drums/synth WAV at 128 BPM. Four real WAVs across both browsers are finite, non-silent and below full scale. These prove automatic parameter/audio changes, not musical-quality acceptance.

**PASS:** Disposable local Postgres migration/account round trip, owner isolation, revision conflicts, deletion, and 20 long Unicode favorite names plus metadata. The first large-list attempt exposed the prior database's 16 KiB constraint; migration 0015 fixed it and the rerun passed. `node tests/taste-recovery-browser.mjs` also verifies corrupt storage stays intact until a new list is started, cancellation during metadata lookup retains favorites, and a late response cannot start rendering.

Evidence: [composition browser receipt](evidence/music-dna-auto/browser.json), [live search](evidence/music-dna-auto/live.json), [account HTTP](evidence/music-dna-auto/http.json), [recovery](evidence/music-dna-auto/recovery.json), [artifact hashes](evidence/music-dna-auto/artifacts.json). Raw screenshots, four WAVs and logs: `renders/music-dna-auto-20261022/`.

**PARTIAL:** Automatic taste understanding is limited to catalogue genre metadata and our arrangement rules; deep audio/style understanding is not implemented. **NOT RUN:** New human musical acceptance, iOS, production migration/deployment and high-volume provider capacity. Broader product/spec browser suites were updated and syntax-checked, not rerun in full. Basic/Pro acceptance stays closed; iOS and general launch remain later work.
