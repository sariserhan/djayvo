# Reproducible local evaluation preparation

Recorded 2026-10-17. **Batch preparation: PASS. Dataset/preregistration: PARTIAL.
Formal listening and M1 quality: NOT RUN.** The owner confirmed that no additional
consented clips are available. Only the existing owner recording was used for
the actual pilot; no new speaker, consent, reviewer or rating was invented.

2026-10-18 continuation: [licensed multi-source evaluation](licensed-evaluation.md)
adds 20 public-license speech speakers, three public-domain non-speech recordings
and an explicitly synthetic silence control. Credits and local anonymous-player
pages are preserved in each packet. Model timing and native crop research remain
separate from the frozen listening comparison. Human ratings are still **NOT RUN**.

`scripts/prepare_evaluation.py` freezes the source ledger, source and renderer
hashes, engine source hash, available Git revision, exact rubric and preparation
script hashes before rendering. It copies inputs into a new private folder,
renders seeds 4123/4124/4125, verifies complete exports and checks each master
independently. Baselines use the same seed as their candidates. Failures stay in
the report; existing output folders and response files are never reused.

The source hash is checked before copying and against completed exports.
Changing the renderer during a batch fails the affected attempts. A minimal
Linux container exposed an unnecessary Git requirement; commit metadata is now
null when Git is unavailable, while binary/source/rubric hashes remain recorded.
The snapshot records provenance, not a cryptographic attestation that a binary
was built from the recorded source. Build the renderer from the intended checkout
before preparing a study.

## Use with future consented inputs

Keep the manifest and all audio under ignored `renders/`. Convert M4A separately
with the [recording workflow](workflow-hardening.md); provide its converted WAV.
Paths are relative to the manifest, or absolute. Opaque IDs identify speakers
and sessions consistently without exposing names. A manifest looks like:

```json
{
  "schema_version": "1.0-evaluation",
  "clips": [{
    "id": "clip-01",
    "path": "source.wav",
    "sha256": "REPLACE_WITH_THE_ACTUAL_FILE_SHA256",
    "kind": "speech",
    "source_kind": "recorded",
    "speaker_id": "speaker-01",
    "session_id": "session-01",
    "consent": {
      "local_processing": false,
      "review_scope": "owner_only",
      "evidence": "REPLACE_WITH_THE_ACTUAL_PERMISSION_RECORD"
    }
  }]
}
```

The example deliberately cannot run until its hash and actual permission are
supplied. Set `local_processing` true only with that permission. `review_scope`
may be `owner_only` or `independent_reviewers`; local processing permission does
not imply permission to distribute recordings. No training, public distribution
or uploads are authorized by this tool. Consent statements are declarations
that require human verification, not proof inferred from a filename.

Supported content kinds: `speech`, `syllabic_speech`, `laughter`, `claps`, `noise`,
`silence`, `synthetic_control`. `source_kind` explicitly separates `recorded`
from `synthetic`; synthetic controls never count as real-source diversity or
speech recognition evidence. Only an actual silence/quiet rejection passes the
expected silence control; a corrupt file does not. Duplicate hashes and clip IDs
are rejected so copies cannot inflate the independent-source count.

```sh
.venv-build/bin/python3 scripts/prepare_evaluation.py \
  --manifest renders/YOUR-MANIFEST.json \
  --output "renders/evaluation-$(date +%Y%m%d-%H%M%S)" \
  --renderer build-mac/djayvo_remix
```

`freeze.json` and `rubric.md` precede the renders; `report.json` is written only
after all scheduled cases have been considered. A crashed run may leave a partial
folder without that final report: preserve it and choose a fresh output. Check
the report's status and every failed case rather than treating file existence
as acceptance. The script exits nonzero for technical failures; insufficient
dataset size is explicitly PARTIAL and does not disguise a successful pilot.

Each `CLIP/SEED/blinded/listener/` contains four anonymous, RMS-matched WAVs,
the source, blank rating/pairwise CSVs and instructions. The organizer key and
raw named exports stay outside that folder. Reviewers receive only the listener
folder, and only when its permission scope allows it. Make separate response
copies for actual reviewers; no responses are prefilled. Existing historical
packets are preserved.

The old packet codes used only source identity and a letter, so different seed
blocks could reuse answer codes. New codes include a hash of all four WAVs and
the assignment seed; CSVs also contain `block_id`. Different audio or assignments
have distinct codes, while an identical block reproduces exactly. Mixed render
seeds/sample rates are rejected. Retain the matching organizer key when
analyzing historical CSVs that lack `block_id`; do not silently pool them.

## Current pilot and gate boundaries

Actual private pilot: `renders/evaluation-owner-v6-final/`. It contains one
4.862-second owner recording, nine candidate masters, three fixed-loop controls,
three blinded blocks and empty response forms. Technical usability is 3/3 per
style for this one source; it is not a confidence interval or a diverse-source
pass. This pilot uses the previously auditioned PCM conversion. Its rendered
WAVs are compared with the retained v4 seed outputs in the evidence report.

| Gate | Status | Evidence / remaining work |
| --- | --- | --- |
| Native M5 release, ASan/UBSan, Linux arm64 release | PASS | Eight CTest suites each; new preparation suite included |
| Consent/hash/duplicate/path protection | PASS | Invalid ledgers rejected before creating output; existing folders preserved |
| Batch failure and silence controls | PASS | Corruption retained as failed attempts; synthetic silence rejected; no synthetic diversity credit |
| Distinct, reproducible answer codes | PASS | Changed audio/shuffles separate; identical block reproduces; mixed seeds rejected |
| Actual owner batch | PASS | Three seeds, nine candidates, three controls, three blind packets; blank ratings |
| Current diverse dataset | PARTIAL | One source/speaker/session, owner-only review permission; no additional clips available |
| Preregistration | PARTIAL | Technical freeze exists; final cohort and reviewer assignments missing |
| Formal recognition, enjoyment, sharing, preference | NOT RUN | No blinded responses; no automated substitute |
| Hosted CI / physical Intel / M2–M5 execution | NOT RUN | No new hosted, physical Intel, model, iPhone, live or release claim |

The [verification report](evidence/evaluation-preparation/report.json) and
[reproduction script](evidence/evaluation-preparation/verify.py) retain exact
counts, hashes and tests. No core audio algorithm, instrument asset, master
specification, supplied speech fixture or `~/mlx-env` was changed.

The [protocol](evaluation-protocol.md) still requires 20–50 cleared sources,
including at least ten speech clips across speakers/sessions, coverage of other
sound categories, and at least three independent reviewers per block. The
tool reports missing prerequisites but cannot authenticate consent, establish
reviewer independence, supply observations or approve production quality.

## Summarize submitted listening forms

`scripts/summarize_listening.py` validates submitted CSVs against the frozen
block/clip/candidate keys. It rejects unknown codes, duplicate judgments,
incomplete/non-numeric ratings, invalid pairings and comparisons lacking matching
candidate/baseline ratings. Input CSVs are never edited. Notes may contain quoted
newlines. Files are bounded to 1 MiB and total parsed rows to 60,000.

```sh
python3 scripts/summarize_listening.py --batch renders/licensed-evaluation-validated-20261018 --ratings /path/to/completed/responses.csv --pairs /path/to/completed/pairs.csv --output /fresh/listening-summary.json
```

Repeat `--ratings` and `--pairs` for more submitted files. Use consistent opaque
listener IDs; three distinct IDs alone do not prove reviewer independence.
An omitted or wholly blank form supplies no observations and produces **NOT RUN**,
not a zero score. Partially completed individual rows are rejected rather than
filled in. The current real cohort has no submitted ratings.

Each style is reported separately, retaining the batch's technical attempt
counts. First average each metric across that source's seeds/reviewers; then
average source means equally. Recognition excludes non-speech. Enjoyment also
reports the fraction of ratings at least 4/5. Paired decisions require a strict
majority of all that source's votes for candidate or baseline; otherwise the
source is a tie. Ties are retained and are not candidate wins. Descriptive 95%
percentile bootstrap intervals use 2,000 deterministic source-clip resamples;
a single clip gets no interval. Sample sizes and complete-reviewer-ID coverage
remain visible. Raw judgments remain in the hashed source CSVs.

The tool does not infer audible variety, genuine independence, representative
sampling or release acceptance. Even populated results remain **PARTIAL** pending
human evidence review, and it never automatically passes M1. The unit checks use
temporary, explicitly labelled algorithm fixtures, not study observations.
