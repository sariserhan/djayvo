# Non-iOS implementation follow-through — 2026-10-21

The earlier checkpoint stopped with feasible engineering unfinished. This follow-through
implements those gaps, plus the missing note sequencer. **Overall specification
status remains PARTIAL.** Human musical acceptance, physical capture/routing,
provider/model execution and the explicitly deferred iOS/release work cannot be
closed by local tests. The immutable master and historical evidence are unchanged.

## Implemented

- **DJ scratch and key lock:** explicitly decoded imported tracks use a bounded
  AudioWorklet. Pointer motion drives signed sample playback; release restores the
  prior transport state, cancellation stops it, and an 80 ms motion watchdog prevents
  a stuck scratch. Key lock uses overlapping aligned grains at the original pitch
  while transport runs at ±16%. Stereo shares alignment. The existing 2-second–5-minute,
  128 MB decoded limit remains; ordinary native playback supports up to 20 minutes.
  Academy retains its existing shared-clock buffer transport. Four decks are a
  conditional extension, not a claimed supported capability.
- **Effects:** each deck gains reverb, phaser and flanger. Wet/dry ranges are bounded;
  pause/reset flushes tails. Effect processors are created only when first enabled, so the default dry graph does not continuously run unused convolvers or LFOs. Version 3 mixer traces include initial effects and
  effect/reset events, while readers still accept versions 1 and 2. The dry path
  remains PCM-identical in the focused browser probe.
- **Headphone cue:** optional explicit speaker/headphone selection, separate
  pre-fader preview, bounded cue level, quiet test, and a mandatory user routing
  confirmation before cue is enabled. Device changes, permission withdrawal,
  interruptions and hidden pages mute it. Pending setup cannot reopen a revoked
  route. Where supported, output-selection prompts grant access without requesting
  microphone capture. Device identities and verification are never restored.
- **Scenes and recovery:** transactional automatic recovery and three explicit
  scene slots retain A/B source bytes, cues, loops, position/rate/key lock, mixer/FX,
  prepared A context, source phrase and verified C files, instrument patch/register,
  mouth shape and sequence pattern. Total saved-set bytes are capped at 100 MB.
  Restore checks bounds, hashes and permissions, and leaves playback stopped.
  Online-only partner music, held notes, physical routing and unfinished recordings
  are excluded. Deleting a scene does not delete another scene or loaded media.
- **Note sequencer:** sixteen notes/rests, sixteenth-note timing, 40–240 BPM,
  selected instrument/velocity, sample-clock scheduling independent of callback
  sizes. Start is independent of deck sync. Stop, panic, blur and page hiding stop
  the pattern. Saved patterns restore paused. The master mix recorder captures it;
  dry take capture and the sequencer are explicitly separated so an incomplete
  action trace cannot masquerade as replayable evidence.
- **Music DNA:** search the existing ten cleared CC0 practice tracks by title/artist,
  identify the edition and source, rate love/like/avoid with influence, and inspect
  weighted genre evidence with limited confidence. Unknown audio attributes remain
  unknown. Explicit controls still drive original synthesis. An opt-in preferred
  variation reapplies and saves its actual generating settings and direction for
  future local compositions. No provider scraping, audio fingerprint claims,
  named-artist imitation, learned model or training authorization is added.
- **Cloud-output recovery:** a trusted worker stages an immutable checksum-bound
  output receipt before storage; restart recovery validates the output, renews only
  the identical expired pending upload, creates the owner-scoped private master,
  and settles once after confirmed provider shutdown and final all-in cost evidence.
  Storage failure retains the reservation; cancellation withdraws partial assets;
  temporary-object cleanup is retryable even after settlement. The watchdog holds
  staged results for recovery instead of incorrectly settling them as failed.
- **Provider charge evidence:** a read-only, account/instance/label-bound paginated
  charge collector uses integer microdollars and stores a private hashed receipt.
  Observed charges are explicitly non-final. It cannot allocate compute, release
  paid generation, or treat incomplete provider billing as final all-in cost.

The routing API follows [output-selection permission requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/selectAudioOutput)
and [AudioContext output selection](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/setSinkId).
Provider evidence uses Vast's [instance charge API](https://docs.vast.ai/api-reference/billing/show-charges);
account top-ups are not substituted for job costs.

## Evidence and acceptance boundaries

Receipts are retained in [evidence/non-ios-finish](evidence/non-ios-finish/).
All browser audio checks mute the physical destination downstream of measured taps.

| Gate | Result | What the evidence proves |
|---|---|---|
| Deck DSP | PASS, bounded technical probe | Actual Chromium/WebKit worklets: unlocked 440 Hz becomes about 510 Hz at 1.16×; locked output stays about 440 Hz. Unit tones cover 55–2000 Hz and four rates; signed scratch, watchdog, bounds and loops pass |
| DSP deadline/venue qualification | PARTIAL | Short browser tone probe reports max 2 ms with no blocks above 128/48000 s. Coarse wall-clock timing and a short tone are not a worst-case polyphonic or physical round-trip benchmark; prior deadline failures remain historical failures |
| Effects | PASS, local | Actual offline browser PCM: each effect changes the signal, reverb has a tail, dry/reset match dry PCM, finite output and peak below one |
| Cue routing | PARTIAL | Selection validation, mute-before-verification, device-loss muting and interrupted setup pass with the routing harness; physical separation and calibrated headphone latency NOT RUN |
| Music DNA and full scene recovery | PASS, local | Real native/WASM equality, generated variations, exports, cancellation, catalogue inference, feedback and paused A/B/C recovery in Chromium/WebKit; recovered C download has exactly the original checksum |
| Note sequencing | PASS, local | Callback-size-independent sample timing and actual WASM playback/panic/dry-capture isolation; browser sequence and scene checks retained in browser receipt |
| Storage/settlement | PASS, isolated contract | Disposable loopback PostgreSQL, remote-store interface with injected failure, expired upload, restart, cancelled output, cross-owner denial, cleanup retry and exactly-once charging |
| Actual R2/provider job execution | NOT RUN | No new GPU allocation, paid job, R2 write or live settlement; adapters and fixtures do not establish provider delivery |
| Secure-origin companion control | PARTIAL | Locally served HTTPS-origin fixture: Chromium with explicit local-network permission controls real native HTTP; WebKit rejects the loopback connection and exposes its fallback. No disabled browser security flags; fixture telemetry is synthetic, not system capture |
| Build and regressions | PASS for recorded checks | 117 web, 38 site, 15 wallet/provider and one isolated cloud-output integration test; production build, TypeScript, bundle audit, actual recorder and short Academy regressions. 48 Chromium DJ/offline actions; 12 recorder cases per browser; short Academy cue/restart recordings in both browsers |
| Human/physical acceptance | NOT RUN | No new listening scores, physical headphone/device routing, actual permitted-app capture, native round-trip, manual screen reader or novice-learning evidence |

The secure-origin test intercepts the website documents/assets from a local
production build while native HTTP goes to the actual loopback listener. It is
**not a hosted deployment test**. Chromium's local-network permission is granted
only to the controlled fixture origin. WebKit rejection is retained as a real
compatibility limit; native controls remain available, not bypassed with unsafe
browser flags or an unauthenticated public listener.

Earlier Academy recordings include actual muted 60-minute runs in both browsers.
Their original receipts remain unchanged. The new short cue/restart run initially reported two Chromium clock gaps; the retained failure is not erased. After lazy effect setup, the subsequent isolated run reports zero gaps in both browsers and one classified Chromium clock stall. This does not establish the initial cause or certify physical output. This increment does not relabel those
recordings as new-renderer, physical, audible or deployed evidence.

## What still prevented full specification completion at this checkpoint

The wider-duration and continual-phrase implementation below is superseded by
[the next local increment](duration-and-live-phrases.md); historical acceptance
boundaries and earlier failures remain intact.

1. **Musical quality FAIL / human review NOT RUN:** the owner's earlier robotic-output
   rejection stands. New comparisons require the deferred listening review; M1
   prerequisites still block promotion of learned production AI. Rule-based local
   instruments, catalog inference and preference adaptation do not replace that gate.
2. **Physical gates NOT RUN:** verify separate headphones, source suppression and
   restoration during actual Mac capture, route changes, interruptions, physical
   latency/venue endurance, MIDI and manual accessibility/Academy acceptance.
3. **Provider/model validation NOT RUN:** approved model selection/deployment,
   actual all-in finalized bills, remote output recovery and commercial economics.
   Paid execution and production mutations remain outside this local increment.
4. **Broader capabilities PARTIAL:** the established MVP source/renderer contract
   remains 2–5 second selected input and approximately 20–40 second output (imports
   may contain up to 15 seconds before trimming). The supplementary 1–15/15–60
   range, continual live phrase-response qualification, learned personalization
   and conditional four-deck promotion are not claimed complete. The immutable
   master's bounded MVP and existing quality gate are preserved.
5. **iOS, then launch operations:** explicitly deferred by the owner. No push,
   deployment, public distribution, live charge or sales enablement here.

## Reproduction

Use Node 22. Database suites must use a disposable `127.0.0.1` PostgreSQL target,
never the configured hosted database. No migration or dependency is added.

```sh
npm --prefix apps/web test
npm --prefix apps/site test
npm --prefix apps/site run test:wallet
npm --prefix apps/site run test:generation-output
npm --prefix apps/site run test:generation-local
npm --prefix apps/site run build
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
node apps/web/tests/deck-dsp.mjs
node apps/web/tests/mix-recording.mjs
cd apps/site
node tests/spec-completion-browser.mjs
JAMLOOM_LIVE_ORIGIN=https://www.jamloom.com node tests/live-companion-browser.mjs
```

`generation:output` is a trusted-worker command requiring an exact
`JAMLOOM_OUTPUT_TARGET=host/database` match; staging also requires the job lease.
`generation:cost JOB_ID /absolute/private/evidence.json` only collects observed
charges for an already confirmed terminated rental. Neither command authorizes
paid compute or publication; review final billing and attributable overhead before
using the existing cost-evidence/settlement controls.
