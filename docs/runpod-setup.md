# Runpod setup — 2026-10-22

**PARTIAL:** Runpod account access verified; local worker/provider tests PASS.
Image build, endpoint provisioning, real NVIDIA inference, listening and production
website dispatch remain NOT RUN at this checkpoint. No customer purchases enabled.

The owner selected Runpod after comparison with the existing Vast research rental
controller. Runpod queue endpoints supply asynchronous job status and worker scaling;
Vast trial records remain historical and unchanged. This is a new provider adapter,
not a claim that research rentals were a live multi-user product.

## Implementation

- Explicitly allowlisted Linux/amd64 image: pinned ACE-Step code/weights and model
  checksums, Qwen planner, CLAP style screen, Whisper transcription and sample arrangement.
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

The private GHCR image builds from `codex/runpod-setup` through
`.github/workflows/runpod-image.yml`. Vercel deployments are disabled for that
branch only; ordinary core CI skips that infrastructure-only branch. Main remains
unchanged remotely. No private recordings, model training data or dotenv files
are sent in the Docker build context. Public checkpoints are fetched by pinned
revision and verified against manifests while building the image.

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

## Remaining release work

Build/pull verification; authenticated real GPU runs for DNA and Improvise;
measure startup, runtime, failure and retry costs; verify R2 checksums and listening;
connect durable website job dispatch/recovery and cost-backed credit settlement.
The local rehearsal quote must not be used as a production GPU-cost certificate.
Stripe credit checkout and public launch remain separate unfinished work.

## Sources

Context7 was unavailable. Official [Runpod handlers](https://docs.runpod.io/serverless/workers/handler-functions),
[request policies](https://docs.runpod.io/serverless/endpoints/send-requests),
[endpoint API](https://docs.runpod.io/api-reference/endpoints/POST/endpoints),
[GitHub private image authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[Qwen model](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507), and
[Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration)
were consulted. No invented GPU measurements or human listening results.
