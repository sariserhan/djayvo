# Clean-checkout website build — 2026-10-19

**PASS — local clean-build fix. Actual Vercel redeployment: NOT RUN.**

The owner's Vercel build of `8e544e5` failed before Next.js compilation: the
prebuild audited `dist/web`, but that generated directory is intentionally ignored.
The earlier local build had reused existing output and did not establish that a
fresh Git import worked. The missing-bundle failure was reproduced in an isolated
tracked-source snapshot; [original failure](evidence/vercel-clean-build/original-failure.log).

## Fix

Site preparation now invokes the existing shared-engine build before auditing
and copying the studio. Every build compiles current sources incrementally;
neither the public-file allowlist nor license/offline checks are bypassed.
Missing Emscripten 6.0.1 is installed in `build-web-tools/` from its release tag;
missing CMake is installed as 3.31.6 in a project-only Python environment.
When Python is older than 3.10, uv 0.13.2 bootstraps Python 3.12.13 under that same
tools directory (including its cache), without changing system Python.
An existing SDK with another active version fails explicitly. No application
binary is checked into Git. The master, recordings, fixture, database, storage
provider, `~/mlx-env`, and shell profiles are unchanged.

The new Amazon Linux 2023 `website` CI job starts without `dist/web`, installs site dependencies,
builds, runs the seven unit tests, and audits the output. It requires no provider
credentials and performs no migrations. The existing browser render check now
accepts `DJAYVO_STUDIO_URL` to exercise the site-hosted worker as well as port 4173.

## Evidence

- **PASS — Linux cold build:** Amazon Linux 2023 x86_64/glibc 2.34, Node 22.23.2,
  starting with Python 3.9.25 and no CMake, SDK, bundle, site cache or secrets.
  Project-local Python 3.12.13, uv 0.13.2, CMake 3.31.6 and Emscripten 6.0.1
  bootstrap successfully. Next.js compilation/typechecking, all seven unit tests,
  bundle audit and production-server startup pass. Both WASM binaries and the
  JavaScript glue match the Mac build byte-for-byte.
  [Build output](evidence/vercel-clean-build/linux-build.log),
  [versions and hashes](evidence/vercel-clean-build/linux-results.json).
- **PASS — Linux-served browser renders:** a Mac Chromium client requests the
  Linux production server through port 3002. All seven WAVs, plans and event
  frames match the clean Mac build exactly; maximum/RMS PCM difference **0**.
  This is a Linux build/server check, not a Linux browser/device check.
  [Evidence](evidence/vercel-clean-build/linux-browser.json).
- **PASS — installed-tool reuse:** subsequent Mac and Linux builds reuse the
  isolated tools without installing again.
  [Mac log](evidence/vercel-clean-build/mac-incremental.log),
  [Linux log](evidence/vercel-clean-build/linux-incremental.log).
- **PASS — reproduction:** the old audit fails on the missing bundle in a clean snapshot.
- **PASS — Mac clean-source build:** Node 22.23.1, CMake 4.4.2, existing isolated
  Emscripten 6.0.1; Apple M5, 16 GiB, macOS 26.7.1. No prior generated files, site
  cache or `.env` files were copied. `npm ci`, `npm run build`, seven unit tests,
  and the bundle audit pass. [Build log](evidence/vercel-clean-build/mac-build.log),
  [results and hashes](evidence/vercel-clean-build/mac-results.json).
- **PASS — Mac Chromium render:** the clean site at port 3001 renders all seven
  styles from the existing synthetic fixture through `/studio/engine-worker.js`.
  WAVs, plans and event TSVs are byte-identical to a freshly rendered baseline
  from the unchanged original studio. PCM maximum/RMS difference: **0** for all
  seven. [Browser versions, timings and audio hashes](evidence/vercel-clean-build/mac-browser.json).
- **FAIL — initial Linux test harness:** SDK tar extraction could not create
  npm/npx/corepack links on the Mac-shared VirtioFS directory. This run did not
  reach C++ compilation. The retry uses the container's native filesystem,
  matching a hosted build more closely.
  [Failure log](evidence/vercel-clean-build/linux-bind-mount-failure.log).
- **FAIL — initial native-filesystem Linux build:** the base image's Python
  3.9.25 did not meet Emscripten's 3.10 minimum. This revealed a second missing
  toolchain prerequisite; the build now bootstraps compatible Python locally.
  [Failure log](evidence/vercel-clean-build/linux-python39-failure.log).
- **FAIL — first Python fallback retry:** the shell retained its cached system
  Python after the new environment was created. Clearing that command cache and
  asserting Python compatibility before SDK setup fixes this selection error.
  [Failure log](evidence/vercel-clean-build/linux-python-path-failure.log).
- **NOT RUN — remote CI execution, actual Vercel redeployment, hosted auth/email/R2, new listening.**
  Local build/render success does not establish hosted behavior or musical quality.

The Linux test uses the [Amazon Linux 2023 base documented by Vercel](https://vercel.com/docs/builds/build-image),
not Vercel's undistributed build image. It runs amd64 under Rosetta in a local
Colima VM (4 CPUs, 6 GiB; test container capped at 5 GiB). The first slow image
bootstrap under QEMU was interrupted to enable Rosetta; this was test preparation,
not an application build failure. [Dockerfile](evidence/vercel-clean-build/Dockerfile).
Tool setup follows the [official versioned Emscripten SDK procedure](https://emscripten.org/docs/getting_started/downloads.html).

## Reproduce and redeploy

In a fresh checkout, use Python 3.9+ with venv/pip, Git, Make, tar with xz support,
and Node 22:

```sh
cd apps/site
npm ci
npm run build
npm test
npm run audit:bundle
```

For the isolated Linux approximation, build the evidence Dockerfile with
`docker build --platform linux/amd64 -t djayvo-vercel-check:node22 docs/evidence/vercel-clean-build`.
Create a container from that image, copy a `git archive HEAD` snapshot into
`/work` using `docker cp`, and run the commands above in `/work/apps/site`.
Use native container storage for the SDK; do not copy local secrets or recordings.

On Vercel, keep root **apps/site**, framework **Next.js**, Node **22.x**, build
command **npm run build**, and source files outside the root directory included.
The first build downloads the SDK and compiles both engines. Push the fix and
redeploy the new revision; retrying `8e544e5` repeats the original failure.
Provider configuration and actual hosted smoke checks remain separate gates.
