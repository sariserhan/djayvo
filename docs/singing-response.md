# Local AI musician voice — 2026-10-22

**Update:** The owner liked these singers. The introductory source playback and two-style limit are superseded by the [integrated sample arrangement and 12-style studio](integrated-singer.md). This report preserves the original audition evidence.

The owner clarified that the requested musician is a natural-sounding **AI
singer**, separate from the submitted user recording. The local implementation
uses lyric-conditioned song generation, with male/female and reggae/hip-hop
choices. It does not use spoken TTS or pitch the user's voice into a singer.

## Listen and make another reply

Open `renders/singing-response-review-20261022/review/index.html` on this Mac.
Four different 30-second singer performances answer the owner's “I have a
question” example. Each card has **Hear the AI singer** and **User phrase →
singer reply**. The four demo lyric plans were authored by the assistant; they
are not evidence of the local lyric model's reasoning. Nothing autoplays.

The interactive local studio is at <http://127.0.0.1:4198/> while running:

```sh
.venv-singer/bin/python scripts/singer_studio.py
```

Record or upload a permitted 2–5 second phrase, confirm its words, choose a
singer/style or Surprise me, and select **Make a sung reply**. The local language
model drafts a new response; the singing model renders it with accompaniment.
The original sample plays once or twice before the singer enters. The studio
returns both the singer and the assembled exchange, with downloads and intended
lyrics. One queued generation runs at a time; it can take several minutes.
Recordings, intended lyrics and results remain in the ignored
`renders/singer-studio/` directory; Gradio also retains local upload cache files.
No recording is uploaded to a provider. The server binds only to loopback.

## Model and runtime

The [model manifest](../assets/manifests/singing-model.json) pins ACE-Step source
`ca1e85fe9430179831e6bc6be790c332190a3866` and weights
`19671f406d603126926c1b7e2adc169acbcade22`. It verifies 597 Python source files
and all five tensor/silence files before execution. The pinned model card declares
MIT licensing; this does not close Jamloom's production quality gates.

The isolated `.venv-singer` uses the upstream frozen lockfile. The existing
`build-style-training/upstream` checkout is reused. For a fresh machine, extract
the [pinned source archive](https://github.com/ace-step/ACE-Step-1.5/archive/ca1e85fe9430179831e6bc6be790c332190a3866.tar.gz)
into that directory; its archive SHA-256 is
`b464c11f00af00e1e089a09f58a03962f803c080f116fd0517dbe5ec839706b3`.
Then run `bash scripts/setup_singer.sh`. This downloads approximately 12 GB of
public model files and verifies the runtime. FFmpeg and uv must already be
available. No new package or service is added to the deployed Jamloom site.

Actual renders on Apple M5 use PyTorch 2.10.0, MPS bfloat16 DiT, CPU-offloaded
text encoding and the native MLX float32 VAE. The default MPS float32 attempt
stalled while copying model weights and was stopped. A float16 attempt produced
48,000 invalid latents and failed closed. Neither attempt produced an accepted
audio file. Bfloat16 produced all four complete 48 kHz stereo PCM16 renders.
The wrapper changes dtype locally; upstream Python source remains pinned.

For lyric planning, the bundled ACE language model failed the first browser
attempt: it produced an unrelated, overlong song. Validation rejected the plan
before singing. The implementation now uses the local 4-bit Qwen3-4B-Instruct-2507
model, pinned and hash-checked by [its manifest](../assets/manifests/lyric-planner.json).
It runs through the already installed MLX-LM package; its process exits before
the singer loads to keep memory bounded. The [model card](https://huggingface.co/mlx-community/Qwen3-4B-Instruct-2507-4bit/blob/50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b/README.md)
declares Apache-2.0. Generated lyrics are bounded and displayed for review;
semantic correctness still requires judgment.

No new training was performed. These singers use the pretrained base; the
earlier instrumental adapters were not loaded or promoted. No paid compute,
temporary cloud rental, recording upload, publication or iOS change occurred.

Official references: [pinned installation guide](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/INSTALL.md),
[pinned model card](https://huggingface.co/ACE-Step/Ace-Step1.5/blob/19671f406d603126926c1b7e2adc169acbcade22/README.md).

## Verification and limits

- **PASS:** four actual generated singer WAVs and four source/singer assemblies.
  Source pitch/speed is preserved; only edge fades and gain change it. PCM
  reconstruction error is bounded by half one PCM16 step, with no source/singer
  overlap. Inputs and existing outputs are hash-checked and never overwritten.
- **PASS:** eight loudness-matched review tracks, at most −1.8 dBTP. Chromium
  and WebKit playback, seeking, download links, no autoplay and exclusive
  playback; desktop, 375 px and 320 px layouts have no horizontal overflow.
  [Browser evidence](evidence/singing-response/browser.json).
- **PASS:** six unit tests cover plan bounds, independent voice/style choices,
  consent, tampering, assembly, output preservation and studio orchestration.
  The orchestration unit test mocks model execution; the real browser run is
  reported separately.
- **PASS, local workflow:** actual browser upload → local lyric draft → singing
  → source/singer assembly → downloaded audio, permission rejection, seeking,
  exclusive playback and responsive layout. [Browser run](evidence/singing-response/studio-browser.json),
  [render receipts](evidence/singing-response/studio-renders.json). Gradio 6.2's
  waveform reload raises a known `AbortError` from `StaticAudio`; reproduced
  separately during upload. The test records these warnings and still fails on
  other page errors. Loaded audio and playback checks passed.
- **PARTIAL, contextual writing:** the model also drafted a different response
  to “My coffee went cold,” mentioning chilly brew and warmth. This proves the
  path is not a fixed question template; it does not prove good humor or broad
  generalization. Wording can be awkward. [Actual text-only check](evidence/singing-response/context-draft.json).
- **PARTIAL:** source placement is a sample-only pickup followed by generated
  singer and band. The requested tempo determines a bar grid; actual beat
  alignment is not verified. Amplitude trim is not word alignment. This is not
  yet a live, learned performance director with adaptive callbacks.
- **NOT RUN:** human acceptance of naturalness, diction, voice control, humor,
  lyric relevance and meaningful musical diversity. An offline tiny ASR check
  recognized several expected phrases in the first male-reggae output, but
  disagreed on the joke line. This is neither a listening score nor proof of
  exact lyric delivery. AI singing can still mispronounce or sound artificial.
- **NOT RUN:** production integration/promotion and general musician learning.
  This is a local studio, not a deployed Performance studio feature. Existing
  physical, M1 and release gates remain open.

Reproduction entrypoints: `scripts/singing_response.py draft`,
`scripts/singing_response.py sing`, `scripts/assemble_sung_response.py`, and
`scripts/prepare_singer_review.py`; each exposes `--help`. Private plans, raw
audio, failure logs and completed receipts are retained under
`renders/singing-response-20261022/` and the review directory. A `.partial`
marker denotes an incomplete job and is never accepted as successful output.
