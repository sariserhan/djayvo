# Prepared Deck A + C session

This report records the original minor-only increment. The current
[major/minor extension](session-modes.md) adds explicit mode selection and new
portability evidence; the original results below remain historical.

2026-10-18. Local implementation **PASS** for the tested scope below. Full
specification and live studio **PARTIAL**. The owner's latest instruction resumes
remaining local specification work; the master remains unchanged.

## What now works

Open <http://localhost:3000/studio/dj.html> (standalone: <http://localhost:4173/dj.html>).
Load a permitted track into A, pause it, then choose **Prepare loaded A** in the
new Deck C section. Confirm/correct tempo, minor key and first downbeat, then
start prepared A. Import a consented 2–5 second recording or record a phrase
with headphones while A plays. **Make performance** prepares a new call-response
arrangement; **Bring C in on next bar** schedules it. C has a separate level,
stop/cancel and WAV download. Stop A to preview C through the same mix bus.

A's channel level, EQ and crossfader keep working. Its conflicting manual
transport controls are disabled while prepared. **Return A to manual** stops the
prepared session and restores the original file. B and the playable instrument
rack retain their existing behavior. Pause all decks stops prepared A/C too.

The session is local and uses the existing deterministic phrase director. It is
not a newly trained AI, a reference-artist replica, or evidence of musical quality.
A new seed selects a new plan; the last ten accepted instrumental structures are
excluded through the existing bounded eight-candidate selector. This history stays
in the tab and is cleared with the phrase. Perceptual originality is still a listening gate.

## Architecture and limits

- Shared C++17 `MusicalContext` constrains the existing call-response planner to
  60–180 BPM and one of twelve minor tonics. The planner chooses 9–21 bars for
  20–40-second validated performances, retaining source hooks and phrase-derived
  instrumental answers. The regular Instant Remix planner is unchanged.
- Existing schema/source/clip/voice/event/tail/consent validation runs before
  render. The browser additionally checks the returned context, render status
  and SHA-256 before replacing ready C. Generation/analysis run in workers;
  decoding and preparation do not run in the audio callback.
- Shared C++ `next_bar_frame` computes absolute 4/4 bar frames using integer
  rational arithmetic, rounded once. Native and WASM use the same function.
  A and C use scheduled Web Audio buffer sources on one AudioContext, with
  5 ms entry/exit envelopes. C is scheduled at least 150 ms ahead. This is
  scheduling lookahead, **not measured physical latency**.
- Prepared A is bounded to 32 MiB encoded, five minutes, mono/stereo and
  128 MiB decoded. It plays at original pitch/speed, without looping or tempo
  changes. B remains the existing manual media-element deck; it is not synced.
  Prepared mode is explicit so existing manual key-lock/rate/loop behavior is
  preserved. A ends naturally; C cannot be armed unless it fits before A ends.
- A first-30-second, 8 kHz preparation pass estimates pulse correlation and
  strongest triads. It is a heuristic, not a reliable beat/key tracker. Half-time
  ambiguity was observed. A triad does not establish key or chord progression.
  Downbeat is manual; explicit confirmation is required. Major/modulating or
  variable-tempo music needs further implementation, not a false confidence claim.
- A failure, rejected plan or cancelled worker leaves A playing and retains the
  last ready C. Two-minute generation and 20-second analysis limits apply.
  The local rule director is the offline baseline. No optional inference service
  is connected, so learned-AI retries/automation are not claimed.
- Recording uses a separate opt-in permission and visible state. Late permission
  grants after cancellation are stopped/discarded. Revoking phrase consent deletes
  source/C memory and download URLs; revoking music rights releases prepared A/C.
  No source upload, automatic persistence, transcript logging or training occurs.
- Hiding/leaving the page stops prepared playback and capture rather than assuming
  mobile/background reliability. Reload clears unsaved audio. Cache the app once
  through Voice studio's offline control, then reselect local files after reload.
  Browser storage can be evicted. Headphone cue routing is not implemented.

## Gates and evidence

[Machine receipt](evidence/prepared-session/summary.json),
[waveform/event comparison](evidence/prepared-session/comparison.json),
[Mac/toolchain](evidence/prepared-session/hardware.json),
[Linux/toolchain](evidence/prepared-session/linux-hardware.txt).

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Native Mac build/tests | PASS | 15/15 CTest suites; context plans across 12 minor keys, four tempi and three seeds; frame grid at five rates |
| Native Linux build/tests | PASS | Actual Debian 12 arm64 container, 15/15 CTest suites; same context render program |
| Address/undefined sanitizers | PASS | Native remix tests, including new context/frame constraints |
| Native/WASM planning and event frames | PASS | Four owner-consented input renders: exact plans/events and six-hour bar-grid agreement |
| Waveform portability | PASS | Mac/Linux/WASM PCM16 identical for 60, 83.92, 120 and 180 BPM; maximum absolute and RMS differences both zero |
| Browser A/C timing | PASS | Chromium/WebKit offline stereo render: scheduled frames 4800 and 100800 at 48 kHz; first signal above 1e-7 at the following frame due to the 5 ms fade; no A gap at C entry |
| Joined browser workflow | PASS | Real prepared A, owner-consented import, generated WAV, C entry/natural ending, manual stop/fader/preview, cancellation and director-load failure |
| Synthetic microphone and consent races | PASS | Both browsers capture/decode a synthetic MediaStream while A runs; stopped tracks and late permission rejection checked |
| Disconnected operation | PASS | Server closed before reload; cached engine/workers, new local input, analysis, generation and A/C entry succeed without server requests |
| Existing console/voice regressions | PASS | 48 DJ checks, 40 voice checks and 22 unit tests; existing piano/percussion/tone/echo and manual decks preserved |
| Integrated Next site | PASS | `/studio/` worker/module paths, real A/C output, desktop and 390 px viewport, no overflow or page errors |
| Direct reference or generated-music listening | NOT RUN | Automated audio tests do not hear or judge music |
| Physical microphone/output latency and venue endurance | NOT RUN | Synthetic capture and short render-callback checks are not hardware/venue certification |
| Actual Linux browser | NOT RUN | Linux C++ was executed; browser checks ran on Apple M5 |
| Full DJ transport/context | PARTIAL | Prepared constant-tempo minor-key A/C works; unified A/B/C, continuous context tracking, live note scheduling, beat loops/scratching and cue routing remain |
| Learned director, M1 quality and production release | NOT RUN | Formal blinded quality evidence still required; no model promotion, new cloud spend or deployment |

Final browser receipts: 17 checks each. The monitored complete performance plus
preparation/cancellation window contained 1,660,672 Chromium frames and 1,624,960
WebKit frames, with zero silent blocks or frame discontinuities. Measured generation
was 1.002 s / 0.368 s respectively for this one source/seed run; these are not
broad latency percentiles. Per-file integrated loudness spans −24.6 to −23.4 LUFS,
with true peaks −7.9 to −7.8 dBFS; no loudness normalization claim is made.
Callback block counters and sample energy are
software observations; they cannot detect all device-driver/output underruns.

Four reproducible native performances are in `renders/session-native-20261018/`;
matching WASM outputs are in `renders/session-wasm-20261018/`. They are private,
ignored audio artifacts, not bundled assets. Reports include sample peaks/RMS,
finite-output checks and event lists; per-file EBU R128/true-peak logs are committed
alongside this report. No musical-quality inference is made from these numbers.

## Reproduce

```sh
cmake --build build-mac --parallel 4
ctest --test-dir build-mac --output-on-failure
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/session.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/session.mjs
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
npm --prefix apps/web run test:browser
DJAYVO_BROWSER=webkit npm --prefix apps/web run test:browser
node apps/site/scripts/prepare-studio.mjs
node apps/web/tests/session-site.mjs
python3 scripts/verify_web_bundle.py
```

Native context comparison (each output directory must be new):

```sh
./build-mac/djayvo_session_render renders/voice-20261017-221411/source-pcm.wav renders/NEW_NATIVE --consent
# Run the same helper in the existing Linux container, writing to /out/NEW_LINUX.
node scripts/verify_session.mjs renders/voice-20261017-221411/source-pcm.wav renders/NEW_NATIVE renders/arrangement-linux/NEW_LINUX renders/NEW_WASM
```

No fixture was regenerated. Master, supplied speech, owner source and reference
MP3 hashes were checked against the preceding receipt. `~/mlx-env` was untouched.
The isolated Colima profile was stopped after Linux checks; the global Docker
context was left unchanged. No secrets, source audio or models are committed.

## QA notes

Flow: DJ workspace → prepared A/context → consented capture/import → C generation
→ preview/bar entry → manual stop/withdrawal → cached reload without server.
Desktop and mobile screenshots were inspected for visible controls and overflow.
Playwright is the repository's fallback: the Browser skill's required execution
tool was unavailable. Context7 was also unavailable; API behavior was checked
against the primary [Web Audio specification](https://www.w3.org/TR/webaudio/)
and [MediaStream Recording specification](https://www.w3.org/TR/mediastream-recording/).
WebKit rejects Playwright's injected screenshot stylesheet under the strict CSP;
only warnings occurring during screenshot capture are recorded separately.
Application runtime errors remain a failing check; CSP was not relaxed.

Failures investigated: the initial minimum-eight-bar plan left a zero-length
section at 60 BPM (minimum now nine); a probe's first connection block was silent
(the measurement window now starts after explicit graph warm-up); a test fixture
accidentally used a closed decode context for its fake microphone (fixed test
ownership). Tiny WebKit fade values below 1e-7 are not treated as audible onsets.
All final gates above depend on their final passing receipts, not the failed runs.
