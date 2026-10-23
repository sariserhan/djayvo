> Superseded for list matching and acceptance by [the corrected flow and evidence](music-dna-fit.md). The examples and results below are historical; they are not songs made from the owner’s rock/metal list. The pinned auditor is now required before generating new songs.

# Music DNA full songs — 2026-10-22

The owner rejected the earlier instrumental output: selecting favorites worked,
but the composition did not reflect their taste and sounded poor. They want a
new song they would choose to listen to, including natural-sounding AI singing.
**Earlier musical acceptance: FAIL. New musical acceptance: NOT RUN.** Technical
checks on the previous renderer remain historical evidence, not acceptance.

## What changed

The web **Make my music** action now uses the existing local Qwen lyric planner
and pinned ACE-Step singer that produced the earlier singer examples. It no
longer calls the simple Music DNA WASM instrumental generator. The original
30-second reply studio, native composer, models and recordings are preserved.
No training, adapter promotion, new dependency, paid compute or cloud upload.

The planner receives the entire favorite list and selected catalogue genres.
It considers each reference, proposes a coherent musical direction, and writes
original lyrics with verses, returning choruses, a bridge and an ending. The
singer receives musical traits and lyrics, not reference audio. A two-minute
stereo vocal song is rendered. Full-song genre descriptions are not restricted
to the reply studio's 23 choices. The two generic voice directions are selected
by the planner; they do not request a named artist's voice.

This is **metadata plus language-model interpretation**, not acoustic analysis.
A model's claimed familiarity is unverified. Unknown references are retained;
a plan that marks everything unknown is rejected instead of supplying a random
instrumental. Creative and factual mistakes remain possible. Prompts discourage
copied lyrics and artist impersonation, but are not a similarity audit.

The page shows the intended song direction, original lyrics and each favorite's
influence. It offers playback, WAV and song-note downloads, exclusive playback,
and restoration of the latest two songs after reload. Favorites remain the only
required input. Search, device/account saving and cleared practice previews stay
available. No original recording is downloaded, sampled or used for training.

## Local execution boundary

`POST /api/taste/song` validates the existing bounded taste profile, then passes
only names/selected metadata and a random seed to `scripts/music_dna_song.py`.
The planner exits before the singer loads. Plans are schema-checked before any
singer work; invalid drafts get at most one local correction. The first complete
JSON object may have redundant closing punctuation, but arbitrary trailing prose,
truncated JSON, invalid plans and missing influence entries are rejected.

One job runs per server process, with a file lock also preventing simultaneous
Music DNA model jobs across server restarts. The planner has a 10-minute bound,
the singer a 20-minute bound, and the server kills the job process group after
31 minutes. Cancellation kills the group and waits for exit. Failed/cancelled jobs
never expose audio as completed. No silent fallback to the old instrumental.
Job status, plans and previous completed outputs remain on disk. Random job IDs,
fixed file names, private response headers and byte-range playback are used.

This endpoint is **disabled by default**, requires an explicitly configured local
root, rejects non-loopback hosts/forwarded callers and cross-origin requests, and
requires a custom header for mutations. It is not a hosted multi-user job service.
Do not expose this preview server through a reverse proxy. Production needs
identity-bound jobs, private hosted storage, worker capacity/cost controls and
required model-quality/release evidence before enabling full songs.

Private data lives in ignored `renders/music-dna-songs/<id>/`: favorite names,
lyrics, plans, logs, raw generation and completed WAVs. Earlier outputs are not
automatically deleted. Deleting browser favorites does not delete song archives;
their notes contain the list used to make them. No account schema migration was
added here. The previous `0015_taste_metadata_size.sql` release requirement remains.

## Run on this Mac

Use the already installed `.venv-singer` and pinned model files documented in
[singing-response.md](singing-response.md). From `apps/site`, build with Node 22,
then start the preview:

```sh
JAMLOOM_COMING_SOON=false \
JAMLOOM_DNA_SINGER_ROOT=/Users/serhansari/Documents/projects/jamloom \
DATABASE_URL='' BETTER_AUTH_URL=http://127.0.0.1:4247 \
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4247
```

Open <http://127.0.0.1:4247/music-dna>. This process has no database configured;
account saving is unavailable here, while device saving and song generation work.
Do not launch the separate singer studio at the same time as a DNA render: its
older workflow does not participate in the DNA lock.

The pinned upstream [inference documentation](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/INFERENCE.md)
was consulted for duration, captions and lyric conditioning. Context7 was not
available in this session. Existing pinned APIs and dependencies are reused.

## Evidence

- **PASS — two real 120-second, 48 kHz stereo songs:** a soul/pop list (Beyoncé, Alicia Keys, John Legend) and an electronic/synth-pop list (The Weeknd, M83, Kavinsky). Different written directions, lyrics, tempos and audio. First generated through the CLI; second through the real website submission and reload flow. Both selected a female voice in these particular runs. [Render receipts](evidence/music-dna-songs/renders.json).
- **PASS — local browsers:** Chromium and WebKit, both real song files, muted playback, seeking to 90 seconds, byte-range responses, no autoplay, exclusive playback, reload, full WAV downloads matching the original SHA-256, and 1280/390/320 px layouts. Zero scoped accessibility violations and page errors. [Actual audio/browser evidence](evidence/music-dna-songs/browser.json). The separate [fixture browser suite](evidence/music-dna-songs/fixture-browser.json) covers search, two submissions, autosave, removal and account-control presentation; its test tones are not model evidence.
- **PASS — 29 site and 14 Python tests:** local access boundaries, request/plan bounds, per-reference evidence, unsupported names, full-song styles, formatting recovery, concurrency, cancellation, previous-output preservation and existing reply behavior. [Site tests](evidence/music-dna-songs/site-tests.log), [Python tests](evidence/music-dna-songs/python-tests.log). TypeScript and the [production build](evidence/music-dna-songs/build.log) pass.
- **PASS — recovery:** corrupt favorites preserved, cancellation during lookup, late lookup cannot start a render, unavailable singer produces no instrumental substitute, partial history loading cannot erase another saved song link. [Recovery checks](evidence/music-dna-songs/recovery.json).
- **FAIL, preserved initial website attempt:** job `0c8de16f058045d9b4396be90d2eb72f` returned excess JSON closing punctuation; inspection also found a genre outside the old reply list. It failed before singing. Both validation issues were fixed, regression-tested and the new website job completed. Raw draft and logs remain local.
- **PARTIAL — automated vocal check:** existing offline tiny ASR recognized intended words/phrases in the first output but also disagreed with several lines. This supports vocal-content execution, not clear diction or naturalness. Lyrics displayed in the page are intended lyrics, not a verified transcription.
- **NOT RUN — human judgment:** enjoyable music, naturalness, reference fit, broad-list generalization, accurate lyric delivery and musical endings. Both examples are for listening, not accepted quality. No claim that parameter changes solve taste matching for every list.
- **NOT RUN — hosted deployment / production model promotion / iOS.** No paid compute or provider upload. The modified broad spec-completion browser script was syntax-checked, not run end to end; its unrelated deck/native parity gates are unchanged.

[Listen to both new songs on the local Music DNA page](http://127.0.0.1:4247/music-dna?song=d0a71022000000000000000000000001&song=b11454224b724e708a68b80faf60d5e2).
They are labeled by original song title, with each source list under **How your favorites shaped this song**. These are representative example lists, not an imported private playlist.
[Artifact hashes](evidence/music-dna-songs/artifacts.json) retain successful and failed evidence; raw audio/model logs remain ignored.
