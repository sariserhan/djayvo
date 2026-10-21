# Academy local completion increment — 2026-10-21

Owner instruction: “finish academy and update the todo everytime.” This increment
finishes runnable local course coverage; human learning, physical audio, musical
phrase annotations, actual payment-provider transactions and release remain separate
requirements. Local automated integration checks pass; overall release readiness remains PARTIAL. No production writes,
charges, deployment, new training or dependencies.

## Implementation

- `apps/web/frame-deck.js` gives the two cleared course buffers one AudioContext
  clock. Continuous rate changes, whole-track and 1/2/4/8/16/32-beat loops, exit,
  four-beat jumps, cues and declared-grid alignment use the existing real controls
  and mixer. Ordinary imported media retains its native decoder. The buffered path
  changes pitch with speed and explicitly disables key lock. Course buffers are
  bounded to 180 seconds and two channels.
- `apps/web/set-recording.js` and `set-meter-worklet.js` provide a private compressed
  recording up to 60 minutes / 96 MB. Opus or AAC is selected by browser capability;
  unsupported browsers get an explicit explanation. Per-second audio measurements
  cover all processed samples, rather than intermittent analyser snapshots.
  Permission withdrawal, hidden-page/audio interruption, processor/encoder failure,
  byte overflow and deletion discard incomplete recordings. Nothing is uploaded.
- The original 30-second WAV recording remains available. Both recorders now wait
  for connected, consecutive processing blocks before acknowledging recording.
  Post-start clock discontinuities remain measured and reject a set assessment.
- Curriculum `2026.10.2`, evaluator `academy-2`: 20 runnable lessons with explicit
  prerequisite branches across all six levels. Earlier versioned account history
  is preserved and labeled as an earlier curriculum; it does not silently earn new
  checks. New task evidence is re-evaluated on the server with bounded payloads,
  ownership, purchase and task-order checks.
- Rubrics cover sustained playback/levels, eight/sixteen/thirty-two-beat fades,
  tapping, manual tempo matching, declared-grid phase, actual cue/jump changes,
  loops, instrument signal while Deck A plays, and recorded sets. Demonstrations
  cannot earn learner checks. Knowledge questions are explicitly labeled knowledge,
  not signal or artistic assessments. Free Jam never auto-advances.
- Local plan/review downloads, full challenge routes, and a completion badge tied
  to the final prerequisite chain are included. Badge wording is specific to the
  measured software course; it is not professional accreditation.

## Audio defect found by the longer test

Both historical course MP3s had 32 seconds of silence at the end of their 64-second
exports. The old FFmpeg output trim retained the source timestamps for the fade.
The new export uses `atrim` and `asetpts=PTS-STARTPTS` before normalization/fades.
`extended-v2.mp3` and `theories-v2.mp3` are distinct files with new hashes. Original
MP3s, `manifest-v1.json`, original reports and the rejected recording are retained.
Full-duration analysis now rejects silence lasting 200 ms at −55 dBFS and peaks
above the existing ceiling. This is technical evidence, not musical suitability.

The initial 126.408-second recorded assessment correctly rejected the silent
fixtures, with zero recorder clock gaps. Evidence:
`docs/evidence/academy-completion/silent-fixture-failure.log`,
`silent-fixture-recording.json`, `startup-before.json`, and `audio.json`.

## Course coverage

| Level | Runnable content | Assessment |
|---|---|---|
| Intro | Playback and first fade | Eight-beat transition |
| Beginner | Gain, count/tap, cue movement | Guided transition and two-minute recorded mini-set |
| Elementary | Tempo/grid alignment, bass swap, longer fades | Manual tempo hold and two transitions |
| Intermediate | Loops/jumps, hot cues, tone/echo, key/energy decisions | Five-minute recorded mix |
| Advanced | Cue/restart recovery, live instrument layering, consent/tempo recovery decisions | Five-minute mix including a cue recovery |
| Performance | Local set plan, backup/venue/self-review decisions | Thirty-minute recorded set, twelve transitions and cue recovery |

Graded recordings use the checked course pair, with whole-track looping for longer
practice. The ten-track public library and user imports remain available in free
practice. A repeated teaching pair does not demonstrate varied set programming.
The plan/replay review explicitly asks for listening and artistic critique.
Declared-grid phase is based on author BPM and file zero; independent musical
phrase/key/downbeat annotations remain open. Live voice capture is optional and
uses existing explicit consent; no learner must surrender a voice recording.

## Reproduction and boundaries

Use Node 22. From the repository root:

```
node --test apps/web/tests/*.test.js
python3 scripts/prepare_academy_audio.py
npm run build
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
```

From `apps/site`, with `JAMLOOM_TEST_DATABASE_URL` pointing to an explicitly isolated
loopback Postgres base (tests create and drop only their own databases):

```
npm run test:academy
npm run test:academy-browser
```

Browser availability: the Browser skill is present but its required execution tool
is absent after discovery. The Academy specification calls for Chromium/WebKit;
the repository's Playwright tests supply that local validation. Access prerequisites
in expanded route tests are explicitly seeded local fixtures; actual control/audio
checks are performed in the browser. They are not human learner results or Stripe
transactions. Captured audio stays under ignored `build-academy-completion/`.

## Final evidence

- **PASS:** 96 web unit tests, 12 Academy/database tests, 31 site tests;
  production build, TypeScript and public-bundle audit. No new migration needed.
- **PASS:** Broad Chromium/WebKit route/lesson run (`full-curriculum.json`),
  then focused final controls/lifecycle/offline run (`browser.json`). Every one
  of the 20 lesson routes loads with the appropriate local entitlement/prerequisite
  fixtures. Fourteen new shorter exercises/mini-set are actually performed in the
  broad run; four longer assessment routes have rubric/route validation instead
  of full-duration browser execution. Existing introduction and gain-stage
  regressions are retained. See the exact per-lesson receipts rather than inferring
  every long assessment was performed.
- **PASS:** Two real mini-sets, Chromium 126.420 seconds and WebKit 126.3025
  seconds. SHA-256 checks, decoded audio, no full-scale clipping, no sustained
  silence, and zero post-start timestamp gaps. Longest near-silent stretches were
  1.35 ms and 4.10 ms respectively. `recorded-sets.json` and ignored
  `build-academy-completion/` hold the receipts/audio. These are automated
  recordings, not genuine learner outcomes.
- **PASS:** Original WAV recorder regressions in both browsers: destination PCM
  matches captured PCM exactly, all four channels/effects remain present,
  permission revocation and failure cleanup work, and the real 30-second cap works.
  Reports: `chromium-recorder-regression.json`, `webkit-recorder-regression.json`.
- **PASS:** Responsive/axe checks at 1440, 390 and 320 pixels for existing routes
  and first lesson; actual 320px paid knowledge/plan lesson additionally inspected
  with zero axe violations (`knowledge-mobile.png`). Native forms use bounded
  widths and visible focus. Keyboard-only first crossfade remains passing.
- **PASS:** Guest free lesson, account saving, paid-route enforcement, seeded
  sandbox access, wrong-action rejection, demo isolation, voluntary Free Jam,
  completed lesson controls, and private recording delete/revoke/retry behavior.
- **PASS:** Free offline lesson/audio in Chromium offline mode and WebKit with
  the origin actually stopped. The new pack caches only current v2 course assets;
  original v1 files remain preserved but are not downloaded into the offline pack.
- **PARTIAL:** Musical suitability, phase/key annotations and complete calibrated
  teaching outcomes. The shorter technical exercises are runnable; this is not
  proof that learners can program a varied or enjoyable performance set.
- **NOT RUN:** Five genuine novices, three beginner mini-set learners, manual
  screen reader/physical audio/venue tests, full 5/30/60-minute browser endurance,
  actual payment-provider transactions, hosted operations or commercial launch.

No publication, paid compute, training, live charge or production database change.
The prior improvisation quality FAIL and separate paid-generation hold remain.
Find the implementation commit with `git log -1 -- docs/academy-completion.md`.
