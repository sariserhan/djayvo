# Music DNA: saved-list binding and style consistency — 2026-10-22

The owner reported **Alternative · Hard Rock · Metal** beside soft vocal songs.
The earlier linked examples were made from different favorites: Beyoncé / Alicia
Keys / John Legend, and The Weeknd / M83 / Kavinsky. The page mixed those examples
with local history and did not distinguish them from results for the current list.
The unconstrained planner and lack of audio screening also allowed style drift.
The owner's actual saved list is the application's input; they do not need to
repeat it to an operator. Test lists below are explicitly fixtures, not a claim
that we recovered or used the owner's private browser list.

## Corrected flow

- Every submission saves an immutable favorite/genre snapshot and required musical
  direction. All favorites reach the planner; each gets an interpretation entry.
  Recognized catalogue genres choose the dominant musical family, with stable
  tie-breaking. Missing metadata stays unknown; an entirely unsupported list
  stops with an explanation instead of generating arbitrary music.
- The same 16-family direction policy drives the page, server and planner. The
  planner must retain that direction, energy, instrument roles and tempo range.
  Contradictory production descriptions fail validation and get one correction
  attempt. The authoritative musical direction leads the singer caption.
  These are creative constraints, **not measured properties of the originals**.
- Input, plan and finished WAV hashes bind the style report to the same render.
  Download and status endpoints verify those bindings. A failed style screen triggers one new performance with the same favorite
  snapshot and musical plan; both attempts are retained. If both fail, the job
  stops with an explanation. Rejected takes are not
  presented or served as completed. Historical outputs remain available as
  explicitly unchecked earlier takes; changing the policy does not relabel them.
- **Songs for this list** contains only checked songs whose saved favorites and
  genres match the current list. Other results are under **Earlier songs and
  other lists**. Query-linked examples have their own section, show their source
  list and never enter local song history or replace favorites. Every player
  shows the exact list it used. A busy job from another list cannot be adopted
  by pressing Make my music.

## Independent audio screen and its limits

The local [CLAP audio/text model](https://huggingface.co/laion/clap-htsat-unfused)
compares four ten-second passages at 15, 45, 75 and 105 seconds with fixed musical
style descriptions, plus soft-ballad and speech controls. Model files and revision
are pinned in `assets/manifests/dna-auditor.json` and hash-checked before loading.
No new Python dependency, paid compute, reference recording upload or training.

A take passes this **broad mismatch screen** only if its target cosine similarity
is at least 0.25, lies within 0.03 of the best unrelated style on average, and is
within that margin in at least three of four passages. Parent/neighboring rock
labels are not treated as unrelated competitors, but the required style itself
must still score against unrelated genres. This is not a probability or a
musical-quality score. The thresholds are **not calibrated on a representative,
listening-labelled cohort**. False acceptance and rejection remain possible.

The first rock render was initially rejected by a stricter check that treated
rock and metal as unrelated. Its initial report remains preserved. Comparing
parent genres separately is now explicit and regression-tested; thresholds were
not relaxed. The older soul example passes for soul and fails for heavy rock.
The older electronic-labelled example fails both electronic and heavy-rock checks.
These controls establish broad mismatch behavior, not general quality acceptance.

No screen proves enjoyable songwriting, natural vocals, accurate lyric delivery,
subgenre fidelity or individual preference. A full listening cohort and quality
acceptance are still required before presenting this as a finished public product.

## Setup and checks

Use the existing singer environment and model setup in [the song workflow](music-dna-songs.md).
Fetch and verify the pinned auditor once from the repository root:

```sh
.venv-singer/bin/python scripts/setup_dna_auditor.py
```

Then build/start the existing loopback preview as documented there. All model
execution after setup is local/offline. The singer endpoint remains disabled by
default and rejects remote access; it is not a hosted multi-user service.

Evidence for the current increment is in `docs/evidence/music-dna-fit/`; full WAVs,
private drafts and screenshots remain under ignored `renders/music-dna-songs/`
and `renders/music-dna-fit-20261022/`. Browser playback automation is muted.

- **PASS — 59 site tests and 18 Python tests; production build/type checking:** saved-list identity, catalogue overlaps, strict
  musical direction, unknown inputs, process/cancellation boundaries, hash binding,
  rejected-output access, legacy preservation and conservative score validation.
- **PASS — fixture browser checks:** Chromium/WebKit favorites-to-song flow,
  current versus older lists, metadata preservation, reload, 320/390/1280 layouts,
  exclusive muted playback and zero scoped accessibility violations. Recovery
  covers corrupt storage, cancelled lookup, unavailable service, partial history
  and another-list active jobs. Fixture audio is not model-quality evidence.
- **PASS — fresh actual website generation and playback:** **Concrete Roots**, job
  `06d89abd7d194ddf81bbc54af3e9b67f`, 120 seconds, 48 kHz stereo PCM16, male vocal,
  130 BPM creative target. The fixture list is **Black Hole Sun — Soundgarden**
  (Alternative), **Back In Black — AC/DC** (Hard Rock), and **Master of Puppets —
  Metallica** (Metal). All four windows pass; mean heavy-rock cosine 0.6145 versus
  rock 0.6185. This is model classification, not listening acceptance.
  Actual website submission/reload, Chromium/WebKit muted playback, 90-second
  seeking, byte-range reads, full WAV download, all three layouts, preserved
  favorites and isolated examples pass, with zero scoped axe violations or page
  errors. The final build restart retains the verified result and denies rejected
  audio. [Live report](evidence/music-dna-fit/live.json),
  [audio screen](evidence/music-dna-fit/accepted-fit.json),
  [restart check](evidence/music-dna-fit/restart.json).
- **FAIL, preserved style candidate:** website job
  `274355fefe7242eab40598331ccb9385` passed only two windows and was withheld.
  [Rejected report](evidence/music-dna-fit/rejected-fit.json). The later automatic
  retry behavior is verified with controlled process fixtures; the final real
  website job passed on its first performance. No claim that every generated
  take succeeds.
- **PARTIAL — model screening evidence:** two older controls and three new
  rock-directed renders; no broad calibration cohort.
- **PASS — scoped informal owner review:** following the corrected flow and
  Concrete Roots example, the owner said “yes that is good now” on 2026-10-22.
  [Exact feedback and scope](evidence/music-dna-fit/owner-review.json). This does
  not establish itemized vocal/lyric scores or quality across other favorite lists.
- **NOT RUN — broad listening cohort, hosted workers/deployment, model
  production promotion, iOS.** Historical deferrals remain. No push or deployment.

[Listen to Concrete Roots as a clearly labelled example](http://127.0.0.1:4247/music-dna?song=06d89abd7d194ddf81bbc54af3e9b67f).
The normal **Make my music** action uses the list already saved on the device.

WAV SHA-256: `b0d3384d389644c57db4bb6c706225cb6404e7e2b1b5eaeea4a591df2b0619d4`.
The complete 59-test site run preceded the final audit-target and legacy-file
checks; the updated three API tests were then rerun successfully. The eight
new/updated DNA Python tests also pass with system Python, without model packages,
and now run in the existing website CI job. CI execution on GitHub itself is
**NOT RUN**. The broader spec-completion browser script was updated and
syntax-checked, not rerun. Browser skill runtime tools were unavailable; the
repository's existing Playwright checks provided browser evidence.

The 31-minute overall server job limit remains; individual planner/singer/auditor
limits and the one style retry do not extend it. Successful calls retain the
original input snapshot even if the second performance uses the next seed.
