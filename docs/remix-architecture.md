# M0b/M0c implementation and boundaries

`core/audio/input.cpp` reads bounded RIFF/WAVE and computes SHA-256 over original
bytes. It accepts mono/stereo PCM16/24/32 and IEEE float32 at 8–192 kHz; rejects
malformed chunks, inconsistent headers, invalid channels, nonfinite/out-of-range
PCM, files over 32 MiB, and audio over 15 s. The remix entry point requires
**2–5 s**. Unsupported codecs fail explicitly. Stereo is averaged to mono;
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
Timbres now use a small pinned CC0 acoustic bank; see [acoustic-review.md](acoustic-review.md).

Every plan plays the whole source forward at rate 1 twice. The first statement
starts at tick zero or after a two-bar instrumental/fragment introduction,
chosen deterministically by style and seed. The second occurs later. This protects an intelligible opportunity, but
cannot prove human recognizability. Crops stay in bounds; chop edges search a
small near-zero region and playback applies 3 ms edge fades. Clean statements
smoothly duck instruments to 15% (-16.48 dB) over 10 ms. If a source exceeds the
experimental intro, ducking continues into the instrumental entrance. Generated
chops are excluded from both full clean intervals; quantization cannot place
two chops at the same frame. All generated chops leave 80 ms breathing room
around one another and clean hooks, and retain original speed. The
renderer still supports reverse and rates 0.5–2. Rate changes couple pitch and duration;
**independent time stretch/pitch shift is not implemented**. Linear interpolation
for varispeed can alias transformed high frequencies. Clean hooks are untransformed.

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
Velocity-dependent filtering gives softer sampled notes a darker tone; the bank
still has only one recorded velocity layer. See [arrangement-review.md](arrangement-review.md).

Stems share the master timeline and ducking. Each is quantized/mastered
separately: rounding/nonlinearity mean their sum need not exactly reproduce the
master. The complete master is authoritative.

## Plan and integration contract

`schemas/remix-plan.schema.json` defines `1.0-remix` exports: original file
hash/rate/frame count, synthetic/recorded kind and consent, processed length,
analysis, key, sections, instruments, clips, and source events. No original path,
filename, transcript, or human identity is exported. A clip's
`[start_frame,end_frame)` uses **processed source frames**. Original position is
`processed_frame * original_rate / sample_rate`, rounded/bounded as needed.
There is no external JSON importer. Native validation checks temporal, numeric,
source/consent, overlap, clean-hook, and duration relationships beyond structural
JSON Schema. This is not yet a model-generated-plan boundary.

`core/audio/remix_file.cpp` is the shared CLI/C-ABI pipeline. It validates all
requested plans and checks every output alias before writing, including hard
links, symlinks, stems, and metadata. I/O failure returns failure; a partial file
is not an accepted export. Writes are not transactional/cancellable yet.

`core/include/djayvo/djayvo_c.h` exposes ABI version 1 with caller-owned C strings,
fixed-width options, bounded error text, and contained C++ exceptions. A test
compiled as C performs a real offline render. Calls are synchronous and belong
on a worker thread. No iPhone UI, audio session, capture, or device-performance
result has been implemented or claimed.
