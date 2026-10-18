# M0a architecture

This records the M0a foundation. The implemented source-remix/C-ABI extension is
documented in [remix-architecture.md](remix-architecture.md).
The procedural voice description below is historical; current voices use the
[acoustic bank](acoustic-review.md) with the same clock and fixed voice pool.

The C++17 static library `djayvo_core` has three layers. `core/arrangement/`
constructs the original demonstration as a native `PerformancePlan`;
`core/composition/` defines and validates musical content and exports score JSON;
`core/audio/` compiles notes into sample-frame events and renders the resulting
schedule. `core/instruments/` contains fixed-state procedural voices. The CLI owns
filesystem operations and buffers. No device, OS audio, network, GPU, UI, or model
APIs appear in the library.

## Time and event contract

All musical positions and durations use integer ticks: 960 ticks per **quarter
note**, irrespective of time-signature denominator. Tempo is integer
`tempo_milli_bpm` (100000 means 100 quarter notes/minute). A bar has
`960 * 4 * numerator / denominator` ticks. A note's interval is
`[start_tick, start_tick + duration_ticks)`; note-off begins release at the end.

At fixed sample rate `R` and tempo `T`, an absolute tick `t` becomes
`round_half_up(t * R * 60000 / (960 * T))`. Integer quotient/remainder arithmetic
avoids long-timeline overflow and rounding accumulation. Every onset and offset
is converted independently exactly once at compilation. Unit tests compare
100001 points extending beyond 24 hours with an independent long-double oracle;
error must be <=0.5 frame. The current plan supports constant tempo. Tempo maps,
sample triggers, automation, and vocal chops are deferred.

The schedule sorts by frame, note-off before note-on, then unique note ID. IDs
come from track order followed by each track's event-list order; simultaneous
unisons remain separate voices. Section order must cover every bar exactly once,
without gaps or overlaps. Notes must end by the last musical tick. The final
allocation includes `round_half_up(tail_ms * R / 1000)` additional frames; compiler
validation prevents truncating a release. The default composition is 4 bars of
4/4 at 100 BPM: 460800 music frames and 96000 tail frames at 48 kHz.

## Synthesis and mixing

Piano uses velocity-dependent, exponentially decaying, mildly inharmonic additive
string modes. Bass uses a fundamental and decaying harmonics. Piano and bass
omit modes above 0.45 times the sample rate; native validation rejects pitched
fundamentals beyond that limit. Drums use pitch-swept kick synthesis, filtered
noise and body modes for snare, and noise/metal modes for hats. The supported
drum note map is 36 kick, 38 snare, 42 closed hat, 46 open hat. No recordings or
SoundFonts are used. These are basic synthetic timbres, not sampled acoustic
instrument realism.

Each voice has a short attack, note duration, and cosine release (piano 220 ms,
bass 100 ms, drums 80 ms). Synth state/phase uses double precision; interleaved
stereo buffers use float32, with double accumulation for the mix and statistics.
Track gain is `10^(gain_db / 20)` and pan uses the constant-power sine/cosine law.
There is no automatic peak normalization. Master output stays linear up to
80% of the peak ceiling; above it, a continuous tanh soft knee asymptotically
bounds each channel at the ceiling. This safety stage can color overloaded
material; the demo does not reach its knee. It is not a lookahead loudness
processor. The default ceiling is -1 dBFS.

`Renderer::process()` applies events before computing the exact scheduled sample.
The first attack sample is zero by design. Rendering does not allocate, lock, or
perform I/O. A 128-voice fixed pool is allocated when the renderer is constructed;
compilation rejects scores exceeding that limit, including release overlap.
Unexpected pool exhaustion is counted and causes CLI rejection. Construction,
compilation, score export, WAV writes, and reporting run outside the processing
path. The API is single-thread-owned; real-time/device integration has not been
validated. `Schedule` is an internal compiled representation: callers should
produce it with `compile()`, rather than build events manually.

Procedural percussion uses explicitly defined uint32 xorshift noise with per-note
mixed seeds. Arrangement variations use a separate seeded generator. No
implementation-defined standard random distributions, wall-clock seeds, or
unordered event iteration are used. The same executable/plan produces identical
audio across tested block sizes; transcendental-library/compiler differences can
produce small numerical differences across platforms. Fast-math is disabled.

## Files and integration boundary

`schemas/performance-plan.schema.json` defines the `1.0-m0a` **export** format.
It deliberately versions the instrumental subset separately from the master
specification's future sketch. No external JSON importer is implemented. The
native validator additionally checks relationships JSON Schema cannot express:
section coverage, note bounds, synthesis bandwidth, total event budget (100000
notes), and compiled polyphony/release coverage. Source ownership is null in this
milestone because there is no input recording. Stems, voice clips, source
provenance, effects, and harmonic validation are future extensions.

The WAV writer streams a canonical little-endian 44-byte PCM16 RIFF header and
interleaved audio, quantized by rounding `sample * 32767` without dither. It rejects
nonfinite/out-of-range samples, incomplete output, and lengths above RIFF's 4 GiB
limit. PCM16 quantization means the decoded file differs slightly from the float
statistics. Engine report peaks/RMS cover the complete export including tail;
`scripts/inspect_wav.py` independently measures the decoded PCM. RMS is not LUFS.
Reports use finite -300 dBFS as the silence floor.

The extension now provides an offline C ABI. Future iOS integration can use it
through a narrow Apple wrapper; Swift must use this clock. No Apple-specific
wrapper or UI is implemented. File writing is separate from sample processing, so Apple
audio buffers can consume the same float output without a WAV round trip.
