# User sound inside the song — 2026-10-22

The owner listened to the previous singer previews and said: “they are great I
loved them.” That is positive informal listening evidence for those takes. The
owner rejected the disconnected source-only introduction and requested creative
use of the input inside the song, plus many more musical styles.
[Recorded feedback](evidence/integrated-singer/owner-feedback.json).

## What changed

The song is now 30 seconds, with the band playing from the beginning. One
recognizable source hook sits inside the music; shorter source fragments return
in two later sections. Their rhythm follows an estimated grid from the actual
drum stem. Modest pitch-preserving time stretch fits fragments to the groove,
with style-specific syncopation and a quiet rhythmic delay on selected answers.
The source file itself is preserved.

The arrangement creates space around the sample: it fades the estimated singer
stem out during the source phrases, lowers accompaniment, and makes a drum-led
break around the middle motif. This changes the band and singer arrangement,
not just the sample start time. Selection depends on source length, available
crops, the measured drum pulse, local singer energy, style and seed. Each export
includes replayable event/crop/transform metadata and separate user/music stems.

Style choices are now **Reggae, Hip-hop, Funk, House, Disco, R&B, Soul, Afrobeats,
Latin pop, Drum and bass, Acoustic pop and Rock**, plus Surprise me. Both voices
work with every choice. Each style has its own tempo, instrumental description
and sample rhythm. These are generation controls; they do not guarantee perfect
genre or voice fidelity. Default CLI drafting remains capped at four candidates.

The interface puts **Your sound inside the song** first. The unarranged singer
and band are under a comparison disclosure. New songs use the integrated path;
there is no silent fallback to the rejected source-only introduction.

## Listen and run

- Six-style review: `renders/integrated-singer-review-20261022/review/index.html`.
  Start with **Your sound inside the song**, then compare the singer before
  sample arrangement. Reggae and hip-hop reuse two of the original takes;
  funk, house, drum and bass, and acoustic pop are new renders. The review uses
  assistant-authored responses to the owner's question example.
- Interactive studio: <http://127.0.0.1:4198/>. Start it with
  `.venv-singer/bin/python scripts/singer_studio.py`. Choose any of the 12 styles,
  record/upload a permitted 2–5 second sound, confirm its words and make a song.
  This path generates new lyrics with the existing local planner.
- Existing singer renders now need a matching `stems/` analysis before assembly:
  `.venv-singer/bin/python scripts/separate_singer.py --input PATH/singer.wav --output PATH/stems`.
  The studio and review builder perform this step automatically. All outputs use
  fresh directories; existing source, singer and review files are retained.

No autoplay, cloud recording upload, new paid compute, training, publication or
production promotion. Existing iOS and physical qualification boundaries remain.

## Implementation and evidence

**PASS, local implementation:** the shared style catalogue supplies the CLI,
validation, generator prompts and studio choices. Plan tests exercise all 24
voice/style combinations. The source arranger validates consent, source hashes,
exact singer/stem matching, bounded crop/event coordinates and finite audio.
Missing or corrupt stems fail closed. Seven tests cover plan limits, consent,
actual FFmpeg time stretch, bounded crops, tempo recovery from a known pulse,
source integrity, non-overlapping dry sample events and deterministic assembly.
[Test log](evidence/integrated-singer/tests.log).

**PASS, rendered audio and browser checks:** six integrated arrangements and
twelve loudness-matched players, including four newly generated styles. Every
mix stays at 30 seconds and has 5–7 source events. The measured accompaniment
RMS under the clean hook is nonzero in every case; original source reconstruction
stays within the stated PCM tolerance. [Audio measurements](evidence/integrated-singer/review-audio.json),
[singer/separation receipts](evidence/integrated-singer/renders.json).
Chromium and WebKit pass playback, seek, exclusive playback, downloads and
320/375 px layouts. [Listening-page checks](evidence/integrated-singer/browser.json).

The actual studio flow also generated a new Disco song from an upload, drafted
lyrics locally, separated it and assembled six source events into a 30-second
song. Consent rejection, all 12 style choices, no autoplay and playback controls
pass. [Studio checks](evidence/integrated-singer/studio-browser.json),
[real render](evidence/integrated-singer/studio-render.json),
[style menu](evidence/integrated-singer/style-menu.json). The inherited Gradio
waveform-reload `AbortError` is recorded as a known warning; other page errors
fail the check. R&B, soul, Afrobeats, Latin pop and rock have validated controls
and plans, but no new audio audition in this increment.

**PASS, original preservation:** immutable specifications, prior recordings,
models and all four accepted singer WAVs remain hash-identical.
[Preservation check](evidence/integrated-singer/preservation.json).

The new separator uses the already installed TorchAudio 2.10.0 implementation of
Hybrid Demucs, on CPU with four threads and overlapping six-second chunks.
The 334,697,255-byte official checkpoint is pinned and checked before loading
with `weights_only=True`; see [manifest](../assets/manifests/singer-separation.json).
It estimates vocals and drums. The remaining band is computed as original mix
minus estimated vocals, so analysis does not replace the original singer take.
No package was added to the frozen environment. `scripts/setup_singer.sh` now
also acquires and verifies this checkpoint.

Official references: [TorchAudio model documentation](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS.html),
[upstream Demucs project and MIT declaration](https://github.com/facebookresearch/demucs#license).
The model is used locally for research; checkpoint redistribution and production
rights/quality acceptance are not claimed. Context7 was unavailable; the installed
API source and official documentation were checked.

## Limits that still need listening

**PARTIAL:** drum analysis estimates tempo and beat phase near the requested
tempo. It does not certify musical downbeats, key or perfect beat alignment.
Source cuts use supplied crop metadata or amplitude valleys; they are not
verified word/phoneme boundaries. A clean, unwarped hook remains in every output.
Its isolated PCM matches the original crop within half one PCM16 quantization
step, excluding its short edge fades and documented gain.

**NOT RUN:** owner acceptance of these new arrangements and new styles, blind
musical comparison, separation transparency and broad source generalization.
Estimated vocal stems can leave bleed or remove some instrumentation; the short
sample echoes can continue underneath the returning singer. The rule-based
arrangement is more responsive, but it is not a learned live musician policy.
The owner's praise of the prior takes does not transfer automatically to these
new edits or close M1. Local feature delivery does not imply hosted integration.
