# Runpod setup — 2026-10-22

**PASS, technical setup; PARTIAL, hosted release:** Runpod access, Linux build,
authenticated endpoint, successful real Music DNA and Improvise generation, R2
checksum delivery and shutdown verified. Successful execution took 45.931 seconds
for a 120-second DNA song and 47.682 seconds for a 30-second Improvise song.
Cold starts took 3–5 minutes. The jazz fixture failed at style checking and remains
unresolved; listening, final costs/load and production website dispatch/billing
remain unfinished. No customer purchases enabled. All workers are disabled.

The owner selected Runpod after comparison with the existing Vast research rental
controller. Runpod queue endpoints supply asynchronous job status and worker scaling;
Vast trial records remain historical and unchanged. This is a new provider adapter,
not a claim that research rentals were a live multi-user product.

## Implementation

- Explicitly allowlisted Linux/amd64 image: pinned ACE-Step code/weights and model
  checksums, Qwen planner, CLAP style screen, Whisper transcription and sample arrangement.
- Runpod SDK uses the base Python environment; music runs in its pinned upstream
  virtual environment so newer provider SDK dependencies cannot replace model dependencies.
- Same local music pipelines, opt-in CUDA backend. The CUDA planner uses original
  Qwen3-4B-Instruct-2507 BF16 weights instead of the Mac MLX 4-bit conversion.
  The prompts/validators remain shared; output equivalence and listening require a GPU run.
- Jobs accept only bounded metadata and scoped signed R2 staging grants. No R2,
  database or Stripe credentials reach the generation process. Private files are
  removed after each job. The child process group is killed on timeout.
- DNA retains its direction-bound audio screening and at most two takes. Improvise
  retains transcription and the existing varied sample arrangement, including its
  documented fallback when a sample cannot fit. No new quality acceptance claimed.
- Server-only API adapter: asynchronous submit/status/cancel, validated receipts,
  no automatic resubmission after an ambiguous POST response. A future durable
  dispatcher must reconcile ambiguous submissions before permitting another render.
- Provisioning initially sets both minimum and maximum workers to zero. Enable at
  most one worker for a bounded trial; no always-on GPU. Execution limit 15 minutes,
  job TTL 30 minutes; these are runtime bounds, not a total-dollar provider cap.

## Build and provision

The GHCR image builds from `codex/runpod-setup` through
`.github/workflows/runpod-image.yml`. Vercel deployments are disabled for that
branch only; ordinary core CI skips that infrastructure-only branch. Main remains
unchanged remotely. No private recordings, model training data or dotenv files
are sent in the Docker build context. Public checkpoints are fetched by pinned
revision and verified against manifests while building the image.

Registry verification found the published image **public**, contrary to the initial
private-image plan. Anonymous pull was verified; the build contains only allowlisted
source and public model checkpoints, never credentials or recordings. The Runpod
template was requested with `isPublic:false`; job submission requires authentication
and unauthenticated endpoint health returns HTTP 401. The configured
registry credential is not required to pull this public image. [Image receipt](evidence/runpod-setup/image.json).

The image contains 19.97 GB compressed; its largest layer is 6.32 GB. Endpoint
`jl77hn92npt65k` uses the verified digest and one RTX 4090 or L40S per worker. Runpod's create
API substituted max=3 for the requested zero, with min=0 and no queued jobs; an
immediate PATCH set max=0 and read-back verified it. Provisioning now includes that
PATCH. The v2 placement update can rename the attached template; reruns resolve
its immutable ID from the endpoint instead of creating a second template by name.
A setup rerun-created orphan was removed after confirming no endpoint referenced
it; a live rerun and regression test verify reuse. [Endpoint receipt](evidence/runpod-setup/endpoint.json).

Configuration in ignored `apps/site/.env.local`:

- `RUNPOD_API_KEY`: Runpod account credential, verified via read-only inventory.
- `RUNPOD_GHCR_TOKEN`: GitHub classic token with `read:packages`, used only for
  Runpod's private container registry credential. Renew before its expiry.
- `RUNPOD_REGISTRY_AUTH_ID`: provider registry credential ID, after registration.
- `RUNPOD_WORKER_IMAGE`: immutable `ghcr.io/sariserhan/jamloom/music-worker@sha256:…`.
- `RUNPOD_ENDPOINT_ID`: created endpoint ID.

From `apps/site`, Node 22:

```sh
npm run runpod:setup          # review image, storage target and disabled endpoint
npm run runpod:setup -- --apply
node --import tsx --test tests/runpod-provider.test.ts
```

The setup script refuses to overwrite an existing mismatched/active endpoint.
If a provider creation response is lost, inspect inventory before retrying.
It never submits music generation or changes wallet balances.

## Linux build verification — 2026-10-23

The Linux build passed all pinned model checksums, the unchanged 597-file ACE
source hash and Python imports. Initial dependency and generated-build-file
failures were corrected; [attempt history](evidence/runpod-setup/build-attempts.json)
retains them. The combined model layer was proactively replaced with separate
layers to respect GHCR's documented 10 GB per-layer limit. No model verification
was disabled. [Linux check receipt](evidence/runpod-setup/model-build-checks.log).

## Bounded verification

`runpod-trial.ts --product music-dna --apply` (Node 22 / tsx, from `apps/site`)
starts one test only from a disabled endpoint, waits for its single worker to be
ready before submitting, validates its R2 audio checksum,
saves results under ignored `build-runpod/`, then disables workers and removes
staging objects. Improvise additionally requires `--source /absolute/permitted.wav`.
The 20-minute wall limit includes startup; the worker is disabled in cleanup.
An existing trial receipt blocks accidental repeat spending. Submission ambiguity
requires provider reconciliation before another attempt. No customer credits are used.

The test recording was synthesized directly to a local file; no microphone capture
or speaker playback was started. Runpod account preflight confirmed available funding and
zero current hourly spend. No billing settings or automatic top-up were changed.

## Queue diagnosis — 2026-10-23

The first job stayed queued without workers because the configured CUDA allowlist
(12.8/12.9/13.0) excluded available hosts, which the live GPU catalogue reported
as 13.2. The v1 API rejected adding 13.2. The v2 API accepted an empty allowlist
with `minCudaVersion:12.8`; a worker was then assigned and started downloading
the image. Provisioning now uses this driver floor instead of a frozen allowlist.
The trial remains limited to one worker and its original 20-minute wall limit.
This configuration delay is not a measured normal customer generation time.

The first worker then rejected its job in 148 ms: the S3 SDK signed a bucket-hosted
URL while the worker requires an account-hosted `/bucket/uploads/...` path. Shared
R2 signing now explicitly uses path-style URLs. Real signed PUT/GET byte identity
and validation of the actual grant/payload PASS; existing keys are unchanged.
The provider adapter now preserves terminal failure status while discarding private
error text. The first failed job is retained, staging removed and workers disabled
before a new bounded trial. A second submission returned no job ID; two subsequent
health reads showed no new queued/active work. The next attempt waited for a ready
worker (about 181 seconds), then failed after 76.279 seconds of execution. No audio
was accepted. Safe source-location diagnostics were added without exposing private
exception messages, lyrics or grants. [Storage evidence](evidence/runpod-setup/storage-grants.json).

## Successful Improvise trial — 2026-10-23

A synthetic spoken fixture produced a valid 30-second, 48 kHz stereo PCM16 song
on the real provider. Worker startup took 183.190 seconds, provider queue delay
9.781 seconds and execution 47.682 seconds. Signed R2 delivery and downloaded
SHA-256 identity PASS. The endpoint was disabled and staging deleted. This is one
technical measurement, not a latency guarantee or human listening acceptance.
[Receipt](evidence/runpod-setup/improvise-trial.json); local audio is retained under
`build-runpod/improvise/song.wav`.

The provider inventory reported Blackwell MIG workers despite configured ADA pools,
and transiently listed two workers while configured max=1. Actual placement and
final billed cost remain unverified; the configured limit is not a proven hard
spending cap. [Observation](evidence/runpod-setup/worker-placement-observation.json).

## Successful Music DNA trial — 2026-10-23

The metal fixture (Enter Sandman / Metallica and The Trooper / Iron Maiden) produced
one 120-second, 48 kHz stereo PCM16 song. Worker startup took 303.191 seconds,
provider queue delay 11.621 seconds and execution 45.931 seconds. The unchanged
style screen accepted heavy rock in all four windows. Signed R2 delivery and
checksum identity PASS; workers disabled and staging deleted afterward.
[Receipt](evidence/runpod-setup/dna-success.json); local audio is retained under
`build-runpod/music-dna/song.wav`.

The earlier jazz fixture is retained as a failed style-stage test. Switching the
verification fixture does not resolve that failure or certify all genres. No
quality guard was weakened. [Failed attempts](evidence/runpod-setup/dna-trial.json).
Both successful trials retain their exact image and input provenance; the later
image changes only failure diagnostics from the Improvise-tested image.

## Remaining release work

Resolve the jazz style-stage failure; measure billed costs, cached startup, concurrent
load and recovery; obtain listening acceptance;
connect durable website job dispatch/recovery and cost-backed credit settlement.
The local rehearsal quote must not be used as a production GPU-cost certificate.
Stripe credit checkout and public launch remain separate unfinished work.

## Generation progress display — 2026-10-23

**PASS, local; NOT RUN, hosted integration/deployment.** Music DNA and the
existing Improvise browser remix share a visual step display and animated music
indicator (static with reduced motion). Copy is allowlisted and uses no provider
diagnostics, hardware terminology, invented percentages or queue positions.
Queued jobs say “You’re in the queue” and explain that the request is waiting to
be processed. Real phase updates show preparation, writing, creation, another
take, checking and saving; completion, rejection, cancellation and reconnects
have distinct messages. No stage advances on a timer.

Music DNA now keeps polling queued jobs and restores them on reload. Its local
endpoint returns owner-only queued status before files exist; Python reports
structured phases, and saving remains unfinished until durable settlement.
The existing local Improvise remix reports preparation, creation and saving;
it does not claim to use a cloud queue. The separate local AI singer preview
and production Runpod dispatcher are not integrated into this display yet.

Validation: 70 site tests, 144 browser-engine unit tests, 12 Music DNA Python
tests, TypeScript, production build and public-bundle audit **PASS**.
`apps/site/tests/generation-progress-browser.mjs` passes in Chromium and WebKit
against `http://127.0.0.1:4235`, with 1280/390/320-width layouts, axe checks,
reduced motion, queued reload, reconnect, retry, cancellation, rejection and
completion. Cloud statuses are HTTP fixtures; the final local remix uses the
real engine and synthetic audio with speaker output muted. Existing
`taste-recovery-browser.mjs` regressions also pass. Screenshots were inspected
in `/tmp/jamloom-generation-progress/`. The first run hit an older preview on
port 4247; all passing rendered checks used the current development page.
The in-app Browser tool was unavailable; the owner approved local Playwright.

Reproduce: run site `npm test`, web `npm test`,
`python3 -m unittest discover -s tests -p test_music_dna_song.py`, site
`npm run typecheck`, `npm run build`, `npm run audit:bundle`, then
`JAMLOOM_TEST_URL=http://127.0.0.1:4235 node tests/generation-progress-browser.mjs`
and `node tests/taste-recovery-browser.mjs` with the same URL environment.
No paid cloud job, model promotion or deployment was performed for this change.

## Sources

Context7 was unavailable. Official [Runpod handlers](https://docs.runpod.io/serverless/workers/handler-functions),
[request policies](https://docs.runpod.io/serverless/endpoints/send-requests),
[endpoint API](https://docs.runpod.io/api-reference/endpoints/POST/endpoints),
[v2 placement constraints](https://docs.runpod.io/api-reference-v2/serverless/update-a-serverless-endpoint),
[NVIDIA driver compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/frequently-asked-questions.html),
[GitHub private image authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[Qwen model](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507), and
[Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration)
were consulted. GPU timing comes from the linked real trials; no human listening result is claimed.
