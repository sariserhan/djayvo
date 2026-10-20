# Night Current — standalone song

2026-10-20. Owner instruction: pause improvisation and make a song in the broad
Blood Club direction. Q0 is paused; its failed listening result is unchanged.

**Night Current** is a 120.571-second, 140 BPM instrumental: filtered opening,
build, first drop, sparse breakdown, rebuild, changed second drop and outro.
This is an authored arrangement of existing original generated material, not a
fresh model generation or an improvement to the improvisation engine.

Listen locally at <http://127.0.0.1:4212/>. Downloads:

- `~/Downloads/Jamloom - Night Current.wav` — stereo, 48 kHz, 24-bit PCM.
- `~/Downloads/Jamloom - Night Current.mp3` — stereo, 320 kbps.

## Source and arrangement

`experiments/songs/night_current.py` uses one existing original ACE-Step output,
`renders/cloud-trial-20261018/club-seed-7441.wav`, to preserve its harmonic identity.
The pinned batch manifest records a base-model, seed-7441 text-to-music generation
without source/reference audio or an adapter. Existing trial code/weight provenance
is documented in [the cloud trial](cloud-music-trial.md). No new cloud rental,
API generation, model training or purchase occurred.

The arrangement adds deliberate phrase edits, filter motion, breaks, snare builds,
noise transitions, repeats, echoes and an ending. Recorded snare layers come from
the existing CC0 Virtuosity Drums cache; exact sample paths, pinned commits,
hashes and attribution are in [song.json](evidence/night-current/song.json).
No Blood Club recording, lyrics, melody transcription or performer voice was used.
The reference informed only the broad tempo, half-time bass direction and contrast.
This does not establish similarity, originality against every existing work, or
professional quality through listening.

The local render folder preserves arrangement, transition and snare-build buses,
premaster, final WAV/MP3, edit-frame schedule and credits. These buses are not
isolated stems of the original generated backing. Existing recordings and plans
were preserved. Audio is local and ignored by Git; source and compact evidence
are committed. The master specification and production application are unchanged.

## Validation

| Gate | Result | Evidence / limitation |
|---|---|---|
| Render and exports | PASS | Fresh output directory; pinned source/sample hashes; finite samples; 120.5714375 seconds |
| Levels | PASS | WAV −15.09 LUFS, −1.21 dBTP; MP3 −15.09 LUFS, −1.14 dBTP; LRA 13 LU |
| Files and Downloads | PASS | All six WAV/MP3 hashes verified; Downloads copies byte-identical; zero full-scale decoded samples |
| Browser player | PASS | Chromium 149.0.7827.55 and WebKit 26.5: decode, seek, muted playback clock, downloads, 390/1280 px layouts; no runtime errors or external-origin requests |
| HTTP seeking | PASS | Exact initial, suffix and open-ended byte ranges; malformed/unsatisfiable ranges rejected |
| Musical alignment | PARTIAL | Estimated 140 BPM grid; edit positions recorded, no verified beat transcription or listening confirmation |
| Human listening / reference-level quality | NOT RUN | No listening verdict for this new song; browser clock and loudness are technical evidence only |
| New training / production integration | NOT RUN | Outside this standalone song task; improvisation remains paused |

The first player attempt lacked HTTP range support. A loopback-only range server
fixes seeking before a full download. A later test also incorrectly classified
WebKit's same-origin blob URLs as external; the assertion now compares origins.
Both failed logs remain alongside the successful browser and audio reports.

## Reproduce

From the repository root, with the existing original generation, CC0 sample cache,
NumPy/SciPy environment and FFmpeg available:

```sh
.venv-analysis/bin/python experiments/songs/night_current.py --output renders/night-current-replay
```

The renderer refuses existing output directories and asserts source/sample hashes,
finite output, headroom and final true peaks. It uses a fixed transition-noise seed.
Its exact source digest is in `song.json`; this delivery did not run a second full
render comparison. Rendering from a fresh clone alone needs the local audio cache.

To recreate the existing player folder if absent:

```sh
mkdir -p renders/night-current-20261020/review
cp -n experiments/songs/night_current.html renders/night-current-20261020/review/index.html
cp -n renders/night-current-20261020/song-v1/'Night Current.wav' renders/night-current-20261020/review/
cp -n renders/night-current-20261020/song-v1/'Night Current.mp3' renders/night-current-20261020/review/
cp -n renders/night-current-20261020/song-v1/CREDITS.txt renders/night-current-20261020/review/
.venv-q0/bin/python experiments/songs/serve.py
```

With that server running, exact verification commands:

```sh
.venv-analysis/bin/python docs/evidence/night-current/verify.py
node docs/evidence/night-current/check.mjs
```

Both completed successfully. [Audio/range results](evidence/night-current/verification.json),
[browser results](evidence/night-current/browser.json),
[render log](evidence/night-current/render.log), and mobile screenshots are retained.
No production website deployment or Q0 acceptance is implied.
