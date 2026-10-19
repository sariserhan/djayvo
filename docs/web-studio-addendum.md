# Djayvo — web-studio product direction addendum

**Current authorization — 2026-10-18:** The owner subsequently instructed continued
implementation through the specification. This supersedes the historical M0a
review stop and console-only boundary for local implementation. The
[prepared A + C session](prepared-session.md) implements the first joined
browser workflow. Master/M0a scope remain unchanged; formal quality, physical
hardware/venue evidence, and separate paid/release approval remain mandatory.
Phone and hosted infrastructure work remain paused.

**Subsequent authorization:** After the M0a review stop the owner authorized the
[first manual DJ increment](dj-mixer.md), then explicitly requested spinning,
controllable decks, full piano keys and more instruments. The
[console and live instruments increment](dj-console.md) implements that local
scope. The owner then continued local instrument controls with
[tone and echo](instrument-effects.md), then explicitly requested
[Talk bass and more percussion](talk-bass.md) with a local `pipe.mp3` reference. The original review-stop wording below is historical; it is not a blanket
later-stage approval. All live, quality and venue requirements remain in force.

Owner direction recorded 2026-10-18. This separate addendum preserves the
[master specification](../ai_improvisational_musician_master_spec_v1.md).
It changes the future product direction and current authorization boundary,
not M0a's implementation scope or acceptance criteria.

Latest local increment: [MIDI Learn](midi-learn.md), **PASS (technical)** for
23 bounded absolute CC targets with pickup and tab-local assignments. Physical
MIDI/timing and venue evidence remain **NOT RUN**; whole-track loop repeatability
is **PARTIAL** after an intermittent WebKit timeout (DJ14).

Previous local increment: [Deck tone and echo](deck-effects.md), **PASS (technical)**
for independent A/B effects, including prepared A, controlled tails and offline
browser operation. Full studio remains **PARTIAL**; no new human listening,
physical latency or venue gate has passed.

## Historical M0a authorization and review stop

**M0a technical implementation: PASS. Review acceptance: PARTIAL.** M0a is already
implemented. Its [original evidence](m0a-report.md), commit `02d0e18`, includes
Linux release and sanitizer runs, 9/9 C++ groups, 2/2 CTest suites, deterministic
rendering and a decoded four-bar instrumental WAV. Human musical-quality
acceptance remains **NOT RUN**; automated tests do not supply it.

At that historical checkpoint, the owner instruction superseded earlier autonomous-continuation
permissions: stop for M0a review. Do not begin or resume W0, W1, other later
milestones, model training, DJ implementation or infrastructure work without
explicit authorization. Existing later-stage code, recordings and evidence were
created under prior instructions and are preserved. Their presence does not
approve further development or prove the future studio workflow.

This update documents future components only. The browser mixer and AI
performance channel are not prerequisites for passing M0a. No rollback, master
rewrite or product implementation is part of this update.

## Product objective

Djayvo combines an AI musical improviser with a professional browser-based DJ
studio. Its differentiator is transforming speech and environmental sounds into
original musical performances that can join an ongoing DJ session. Generic song
generation and conventional deck playback alone do not meet that objective.

The musician must respond to the captured sound and current musical context,
preserve a recognizable source hook where appropriate, develop an original
performance, and leave the performer in control of when it enters the mix.

## Component boundaries

| Component | Responsibility | Boundary |
| --- | --- | --- |
| Shared C++17 DSP core | Audio rendering, effects, mixing and deterministic sample-frame scheduling | Portable across Linux, macOS, iOS and WebAssembly; no platform APIs or model calls in shared DSP |
| Browser audio host | Web Audio routing and AudioWorklet processing, using WebAssembly DSP where appropriate | Device access and browser lifecycle stay outside the core; no inference, network waits, decoding or unbounded allocation in the processing callback |
| Decks A and B | Prepared music playback, transport, tempo controls, levels and cueing | Controls must operate real audio; unavailable functionality is explicitly disabled |
| Deck C / AI performance channel | Prepare, preview and synchronize a source-derived performance before admitting it to the live mix | Independent ready/armed/playing states; unfinished generation never interrupts existing decks |
| Musical-context analysis | Estimate tempo, beat phase and harmonic context from current music | Confidence and manual correction required; ambiguous context must not force an unsafe synchronization or pitch choice |
| AI musical director | Propose bounded musical commands or a versioned performance plan | Validate schema, source/asset bounds and permissions, timing, harmony, event/voice budgets and duration before scheduling; no direct sample-level control |
| Mixer and performer controls | Channel routing, gain/EQ, cue, crossfades and authorized automation | Manual override cancels conflicting AI automation; consistent clock and headroom; cue routing depends on tested output-device support |
| Prepared-session storage | Retain explicitly selected, rights-cleared assets, plans and required local inference resources | Complete readiness verification before disconnecting; no silent dependency on cloud inference or remote media |

Reuse the existing validated plan boundary, portable renderer and baseline
planner where they fit. Extending them for sustained live processing requires
separate implementation and real-time validation; an offline renderer or cached
web page is not evidence of a venue-ready system.

## Required future demonstration

1. Load licensed music and play Deck A continuously.
2. Obtain explicit recording consent, show capture state and record a short
   spoken phrase through the microphone. Environmental input follows the same
   opt-in capture boundary, including consent for identifiable bystanders.
3. Analyze the currently playing tempo, beat phase and harmonic context; allow
   manual correction when estimates are uncertain.
4. Generate an original source-derived remix through validated musical commands.
   Perform analysis/inference and preparation away from the live audio callback.
5. Prepare Deck C, preview it, and arm a synchronized entry against the shared
   transport. Revalidate readiness/context if Deck A's tempo or position changes.
6. Mix the performance into the session manually or through explicitly enabled
   AI automation. Manual controls retain precedence; Deck A continues playing.
7. Repeat with the network disconnected after required preparation and asset
   loading. Demonstrate continuous playback, usable controls and the local
   fallback when optional AI inference is unavailable.

If inference fails, times out or returns invalid commands, retain ongoing deck
playback and use the validated local baseline when a valid source and context
permit it. Otherwise keep Deck C unarmed and explain the failure. Never replace
live audio with a partially prepared performance. Cloud enhancement may be
optional during preparation; the venue path must work without it.

## Future engineering and acceptance gates

| Gate | Status now | Required future evidence |
| --- | --- | --- |
| Browser DJ mixer and Deck C integration | PARTIAL | Prepared A/C implemented and tested; full transport and physical review remain. Real audio behind each control, cue/transport/mix behavior and end-to-end demonstration |
| AI command/failure boundary in a live session | PARTIAL | Validated rule planner and worker-failure isolation tested; learned model held. Invalid output, timeout, crash and manual-override tests while existing music continues |
| Live timing and audio continuity | PARTIAL | Frame/short callback checks pass; physical timing and endurance remain. Measured capture-to-ready latency, scheduled-entry frame error, sustained callback load and underruns/glitches on actual hardware |
| Offline venue performance | PARTIAL | Disconnected-server prepared session passes; venue acceptance remains. Disconnect before session start and during playback; verify prepared assets, reload/recovery, local fallback, storage/permission failures and no required network requests |
| Linux and Apple Silicon studio compatibility | PARTIAL | Native Mac/Linux/WASM agree; actual Linux browser still required. Actual runs of the same prepared session; event-frame comparison, measured waveform differences, hardware, browser and toolchain versions |
| Musical quality and originality | NOT RUN | Playable outputs and blinded listening comparing source-driven improvisation with a stock-beat baseline; varied inputs and contexts |
| Recording consent and music rights | PARTIAL | Existing controls/ledgers provide a foundation; review live capture, local retention/deletion, playback, transformation, training and publication rights separately |

Set and record numerical latency and continuity acceptance thresholds before
future trials; no unmeasured “low latency” or “glitch-free” claim. Tests must
include sustained playback under preparation load, device/route changes and
browser lifecycle limitations. Mobile background behavior and multi-output cueing
need device-specific checks. License or training permission alone does not imply
public-performance, sampling or redistribution permission.

## Evidence available for this review

The original Linux M0a report remains historical and unchanged. Its
`renders/m0a.wav` path is not present in this checkout. A later Mac regression
artifact is available at `build-mac/integration/m0a.wav`: **PASS** read-only decode
and hash agreement with its saved validation report, 48 kHz stereo PCM16,
556800 frames / 11.6 seconds, peak −8.196070 dBFS, zero full-scale samples.
It uses the later instrument bank and is not the original Linux waveform.

[Current review receipt](evidence/web-studio-direction/review.json) records the
artifact hash, master preservation and explicit unrun gates. No new build,
render, inference, fixture generation or listening assessment was performed.
Later [Apple M5 portability evidence](mac-portability.md) remains available,
separate from the historical Linux M0a report and future live-studio gates.

**Historical stop:** subsequently superseded by the current authorization above.
Human quality and release gates still require their stated evidence.

### 2026-10-19 — Performance C effects

**PASS (technical):** C now shares the existing tone/echo processing design,
with independent controls, MIDI Learn, safe stop/consent cleanup and effects
before C/Master levels. [Evidence and remaining gates](performance-effects.md).
Full studio **PARTIAL**; physical/venue and musical-quality acceptance **NOT RUN**.
The master specification remains unchanged.

### 2026-10-19 — Rhythmic C echoes and timing diagnostics

**PASS (technical):** C's confirmed tempo drives eighth/dotted/triplet echoes;
shared delay clearing retains its requested target. Independent test PCM counters
separate sample sequence from stale browser frame metadata. [Evidence](beat-echo.md).
Startup/manual-loop repeatability and full studio **PARTIAL**; physical/venue and
musical-quality acceptance **NOT RUN**. Master specification unchanged.
