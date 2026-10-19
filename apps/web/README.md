# Djayvo web

The owner requested the web version first on 2026-10-18. Phone work is paused.
This is a working local browser app, using the same C++17 music engine through
WebAssembly. No backend, account, audio upload, model or paid API is required.

From the repository root, build and start:

```sh
sh scripts/web_build.sh
python3 scripts/web_serve.py
```

Open **http://localhost:4173**. Confirm permission, record about 2–5 seconds or
import 2–15 seconds (up to 8 MB), trim, choose Three takes, Club or Funk, then Make music.
Play and download the mixes below. Make music again uses a new seed. Capture stops
automatically after about 4.8 seconds. Leaving the tab stops/discards active capture
and cancels active generation; it never starts recording on its own.

Finished sessions save atomically in IndexedDB, up to ten per browser origin.
Cancellation discards the worker's entire unpublished filesystem. Failed storage
does not discard a completed mix: the page offers downloads and explains that it
is unsaved. Download before closing in that case. Stored file hashes are checked
on reload; damaged sessions are withheld, not silently deleted. Privacy & credits
includes an explicit, confirmed delete-all action, including withheld sessions.
The untrimmed input is never persisted. No library upload or cross-device sync.
Clearing browser data, private browsing, quota eviction or changing hostname/port
can make the library unavailable. Download important mixes.

## DJ workspace preview

Open [DJ workspace](http://localhost:4173/dj.html), also linked from the studio.
Confirm permission for your music, load local tracks into A and B, then use
play/pause, platter jogging, pitch/key lock, cue/hot cues, full-track looping,
manual tempo matching, three-band EQ, channel levels, crossfader and master.
Enable instruments for an 88-key piano, ten melodic sounds and twelve drum/percussion pads. Select Talk bass for the
low C2 register, then hold a key and move Mouth shape through OO / AH / EE.
This is an original formant synth, not microphone processing or an artist sample.
Use mouse/touch or A W S E D F T G Y H U J K for a chromatic octave; octave
buttons shift this computer-key range. Sustain, velocity, instrument level and
All notes off operate the shared C++ AudioWorklet engine. Tracks
stay in this tab and are not saved or uploaded. Unchecking permission unloads
both decks. The pages are separate; opening Voice studio ends the DJ session.

The existing offline preparation includes the DJ page. Reopen it after saving
app assets, then select local tracks; reload clears the decks. This is manual
mixing, with no beat sync, cue routing or AI Deck C yet. See
[checks and limits](../../docs/dj-console.md). Run the dedicated checks with
`node apps/web/tests/dj.mjs` (from the root), then the same command with
`DJAYVO_BROWSER=webkit`. They start their own temporary server.

## Offline use

In **Privacy & credits**, select **Keep studio available offline** while connected,
then reopen the studio. App files and instruments are verified and saved; audio,
account pages and API responses are excluded from this cache. Offline creation
needs no account. Updates wait until all studio tabs close. **Remove offline
studio** removes only the cached app; saved mixes stay in the separate library.
Browser storage eviction can remove either; download important music.

**Privacy & credits → Add Djayvo to your device** offers installation when your
browser supports it, with menu instructions otherwise. Installation and offline
storage are separate choices. Installed apps may have separate storage; download
important mixes before switching. [Installation support and checks](../../docs/web-installation.md)
cover local browser behavior; physical install/launch and public hosting remain unverified.
[Implementation and evidence](../../docs/offline-studio.md).

## Isolated build tools

The existing checkout and `~/mlx-env` are not modified by SDK setup. The SDK is a
separate tool repository under the ignored `build-web-tools` directory:

```sh
git clone --depth 1 https://github.com/emscripten-core/emsdk.git build-web-tools/emsdk
build-web-tools/emsdk/emsdk install 6.0.1
build-web-tools/emsdk/emsdk activate 6.0.1
sh scripts/web_build.sh
```

Do not repeat setup if it already exists. `DJAYVO_EMSDK` can select another SDK
directory. No shell profile edits are needed. CMake uses `.venv-build/bin` if
present. Build output is `dist/web`; only that folder is served. No repository
files, private audio, test fixtures or developer tools belong in a hosted bundle.
Run `python3 scripts/verify_web_bundle.py` before distributing a build.

The frontend uses native ES modules, browser audio, semantic HTML and CSS. This
single-screen studio needs no frontend runtime package or framework bundler.
Emscripten glue, libc/libc++ and runtime notices ship alongside the cleared sample
notices. Browser rendering uses its own adapter because MEMFS does not implement
the native export layer's hard links. The planner, instruments and DSP are shared.
The core's only accompanying change is an explicit bounded stream-size conversion
for the 32-bit WebAssembly compiler, with unchanged audio behavior.

Latest addition: [Organ, pad, lead and broader groove/harmony variation](../../docs/sustained-instruments.md).
Recent-body comparison ignores instrument swaps and tries at most eight candidates.

Previous addition: [Recorded guitar, strums, stems and browser QA](../../docs/guitar.md).
Previous addition: [Call-response, hybrid, recent-structure checking and browser QA](../../docs/creative-strategies.md).
Previous addition: [Funk implementation, cross-platform comparisons and browser QA](../../docs/funk.md).
Funk is a separate single-mix option; previous saved sessions remain valid.
The site studio preparation command copies the same audited engine into Next.

## Checks

```sh
npm --prefix apps/web ci
npm --prefix apps/web exec -- playwright install chromium webkit firefox
npm --prefix apps/web test
node apps/web/tests/wasm.mjs
# Keep the local server running for these commands:
npm --prefix apps/web run test:browser
DJAYVO_BROWSER=webkit npm --prefix apps/web run test:browser
DJAYVO_BROWSER=firefox npm --prefix apps/web run test:browser
node apps/web/tests/browser-render.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/browser-render.mjs
DJAYVO_BROWSER=firefox node apps/web/tests/browser-render.mjs
# Offline tests start their own disposable server; repeat with webkit/firefox:
DJAYVO_BROWSER=chromium node apps/web/tests/offline.mjs
DJAYVO_BROWSER=chromium DJAYVO_OFFLINE_ROOT=1 node apps/web/tests/offline.mjs
```

Browser names are explicit: `chromium`, `webkit`, or `firefox`; unknown values
fail before launching. Both UI and worker runners keep fresh artifact folders.
Malformed saved sessions are withheld without blocking healthy ones; no data is
silently deleted. [Recovery and Firefox evidence](../../docs/web-recovery.md).

Tests import the supplied `renders/fixtures/synthetic-speech.wav`; they do not
regenerate it or bundle it into the application. WASM and worker comparison
runners now print a fresh output directory so historical renders are preserved. Browser tests use disposable
contexts, never the owner's browser library. Chromium's microphone test uses
the supplied fixture as a fake device. Muted playback is transport evidence,
not hearing, musical quality or physical microphone evidence.

`browser-render.mjs` exports actual browser worker results for the existing
`scripts/compare_portability.py` comparator. Use seed 4123 for native references;
three styles use `--style all`, club uses `--style club`, funk uses `--style funk`. The additional funk
worker and UI checks are in `docs/evidence/funk/wasm-check.mjs` and
`docs/evidence/funk/browser-check.mjs`; they use fresh evidence directories. See the complete
[web evidence report](../../docs/web-instant-remix.md) for exact comparisons,
failure history and gates.

## Hosting boundary

The local server binds only `127.0.0.1:4173`. It does not expose your Mac to the
network. Public hosting is **NOT RUN**. A future static host must serve `.wasm`
as `application/wasm`, use HTTPS for recording, and supply the security headers in
`scripts/web_serve.py`. No server-side audio processing is needed. Installation support and optional offline caching are implemented; physical
installed-app checks, billing and public sharing remain open; the separate site shell has local account code
with live infrastructure still paused.
WebKit automation is not installed Safari/iPhone hardware validation. Physical
browser microphone, device routes, battery and formal listening remain open.

Documentation consulted (Context7 tools were unavailable):
[Emscripten setup](https://emscripten.org/docs/getting_started/downloads.html),
[C++/JavaScript calls](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html),
[compiler settings](https://emscripten.org/docs/tools_reference/settings_reference.html),
[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder),
[OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext),
[Playwright contexts](https://playwright.dev/docs/api/class-browsercontext).
