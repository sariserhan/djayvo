# Current product decisions

2026-10-20. The owner-supplied full product specification takes precedence for
four experiences, platforms and commercial safety. Existing master/addenda remain
unchanged. Older pause statements are historical for local implementation.

- Retain `apps/site` Next.js and `apps/web` static/WASM studio. New product pages
  introduce and launch existing audio workflows; no second DSP engine or project.
- Keep Better Auth, Neon/pg, Vercel, private R2 and existing Vast research scripts.
  No unrequested provider replacement or paid infrastructure provisioning.
- Keep account/private routes noindex by default; explicitly index authored public
  routes with canonical www URLs. Preserve VisitorPing and its existing exclusions.
- Store credits in immutable Postgres ledger entries, per-purchase lots and
  serialized owner transactions. Units are integer credits and USD microdollars.
  Apple and Stripe credits retain their actual lot's conservative net valuation.
- Start sandbox-only; 30% minimum margin, 50% target. Fail closed before live
  purchasing. Financial fixture assumptions are not realized provider proceeds.
- A failed musical gate cannot be bypassed by an environment variable. Paid
  generation requires reviewed evidence and a code-level release decision.
- Manual taste inputs are explicit preferences. Titles alone do not reveal tempo,
  harmony or melody; no unlicensed provider import is implied. Three brief forms
  are planning alternatives, not proof of creative audio.
- Browser Live Source is a limited fallback, not external app transport control.
  Process only selected audio and default monitoring to silent. The browser cannot
  guarantee that an external source is inaudible, so native isolation remains open.
- Reuse the ten-source audit pipeline to broaden diagnostic coverage without
  rewriting rejected plans or calling additional renders musical improvement.
- Night Current is one positive-leaning standalone example. Future music must not
  repeat its arrangement template as a substitute for musical intelligence.
- Monotonic taste-profile revision numbers survive deletion/recreation; owner
  filtering plus optimistic revisions prevent stale-tab data loss.
- Worker claims are single-attempt durable leases. Lost leases stop capacity;
  they never automatically requeue while a rental may still be billed. Result
  recording then idempotent wallet settlement is crash-recoverable; credits stay
  held until shutdown/cost reconciliation. Only trusted adapters may confirm stop.
- Refund/dispute holds persist before grants and serialize with purchase receipt
  delivery. Full provider refunds/entitlement reversal remain an explicit blocker.

## 2026-10-21 — DJ Academy integration

- Fifth feature; preserve all four product routes and the separate paid-generation
  quality hold. Master and learning specs unchanged.
- Teach on the existing `apps/web/dj.html` deck handlers and mixer. A shared bridge
  distinguishes user and coach-demo commands. Actual analyser/audio-clock samples
  drive the rubric; no second toy mixer or click-only scoring.
- Raw deck route handlers preserve existing audio state during coach steps and
  avoid an iframe. Keep frame blocking; permit a same-origin base URL only for
  Academy deck/offline routes. Account and private-storage policies stay intact.
- Guest intro/local practice is free; verified account progress is separate from
  local history. Shared rubric is re-evaluated on the server with ordered tasks,
  asset/version hashes, expiration, owner scoping and replay conflicts. This does
  not defeat a hostile client forging its own telemetry; no accredited certificate.
- Artist-published CC0 music replaces no generative assets. No songs downloaded
  from streaming APIs. Source hashes, modifications and licensing evidence ship.
- Author metadata supplies 120 BPM, not verified downbeats/keys. Grade fade
  duration/smoothness, not beat phase. Unsynchronized A/B playback, discontinuous
  pitch/whole-file loops and 30-second capture block advanced set assessments.
- A separately scoped, content-hashed free offline package reuses the existing
  bounded service worker. It never caches paid lessons, auth or API responses.
  Offline checks are local; account verification requires a fresh online attempt.
- Academy receipts/access are separate from credit lots. Checkout is $79.99 USD
  one-time before tax, test keys only. Event and receipt operations share one
  database transaction/connection to avoid pool starvation under concurrent replay.
  Refund/dispute holds precede grants; legitimate separate repurchase restores access.
- Owner found preparation unclear. Move the existing permission control into the
  coach's numbered onboarding; do not count this failed test as learning acceptance.
- Full-course selling, human enjoyment/novice outcomes, venue reliability and live
  payment activation remain open gates. No paid cloud inference is needed for lessons.

## Music DNA favorite-song mapping — 2026-10-22

Use confirmed user choices with the existing numeric composer interface. Keep provider content out of the renderer; play only the existing cleared catalogue locally and link to external services for other listening. Extend the existing JSON profile with optional annotations/direction and preserve those fields in native sync. Do not add an OAuth integration, metadata inference service, or audio scraper to satisfy manual preference entry. [Implementation and evidence](music-dna-favorites.md).
