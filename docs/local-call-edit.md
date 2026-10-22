# Keep the song; edit one call — 2026-10-22

The owner rejected the source-led regenerated performance and authorized finding
a better approach that preserves the earlier songs. Two **listening candidates**
now use the same original male reggae song. Neither candidate contains newly
generated music or moves the original singer. Musical improvement remains
**NOT RUN**, pending the owner's judgment.

Listen at <http://127.0.0.1:4197/>. The page has the original, A and B, buttons that
jump to each changed passage, downloads, and the earlier style comparisons.

| Candidate | Change | What stays exact |
|---|---|---|
| A: short call before the chorus | The intact 1.96-second “I have a question” crop at 9.426 s, before the original sung question | All original band/singer audio; mixed PCM outside the 1.96-second call (28.04 s) |
| B: user asks first | Replace the first estimated sung phrase at 1.1–3.5 s with the real voice at 1.3 s; original singer answers later in its original position | Entire mixed PCM outside the 2.4-second edit (27.6 s) |

Earlier insertions included a longer phrase with “please help.” This study uses
only the complete question, verified by a prior local recognition diagnostic.
The new clip is manually selected; no claim of automatic semantic crop choice.
A uses an existing vocal gap. B subtracts the estimated original vocal only in
that one short region with 40 ms fades. That estimate may include instruments or
leave residual voice; B needs listening for those defects. It does not reconstruct
the full song from separated stems, shift the singer, regenerate the backing,
stretch the source, pitch it or add repetitions/echoes.

The call level follows the original lead's measured vocal level, with a bounded
peak and headroom check. The initially quieter edits are preserved privately as
`gap-low-level` and `replacement-low-level`. No compressor or new dependency was
added. Source PCM is preserved up to gain, 10 ms edge fades and PCM16 rounding.
All comparison files use the **same gain**, preserving identical PCM outside the
edit even in the browser audition. This avoids altering the whole song's playback
level separately for each candidate.

## What the local model could not do reliably

The pinned model documents local repainting as a way to regenerate a selected
region using the surrounding audio. We checked the
[official pinned tutorial](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/Tutorial.md)
and installed implementation. Context7 tools were unavailable. No new model,
installation, service or paid compute was used.

Two actual local 1–4 s instrumental-repair trials at strengths 0.5 and 0.8 failed
the estimated vocal-overlap gate. Residual vocals or separator bleed exceeded
the allowed threshold at the call. Neither repair appears on the listening page.
The raw renders and failure evidence remain in `renders/local-call-edit-20261022/`.
This is **FAIL for this controlled repair test**, not proof that repainting is
universally incapable or that the detected residual is definitely audible speech.

The research wrapper now accepts a bounded 3–6 s instrumental repaint region,
with source hashes and explicit mask validation. Normal studio generation is
unchanged. The installed handler maps higher balanced strength to less source
injection; its actual implementation disagrees with a comment in the upstream
parameter dataclass. We used the executed handler behavior, not that comment.

## Implementation and evidence

- `scripts/local_call_edit.py`: consent/provenance checks, bounded local edits,
  estimated vocal-gap rejection, source gain/headroom, exact outside-window PCM
  checks and immutable outputs. The optional repaint path rejects the tested
  outputs; it does not silently fall back to a song without the recording.
- `scripts/prepare_local_call_review.py`: exact same-song comparison, common gain,
  audio checks, private review page and preserved earlier comparisons.
- **PASS — actual local artifacts:** two 30-second candidates, source identity
  within half a PCM16 step and exact outside-edit PCM. Unchanged portions include
  the original natural singing; they are not newly rendered approximations.
  [Render receipt](evidence/local-call-edit/render.json).
- **PASS — 19 scoped tests:** six edit/bounds/consent/provenance tests, four source
  conditioning regressions and nine existing singer/studio tests.
  [New tests](evidence/local-call-edit/tests.log),
  [regressions](evidence/local-call-edit/conditioning-regression.log).
- **PASS — Chromium and WebKit:** playback, passage-jump buttons, seeking,
  exclusive playback, downloads, no autoplay, 320/375 px layouts, and all twelve
  earlier comparison players. [Browser evidence](evidence/local-call-edit/browser.json).
- **NOT RUN — musical acceptance, naturalness of the local vocal subtraction,
  speech intelligibility in the mix and broad input/style generalization.**
  Diagnostic tiny-ASR did not reliably transcribe the initial lower-level mixed
  excerpt. It cannot determine musical quality; its private failures are retained.
- No training, model promotion, production/default-studio rollout, upload,
  publication, phone change or new paid execution. The earlier rejected source-led
  experiment remains **FAIL — owner listening**.

## Reproduce

Use fresh output directories to preserve earlier evidence. The original song and
source crop are already retained privately in this checkout.

```sh
.venv-singer/bin/python scripts/local_call_edit.py \
  --song-dir renders/integrated-singer-audition-20261022/reggae-male \
  --source renders/source-led-response-20261022/hook.wav \
  --output renders/local-call-edit-20261022/gap --call-at 9.4257142857 --consent
.venv-singer/bin/python scripts/local_call_edit.py \
  --song-dir renders/integrated-singer-audition-20261022/reggae-male \
  --source renders/source-led-response-20261022/hook.wav \
  --output renders/local-call-edit-20261022/replacement \
  --call-at 1.3 --replace-vocal 1.1 3.5 --consent
.venv-singer/bin/python scripts/prepare_local_call_review.py \
  --work renders/local-call-edit-20261022 \
  --previous renders/meaning-singer-review-20261022/review
node scripts/serve_singer_review.mjs
```

The failed model trials can be reproduced with `singing_response.py sing`, the
private `repaint.json` / `repaint-stronger.json` conditioning files and the retained
`question-plan.json`; each source and runtime is hash-checked. Local edit commands
use the existing pinned separator estimates, not a new stem model.
