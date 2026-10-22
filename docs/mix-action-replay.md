# Private mix action reconstruction — 2026-10-21

**Implementation commit: `144e45c` (local only).**

**PASS: local action reconstruction and clocked instrument capture. Overall specification PARTIAL.**
This completes a runnable replay path for the existing browser control/source/transport
exports. It reconstructs A/B/C and instruments from original source files, deck actions,
accepted instrument commands and mixer controls. It does not use the captured master
or captured stems as its audio input. Listening and physical checks remain explicitly
deferred; the earlier musical-quality rejection is unchanged.

## Implementation

- `apps/web/mix-replay.js` validates all four existing hash-linked exports, checks
  timeline bounds, verifies original asset bytes, and renders the existing DeckDSP,
  instrument WASM and Web Audio mixer. It covers play/pause/seek/rate/key lock,
  loops/roll state, scratch, source replacement, scheduled prepared A/C, gain/EQ,
  tone/echo/reset, reverb/phaser/flanger/reset and the master limiter.
- Instrument downloads use additive `1.1-live-instrument-take`, with the first
  accepted audio frame on the context clock. Old `1.0` dry takes still validate and
  replay exactly. Sequencer note/off/reset actions now enter the same accepted-command
  capture; fixed typed buffers avoid per-note allocation in the sequencer callback.
  No existing evidence is rewritten. A current clocked take can
  align its accepted notes with a simultaneous mix; missing/short/mismatched traces
  are rejected instead of assuming a loaded instrument bank was silent.
- `scripts/prepare_mix_replay.mjs` joins existing downloads into one private JSON
  package. `scripts/replay_mix.mjs` verifies the explicitly supplied local files,
  runs Chromium or WebKit offline, and writes a WAV and receipt into a **new**
  private directory. It refuses existing output directories. Browser requests are
  intercepted locally, without a listening server or external network access;
  OfflineAudioContext never plays to the physical output. A 120-second render
  deadline bounds browser execution. The already installed FFmpeg/FFprobe decode
  MP3/FLAC with 30-second deadlines, pipe-only inputs and fixed output bounds.
  No dependency installation, provider call or hosted change.
- PCM validation precedes decoding: mono/stereo 16/24/32-bit PCM or Float32 WAV,
  including checked extensible subformats; 8–192 kHz source rates, at most five
  minutes and 128 MiB decoded per source;
  256 MiB total decoded source budget. Mixes remain capped at 30 seconds. Invalid
  float samples, malformed chunks, missing sources, changed hashes, interrupted
  recording clocks and incomplete instrument coverage fail closed.

## Fidelity boundaries

The historical recorder stores **observed** transport states, not sample-exact
native-decoder/worklet command acknowledgments or pre-recording DSP memory.
Reconstruction starts those histories empty, interprets A/B with the shared DeckDSP,
and rounds mixer graph changes up to 128-frame boundaries. This is a declared
reconstruction, not a bit-identical reproduction of arbitrary historical playback.
The result records both hashes, exact-match status, rounding and reset policy.
Prepared starts retain their scheduled frames. Native plan and dry instrument
replay remain their separate exact paths; captured stems remain preferable when
preserving the actual historical mix is required.

PCM WAV, MP3 and FLAC are supported. MP3/FLAC are decoded locally after original
file hash verification; receipts retain both original and canonical WAV hashes.
No converted file is substituted under an original hash. Playlists, URLs, malformed,
multichannel or oversized inputs are refused. MP3 container-duration padding may
differ from decoded audio by up to 100 ms; larger mismatches are rejected. Saved C uses its
verified generated WAV; a saved plan/phrase link is checked, without pretending that
this mixer step independently rerenders the native plan. Sequencer capture records the
actual accepted sample-frame commands, including stop/panic, through the same
instrument engine as manual and MIDI notes.

The [Web Audio scheduling specification](https://webaudio.github.io/web-audio-api/#dom-offlineaudiocontext-suspend)
requires render-quantum suspension for graph edits. Context7 was unavailable in this
session; official Web Audio documentation was consulted directly.

## Reproduce a private recording

1. Use permitted WAV, MP3 or FLAC sources. For instruments, start **Record instrument take**
   before **Record mix**, then stop the mix before stopping the instrument take.
   Keep the entire instrument take within its 30-second cap. Both consent controls
   remain independent. No automatic recording or upload is added.
2. Download recording details, mixer controls, source details, deck history and,
   if a bank was loaded, the musical actions. Keep original source files and the
   exact instrument bank. A loaded bank requires its trace even if no notes were
   heard. Existing source details enumerate the SHA-256/size of each needed asset.
3. Assemble the package (omit the final take argument for a mix without a bank):

```sh
node scripts/prepare_mix_replay.mjs recording.json controls.json sources.json transport.json replay.json take.json
```

4. Create a private `assets.json` mapping **every** source SHA-256 to its original
   local filename. Relative paths resolve beside this file; filenames never enter
   the replay receipt. For example, `{"<actual SHA-256>": "opening.wav"}`.
5. Render into a directory that does not already exist:

```sh
node scripts/replay_mix.mjs replay.json assets.json new-replay
JAMLOOM_BROWSER=webkit node scripts/replay_mix.mjs replay.json assets.json new-webkit-replay
```

Result: `replay.wav` and `report.json`, mode 0600 within a mode-0700 directory.
No replay operation grants rights or training authorization. Deleting browser
recordings cannot remove these explicitly downloaded private copies.

## Validation

[Evidence](evidence/mix-action-replay/) retains initial failures and final receipts.
An initial test used an insecure synthetic origin, which lacks Web Crypto; the
runner now intercepts an HTTPS origin. A second test incorrectly demanded identical
Chromium hashes despite the existing browser PCM tolerance: 11 samples differed
by one PCM16 unit. Final checks retain exact hashes/differences and enforce the
existing two-unit browser tolerance, without claiming cross-browser identity.

| Gate | Status | Evidence |
|---|---|---|
| Web units | PASS | 137 tests, including PCM preflight, linked clocks, missing notes and deck action replay |
| Four-channel reconstruction | PASS | Chromium/WebKit; source-only A/B/C plus real WASM notes, transport/FX/reset actions, cancel C, scheduled final mute, non-silent stereo WAV |
| Repeated reconstruction | PASS within tolerance | Final Chromium maximum 1 PCM16 unit; WebKit exact. All hashes retained; threshold 2 units |
| Actual concurrent capture → assembled package → WAV | PASS | Both browsers, clocked keyboard/mouth/simulated MIDI/sequencer, real mix receipt/controls/transport/inventory and CLI reconstruction |
| Existing dry-take replay and privacy lifecycle | PASS | Eight grouped checks per browser; dry WAV byte-identical; pairing, permission withdrawal, late hashes, blur/suspension/error cleanup |
| Output/source protections | PASS | MP3/FLAC decode; malformed/playlist/overlong/multichannel inputs and modified sources refused; missing instrument trace refused; existing output directory untouched |
| Production build, TypeScript, static/site audits | PASS | Logs and audited bundle receipt |
| Human musical quality | FAIL / NOT RUN | Earlier rejection retained; no new listening, explicitly deferred |
| Physical qualification | NOT RUN | Explicitly deferred by owner |
| Paid provider/model acceptance, iOS, launch | NOT RUN in this increment | No paid execution, training, phone work, push, migration or deployment |

Tests use generated tones, simulated instrument/sequencer actions and the unchanged supplied
synthetic speech fixture. Raw audio remains under ignored `renders/`. C++ and WASM
are unchanged; new native sanitizer/device results are not claimed.

## Remaining specification boundaries

The current local product paths and this bounded reconstruction are implemented.
The specification remains **PARTIAL**: musical rejection and independent human
judgments, expert corpus/rights/alignment review, physical/venue reliability,
quality-gated model selection/training and actual approved-budget provider billing
cannot be replaced by automated success. Historical precise playback cannot be
recovered from observations that never recorded it. Additional codec formats are outside this bounded replay contract. iOS follows the
non-iOS work; launch operations remain last. Historical tracker entries retain
their original evidence; the current FIN table and linked reports take precedence.
