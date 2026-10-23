# Whole-playlist Music DNA

2026-10-23. Owner request: paste a whole YouTube playlist and infer taste automatically.

## Behavior

- Paste a public/unlisted playlist and press **Use this playlist**. The browser follows every page, then checks every available unique video against the music catalogue. No separate match/select/add steps.
- Progress distinguishes reading, matching and provider waits. Cancel leaves existing favorites unchanged. Failed or cyclic pagination cannot save a partial list. Matched favorites are added atomically and deduplicated against the existing list.
- Missing/private/deleted entries and duplicates are counted. Unmatched titles remain available under **songs need a match** for manual search. Karaoke, covers, ambiguous genres and different track versions are not guessed into the list. Official-video boilerplate is normalized across several languages; musical-version labels remain meaningful.
- This uses catalogue metadata and model interpretation, **not audio analysis**. YouTube titles/URLs are transient; the saved profile contains matched catalogue favorites. No model training or YouTube audio download occurs.
- Profiles support up to 5,000 favorites with a 4 MiB request/profile bound. An oversized list fails explicitly instead of truncating. Only 12 favorite cards initially render; the full list is still saved and sent to composition.
- All matched favorites vote in the full-list genre distribution. The language planner considers every favorite in bounded batches and records unknown languages. The songwriter receives at most 12 varied examples plus the authoritative full-list direction/counts. Notes distinguish individual interpretations from genre-only contributions; all favorites remain bound to the saved plan.
- Provider search remains limited to 20 uncached requests per minute per process. Waits retry automatically; large uncached playlists can take substantially longer than small ones. Keep the tab open. Existing per-process quota/cache limitations remain; no new paid provider or shared cache introduced.

## Verification

**PASS — local implementation and regression checks.** TypeScript; 60 TypeScript/integration tests followed by the new database-size regression; 20 Python planner tests and 10 worker tests. Tests cover late-list genre majority, Unicode/5,000-row round trips, quota retries, malformed/cyclic pagination, cancellation, privacy, full generation payloads, language votes beyond the first 20, bounded songwriter prompts and worker input size.

**PASS — browser.** Chromium 1280px and WebKit 390px: automatic two-page 53-entry import, 52 matched favorites including 32 later metal songs, duplicate imports, unmatched review, cancellation/error preservation, full generation payload, reload persistence, accessibility, no overflow or page exceptions. Provider and generation transport are fixtures in these checks. `apps/site/tests/playlist-browser.mjs`; `/tmp/jamloom-whole-playlist-browser/report.json` and screenshots.

**PASS — live whole-playlist scan; PARTIAL — catalogue coverage.** The real public YouTube playlist returned 182 available entries across four pages. All were checked: 77 unique exact catalogue matches, one repeated matched song, and 104 unmatched entries. Provider quota waits were honored. Missing originals were not replaced with karaoke/cover recordings. The UI warns when most entries remain unmatched; the generated taste reflects identified songs, not a claim of understanding unknown entries. [Receipt](evidence/whole-playlist/live-playlist.json).

**PASS — actual local model planning.** A 30-favorite multilingual evaluation list produced a validated plan in 50.5 seconds. All 30 favorites/influence records remain; language accounting includes 21 interpreted vocal-language entries and nine unknown entries. Initially the model omitted a language row, then struggled with 20 detailed songwriter examples. Explicit numbered language inputs, a 12-example songwriter budget, and narrowly scoped malformed-JSON recovery resolved these observed failures. The rejected artifacts remain under ignored `build-playlist-taste/`; the successful plan is `build-playlist-taste/local-draft-v3/plan.json`. [Receipt](evidence/whole-playlist/local-draft.json). These are model interpretations, not verified linguistic/musicological facts. No audio was rendered.

**PASS — production database migration.** `0020_whole_playlist_profiles.sql` expands private JSON storage to 8 MiB, providing room for JSONB whitespace beyond the 4 MiB request bound. Prior migration hashes matched; a private mode-0600 backup was restored into disposable PostgreSQL 18 and migration rehearsed before application. Repeat apply is a no-op; song count unchanged. [Receipt](evidence/whole-playlist/migration.json).

## Release boundary

**NOT RUN:** website deployment, worker publication, paid GPU execution, new song listening acceptance and maximum-size real model performance. Publish the updated worker before enabling larger-list requests on the website; an older worker still rejects more than 20 favorites. Existing generation/credit availability settings were not enabled (localhost currently reports generation and credits unavailable).

No credentials, private playlist URLs or database backups are committed. Required pagination follows [Google's playlistItems.list documentation](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list). Context7 tools were unavailable, so official documentation was consulted directly.
