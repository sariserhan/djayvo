# Voice-led owner audition

**Superseded interpretation:** The owner clarified that this was not the requested
feature. They want a separate musician singing new, contextual responses, with
the user's voice used only as appropriate source material. See the
[corrected requirement](musician-vocal-response.md). This packet is preserved;
its technical checks do not demonstrate that feature.

**Technical PASS; listening NOT RUN.** The owner requested a voice-led comparison
after rejecting every Group 1 version and hearing no clear adapter difference
in the remaining groups. Three new 30-second mixes use the existing consented
owner recording and downloaded epoch-10 hip-hop, funk and bass-b backings.
Epoch 10 is simply the latest checkpoint, not a selected quality winner.
The rejected bass-a/Group 1 is excluded. Earlier audio and feedback are preserved.

Open `renders/voice-led-20261021/review/index.html`. Start with **Hip-hop → With
your voice**, then **Music only**. Each pair is gain-matched to −22 LUFS. The page
names the versions directly; this is an informal, unblinded audition. Nothing
autoplays, and starting a clip pauses the previous one. Downloads are available.

| Mix | Existing arrangement strategy | Full recording starts | Voice events |
| --- | --- | ---: | ---: |
| Hip-hop, 92 BPM | Instrumental opening, complete phrase, three spaced replies | 3.91 s | 4 |
| Funk, 112 BPM | Fragment pickup, complete phrase, three spaced replies | 4.29 s | 5 |
| Bass, 140 BPM | Later complete phrase, three spaced replies | 5.14 s | 4 |

The full recording includes its original leading silence. All source crops
retain their original pitch and speed. Existing 10 ms edge fades avoid hard
cuts, and the backing ducks by 9 dB during the complete recording and 5 dB
during fragments. Instruments return in the spaces between voice events.
This uses the existing local arranger; it does not generate new singing,
beatboxing, instrumental notes or learned call-and-response. The backing's
arrangement remains prerecorded. Source crops are heuristic rather than verified
word boundaries, and the grid uses the model's requested BPM rather than a
verified beat/downbeat transcription. Listening must judge intelligibility,
alignment, natural phrasing and musical improvement.

## Evidence

- **PASS:** actual WAV renders, source hash and consent validation, bounded
  nonoverlapping crops, zero full-scale samples, clean-hook identity within half
  one PCM16 step and stem reconstruction within one PCM16 step.
- **PASS:** independently rerendered hip-hop events and all four raw WAV hashes
  match exactly. The wrapper rejects missing consent, corrupted backing and
  existing output. Eight existing arranger regression tests pass.
- **PASS:** all six review files measure −22.0 LUFS; measured true peaks range
  from −8.3 to −6.5 dBFS. Source, score, backing and ten previously protected
  specifications/recordings/fixtures/earlier adapters remain unchanged.
- **PASS:** Chromium and WebKit actual muted playback, pause, seek to 29.5 s,
  single-player behavior, six 30-second durations, no autoplay, download links,
  no page errors and no overflow at 375/320 px. Desktop/mobile screenshots
  inspected. Installed Node Playwright was reused because the Python binding
  is absent; no dependency installation was needed.
- **NOT RUN:** human acceptance of these new mixes, new physical qualification,
  production integration or publication. No training, new rental or upload.

[Render receipts and plans](evidence/voice-led/render.json),
[eight regression tests](evidence/voice-led/regression-tests.log),
[browser results](evidence/voice-led/browser.json),
[desktop](evidence/voice-led/chromium-desktop.png),
[mobile](evidence/voice-led/webkit-mobile.png).
Private WAVs, stems, simple-repeat controls and completion receipt stay under
`renders/voice-led-20261021/`; only technical evidence is committed.

Reproduce into a fresh directory:

```sh
.venv-analysis/bin/python scripts/prepare_voice_led_review.py \
  --source renders/voice-20261017-221411/source-pcm.wav \
  --score renders/voice-club-v8/final/remix.club.score.json \
  --trial renders/musician-training-20261021/results \
  --output renders/voice-led-NEW --consent
.venv-analysis/bin/python -m unittest discover -s tests -p test_voice_research.py -v
node docs/evidence/voice-led/browser-check.mjs
```

The browser check targets the completed original packet and stays muted.
