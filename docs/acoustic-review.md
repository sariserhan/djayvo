# Acoustic instruments and varied openings

2026-10-17, America/New_York. The owner reports that experimental is the most
awkward style, all instruments sound artificial/game-like, and the full recording
need not always start the piece. Overall listening is **PARTIAL**, not a quality
PASS. These observations authorize the following rule-engine refinement.

## Changes

- Replaced additive/sine/noise instruments with 14 pinned CC0 acoustic recordings:
  seven upright piano pitches, three plucked contrabass pitches and four drum/hat
  hits. There is no model, network use at render time or third-party DSP runtime.
- Lowered piano chords and responses by an octave. Experimental plays four
  longer arpeggio notes per bar instead of eight short high notes, uses fewer
  vocal calls and one-semitone shifts instead of large speed jumps/reverses.
- Rotate full-phrase, instrumental and vocal-fragment openings by style/seed.
  The full untouched phrase still occurs twice, with gain/edge fades only.
- Retained the preceding `b29fb74` correction: clean phrases are protected from
  overlapping chops and quantized chops cannot share a start frame.

With seed 4123, hip-hop opens with instruments and reveals the full phrase at
5 s; reggae opens with fragments and reveals it at 6 s; experimental opens with
the full phrase. Seeds 4123–4125 exercise all three openings per style. No claim
is made that seeded grammar variation matches a human improviser.

## Implementation and assets

`Voice` selects the nearest recorded pitch (exact mapped hits for drums), uses a
16-tap windowed-sinc table for fractional sample playback and lower cutoff when
downsampling, and applies velocity plus small seeded gain variation. Kernels are
prepared at note start; processing allocates no memory and uses no locks or I/O.
The 128-voice pool is larger because each voice holds its interpolation table;
real-time/device performance is not certified. Note-off releases are 300 ms for
piano, 160 ms for bass and 180 ms for drums, with naturally exhausted samples
ending earlier. Every release is included in schedule bounds.

The bank is mono PCM16 at 22.05 kHz, compiled as immutable data. It is deliberately
small: single velocity layers, short tails, nearest-note pitch shifting, no pedal
or sympathetic resonance, no round-robin hits, no room/reverb, and no guitar.
This is an acoustic-source prototype, not a claim of realistic performance.

[Asset ledger](../assets/manifests/acoustic-v1.json) records pinned source commits,
file hashes, root notes, transformations and prepared PCM hashes. License copies
are in `assets/licenses/`; [license inventory](licenses.md) names the creators.
Reproduce with `.venv-build/bin/python3 scripts/prepare_acoustic_bank.py` and check
offline with `.venv-build/bin/python3 scripts/verify_acoustic_assets.py`.
Only these licensed instrument data are committed, never the owner's voice.

## Evidence and gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Native M5 release | PASS | `evidence/acoustic-review/release.log`, CTest 7/7 |
| ASan/UBSan | PASS | `evidence/acoustic-review/sanitizer.log`, CTest 7/7 |
| Pinned assets and license notices | PASS | Offline integrity test checks every compiled PCM hash and notice |
| Pitch, octave, velocity, timing, release, bounds | PASS | Foundation unit tests; pitched recordings checked for harmonic energy/tuning |
| Both clean hooks and varied openings | PASS | 2/3/5-second regression, three seeds/styles, decoded owner vocal stems |
| Rendered masters/stems and determinism | PASS | 15 decoded files; no full-scale/nonfinite samples; silent final 100 ms; byte-identical 512/113 blocks |
| Original owner listening | PARTIAL | Awkward experimental, game-like timbres; accepted only as a start |
| Acoustic-revision listening | NOT RUN | New audio awaits owner review |
| Current Linux/Mac comparison | NOT RUN | Earlier M0d PASS applies to the earlier procedural revision |
| Formal M1 / AI / iPhone / live / production | NOT RUN | No corresponding evidence or release claims |

The first acoustic test failed a synthetic-piano assumption that the fundamental
alone exceeded a fixed energy threshold. Inspection found upper partials stronger
than the fundamental. The revised test requires energy at the expected harmonic
series, strong rejection of a detuned series, octave transposition and velocity
response. It does not merely remove the frequency checks. Initial failing logs
are retained; the final release/sanitizer logs supersede them.

The historical `renders/m0/` Linux references and `renders/mac/` are untouched.
Plans and waveforms intentionally change in this revision; do not compare it to
those old references as a numerical portability test. Before a fresh cross-OS
PASS, render this revision on Linux with the same bank, fixture, and seed and use
`scripts/compare_portability.py` against matching new Mac renders. No comparison
tolerance was loosened and no new cross-platform PASS is claimed.

## Private review files

New masters and stems are in `renders/voice-acoustic-v1/`. Original source and
first renders remain in `renders/voice-20261017-221411/`; the spacing-only revision
is `renders/voice-review2/`. Detailed measurements, source-derived plans and
artifact hashes remain local. Aggregate evidence is
[report.json](evidence/acoustic-review/report.json).

```sh
afplay renders/voice-acoustic-v1/remix.hiphop.wav
afplay renders/voice-acoustic-v1/remix.reggae.wav
afplay renders/voice-acoustic-v1/remix.experimental.wav
```

Review instrument sound, whether the opening creates interest, whether the full
phrase stays clear later, and remaining awkward timestamps. Reference examples
are useful for discussing sound and arrangement; they do not need to become
training data. No external music is sampled or used to train anything here.
