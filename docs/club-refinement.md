# Club refinement: instruments, transitions and voice

Recorded 2026-10-18. The owner asked to continue, then explicitly requested all
three improvements: bass/drums, builds/drops/transitions and vocal clarity.
This revision implements all three and fixes instrument identity in stem exports.
It does not treat that request as listening approval of v7 or v8.

[Open the private v7/v8 comparison](../renders/voice-club-v8/review/index.html).
Three pairs use the same voice and seeds 4123–4125. Bass, drums and voice each
have isolated before/after players; the final player is the existing Blood Club
3:20–4:10 excerpt. All thirteen players are gain-matched to −22 LUFS. Original
mix downloads retain their rendered levels. No previous recording is overwritten.

## Changes

- **Bass/drums implementation — PASS:** The original `electronic-v2` palette
  increases bass harmonics and its sustained filter cutoff, and adds snare body
  and decay. Bass level falls 3 dB, drums rise 2 dB and chord texture rises 3 dB.
  Kick/snare events allow longer decay. Alternating bars use held versus shorter
  bass replies, with seed variation. These are design choices to assess by ear,
  not proof of a better mix. No reference music enters the generator.
- **Transitions implementation — PASS:** The build accelerates its snare fill,
  then leaves the last beat before the first drop free of new drum hits. The
  return has a new pickup. A second open-hat accent that could closely double
  the first has been removed. The form and 0:10.29 / 0:17.14 / 0:24 landmarks
  remain, so the previous/new comparisons align.
- **Vocal selection implementation — PASS:** Club searches up to 900 ms for
  a sustained pause, prefers pause-ended candidates and removes crops that
  overlap by at least half of the shorter crop. If no pause-ended candidate
  exists, the fallback is bounded near 450 ms with lower confidence. The owner
  recording now has four creative candidates of approximately 0.52–0.65 s,
  replacing twelve 0.13–0.52 s candidates. Calls gain 2 dB. Both full clean
  statements and their breathing space remain. This is energy-based selection,
  not semantic word alignment or a recognition guarantee. Other styles retain
  their previous crop-selection rules.

The electronic bank still contains 14 original one-shots at 24 kHz. Its v2
manifest and generator/PCM hashes are checked offline. The v1 manifest is
historical; its matching generator/bank remains in commit `651fe96`.
The supplied synthetic speech fixture is untouched.

## Stem export defect and correction

Previously, solo export removed other tracks before compiling the score.
Compilation renumbered notes; those IDs seed sample-take selection and small
performance-level changes. The resulting stem could play a different take
from its part in the master. This was separate from expected PCM rounding and
nonlinear limiting, and affected both electronic and acoustic exports.

The exporter now compiles the full performance once and filters scheduled
events afterward. Original IDs, take seeds, timing, gains and kick-duck triggers
survive unchanged. A regression sums four floating-point stems below the limiter
knee and checks them against the full mix, including room and ducking. The test
[fails on the previous implementation](evidence/club-refinement/initial-stem-failure.log)
and passes after the fix. Current actual PCM exports also undergo reconstruction
checks. Old stems remain available as historical files; use the new stems for
editing. Earlier three-style masters are unchanged.

## Gates and evidence

See [the report](evidence/club-refinement/report.json),
[release tests](evidence/club-refinement/release-final-tests.log),
[sanitizer tests](evidence/club-refinement/sanitizer-tests.log),
[Linux tests/renders](evidence/club-refinement/linux-tests-renders.log),
[audition levels](evidence/club-refinement/audition-measurements.json) and
[browser playback](evidence/club-refinement/browser-playback.json).

| Gate | Status | Scope |
| --- | --- | --- |
| Native M5 release | PASS | 9/9 suites; 10 foundation + 15 remix groups |
| M5 ASan/UBSan | PASS | Same nine suites, no findings |
| Actual Linux arm64 release | PASS | Same nine suites plus fixture/owner/alternate renders |
| Current portability | PASS | Exact plans/event frames; four club masters/eight club stems and three legacy fixture masters/twelve stems byte-identical across OSes |
| Block determinism | PASS | Current owner master/four stems identical at blocks 512 and 113 |
| Stem identity | PASS | Four styles reconstruct within two PCM16 steps (0.00006104 maximum), with floating-point regression below 0.0000002 |
| Original-style master regression | PASS | Three default-seed owner masters match v4 byte-for-byte; corrected stems intentionally differ |
| Output, schemas and protected inputs | PASS | Complete export hashes, bounds, finite output, release tails and original input/master hashes checked |
| Full voice preservation | PASS | Both hooks match source × gain within PCM quantization tolerance; not a perceptual recognition score |
| Audition preparation/playback | PASS | Thirteen matched players, decoded/seeking/playing muted, with only one active at a time |
| Bass/drums listening | NOT RUN | No new owner ratings or hearing by this session |
| Transition listening | NOT RUN | Structural checks do not establish musical flow |
| Voice clarity listening | NOT RUN | Longer crops do not establish complete words or intelligibility |
| Reference similarity / formal M1 | NOT RUN | No blinded listener assessment or diverse cleared cohort |
| Production quality | PARTIAL | New playable iteration; listening, device and release evidence remains missing |
| Hosted CI / Intel machine / iPhone / live / AI / release | NOT RUN | No deployment, training or device result claimed |

The three new masters measure −18.5, −18.5 and −18.6 LUFS with true peaks
−3.8, −3.8 and −3.9 dBFS; no limiter samples or nonfinite values were recorded.
Main-drop 20–150 Hz energy falls from approximately 91% to 78% of mono energy.
This describes the changed tonal balance, not a quality threshold. The previous
club stems differed from the master by as much as 0.56085 normalized PCM;
current reconstruction differs by at most 0.00006104. Per-style maximum/RMS
errors and the full environment are retained in the report.

Hardware/toolchain: Apple M5, arm64, 10 cores, 16 GiB; macOS 26.7.1 (25G241),
Xcode 27.1 (27A9275), SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2 and separate
project Python 3.14.6. Linux is the isolated Debian 12 aarch64 container on this
M5, with GCC 12.2, CMake 3.25.1 and Python 3.11.2. Full current values are in
[Mac](evidence/club-refinement/environment.json) and
[Linux](evidence/club-refinement/linux-environment.log) records. No packages were
installed and `~/mlx-env` was not changed.

## Reproduction and limits

The [native recipe](evidence/club-refinement/render-native.py) preserves exact
commands and measured run times. The [independent verification](evidence/club-refinement/verify.py)
compares actual outputs. The [audition recipe](evidence/club-refinement/prepare-audition.py)
uses only gain changes, not extra mastering. Use fresh prefixes on rerun:

```sh
./build-mac/djayvo_remix --input /path/to/consented.wav --consent \
  --style club --stems --seed 4123 --output renders/new-session/remix
python3 scripts/verify_export.py renders/new-session/remix
```

Current local files: `renders/voice-club-v8/final/remix.club.*`,
`seed4124.club.*`, `seed4125.club.*`, and `legacy.{hiphop,reggae,experimental}.*`.
Linux comparison files are under `renders/arrangement-linux/club-v8/`.
A future full smoke run can use that folder's `legacy` prefix as
`DJAYVO_REFERENCE_PREFIX`; do not compare changed club music to old plans as a
portability test.

Stems are still independently quantized and limited. Their exact sum is not
promised when nonlinear processing engages. The original sample-based bank is
small and mono; sampled-note pitch also affects envelope duration. This remains
a 36-second rule-based performance, not full-song or commercial-production
validation. Owner-only permission and the absence of additional consented clips
are unchanged. [TODO.md](../TODO.md) tracks the remaining gates.
