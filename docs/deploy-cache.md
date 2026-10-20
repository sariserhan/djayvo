# Cached Vercel build repair

2026-10-20 (America/New_York). Fix commit: `66031e3`.

## Cause

The Git deployment of `41fd759`, `dpl_2zVqSWH5pE65XfiVxifm2GMA8vfZ`
(`site-3s8qnpnlo-ssari.vercel.app`), restored the cache from the last successful
release. SDK setup found no `emsdk_env.sh`, then attempted `git clone` into the
existing non-empty `build-web-tools/emsdk` directory. Git exited 128, stopping
`studio:prepare` before Next.js compiled. [Original build log](evidence/deploy-cache/failure.log).
The Node 24/22 settings warning was not the failure; the project correctly used
its pinned Node 22 requirement. GitHub's rename and latest commit were recognised.

The non-empty directory plus missing SDK entry point after cache restoration
establishes a partial SDK directory. Nested cached dependencies are the likely
contents; the failed container's individual files were not inspected.
[Vercel documents reuse of framework and dependency files between builds](https://vercel.com/docs/deployments/troubleshoot-a-build).
The regression reproduces this shape with a cached dependency sentinel.

## Change

Instead of cloning into an assumed-empty target, the existing build script
initialises the SDK directory, fetches the pinned 6.0.1 tag, and checks it out.
Cached dependency files remain present. Checkout has no force flag and refuses
conflicting user files. Complete SDK installations still take the existing
reuse path. No cache purge, version upgrade, application logic, provider secrets,
database migration, recordings or master-specification change.

The regression uses real Git against a tiny local SDK fixture and stops at a
compiler sentinel. It proves bootstrap behaviour, not real compilation. The
actual local and hosted production builds supply compilation evidence. The
existing website CI job now runs that regression before building.

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Failure reproduction | PASS | [Old script](evidence/deploy-cache/before.log) fails on non-empty partial SDK exactly as Vercel did |
| Fresh/complete/partial SDK bootstrap | PASS | [Regression](evidence/deploy-cache/regression.log); fresh and partial states both pass a second warm run without reinstalling |
| Preserve dependencies/conflicting files | PASS | Cached sentinel retained; conflicting untracked SDK file causes safe refusal and remains unchanged |
| Local production build and audit | PASS | [Build](evidence/deploy-cache/local-build.log), [audit](evidence/deploy-cache/audit.log); 16 client files, no server secrets, correct studio bundle |
| Vercel production with cache enabled | PASS | [Build log](evidence/deploy-cache/deploy.log) explicitly restores the same cache; SDK, WASM and Next.js compile succeed; [READY receipt](evidence/deploy-cache/deployment.json) |
| Public pages and engine assets | PASS | [Chromium/WebKit checks](evidence/deploy-cache/public.json): eight page cases, auth endpoint and redirect; [both WASM files](evidence/deploy-cache/engines.json) compile and are byte-identical to the local build |
| Runtime error scan | PASS | [No error logs returned](evidence/deploy-cache/runtime.json) in the deployment-specific 10-minute query; continuous monitoring was not assessed |
| Git-triggered fix rollout | PARTIAL | Fix committed locally; remote main still `41fd759`. Push the fix before relying on a Git-triggered retry. |
| GitHub Actions execution | NOT RUN | Workflow change committed locally, not pushed |
| Musical quality and new listening | NOT RUN | Deployment fix provides no perceptual evidence |

## Reproduce

```sh
python3 tests/integration/verify_web_sdk.py
npm run build
npm --prefix apps/site run audit:bundle
```

The successful local run uses Node 22.23.1 and the existing project SDK. The
remote retry deliberately uses `vercel deploy --prod --yes --force --with-cache`
from an isolated checkout of the current GitHub source plus this fix. This tests
the restored-cache path instead of relying on the earlier clean-cache workaround.
GitHub source remains unchanged until the owner pushes the local fix.

Production is READY at [www.jamloom.com](https://www.jamloom.com), deployment
`dpl_FnKTx3qLzsW3mXJmEmaBbE7Lg7uM`
([build inspection](https://vercel.com/ssari/site/FnKTx3qLzsW3mXJmEmaBbE7Lg7uM)).
This CLI release uses `66031e3`, the failed GitHub source plus the bootstrap fix.
No GitHub push, provider configuration or database change was performed.
