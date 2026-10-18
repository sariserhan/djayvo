# Safe exports and local recording workflow

Recorded 2026-10-17 on the actual Apple M5. This revision closes the local export,
import and representative offline benchmark tasks. It preserves v4's sound:
all fifteen owner master/stem WAVs remain byte-identical. The owner answered
“they are fine” when asked specifically about v4's piano and drums. That is
**PASS** for this informal instrument feedback, with **PARTIAL** production
realism and **NOT RUN** formal M1 evaluation. No per-style scores were inferred.

## Recording a new mix

Save a 2–5 second M4A or WAV of speech you consent to processing locally. With
the native build and optional installed FFmpeg/ffprobe available, run:

```sh
.venv-build/bin/python3 scripts/remix_recording.py \
  --input ~/Downloads/djayvo-my-voice.m4a --consent \
  --output-directory "renders/my-recording-$(date +%Y%m%d-%H%M%S)"
```

Open the printed `index.html` to play or save the three mixes. The workflow
preserves the original, converts locally, records hashes, renders all three
styles and twelve stems, verifies every export, and creates a listening page.
It refuses any existing output directory. The tested owner session is
[available locally](../renders/recording-workflow-v5/index.html). Earlier
[v4 matched comparisons](../renders/voice-articulation-v4/review/index.html)
remain available. Neither page autoplays. Private audio stays outside Git.

The actual M4A has a 4.928 s container duration; both decoder paths produce
233,376 frames, or 4.862 s at 48 kHz, after AAC padding handling. The new report
measures a maximum FFmpeg/previous afconvert PCM difference of 0.013855 and RMS
0.00054587 (normalized full scale). Conversion is not claimed bit-identical
across decoders; these values are separate from the zero-error engine portability
comparison using identical WAV input. No manual cut or synthetic speech regeneration
was performed. Native import now accepts the original afconvert extensible WAV
without repacking; its fifteen rendered WAVs exactly match the repacked input.

## Export and cancellation contract

`djayvo_remix` and both C entry points reserve `PREFIX.partial`, render and hash
the complete set there, then publish files without replacing existing paths.
`PREFIX.complete.json` is published last. Consumers must verify that marker:

```sh
python3 scripts/verify_export.py renders/recording-workflow-v5/remix
```

Ctrl-C/SIGTERM cancels the CLI (exit 130), cleans its own staged/published files
and leaves existing recordings untouched. The additive C function
`djayvo_render_file_cancellable` accepts a caller-owned polling callback/context
and returns 4 on cancellation. ABI version 1 and the old entry point remain
compatible. Run these synchronous functions on a worker, never an audio callback.
Cancellation is checked between render blocks and publication steps; it does
not interrupt every input read, hash or filesystem call.

**Limits:** the flat files do not become visible simultaneously. A hard kill
or power loss can leave `.partial` and files without a completion marker; keep
them for inspection and choose a fresh prefix. This is not fsync/power-loss
durability certification or automatic recovery. Publication requires filesystem
hard-link support (tested APFS and Linux); there is no overwrite fallback.
The low-level `render_remix` and M0a writer remain direct-write helpers, not this
multi-file export interface.

Each prefix represents one immutable export. Create a baseline with a separate
prefix, then use `prepare_listening.py --baseline-renders PREFIX`. New listening
preparation requires verified exports. Retained historical exports can be read
only with explicit `--legacy-export`; existing audio/responses are preserved.

Extensible WAV parsing validates subtype GUID, extension size, channel mask,
valid-bit count and left-aligned PCM padding. Supported formats remain
mono/stereo PCM16/24/32 and float32. This follows Microsoft's
[WAVEFORMATEXTENSIBLE contract](https://learn.microsoft.com/en-us/windows/win32/api/mmreg/ns-mmreg-waveformatextensible).
M4A conversion belongs to the optional local script; shared C++17 gains no
platform APIs or third-party runtime dependency.

## Evidence

| Gate | Status | Result |
| --- | --- | --- |
| M5 release, M5 ASan/UBSan, Linux arm64 release | PASS | Seven CTest suites each; 10 foundation + 12 remix test groups |
| Current Linux/M5 comparison | PASS | Exact plans/event frames; 6 masters + 12 fixture stems identical; max/RMS PCM error 0 |
| Block 512 versus 113, unchanged v4 sound | PASS | Exact plans/frames/masters; all 15 v4 owner WAVs preserved |
| Export collision, cancellation, interruption | PASS | C API cancellation/retry, mid-render and mid-publication rollback, competing file, dangling symlink, stale lock, actual SIGINT/SIGKILL |
| Extensible WAV decoding | PASS | PCM16, PCM24-in-32, float32 equivalence; malformed GUID/mask/precision/padding rejected |
| M4A workflow and browser | PASS | Actual owner input plus procedural integration test; consent, existing-file and corruption checks; three muted players advance with exclusive playback |
| Complete-export and plan schemas | PASS | Retained artifacts verified against size, hash, source provenance and JSON schemas |
| Blinded pilot preparation | PASS | Fresh baseline and three anonymous candidates; no invented responses |
| Offline timing/memory | PASS | 11 cases × 3 repetitions; every export hash-verified |
| CI recipe/static configuration | PASS | Local Mac/Linux execution and identical procedural control; pinned actions, read-only permissions |
| Hosted CI | NOT RUN | Workflow committed locally; no push or hosted job claimed |
| Owner v4 piano/drum feedback | PASS | “they are fine”; informal, unscored observation |
| Production quality | PARTIAL | Formal diverse-input and listening evidence still missing |
| Physical Intel rerun, M1–M5 | NOT RUN | No new physical Intel, formal evaluation, AI, iPhone, live or release execution |

The [machine-readable report](evidence/workflow-hardening/report.json),
[benchmark trials](evidence/workflow-hardening/benchmark.json),
[Mac environment](evidence/workflow-hardening/environment.json) and
[Linux environment](evidence/workflow-hardening/linux-environment.txt) retain
the details. M5: 10 cores, 16 GiB, macOS 26.7.1 (25G241), Xcode 27.1 (27A9275),
SDK 27.0, Apple Clang 21.0.0, CMake 4.4.2, project Python 3.14.6. Actual isolated
Linux: Debian 12 aarch64, GCC 12.2, CMake 3.25.1, Python 3.11.2. FFmpeg 9.0.2
handles the optional import. `~/mlx-env` was unchanged. The project VM/container
was stopped after validation.

Browser playback was muted: a native first-player button click and all three
media-API play calls advanced time and enforced exclusivity. The automation
tool did not activate the second native shadow control by its element reference;
that attempted click is not counted as a pass. See the
[browser record](evidence/workflow-hardening/browser-check.json). This is playback
functionality evidence, not an assertion that the agent heard the music.

At 48 kHz, single-style median wall times were 0.171–0.231 s with peak RSS
29.9–31.4 MiB across the owner and 2/5-second procedural sources. All three
owner mixes plus twelve stems took median 2.049 s, peak RSS 39.4 MiB. A 192 kHz
experimental render at 113-frame blocks took median 0.889 s, peak RSS 112.9 MiB.
These fresh-process measurements include import, planning, rendering, I/O and
completion hashing. They do not certify live latency, worst-case polyphony,
phone performance or musical quality.

Reproduce against retained private artifacts from the repository root:

```sh
DJAYVO_PYTHON="$PWD/.venv-build/bin/python3" \
DJAYVO_REFERENCE_PREFIX=renders/arrangement-linux/workflow-v5/remix \
sh scripts/mac_smoke.sh
.venv-build/bin/python3 tests/integration/verify_recording.py --renderer build-mac/djayvo_remix
.venv-analysis/bin/python3 docs/evidence/workflow-hardening/verify.py
.venv-build/bin/python3 scripts/benchmark_render.py --renderer build-mac/djayvo_remix \
  --voice renders/voice-20261017-221411/source-pcm.wav --consent \
  --report "renders/benchmark-$(date +%Y%m%d-%H%M%S).json"
```

The benchmark generates independent procedural controls in a temporary folder;
it never regenerates the transferred speech fixture. CI likewise uses a separate
procedural control. The [workflow](../.github/workflows/core.yml) follows
[GitHub's workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
and pinned [checkout](https://github.com/actions/checkout),
[upload-artifact](https://github.com/actions/upload-artifact) and
[download-artifact](https://github.com/actions/download-artifact) actions. Context7
was unavailable in this session; these official sources were the fallback.
