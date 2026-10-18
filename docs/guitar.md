# Recorded guitar and articulated strums

2026-10-18. Overall **PARTIAL**: the instrument and technical checks are complete;
audible realism and owner acceptance are **NOT RUN**. The master is unchanged.

Funk and the funk chapters of hybrid now use three-string guitar strums for
chords. Successive strings start 24 ticks apart (about 13 ms at 112 BPM), alternate
up/down direction by bar and seed, and end together. Short chords use a separately
recorded staccato attack; the final chord uses a normal pluck. Piano retains its
intro, breakdown and melodic replies. Normal note-off has a 120 ms smooth release.
This is a sampled electric guitar, not a model of finger placement, amp/cabinet,
string bending or every acoustic/electric guitar technique.

The bank contains 78 recordings at 13 root pitches (MIDI 40–76 every three
semitones): two normal dynamics with two takes each, plus two staccato takes.
The accepted MIDI range is 40–79. Most notes transpose at most one semitone; the
upper edge is at most three. Normal samples are capped at 2.2 seconds and staccato
at 0.6 seconds; this is a decaying one-shot instrument, not unlimited sustain.
Existing onset trim, sinc resampling, mono conversion, peak normalization and edge
fades prepare the recordings. Per-note velocity filtering, deterministic take
selection and interpolation reuse the existing sampler without runtime libraries.
Discrete layer boundaries, naturalness and mono spatial limitations need listening.

Source: Brian Wood / Karoryfer Lecolds' recorded electric guitar collection,
[published by its creator](https://shop.karoryfer.com/pages/free-black-and-green-guitars)
and distributed with a [CC0 license at the pinned commit](https://github.com/sfzinstruments/karoryfer.black-and-green-guitars/blob/b3b3249d37dc977a1a297bd2dc053e6d9b6b805c/LICENSE).
Commit `b3b3249d37dc977a1a297bd2dc053e6d9b6b805c`, per-file URLs/SHA-256,
creator, permissions, modifications and prepared-PCM hashes are recorded in
[the asset manifest](../assets/manifests/guitar-v1.json). The complete license is
bundled in web/native license folders; web and iOS credits name the source.
Only selected single notes were downloaded. No reference-track audio, performer
imitation, training, Sforzando runtime or instrument plugin is bundled.

The native instrument enum appends guitar. Optional note `muted: true` selects
recorded staccato; other instruments reject that articulation, and guitar rejects
the unrelated electronic bank. Guitar plans export `1.4-remix` / `1.2-m0a`;
older versions reject the new fields/assets. Strict CLI import, native validation
and both JSON schemas cover pitch/articulation limits. Guitar frame traces include
an articulation column. Old plans retain their versions and bytes.

Stems include `.guitar.wav` only when a guitar track exists, while preserving the
historical piano/bass/drums/vocals set. Exclusive staging, cancellation, completion
hashes and the verifier all include it; missing guitar stems fail verification.
Maximum eight-strategy export expands to 72 artifacts. Low-gain float stems still
sum to the master within 2e-7; nonlinear processing/PCM quantization prevent a
general promise of exact exported stem summation. Moving chords to a new track
also changes some event IDs/take selections in those revised arrangements.

## Validation

| Gate | Status | Evidence |
| --- | --- | --- |
| Pinned asset/rights/PCM verification | PASS | 78 source/PCM hashes, pitch/dynamic/take/articulation coverage, fade endpoints and bundled license audit |
| M5 release | PASS | 11/11 suites; final changed-code checks 3/3 |
| Linux arm64 release | PASS | 11/11 suites; final changed-code checks recorded separately |
| M5 ASan/UBSan | PASS | 11/11 suites, 461.89 s; [log](evidence/guitar/sanitizer.log) |
| Native instrument safety | PASS | Every accepted pitch, distinct normal/staccato/layer/take output, deterministic playback, allocation-free processing, invalid range/bank/articulation/schedule rejection |
| Strum planning / stems | PASS | Two directions, staggered onsets, coordinated note-off, normal/muted attacks; low-gain stem identity |
| Strict import / schemas | PASS | Eight-style replay, five new guitar rejection cases and incomplete guitar stem rejection |
| M5/Linux waveform and event agreement | PASS | 90 exact WAVs, zero maximum/RMS PCM error, identical plans/event frames; 30 unaffected previous WAVs/scores/events unchanged |
| Browser / Node | PASS | Seven styles match native PCM/events in Node, Chromium and WebKit; full consent/cancel/generate/save/reload/play/seek/download/delete flow |
| Public bundle | PASS | 14,135,362-byte WASM, below 16 MiB; current files and license notices, no private audio; static studio synchronized |
| Owner listening / audible realism | NOT RUN | Eight matched before/after pairs and isolated guitar/voice players prepared |
| Updated iOS app execution | NOT RUN | Credits updated; license folder already includes all notices; phone work remains paused |
| Production release | NOT RUN | No deployment, paid service, upload or model; formal M1 remains open |

[Measurements](evidence/guitar/measurements.json), [M5 release](evidence/guitar/mac-release.log),
[final native checks](evidence/guitar/mac-final-targeted.log),
[Linux](evidence/guitar/linux.log), [browser](evidence/guitar/browser.json),
[asset audit](evidence/guitar/assets.log), and [bundle](evidence/guitar/bundle-final.json)
retain evidence. The first copied browser test expected a guitar-named download;
the product correctly names the selected direction Funk. That test expectation
was fixed and both browsers pass. An audit also caught stale HTML after credits
changed; rebuilding and resynchronizing the bundle resolved it. An explicit
unsigned parity cast removes a new compiler warning without changing the WASM
binary. Two older bounded source-index WASM warnings remain.

Private review: `renders/guitar-20261018/review/index.html`. Eight new mixes,
eight matched pre-guitar controls, eight raw guitar stems and eight raw voice
stems. Original masters: −23.8 to −23.4 LUFS, true peaks −7.9 to −5.6 dBFS.
Review masters: −22 LUFS, peaks −6.2 to −4.0 dBFS. Every checked WAV ends with
100 ms silence. All eight voice stems are byte-identical to their prior versions;
full-source interior error is at most 0.000024151 after PCM16 quantization.
Numerical differences between old/new mixes are recorded per seed, not interpreted
as improvement. Historical recordings and scores are preserved.

Reproduce with `python3 scripts/prepare_guitar_bank.py`,
`python3 scripts/verify_guitar_assets.py`, native CMake/CTest, then
`docs/evidence/guitar/render.py`, `measure.py` and `review.py` in the existing
project environments. Rendering scripts require fresh output directories. These
scripts do not synthesize or replace the supplied speech fixture.

Hardware/toolchain are unchanged from the preceding
[actual M5 environment capture](evidence/creative-strategies/environment.json):
M5 arm64, 10 cores, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1 (27A9275),
SDK 27.0, Clang 21.0.0, CMake 4.4.2. Linux: isolated Debian arm64/GCC 12.2/
CMake 3.25.1. Emscripten 6.0.1, Node 22.23.1, Playwright 1.61.1,
Chromium 149.0.7827.55, WebKit 26.5, FFmpeg 9.0.2. Original physical Intel,
installed Safari, physical browser microphone and hearing remain NOT RUN.

The original guitar audition reports still label their bank `acoustic-v1`; the
score and guitar manifest identify the correct instrument and source hashes.
The subsequent sustained-instrument work corrects per-render bank reporting;
these historical reports are retained rather than rewritten.
