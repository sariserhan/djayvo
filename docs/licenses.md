# Dependencies, licenses, and asset provenance

M0a engine dependencies: **only the platform C/C++ standard runtime and math
library**. No DSP framework, codec library, sampler library, SoundFont, external
sample pack, model, cloud service, or paid component is linked or downloaded.
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
The future macOS toolchain/runtime inventory is **NOT RUN**, because no Mac build
was executed. No Apple runtime is included here.

`assets/manifests/m0a.json` records the sound-source inventory: it contains zero
imported audio files. The only sound sources are the original procedural voices;
their checked-in source hashes are recorded. The melody, chord voicings, and
rhythm events are authored in `core/arrangement/demo.cpp`; there is no sampled
third-party performance. Generated WAV hashes live in `docs/evidence/` and the
audio remains local/ignored by Git. There are no training datasets or voice assets.

Original project code and generated composition have not been published, and
this milestone does not select an open-source license for Djayvo. Third-party
dependency licenses do not impose a new public source-code grant on this project
under the recorded build arrangement.

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
