# Two live decks — 2026-10-22

**PASS, local implementation and technical checks. PARTIAL overall: real two-source listening/routing remains NOT RUN.**

The owner confirms the previous repair works: “now they are working but seems like it has limited controlls”. This accepts the earlier controls in their setup. It does not establish acceptance of this new two-deck version.

## What changed

Both the Mac companion and its paired website have Deck A and Deck B, rotating vinyl platters, independent source status/meters and channel levels, and a shared equal-power crossfader/master. Native source selection and consent remain mandatory; the website cannot start capture. Choose distinct playing audio processes (different apps are easiest; browser tabs may share a process). One deck can run alone.

Each deck provides three-band EQ, high-pass and low-pass filters, echo amount/time, pulse-following percussion, FX bypass/reset, reverse, beat loops of ¼/½/1/2/4 beats, manual FX tempo, mute and Return to live. Crossfader/master stay visible while scrolling. Effect edits clear FX bypass; level and transport edits preserve it. Mute leaves capture active and silences the channel. Stop releases its tap and restores original source audio.

Dragging a platter replays recent audio forward/backward with fractional interpolation and smoothed speed. Holding still fades replay to silence; release rejoins live audio unless loop/reverse remains enabled. A 150 ms native movement watchdog zeros an abandoned movement rate; native focus loss and web pointer cancellation/blur release the gesture. Reduced-motion settings stop decorative rotation. Reverse/loop/Return to live provide keyboard-accessible transport alternatives.

## Boundaries and implementation

- Two existing private Core Audio routes, each with its own `LiveSourceDSP`, feed the same selected stereo output. A second source start/failure/stop does not replace the first. Duplicate process selection is rejected. Existing process exclusion, capture consent, device format checks, hot-plug/fault handling, no-input timeout and cleanup remain.
- Each deck retains at most four seconds of stereo PCM in memory at **every** supported rate, 32–96 kHz. Scratch/reverse use the available history; an active beat loop uses its selected duration, bounded by available audio. Replay freezes that window. Return to live crossfades to current input and discards the old history before refilling. No disk recording or PCM upload.
- Playback in source apps continues. This does not seek, pause, change pitch/tempo, or beatmatch an external app. FX tempo sets loop duration only. Pulse estimates are not a verified beat grid. Separate headphone cue and additional OS adapters are outside this increment.
- Each native route is capped at half scale **after** its limiter. Smoothed master/crossfader gains cannot exceed 0.5 per route; even asynchronous gain transitions sum within the 0.89 output bound. This reserves headroom and reduces solo loudness. It does not limit audio from unrelated, uncaptured apps.
- Fixed replay/echo storage is about 3.84 MB per engine, about 7.68 MB for both, allocated outside the callback. Render processing adds no allocation, locks, platform APIs, or dependencies.
- Protocol **2** sends exactly two complete deck control objects plus master/crossfader. Exact keys, numeric bounds, booleans and finite values are validated. Old single-deck clients are rejected. App and website must be updated together. Token/origin/Host checks, expiry, heartbeat stop, bounded bodies and the browser/native capture handoff remain intact.
- The local bundle is **0.2.0 (2)**, ad-hoc signed for owner review. No deployment, push, notarization or public release was performed.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| C++ generated PCM / ASan + UBSan | PASS | [DSP](evidence/live-dual-decks/dsp.log), [sanitizers](evidence/live-dual-decks/sanitizers.log): reverse direction, stationary scratch, wrap at ±2×, fresh history after return, four-second bounds at 32/48/96 kHz, independent histories, high-pass, echo timing, mute, mix ceiling, existing per-effect/stereo/pulse checks |
| Native model/protocol/real loopback HTTP | PASS | [Swift](evidence/live-dual-decks/swift-tests.log): 10 tests pass; optional browser fixture skipped here and run separately by each browser. Includes independent control/start/stop/failure, consent, duplicate sources, watchdog/release, strict version-2 validation and security |
| Actual browser ↔ native HTTP, synthetic audio status | PASS | [Results](evidence/live-dual-decks/browser.json): Chromium and WebKit, all FX, deck isolation, crossfader/master, reverse/loop/mute, backward gesture/hold/release/cancel, record animation/reduced motion, stale-status protection, pairing, panic and lost-connection fallback |
| Rendered layouts / accessibility | PASS | [Native 1280](evidence/live-dual-decks/native-layout.png), [native 960](evidence/live-dual-decks/native-small.png), [web desktop](evidence/live-dual-decks/web-desktop.png), [web narrow](evidence/live-dual-decks/web-mobile.png). Browser widths 1440/820/390/320; no overflow or WCAG A/AA axe violations. Native snapshots are NSHostingView renders, not physical interaction evidence |
| Typecheck, site build, bundle audit, metadata/launch tests | PASS | [Build](evidence/live-dual-decks/site-build.log), [checks](evidence/live-dual-decks/site-checks.log); 5 metadata/launch tests |
| Packaged app launch | PASS | [Launch](evidence/live-dual-decks/launch.log); fresh app starts with captures stopped |
| Two simultaneous real app captures / physical output / listening / long session | NOT RUN | Owner verification required; synthetic fixtures and offline CPU measurements do not establish these |
| Public website / distribution | NOT RUN | Current review is local; protocol-1 hosted clients cannot control this protocol-2 build |

Reproduce with `swift test --package-path apps/desktop-companion` while the app is closed; `c++ -std=c++17 -O2 -Icore/include core/tests/live_source_tests.cpp -o /tmp/jamloom-live-dsp && /tmp/jamloom-live-dsp`; and, from `apps/site`, `DATABASE_URL='' npm run build` then `node tests/live-companion-browser.mjs` with ports 4234/48191 free. Browser fixtures never capture system audio. Use `./script/build_and_run.sh --verify` to rebuild and open the owner app.

For owner review: play two permitted apps, choose each source and one stereo output in Jamloom Live, grant consent and start each deck. Crossfade, mute, loop and drag a platter; Return to live rejoins the current source. For the matching website, use **Website pairing → Copy code and open local preview** and paste the code at `http://127.0.0.1:4234/live-dj`. Stop releases original app audio, so use Mute for silent mixing.
