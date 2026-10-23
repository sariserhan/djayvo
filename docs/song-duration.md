# Variable song lengths — 2026-10-23

**PASS: local implementation, automated checks, actual Mac renders, R2 and production schema.** The owner confirmed Music DNA means **1:40–2:20**, not decimal minutes. Improvise uses **30–45 seconds**. Bounds live in `assets/manifests/song-durations.json`.

New local plans choose a reproducible duration from the fresh seed. Hosted requests select and persist an integer duration before dispatch; replay, settlement recovery and style retries keep it. Existing saved plans remain intact, and older queued hosted payloads retain their original 120/30-second contract. Lyrics receive the chosen length and an appropriate word budget; generation is instructed to resolve naturally. This changes actual inference duration, not playback speed or post-generation trimming.

The planner, renderer validation, four proportional style-check windows, separation, source placement, worker, exact upload grants, receipt validation, R2 reads and database byte limits support the new bounds. The 45-second float32 stem ceiling is covered. Ordinary 15–60-second studio uploads retain their existing default limit. Payment/time/spend caps are unchanged.

## Verification

- **PASS:** 67 Python tests covering duration variety, minimum/maximum boundaries, invalid inputs, retry preservation, style-window coverage, planning, worker uploads, lyric research and Improvise assembly. A 45-second PCM edit preserves audio outside the inserted call.
- **PASS:** TypeScript; 21 cloud-song/audio tests, nine DNA commerce tests and nine admin tests on disposable local PostgreSQL databases. The 140-second receipt settles successfully; incorrect returned duration refunds, and retry dispatch retains its original duration.
- **PASS:** Actual Mac inference from existing original plans at both new upper bounds: 140 seconds (26,880,044 bytes) and 45 seconds (8,640,044 bytes). New seeds, no audio stretching or constructed truncation. [Render receipts](evidence/song-duration/renders.json).
- **PASS:** Both renders uploaded to R2, downloaded and checksum-verified, then added to the public manifest. Titles: **Concrete Roots · 2:20 variation** and **Musician reply · 45-second variation**. The gallery now has 154 samples.
- **PASS:** Chromium desktop 1280px and WebKit mobile 390px load the real R2 samples at `/listening`, report exact duration, seek near the end and play muted without page errors. Repro script: `/tmp/jamloom-duration-browser.mjs`.
- **PASS:** Production migration `0019_song_duration_range.sql`, after matching the prior 18 migration hashes, private mode-0600 backup, PostgreSQL 18 restore and migration rehearsal. Repeat migration is a no-op; song count unchanged. [Migration receipt](evidence/song-duration/migration.json).
- **NOT RUN:** Listening acceptance of these two new endings, full fresh-planner-to-song timing at every length, and hosted inference with the updated image. Technical bounds are not a musical-quality judgment.

## Release order

The worker source, Docker copy list and build-context allowlist are ready. Publish the updated worker first; it also accepts older 120/30-second requests. Then deploy the website that sends `duration_seconds`. The old hosted worker rejects new DNA payloads and cannot generate the new lengths. No worker publication, website deployment or paid compute occurred in this change. Existing generation/billing enablement remains unchanged.
