# Public practice music — 2026-10-21

Three full-length artist recordings are now available in the shared DJ workspace
and Academy through **Try free practice music → Load practice into A/B → Play**.
Confirm the existing music permission checkbox first. The public library uses the
same mixer, transport, consent and replacement guards as user-loaded files.
Existing lesson fixtures and private saved mixes are unchanged.

| Track / artist publication | Style | Duration | Encoded loudness / true peak |
|---|---|---|---|
| [Funked Up — Joth](https://opengameart.org/content/funked-up) | Funk / rock | 1:06 | −18.35 LUFS / −4.17 dBTP |
| [Wednesday Night — Zane Little Music](https://opengameart.org/content/wednesday-night-funk-fusion) | Funk fusion | 2:56 | −17.45 LUFS / −3.01 dBTP |
| [Rhythm Garden — congusbongus](https://opengameart.org/content/rhythm-garden) | Electronic / dance | 3:27 | −18.04 LUFS / −2.72 dBTP |

Each artist's publication explicitly marks the uploaded recording **CC0**, checked
2026-10-21. [CC0's terms](https://creativecommons.org/publicdomain/zero/1.0/)
permit copying, modification, distribution and commercial performance. Credits
are retained even though CC0 does not require attribution. This verifies the
publisher's stated license; it is not a warranty about undisclosed third-party
rights or an artist endorsement. These files are for playback and mixing practice,
not an approved training dataset. No model training or asset purchases occurred.

## Files and reproduction

- `apps/web/practice-audio/`: three MP3s, `manifest.json` and `CREDITS.txt`.
  Manifest includes artist, source/download URLs, original/output SHA-256,
  licensing, edits, duration, measurements and unverified-listening status.
- `scripts/prepare_practice_audio.py`: downloads only the three pinned originals
  into ignored `build-academy/practice`, checks source hashes, preserves full
  duration and encodes stereo 48 kHz / 160 kbps MP3 with loudness normalization.
  FFmpeg 9.0.2 produced the committed files; source hashes remain authoritative
  if another encoder version changes output bytes. Normalization is not a
  beat-grid annotation or a listening-quality evaluation.
- `apps/web/practice-library.js` and `dj.js`: bounded same-origin downloads,
  checksums, abort on permission revocation/unload, existing `loadTrack` path.
  Paused destination required; failure retains the previous track. Loading a
  new track clears its old Academy assessment identity.
- `dj.html`, `dj.css`, `index.html`: accessible chooser, credits, links from both
  decks and accurate offline-storage description. No new audio graph or player.
- Public bundle build/verification explicitly allowlist these five new assets.
  The studio offline ceiling increases from 32 to **40 MiB** for the full tracks;
  the per-file 16 MiB bound and Academy 40 MiB ceiling remain. Audio payload is
  **9,004,932 bytes**. Studio is about 37.4 MB; free Academy pack about 40.5 MB
  including its separate teaching recordings. Cache still excludes private audio,
  account data and paid content. Deployment uses committed MP3s, not live downloads.

```sh
python3 scripts/prepare_practice_audio.py   # optional regeneration; requires FFmpeg
node --test apps/web/tests/*.test.js
npm run build
python3 scripts/verify_web_bundle.py
# With the existing isolated local preview running at 4224:
node apps/site/tests/practice-library.mjs
```

## Validation gates

| Gate | Status | Evidence / limit |
|---|---|---|
| Publisher license and source provenance | PASS | Three primary artist pages, CC0 terms, pinned original and encoded hashes in manifest |
| Encoded audio integrity and headroom | PASS | All three decode; true peaks below −1 dBTP; source pins and output hashes checked |
| Unit and bundle safety checks | PASS | [80/80 tests](evidence/practice-library/unit-tests.log), including corruption, truncation, oversized downloads, external URLs, abort and offline package bounds |
| Production build and public bundle | PASS | [Build output](evidence/practice-library/build.log); actual Next build, no deployment |
| Actual mixer playback | PASS | [Browser receipt](evidence/practice-library/browser.json): all three tracks in Chromium 149.0.7827.55 and WebKit 26.5, advancing time and nonzero output signal |
| Consent / replacement / lesson preservation | PASS | Buttons gated, failed replacement keeps old source, revocation during fetch unloads, original Academy pair still loads |
| Responsive UI / accessibility | PASS | 1920, 390 and 320 CSS-pixel layouts; zero axe WCAG A/AA violations; screenshots in evidence directory |
| Fullscreen regression | PASS | [Receipt](evidence/practice-library/fullscreen.json): both browsers, nine viewports, real playback, native fullscreen/fallback, Academy setup and no overlap |
| Prepared offline playback | PASS | Installed worker, stopped isolated HTTP server, reloaded DJ page, loaded catalogue track and measured actual playback in both browsers |
| Musical enjoyment / course suitability / beat annotations | NOT RUN | No listener evaluation; use Tap tempo, no claimed BPM/key/downbeat accuracy |
| Physical venue/device and public deployment | NOT RUN | Local browser evidence only; no push, deployment or bucket change |

Initial WebKit offline **emulation** failed with an internal navigation error
([original log](evidence/practice-library/webkit-offline-emulation-failure.log)).
The final test uses a physically stopped isolated local HTTP server instead;
both browsers pass cached reload and playback. This does not establish reliability
on a real venue network or physical mobile hardware.

Initial full unit run exposed the offline allowlist test's missing new fixture
names; the fixture was updated to include the explicitly allowed public files.
It still rejects unexpected files, symlinks, per-file overflow and total overflow.
The master specification, C++ engine, recordings, payments and existing AI
musical-quality **FAIL** gate are unchanged. Paid generation remains disabled.
