# VisitorPing installation

2026-10-19 (America/New_York). Public site key: `vp_QBDH92AC`.

**Follow-up:** [Public branding and CSP check](brand-live.md) confirms an actual
configuration-fetch and realtime blocks and allows only those two provider origins.
The tracker subsequently activated automatically and two page views received
HTTP 204. Dashboard Test installation and Live Radar still need confirmation. The initial installation evidence below remains
historical.

The website uses Next.js 16.4.2 App Router. Added the supplied `next/script`
component to `apps/site/app/layout.tsx`, with `afterInteractive` and anonymous
cross-origin loading. No existing VisitorPing or tag-manager installation was
found in the relevant application source or inspected public account page.
No site key was replaced, and no dashboard exclusion settings were changed.

The root homepage redirects to the separate static `/studio/index.html` app.
That studio explicitly promises no analytics and supports offline use. Both
static studio pages remain untracked; only Next.js pages inherit this layout.
No CSP, consent controls, security headers, other integrations or audio assets
were changed. The paused provider script loads under the existing CSP; an active
collection check is still required before considering any targeted CSP change.

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Framework and existing installation inspection | PASS | Next App Router confirmed; no duplicate script/plugin/tag-manager found. |
| Local build | PASS | [Build log](evidence/visitorping/build.log). |
| Unit tests, typecheck, secret audit | PASS | 13/13 tests; TypeScript exit 0; 16 client files audited. [Receipt](evidence/visitorping/checks.json). |
| Local browser loading and deduplication | PASS | One script/request across Account → Music client navigation; no console errors. [Receipt](evidence/visitorping/local-browser.json). |
| Offline studio boundary | PASS | No tracker element or resource on `/studio/index.html`; studio bundle integrity audit unchanged. |
| Production deployment | PASS | Clean rebuild ready and aliased to www; [deployment log](evidence/visitorping/deploy.log). |
| Public website verification | PASS | Correct site key, single request across two Next.js pages, studio exclusion, no console errors and auth HTTP 200; [receipt](evidence/visitorping/public-browser.json). |
| Provider collection | NOT RUN | CDN returns HTTP 200 with `/* VisitorPing tracking paused. */`, not an active tracker. Download success is not collection proof. |
| Dashboard Test installation and Live Radar | NOT RUN | No authenticated VisitorPing dashboard connection. Owner verification required after resuming tracking. |
| End-to-end installation | PARTIAL | Code/build pass; provider must resume tracking and live collection must be verified. |

## Deployment scope and failure

The previously published release was based on Git commit
`815b1e8c1ae289cc3d204790ac068b705ede56eb`. A detached local worktree at that
exact revision carries only the layout installation patch. This avoids publishing
the eight unrelated newer local commits or reverting existing production settings.
No Git branch was pushed and no environment variables were changed.

The first deployment failed because a restored build cache contained an incomplete
`build-web-tools/emsdk` directory; the toolchain clone refused the nonempty path.
[Failure receipt](evidence/visitorping/deploy-first-failure.log). Retried with
`vercel deploy --prod --yes --force` to skip the cache, without altering toolchain
versions or audio-engine source. The retry succeeded: production deployment
`dpl_FR6m9ML7VszUd1gQmTqFbBaAyDEe` was aliased to `www.jamloom.com`.
[Deployment log](evidence/visitorping/deploy.log). No publishing action remains
for the installation patch itself.

The agent-browser local navigation check stalled; its local doctor passed and the
project's installed Playwright completed the same browser assertions successfully.
This does not establish behavior of the paused provider's eventual active script.

## Owner verification still needed

1. Check automatic activation for `jamloom.com` in VisitorPing; preserve existing exclusions. If the script stays paused, inspect the dashboard account/site status rather than assuming it was manually disabled.
2. Open a private browser window, visit `https://www.jamloom.com/account/sign-in`
   and `https://www.jamloom.com/catalogue`, and complete any required consent.
   If either path is excluded in your dashboard, use two other included Next.js
   pages. The `/studio/` homepage is intentionally not a tracked page.
3. Run VisitorPing **Test installation** for `vp_QBDH92AC`.
4. In **Live Radar**, confirm the new visit and activity on both pages. A loaded
   script or successful Test installation alone does not establish both events.
5. Report the result; if collection is blocked, inspect active tracker network/CSP
   errors and allow only confirmed required endpoints.

Reference: [Next.js layout scripts](https://nextjs.org/docs/app/guides/scripts).
