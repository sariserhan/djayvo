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
