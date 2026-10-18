# Selective voice over the GPU instrumentals

2026-10-18, Apple M5, local research. The owner says the GPU clips are “getting
better” and asks for human voice sometimes, with creativity deciding when it fits.
This is informal feedback, not per-track acceptance or a formal quality result.

Later validation hardening: [Research input checks](research-input-validation.md).
Constant mono/stereo offsets are rejected; all six comparison plans and 42 WAVs
remain identical. No new listening result is implied.

Six new 30-second arrangements combine the already-consented owner recording
with six retrieved ACE-Step instrumentals. Three club and three hip-hop cases
use instrumental openings, short fragment pickups or later clean hooks. Each
has one complete source statement and spaced fragment responses. A quieter
candidate window in the backing influences the clean hook's position; seeded
selection chooses fragments. Backing ducking makes space during voice events.
The speech is not pitch-shifted or time-stretched. Each source crop has a 10 ms
edge fade. The final 350 ms fades to zero.

This is rule-based local arrangement over pretrained music, **not learned
musical judgment**. It does not infer lyrics, word boundaries, song sections,
harmonic fit or verified beats. Requested model BPM supplies the provisional
grid. Actual rhythm alignment and chopped-word quality require listening.
No training, voice cloning, artist imitation, production integration, new rental
or upload of speech occurred. Shared C++ and app behavior are unchanged.

## Listen

Open the [private comparison page](../renders/voice-research-20261018/review/index.html).
Start with the three club pairs. Each pair has shuffled A/B versions: selective
voice and a simple full-recording repeat control. The backing is identical within
a pair. Instrumental-only playback is under the expandable control. All three
are gain-matched to −22 LUFS, within 0.2 LU; they are not peak-normalized.
Only one player runs at a time. Nothing autoplays.

Use the downloadable blank notes for preferred version, instrument realism,
groove, voice amount, recognizability and timestamps. This is an informal owner
comparison, not the preregistered M1 study. The organizer key is outside the
served review directory. Audio and the owner recording remain ignored by Git.

## Results and limits

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Six arrangements, controls and stems | PASS | 24 PCM16 stereo 48 kHz WAVs, plus 18 matched review copies; artifact hashes in report |
| Selective voice scheduling | PASS | 22.2–24.6% scheduled source coverage; most of each track is instrumental |
| Source hook fidelity | PASS | After the documented gain/fade, interior maximum error 0.000015224440525873906, below half one PCM16 step |
| Stem reconstruction | PASS | Mix minus backing minus voice is at most one PCM16 step |
| Same-input determinism | PASS | Final full batch rerender: exact events and all 42 WAV hashes; maximum/RMS PCM differences both zero |
| Export integrity | PASS | Zero full-scale samples, exact zero final frame, measured arranged/control true peaks below −1 dBFS; matched review copies below −1.8 dBFS |
| Consent, provenance and failure handling | PASS | Six tests: source hash mismatch, absent consent, invalid crops/tempo, silence, quantization wrap, failed writes, overwrite protection and actual render checks |
| Local playback page | PASS | Chromium/WebKit metadata, muted playback, seek/pause, one-player exclusivity, download, no autoplay or page/console errors; desktop/mobile screenshots |
| Prior GPU owner feedback | PARTIAL | “Getting better”; no formal rubric or per-style score |
| New voice mixes: quality, clear words, groove and alignment | NOT RUN | Browser playback and PCM checks do not establish audible quality |
| Diverse sources / independent listeners / M1 | NOT RUN | One owner source; no additional cleared cohort available |
| Learned contextual arrangement / M2 | NOT RUN | Separate model feasibility trial is measured; constrained AI director and quality prerequisite remain open |
| Production quality / release | NOT RUN | Neither performer-level craft nor public-release readiness is established |

Scheduled coverage includes silence within source crops; it is not detected
speech activity. First-event times below are file insertion times, not necessarily
audible onset. The original full recording includes leading silence.

| Case | Arrangement | First event (s) | Scheduled voice | Mix LUFS | Mix true peak (dBFS) |
| --- | --- | ---: | ---: | ---: | ---: |
| club-seed-7441 | Instrumental first | 6.000 | 22.2% | −22.4 | −4.7 |
| club-seed-7442 | Fragment pickup | 0.214 | 23.8% | −20.5 | −3.7 |
| club-lm-7441 | Late hook | 6.857 | 22.2% | −20.3 | −5.5 |
| hiphop-seed-4123 | Instrumental first | 5.217 | 22.6% | −20.1 | −4.2 |
| hiphop-jazz | Fragment pickup | 0.349 | 24.6% | −20.2 | −6.2 |
| hiphop-lm-4123 | Late hook | 7.826 | 22.6% | −20.4 | −4.9 |

The control deliberately repeats full speech every four nominal bars and lacks
adaptive ducking. A/B preference therefore compares the combined arrangement
and ducking changes; it cannot attribute improvement to one component. Distinct
files and schedules do not prove perceptual novelty. No Linux or phone rerun was
needed for this separate Python research path; its cross-platform determinism
is NOT RUN. Previous native portability evidence is preserved.

## Reproduction and evidence

Uses the existing isolated `.venv-analysis`: Python 3.15.0, NumPy 2.5.4;
FFmpeg 9.0.2 built with Apple Clang 21.0.0. Host: Apple M5, macOS 26.7.1
(25G241). No new dependency installation or change to `~/mlx-env`.

```sh
.venv-analysis/bin/python -m unittest discover -s tests -p test_voice_research.py
.venv-analysis/bin/python scripts/prepare_voice_research.py \
  --source renders/voice-20261017-221411/source-pcm.wav \
  --score renders/voice-club-v8/final/remix.club.score.json \
  --trial renders/cloud-trial-20261018 \
  --output renders/voice-research-repeat --consent
```

Choose a fresh output directory. Existing output is refused, never overwritten.
Individual renders retain `.partial` after failure and only publish `complete.json`
after all WAVs and input-integrity checks succeed. Read that completion marker
before consuming a render. Batch failure may leave completed earlier cases;
the final review page is written only after all six checks pass.

- [Measurements, exact events, artifact hashes](evidence/voice-research/report.json)
- [Six-test result](evidence/voice-research/tests.log)
- [Final full-batch rerender and preservation checks](evidence/voice-research/final-verification.log)
- [Browser results](evidence/voice-research/browser.json) and [reproduction script](evidence/voice-research/browser-check.mjs)
- [Desktop](evidence/voice-research/desktop.png), [mobile](evidence/voice-research/mobile.png)

Browser flow: review page → play A → play B → A pauses → seek/pause B → expand
instrumental → download notes. All 18 files report 30 seconds. Tested using
Playwright 1.61.1, Node 22.23.1, Chromium 149.0.7827.55 and WebKit 26.5 at
1280×900, 375×812 and 320×812. Meaningful title/content and no blank/error screen
were verified; screenshot inspection showed readable text and controls. There
was no viewport overflow or page/console error. The in-app Browser runtime's
required Node REPL tool was unavailable; installed Playwright was used under
the owner's instruction to complete the local steps. Playback was muted and
does not certify speakers, audible quality or installed Safari/mobile hardware.

Two earlier attempts were **FAIL (superseded)**: the generic Python HTTP
server exposed a zero-length seekable range (seeking reset to 0), and direct
file navigation did not trigger the CSV download event. The final workflow opens
the local HTML file directly for seekable WAV playback and embeds the small
notes CSV in its download link. Both browser reruns now pass. The temporary HTTP
server was stopped. WAV link download behavior is browser-dependent; the local
WAV files are also available directly in the review directory.

To reproduce browser checks, no server is needed:

```sh
node docs/evidence/voice-research/browser-check.mjs
```

Unchanged SHA-256 values were rechecked:

- Master: `389964c26456e8622e3525a7798fcfb81d7e55928fe5cba716bab23396143ff2`
- Supplied fixture: `c6db8bb92195399e012b1186908798bf345e5a0f3b185f82a3be745759a4410e`
- Owner PCM: `7b23204717e1f114ebb25821ba4847416af336278fc0ee22275481d330950427`

Next quality work is to use listening observations to choose voice density and
entrances, then validate across diverse consented sources. A future learned
director must choose instrumental space, hook placement and variation through
validated bounded plans; the current heuristic is not evidence that this works.
