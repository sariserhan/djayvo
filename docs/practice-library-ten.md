# Ten-track practice library — 2026-10-21

Expanded the existing chooser from three to **10 full-length recordings**, about
25 minutes in total. These are artist-published CC0 tracks, not generated music.
Select **Try free practice music**, confirm permission, choose a track and load
it into a paused A or B deck. Genre labels now appear in the chooser.

The initial three MP3s and two Academy lesson MP3s remain byte-for-byte unchanged;
see [preservation receipt](evidence/practice-library-ten/preserved-audio.json).
Private mixes, lesson assessments, master specification and AI quality gates are
unchanged. No training, paid services, R2 changes, push or deployment occurred.

## Catalogue

Genre labels describe the artist publication; BPM, key and grids remain unverified.

| Track / artist source | Style | Duration | Integrated LUFS / true peak dBTP |
|---|---|---|---|
| [Funked Up — Joth](https://opengameart.org/content/funked-up) | Funk / rock | 1:06 | -18.35 / -4.17 |
| [Wednesday Night — Zane Little Music](https://opengameart.org/content/wednesday-night-funk-fusion) | Funk fusion | 2:56 | -17.45 / -3.01 |
| [Rhythm Garden — congusbongus](https://opengameart.org/content/rhythm-garden) | Electronic / dance | 3:27 | -18.04 / -2.72 |
| [Party Sector — Joth](https://opengameart.org/content/party-sector) | Dance | 1:36 | -18.87 / -3.81 |
| [Black Diamond — Joth](https://opengameart.org/content/black-diamond) | Drum and bass | 3:21 | -17.64 / -3.01 |
| [Funky Hip Hop Lofi Jam — omfgdude](https://opengameart.org/content/funky-hip-hop-lofi-jam) | Lo-fi hip-hop | 3:09 | -18.28 / -3.74 |
| [Atmosphere — Sudocolon](https://opengameart.org/content/atmosphere) | Electronic | 2:17 | -18.49 / -7.79 |
| [Next to You — Joth](https://opengameart.org/content/next-to-you) | Ambient | 1:23 | -18.35 / -3.44 |
| [Midnight Cruiser — Zane Little Music](https://opengameart.org/content/midnight-cruiser) | Jazz fusion | 2:24 | -18.19 / -6.18 |
| [Midnight Moon — iamoneabe](https://opengameart.org/content/midnight-moon) | Cinematic ambient | 3:27 | -18.51 / -3.19 |

## Licensing and storage

The seven new artist upload pages explicitly identify CC0 1.0; source URLs,
original hashes and page snapshot hashes are in [the source receipt](evidence/practice-library-ten/sources.json).
[CC0](https://creativecommons.org/publicdomain/zero/1.0/) permits commercial
copying, modification, distribution and performance. Credits remain visible in
both the chooser and `practice-audio/CREDITS.txt`. No endorsement is implied.
Publisher declarations are evidence of their stated license, not a warranty about
undisclosed third-party rights. These assets are not added to any training dataset.

The ten MP3s total **30,205,880 bytes** (about 30.2 MB), retaining stereo 48 kHz /
160 kbps encoding. Full tracks are preserved; no padding or repeated copies were
added to reach the count. `prepare_practice_audio.py` pins all ten source hashes
and checks encoded peak headroom. Regeneration used FFmpeg 9.0.2.

Both studio and free Academy offline ceilings change from **40 to 64 MiB** to fit
all ten tracks. The per-file 16 MiB package bound, 10 MiB track download bound and
explicit asset allowlist remain. Package size is about **58.6 MB for the studio**
and **61.7 MB for the free Academy**, including engines and teaching fixtures.
The optional offline UI states the new bound. User recordings, account data and
paid responses remain excluded from the service-worker cache.

## Validation

| Gate | Status | Evidence |
|---|---|---|
| 10 distinct licensed recordings | PASS | Source pages, original hashes, public manifest and unique-source assertions |
| Encoded integrity and headroom | PASS | All ten decoded/measured; true peaks below −1 dBTP; [preparation receipt](evidence/practice-library-ten/audio-preparation.json) |
| Unit tests | PASS | [80/80](evidence/practice-library-ten/unit-tests.log); catalogue/hash/size checks and negative download/offline boundary tests |
| Production build / public bundle | PASS | [Build](evidence/practice-library-ten/build.log), [bundle audit](evidence/practice-library-ten/bundle.json) |
| Browser playback / responsive / accessibility / consent | PASS | [Browser receipt](evidence/practice-library-ten/browser.json): every track plays in Chromium 149.0.7827.55 and WebKit 26.5; no page errors; 1920/390/320 px layouts and zero axe violations |
| All ten tracks offline | PASS | Both browsers reload with the isolated HTTP server stopped, then load and play every one of the ten tracks; measured nonzero mixer signal |
| Human enjoyment, beat grids and venue suitability | NOT RUN | No listening judgment fabricated; use Tap tempo and review tracks before performing |
| Deployment and physical-device validation | NOT RUN | Local preview only |

## Reproduction

```sh
python3 scripts/prepare_practice_audio.py  # optional full regeneration
node --test apps/web/tests/*.test.js
npm run build
python3 scripts/verify_web_bundle.py
# Existing isolated local preview must be running at 127.0.0.1:4224:
node apps/site/tests/practice-library.mjs
```

New evidence is in `docs/evidence/practice-library-ten/`; the earlier three-track
receipts remain intact. Current tests exercise every track online and after
stopping a dedicated static HTTP server, rather than trusting a script download
or a cache listing alone. They also exercise failed replacement, permission
revocation during download, original Academy fixture loading, three viewport
sizes and axe accessibility checks. Automated signal measurements prove audio
execution, not musical enjoyment.
