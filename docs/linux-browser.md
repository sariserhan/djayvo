# Linux browser portability — 2026-10-19

The studio now disables recording when a browser lacks the required capture
APIs. Both Instant Remix and the prepared A/C session show **Recording unavailable**
and retain their consent-gated import controls. Previously Record became enabled
and failed only after a click. The existing runtime error handlers remain in
place for permission denial, missing hardware and recording failures.

This was discovered by actually running the browser suites in the project's
isolated Linux ARM64 VM. The tested Linux WebKit 26.5 has `getUserMedia` but no
`MediaRecorder`, even on secure localhost. It cannot pass the recording gate.
Chromium has that API and exercises its real recorder with a synthetic audio
stream. Neither browser run establishes physical microphone capture.

No engine, transport or DSP changes were made. The master specification,
provided synthetic speech, owner recording, reference MP3s and `~/mlx-env` remain
unchanged. No cloud GPU, hosted service or phone was used.

## Scope and environment

Apple M5 host; existing Colima `djayvo` profile with 2 CPUs / 3 GiB / 16 GiB disk,
Ubuntu 24.04.4, Linux 6.8.0-117-generic aarch64. Container Node 24.17.0,
Playwright 1.61.1, Chromium 149.0.7827.0 and WebKit 26.5. The retained Mac baseline
uses Node 22.23.1, Chromium 149.0.7827.55 and WebKit 26.5. Actual Linux playback
contexts default to 44.1 kHz; deterministic offline PCM probes explicitly use
48 kHz. This is a Linux ARM64 VM, **not the owner's physical Intel Linux system**.
Browser-reported latency is not measured hardware latency.

The [pinned official Playwright image](https://playwright.dev/docs/docker)
`mcr.microsoft.com/playwright@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321`
contains Linux browsers and their system dependencies. Its matching JS package
comes from the existing project environment. The test container has networking
disabled, 2 GiB memory and 1 GiB shared memory. Only the browser source/dependencies,
audited static bundle, two test support files and an isolated output directory
are available; no repository `.env`, host home or credentials are mounted.
The consented source is copied byte-for-byte into that output directory for
local processing. The browser servers listen only on container loopback.

Exact [environment](evidence/linux-browser/environment.json),
[image manifest](evidence/linux-browser/image-manifest.json),
[bundle audit](evidence/linux-browser/bundle.json),
[summary](evidence/linux-browser/summary.json) and
[PCM/frame comparisons](evidence/linux-browser/waveforms.json) accompany this report.
Audio remains in ignored `renders/` directories, not Git or a public bundle.

## Gates

| Gate | Status | Measured evidence |
| --- | --- | --- |
| Recording capability UI | PASS | Both studios keep consented import enabled; Linux WebKit visibly disables Record. Native Mac/Chromium Record stays available; focused 390 px screenshots inspected |
| Unit checks | PASS | 26/26 on Linux Node 24 and Mac Node 22 |
| Linux Chromium prepared session | PASS | 29 checks, including real recorder with synthetic stream, cancellation, consent cleanup and server-disconnected generation/playback |
| Linux Chromium manual decks | PASS | 40 checks: media PCM, cue/rate/loop, EQ/effects, instruments, synthetic MIDI and offline operation |
| Linux WebKit prepared session | PARTIAL | 28 checks PASS; two recording checks NOT RUN because MediaRecorder is absent; imported-phrase generation, timing, consent and offline playback PASS |
| Linux WebKit manual playback/repetition | FAIL | Full suite stops after 8 passing checks; diagnostic copies also fail at initial playback. No unproven product workaround applied |
| Event-frame agreement | PASS | A start 4800 / first nonzero 4801; C start 100800 / first nonzero 100801 at 48 kHz; no A gaps at C entry; 12 long-grid cases per browser exactly match Mac |
| Waveform differences | PASS | All 22 six-second piano WAVs byte-identical to matching Mac browser baselines; normalized max/RMS difference 0. Failed WebKit suite completed its offline PCM stage before failing later |
| Measured session continuity | PASS | Chromium 1,608,704 / WebKit 1,687,040 consecutive counter samples, no silent blocks, counter gaps or timestamp gaps in final session runs |
| Startup repeatability | PARTIAL | Current 300 ms peaks 0.040289104 / 0.040289283; prior DJ17 failure remains unexplained |
| Build, public bundle, protected inputs | PASS | 35 audited assets; engine binaries and seven protected input hashes unchanged; prepared integrated-site bundle refreshed |
| Physical Intel Linux, browser microphone/MIDI/latency, venue | NOT RUN | ARM64 VM and synthetic inputs only; null audio sink is not hardware |
| Formal listening, musical quality, production acceptance | NOT RUN | Automated PCM/timing results do not establish musical quality; full specification PARTIAL |

The first Chromium session had eight browser timestamp anomalies but **zero**
independent PCM counter gaps and no silent blocks. Its full
[continuity trace](evidence/linux-browser/chromium-before-fix-continuity.json)
is retained. The final run had no timestamp anomalies; this does not erase the
first observation. Four WebKit screenshot-only CSP style warnings are separated
from application errors in the final prepared-session report.

Playable outputs are in `renders/linux-browser-eihb11az/`: final prepared
sessions `session-chromium-fPgHDR` and `session-webkit-wHyEes`, and manual-deck
PCM `dj-chromium-9CX6R2` and `dj-webkit-s3FUr9`. Each prepared-session directory
also contains its generated consented performance. No new human listening gate
is claimed. Prior Mac native/DSP checks are retained; no new native executable
or full Mac browser suite was run for this browser capability-only change.

## Findings retained

The first unit launches omitted `service-worker.js`, then `build_offline.py`
from the container. Adding those existing test-support files fixed the setup;
no product workaround was needed. Both failed logs and the final unit log are
retained. The first WebKit session passed 22 checks before timing out waiting
for recording to start. Its [failure receipt](evidence/linux-browser/webkit-before-fix-failure.json)
and [log](evidence/linux-browser/webkit-before-fix.log) remain available.

The updated suite checks the native recording capability. Where absent, it
asserts the disabled Record label and available consented import, records both
capture/later-permission checks as **NOT RUN**, and continues remaining consent,
server-disconnected generation and playback checks. Its overall result is
**PARTIAL**. A separate regression removes `MediaRecorder` on both studio pages,
including browsers that normally support it. It does not supply a fake recorder
to claim unsupported recording works.

**FAIL:** the full Linux WebKit manual-deck suite stopped after eight passing
checks at whole-track repeat. Its [trace](evidence/linux-browser/webkit-loop-failure.json)
shows A reaching the end, restarting at time zero and remaining `seeking=true`
for the ten-second deadline, while B advances and produces signal. There were
no app console errors. This extends DJ14 evidence; it does not establish that
all older Mac failures have the same cause.

A focused repeat of the cue/jog/rate/end sequence failed at iteration 2 after
one pass ([trace](evidence/linux-browser/loop-before.json)). Two browser-route-only
experiments were rejected: waiting up to five seconds for `seeked` failed at
iteration 8 after seven passes ([trace](evidence/linux-browser/loop-seek-wait.json));
reloading the same decoder at EOF, preserving rate, failed at iteration 1 with
a media error ([trace](evidence/linux-browser/loop-reload.json)). Neither experiment
modified product source or the bundle. Root cause remains **PARTIAL**; manual
WebKit repetition is not reliable in this environment.

The [diagnostic generator](evidence/linux-browser/remaining-webkit.py) makes a
separate copy of the DJ test with only whole-track repetition excluded, labels
that check **NOT RUN** and the whole report **PARTIAL**, and attempts the other
controls. Both diagnostic runs actually **FAIL** after four passing offline
checks at initial playback: the browser reports “The operation is not supported,”
with A at readyState 0. The [initial](evidence/linux-browser/webkit-remainder-initial-failure.json)
and [software-sink](evidence/linux-browser/webkit-remainder-pulse-failure.json)
failures are retained; later WebKit instrument/MIDI/offline-manual checks are
**NOT RUN** in this Linux validation. This cannot turn the original full-suite failure into a pass. The
standard test remains unchanged and still requires working repetition.

Native GStreamer diagnostics exposed missing audio-device connections in the
base image. A separate [derived image](evidence/linux-browser/Dockerfile) installs
PulseAudio 16.1 only inside the project container. Its
[null sink](https://wiki.freedesktop.org/www/Software/PulseAudio/Documentation/User/Modules/#module-null-sink)
is a clocked software output that discards audio; it is not a physical device.
The test container still has networking disabled. Only the image build accesses
package repositories, with no project data in its build context.

That setup correction removed connection-refused/device-open messages but did
**not** resolve the failure: the strengthened loop probe, now requiring time to
advance past 50 ms after repeat and the rate to remain 1.1, failed at iteration 1.
The [native log](evidence/linux-browser/pulse-gstreamer.log) contains WAV parser
“no RIFF stream” and internal-stream errors. These errors do not establish why
the native pipeline received unexpected bytes. No new media source, decoder or
retry behavior was added to Djayvo. Next investigation: isolate Blob seeking/
range delivery and HTMLMediaElement startup in a minimal WebKit reproduction,
then validate any fix against both native Mac and Linux browsers.

The first container reached its 2 GiB cap (709 max events), with no OOM or killed
processes. The separate software-sink container peaked at 1,598,947,328 bytes,
with zero max/OOM events. Its repeat/startup failures therefore were not
accompanied by cgroup limit events. This is not a proof of their root cause.

DJ17 startup repeatability remains **PARTIAL**. A passing startup run here cannot
establish the earlier failure's cause or certify sustained venue operation.
Six-hour grid cases are arithmetic checks, not six-hour playback tests.

## Reproduce

Start the existing profile without changing the default Docker context, build
and audit the bundle, then run the suites sequentially. Use a fresh output
directory and container name to preserve previous evidence. These commands
assume the existing project Playwright package is installed.

```sh
colima start djayvo --activate=false
sh scripts/web_build.sh
python3 scripts/verify_web_bundle.py
out=$(mktemp -d "$PWD/renders/linux-browser-XXXXXX")
mkdir -p "$out/voice-20261017-221411"
cp renders/voice-20261017-221411/source-pcm.wav "$out/voice-20261017-221411/"
docker --context colima-djayvo run --detach --init \
  --name djayvo-browser-check --network none --memory 2g --shm-size 1g \
  --workdir /work \
  -v "$PWD/apps/web:/work/apps/web:ro" \
  -v "$PWD/dist/web:/work/dist/web:ro" \
  -v "$PWD/scripts/service-worker.js:/work/scripts/service-worker.js:ro" \
  -v "$PWD/scripts/build_offline.py:/work/scripts/build_offline.py:ro" \
  -v "$out:/work/renders:rw" \
  mcr.microsoft.com/playwright@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321 \
  sleep infinity
docker --context colima-djayvo exec -w /work/apps/web djayvo-browser-check npm test
for browser in chromium webkit; do
  docker --context colima-djayvo exec -e DJAYVO_BROWSER="$browser" djayvo-browser-check node apps/web/tests/session.mjs
  docker --context colima-djayvo exec -e DJAYVO_BROWSER="$browser" djayvo-browser-check node apps/web/tests/dj.mjs
done
# Pass the four printed artifact directories, mapped from /work/renders to $out:
python3 docs/evidence/linux-browser/compare.py \
  "$out/session-chromium-..." "$out/session-webkit-..." \
  "$out/dj-chromium-..." "$out/dj-webkit-..."
docker --context colima-djayvo rm -f djayvo-browser-check
# Restore the profile to stopped only if it was stopped before this run:
colima stop djayvo
```

The comparison script checks retained protected-input hashes, exact A/C and
long-grid frames, and 22 playable stereo WAVs against matching Mac browser
baselines. Declared portability limits are maximum absolute difference ≤ 0.001
and RMS difference ≤ 0.0001 on normalized PCM. It reports exact byte identity
separately; different random personal performances are not compared as identical
compositions. Existing browser impulse assertions retain their one-frame timing
and 1e-6 amplitude bounds.

To reproduce the additional software-sink diagnostics, build the isolated image:

```sh
docker --context colima-djayvo build -t djayvo-browser-audio:1.61.1 - < docs/evidence/linux-browser/Dockerfile
```

Use that image in the same container command above and add
`--env PULSE_SERVER=unix:/tmp/djayvo-pulse`. Start its software sink before tests:

```sh
docker --context colima-djayvo exec djayvo-browser-check pulseaudio \
  --daemonize=yes --exit-idle-time=-1 -n --log-target=file:/tmp/djayvo-pulse.log \
  --load='module-native-protocol-unix socket=/tmp/djayvo-pulse auth-anonymous=1' \
  --load='module-null-sink sink_name=djayvo rate=44100 channels=2'
```

PulseAudio's [daemon flags](https://wiki.freedesktop.org/www/Software/PulseAudio/Documentation/User/Daemon/),
the exact derived image ID, package inventory and launch command are retained.
For the focused probe, copy `evidence/linux-browser/loop-pulse.mjs` into the
mounted output directory, serve `/work/dist/web` on container-only
`127.0.0.1:3000`, then run it with `DEBUG=pw:browser GST_DEBUG=2`. The experimental
seek/reload scripts use browser-route substitution only; they are evidence of
rejected hypotheses, not recommended product changes. `remaining-webkit.py`
generates the separately scoped diagnostic as described above.

The owned test container was removed and the existing Colima profile restored
to stopped. Docker's default context remains `desktop-linux`; the pre-existing
native portability container remains exited with its original exit code 137.
Cached browser images remain for reproducibility; no test services are running.
See [cleanup](evidence/linux-browser/cleanup.json).
