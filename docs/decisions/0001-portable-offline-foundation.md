# ADR 0001: portable offline foundation

Status: accepted for M0a.

Use a C++17 static core with CMake, float32 stereo buffers, a constant-tempo rational
tick clock, integer frame events, and fixed-capacity voice state. Keep arrangement,
schedule compilation, rendering, and file output separate. Build on Linux now;
keep macOS/Apple Silicon execution explicitly unverified until its checkpoint.

Use original procedural piano, bass, and drums rather than acquiring sample
assets or adding a synthesizer framework. This provides actual polyphonic musical
audio with no third-party instrument rights, network runtime, or commercial
framework dependency. Acoustic realism is limited and requires listening review.

Use PCM16 WAV for broad playback and simple independent decoding. Keep full
float output at the library boundary. Avoid dither in M0a so byte-level
reproduction is straightforward. Loudness reporting is unweighted RMS and sample
peak, not an implementation of integrated LUFS or true peak.

Expose native plans and a definitive versioned JSON export; defer importing
untrusted plans and all vocal input. The master specification remains unchanged.
M0a intentionally supports only notes, fixed tempo, gains and pan, rather than
implementing later milestones' event types in advance.
