# Dependencies, licenses, and asset provenance

Website account shell (2026-10-18): Next.js 16.4.2, React/React DOM 19.3.1,
Better Auth 1.7.10, pg 8.23.1 and server-only 0.0.1 report MIT licenses in their
installed package metadata. Versions/transitive dependencies are locked in
`apps/site/package-lock.json`. The Resend integration uses the platform HTTPS
client without an SDK. These packages are separate from the portable C++ core
and original static studio. Public distribution still requires the complete
bundled dependency notices/release audit; no deployment occurs in this slice.

Web target (2026-10-18): Emscripten 6.0.1 compiles the shared core; its MIT/NCSA
notice plus bundled musl, libc++, libc++abi, libunwind and compiler-rt notices are
copied into `dist/web/licenses/EMSCRIPTEN-LICENSE.txt`. Sample notices are copied
unchanged. Browser UI has no third-party runtime package. Playwright 1.61.1
(Apache-2.0) and its browser binaries are developer-only and are not bundled.
See [web evidence](web-instant-remix.md), the pinned `apps/web/package-lock.json`
and `docs/dependencies.json`. Project outbound licensing/public release remains
unselected; this inventory does not grant a public distribution license.

M0a engine dependencies: **only the platform C/C++ standard runtime and math
library**. No DSP framework, codec library, sampler library, SoundFont, model,
cloud service, or paid component is linked. The current revision embeds a small
CC0 acoustic sample bank described below; the original M0a inventory is historical.
No dependency code or system runtime binary is vendored in this repository.
The inventory is machine-readable in `dependencies.json`.

| Component | Observed version | Role | License / distribution consequence |
| --- | --- | --- | --- |
| Original Djayvo engine, composition, and procedural voices | 0.2.0 | Project source | New project code; no third-party code license or sample attribution. No project-wide outbound license selected. |
| GCC/G++ | 15.2.0 | Build tool | GPL-3.0-or-later; compiler is not shipped with Djayvo. |
| libstdc++, libgcc | GCC 15 toolchain | Linux system runtime, dynamically linked | GPL-3.0-or-later WITH GCC-exception-3.1; installed exception explicitly covers eligible proprietary independent modules. Runtime itself is not redistributed here. |
| glibc, libm, dynamic loader | 2.43 | Linux system runtime, dynamically linked | LGPL-2.1-or-later and component notices in installed package copyright. No libc binaries are bundled. |
| CMake | 3.31.6 | Build/test tool | Core BSD-3-Clause; Python wheel packaging Apache-2.0/BSD-3-Clause, plus bundled-tool notices. Tool is not linked into the engine or redistributed. |
| GNU Make | 4.4.1 | Build tool | GPL-3.0-or-later; not part of the product. |
| CPython standard library | 3.14.4 here; >=3.9 required | Offline tests/inspection | PSF license stack and incorporated-component notices; no Python runtime embedded in the engine. |
| Git | 2.53.0 | Repository tool | GPL-2.0; not part of the product. |

License evidence was read from the actual installed packages, rather than inferred
from library names: `/usr/share/doc/gcc-15-base/copyright` (including GCC Runtime
Library Exception 3.1), `/usr/share/doc/libc6/copyright`,
`/usr/share/doc/python3.14/copyright`, and CMake's installed `Copyright.txt` and
wheel `LICENSE_Apache_20` / `LICENSE_BSD_3`. Provenance paths and content hashes are
in `dependencies.json`. Distribution of these tools/runtimes themselves is outside
this source-only prototype; their own notices would travel with such packages.
The actual macOS toolchain is recorded in `evidence/m0d/environment.json`.
No Apple runtime is included here.

`assets/manifests/m0a.json` records the original M0a sound-source inventory: it contains zero
imported audio files. The only sound sources are the original procedural voices;
their checked-in source hashes are recorded. The melody, chord voicings, and
rhythm events are authored in `core/arrangement/demo.cpp`; there is no sampled
third-party performance. Generated WAV hashes live in `docs/evidence/` and the
audio remains local/ignored by Git. There are no training datasets. The owner's
consented source is private local input, not a redistributable voice asset.

## Current acoustic instrument bank

`assets/manifests/acoustic-v1.json` inventories 53 individual note/hit recordings:
seven upright piano pitches with three dynamics and two takes each, plus three
pizzicato contrabass pitches from
[VSCO 2 CE](https://versilian-studios.com/vsco-community/), plus bass drum,
snare, closed hat, and open hat (two takes each) from
[VCSL](https://github.com/sgossner/VCSL). Credit: Versilian Studios / Sam Gossner,
Ivy Audio / Simon Dalzell, and library contributors.

Both repositories' pinned license files declare **CC0-1.0**, including commercial
reuse, modification and redistribution. Full notices are in `assets/licenses/`.
VSCO's README requests credit and asks users not to sell the samples directly;
this project credits the library and uses notes inside an instrument engine.
No sample resale, artist imitation, reference-track sampling, or training occurs.
This does not change Djayvo's own source-code license.

Each source URL pins a commit; SHA-256 identifies source bytes and prepared PCM.
The manifest records root note, crop, mono conversion, windowed-sinc resampling,
normalization and edge fades. `scripts/prepare_acoustic_bank.py` reproduces the
22.05 kHz PCM16 bank with standard-library Python; raw downloads remain ignored.
`scripts/verify_acoustic_assets.py` validates the compiled bank and notices
offline. The generated immutable C++ data has no third-party runtime dependency.

Original project code and generated composition have not been published, and
this milestone does not select an open-source license for Djayvo. Third-party
dependency licenses do not impose a new public source-code grant on this project
under the recorded build arrangement.

## Original electronic palette

`assets/manifests/electronic-v2.json` inventories 14 original 24 kHz PCM16
one-shots generated from project equations and seeded noise. The generator
`scripts/prepare_electronic_bank.py` never reads reference music or downloaded
samples. Compiled bank, per-sample PCM and generator hashes are checked by
`scripts/verify_electronic_assets.py`. This is original project material under
the same unselected project-wide outbound license, not a CC0 third-party grant.
No new runtime dependency or training material is introduced. The v1 manifest
is retained as history; its matching bank and generator are in commit `651fe96`.

## Optional synthetic-speech fixture tool

Continuation work used **eSpeak NG 1.52.0** as a separate local developer
executable to generate original project text. Upstream identifies its software
license as [GPL-3.0-or-later](https://github.com/espeak-ng/espeak-ng#license-information).
The [license text](https://espeak.sourceforge.net/license.html) distinguishes
running a program from conveying it and treats output according to its content.
No executable, library, voice data, source code, or dictionary is linked into
Djayvo or included in the transfer. It includes the local synthetic WAV and
provenance, not a human recording or cloned voice. This is a developer fixture;
production voice assets have not been selected. `scripts/make_fixture.py` also
provides original procedural signals with **no external generator requirement**.

Exact-version Ubuntu `.deb` packages were extracted under
`/tmp/djayvo-speech-tools`, without installing/changing system packages. Package
and notice hashes are recorded under `optional_fixture_tool` in
`dependencies.json`. These are developer tools only; Djayvo still links only
system C/C++ runtime/math libraries. Synthetic metadata is in
`assets/manifests/m0-remix.json`. No human dataset/training rights are inferred.

An additional schema conformance check used the already installed MIT-licensed
`jsonschema` 4.19.2 and its installed Python dependencies. Their exact versions
and declared licenses are recorded under `optional_schema_check`; no packages
were installed for that check, and they are not engine/CTest dependencies.

The later Mac reference/arrangement analysis uses a separate `.venv-analysis`
with NumPy, SciPy, Matplotlib and jsonschema plus their Python dependencies.
Exact versions and installed license metadata are in
`evidence/arrangement-review/analysis-packages.json` and the adjacent requirements
file. Existing FFmpeg 9.0.2 decodes the owner's reference MP3s and measures loudness.
These tools remain local developer utilities; none is linked or bundled into the
C++ engine. Reference music stays private and is used only for analysis/audition,
not instrument sampling, training or distribution. The new Linux container's
actual compiler/runtime environment is recorded in `evidence/arrangement-review/`.

## Native iOS application

The iOS app uses system SwiftUI, Foundation, AVFoundation, UIKit, CryptoKit and
libc++; Apple SDK/runtime use is governed by the applicable Apple developer and
platform agreements. No Apple framework binary is vendored. The shared C++17
engine still uses only standard C++/math APIs. The app bundles the existing full
CC0 instrument notices and exposes their credits in its privacy sheet. Debug
alone includes the existing synthetic test WAV; Release excludes it and all
private/reference audio. The actual Release bundle is inspected by
`scripts/verify_ios_bundle.py`.

XcodeGen 2.46.0 is a development-only MIT-licensed project generator (installed
license inspected at `/opt/homebrew/Cellar/xcodegen/2.46.0/LICENSE`); it is neither
linked nor bundled. The committed Xcode project builds without XcodeGen or any
package download. Actual Xcode/SDK/device versions and validation boundaries are
in [the iOS report](ios-instant-remix.md). This inventory is not final release
rights or App Store approval.

## Recorded electric guitar

[Recorded guitar implementation and evidence](guitar.md) adds 78 single-note
recordings by Brian Wood / Karoryfer Lecolds, pinned to the Black And Green
Guitars repository commit `b3b3249d37dc977a1a297bd2dc053e6d9b6b805c`.
The repository's CC0 license permits commercial modification/redistribution.
`assets/manifests/guitar-v1.json` carries per-source hashes and prepared PCM
metadata; `assets/licenses/BLACK-AND-GREEN-GUITARS-CC0.txt` retains the full
notice. No Sforzando code/plugin is bundled. `prepare_guitar_bank.py` reuses the
existing standard-library PCM preparation; `verify_guitar_assets.py` audits the
compiled bank offline. Djayvo's own outbound license remains unselected.

## Original sustained voices

Organ, pad and lead use original additive synthesis, attack/release envelopes
and per-voice tone filtering in the portable engine. No source recording, artist
reference or model is used. `assets/manifests/sustained-v1.json` records the source
hash and provenance; `scripts/verify_sustained_assets.py` checks it offline. These
are deliberately electronic voices, not claims of acoustic instrument realism.
The project outbound license remains unselected.

## Optional speech timing research

The pinned faster-whisper tiny model and faster-whisper/CTranslate2 run only in
isolated local analysis environments. [Word timing](word-timing.md) links exact
model hashes, dependency locks and retained MIT notices under `ai/analysis/licenses`.
No model or analysis runtime is linked/bundled with the app. Transitive tool
redistribution requires a separate review if bundling is proposed. Original
feedback-reverb DSP adds no external runtime dependency or sampled asset.

## Local licensed evaluation cohort

[The cohort ledger](licensed-evaluation.md) records LibriSpeech CC BY 4.0 source
hashes and full attribution, plus two CC0 recordings and one author-dedicated
public-domain recording from Wikimedia Commons. Notices accompany each local
listener packet. License permission is not represented as individual study
consent. These inputs, derived audio and model weights are not app assets, not
committed and not published; public sharing and training remain unauthorized.
