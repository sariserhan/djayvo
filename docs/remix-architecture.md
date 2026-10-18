# M0b/M0c implementation and boundaries

`core/audio/input.cpp` reads bounded RIFF/WAVE and computes SHA-256 over original
bytes. It accepts mono/stereo PCM16/24/32 and IEEE float32 at 8–192 kHz; rejects
malformed chunks, inconsistent headers, invalid channels, nonfinite/out-of-range
PCM, files over 32 MiB, and audio over 15 s. The remix entry point requires
**2–5 s**. WAVE_FORMAT_EXTENSIBLE accepts these same PCM/float subtypes with
validated extension, channel layout and valid-bit/padding fields. Unsupported
codecs fail explicitly. Stereo is averaged to mono;
opposite-phase content can cancel and be rejected as quiet.

`resample()` uses a normalized Hann-windowed sinc kernel, a 0.94 transition-band
margin, and wider support for larger downsampling ratios. It creates a separate
immutable buffer; the original is never normalized or rewritten. Known-vector
SHA tests and independent Python file hashes check identity. Source normalization
is playback gain, capped at +12 dB and targeting 0.8 peak. Resampling overshoots
are bounded to [-1,1]. This has signal tests, not a mastering-grade SRC claim.

`core/composition/analysis.cpp` measures 10 ms RMS windows, selects energetic
regions with padding/gap merging, detects refractory envelope onsets, and makes
a coarse autocorrelation pitch estimate. These are DSP heuristics, not speech
recognition, word alignment, semantics, or reliable speech VAD. Region confidence
is heuristic. Silence fails before planning. Noise/laughter suitability is
unassessed.

`core/arrangement/remix.cpp` contains independent grammars:

| Strategy | Timing | Instrumental grammar | Source treatment |
| --- | --- | --- | --- |
| Hip-hop | 96 BPM, 12 bars | Swung hats, backbeat, syncopated bass, held minor chords | Sparse source-derived chops and call/response |
| Reggae | 80 BPM, 10 bars | Offbeat chord stabs, one-drop drums, different bass rhythm | Offbeat sample responses |
| Experimental | 124 BPM, 16 bars | Half-time backbeat, chord responses, longer syncopated bass | Sparse original-speed vocal motifs |
| Baseline control | 96 BPM, 12 bars | Fixed original four-bar instrumental loop repeated three times | Full source at fixed positions, no derived motifs |

The three strategies have intro, groove, break, return, and ending sections.
The break removes bass/drums, and the return varies responses/fills. Piano triads
use nearby inversions, staggered attacks and two-note responses. Source
onsets determine crops and quantized melodic-response rhythms; a confident
coarse pitch estimate chooses the tonic. Harmony is i–VI–iv–i in minor. Grammars
differ at a common seed; seed changes alone are not treated as new strategies.
Timbres use a pinned 53-recording CC0 bank: three piano dynamics, two seeded
piano/drum takes and single-layer bass. See [instrument articulation](instrument-articulation.md).

Every plan plays the whole source forward at rate 1 twice. The first statement
starts at tick zero or after a two-bar instrumental/fragment introduction,
chosen deterministically by style and seed. The second occurs later. This protects an intelligible opportunity, but
cannot prove human recognizability. Crops stay in bounds; the planner retains
about 10 ms of attack pre-roll and searches up to 600 ms for a sustained 20 ms
energy valley after the first 120 ms. Without one, it uses a lower-confidence
250 ms fallback. This is not word segmentation; see [boundary evidence](vocal-boundaries.md).
Edges search a small near-zero region and playback applies 3 ms fades. Clean statements
smoothly duck instruments to 15% (-16.48 dB) over 10 ms. If a source exceeds the
experimental intro, ducking continues into the instrumental entrance. Generated
chops are excluded from both full clean intervals; quantization cannot place
two chops at the same frame. All generated chops leave 80 ms breathing room
around one another and clean hooks, and retain original speed. The
renderer still supports reverse and rates 0.5–2. Rate changes couple pitch and duration;
optional [independent pitch/time transforms](voice-transforms.md) use cached
windowed-sinc/WSOLA preparation with strict bounds in 1.1 plans. Linear interpolation
for legacy varispeed can alias transformed high frequencies. Clean hooks are untransformed.
Formant preservation and human acceptance of the new treatment remain open.

`RemixRenderer` precompiles triggers, reads immutable samples, and uses the M0a
instrument clock. Processing has no observed allocations, locks, or I/O. Native
validation caps sample overlap at 16, events at 1024, clips at 64, and retains the
128-instrument-voice cap. The final ceiling is -1 dBFS. All source events must end
by the musical endpoint; the release tail follows it. Baseline instruments and
voice positions are independent of source rhythmic analysis.

`mix.instrument_room_mix` optionally adds four finite instrumental reflections
with band-limited sends; it defaults to zero and is validated in [0,0.35].
Vocals never feed this effect, and both dry/wet instruments follow hook ducking.
Ring buffers are allocated at construction. Release coverage reserves the longest
113 ms reflection plus 100 ms filter settling. No feedback reverb is implemented.
Velocity-dependent filtering gives softer sampled notes a darker tone; piano now
has three recorded dynamics, while bass remains single-layer. See
[instrument-articulation.md](instrument-articulation.md).

The explicit `club` strategy uses an original electronic palette with kick-driven
instrument ducking and a build/drop/break/return form. Its crop search extends to
900 ms, prefers sustained pauses and rejects substantially overlapping crops;
no-pause fallback is bounded near 450 ms. See [club refinement](club-refinement.md).

Stems filter the full compiled schedule, preserving note IDs and sample-take
seeds as well as the master timeline and ducking. Compiling filtered tracks would
renumber notes and change the performance; regression tests prevent this.
Each stem is quantized/mastered
separately: rounding/nonlinearity mean their sum need not exactly reproduce the
master. The complete master is authoritative.

## Plan and integration contract

`schemas/remix-plan.schema.json` defines `1.0-remix` and opt-in transformed `1.1-remix` exports: original file
hash/rate/frame count, synthetic/recorded kind and consent, processed length,
analysis, key, sections, instruments, clips, and source events. No original path,
filename, transcript, or human identity is exported. A clip's
`[start_frame,end_frame)` uses **processed source frames**. Original position is
`processed_frame * original_rate / sample_rate`, rounded/bounded as needed.
The [offline CLI importer](plan-import.md) now reads this contract with bounded
parsing, request/source identity checks and explicit rule fallback. App/C ABI
entry points continue to use their default rule planners. Native validation checks temporal, numeric,
source/consent, overlap, clean-hook, and duration relationships beyond structural
JSON Schema. The importer adds a limited tonal policy; no model provider is connected.

`core/audio/remix_file.cpp` is the shared CLI/C-ABI pipeline. It validates all
requested plans and refuses existing outputs, including symlinks, stems and
metadata. It reserves `PREFIX.partial`, renders/hashes there, publishes with
exclusive hard links and commits `PREFIX.complete.json` last. Failure/cancellation
rolls back only its own files; hard kills can leave an incomplete set. Consumers
must verify the completion marker. The low-level renderer remains a direct-write
helper. See [the contract and recovery limits](workflow-hardening.md).

`core/include/djayvo/djayvo_c.h` exposes ABI version 1 with caller-owned C strings,
fixed-width options, bounded error text, and contained C++ exceptions. A test
compiled as C performs cancellation, retry and a real offline render. The additive
`djayvo_render_file_cancellable` callback API returns 4 on cancellation without
changing the version-1 options. Calls are synchronous and belong
on a worker thread. No iPhone UI, audio session, capture, or device-performance
result has been implemented or claimed.
