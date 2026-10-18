# Local blinded listening form

2026-10-18. **Form and packaging: PASS. Actual listening / M1: NOT RUN.**

A frozen evaluation packet can now be copied into a separate browser questionnaire.
It plays the source and four anonymous candidates, collects the existing rubric
and assigned comparisons, and downloads two CSVs accepted by the response-summary
tool. No answer is preselected. No account, upload, telemetry or browser storage
is used. Responses live only in the tab until the listener downloads them.

A real licensed, still-blank packet is ready at **http://127.0.0.1:4191** while
the local server runs. It is a copy of `ls-2277-149896-0026`, seed 4123, from the
frozen cohort. Its parent directory is `renders/listening-review-v2-20261018/packet`.
Only that directory is served; organizer keys and other repository files are not.
The packet's declared independent-review scope does not establish actual reviewer
assignments or independence. Owner-only packets display their narrower scope.
No packet or invitation has been sent to anyone.

## Use

1. Use the organizer-assigned opaque reviewer code, not a name or email. Listen
   at comfortable volume to the source and all candidates in the assigned order.
2. Enter the seven judgments per candidate and three pair preferences. Notes are
   optional; include defect timestamps, without personal information.
3. Confirm that the judgments come from your own listening. Download **ratings**
   and **comparisons**, and check that both files arrived before closing. The
   confirmation records an assertion; it cannot authenticate a human listener.
4. Keep the downloaded files unchanged. The existing summary command accepts
   them via `--ratings` and `--pairs`. Nothing is automatically submitted.

Refresh discards form contents; an unsaved-change warning is attempted, but browser
warnings are not a durable backup. After both downloads, further edits require
new downloads. Names contain block/reviewer codes. CSV preserves quoted commas,
newlines and Unicode; formula-like notes are prefixed with an apostrophe for safer
spreadsheet viewing. Review scores are never calculated or displayed in the form.

To prepare another block, use a **fresh output outside the frozen batch**:

```sh
python3 scripts/prepare_listening_review.py \
  --batch renders/licensed-evaluation-validated-20261018 \
  --clip ls-2277-149896-0026 --seed 4123 \
  --output renders/YOUR-NEW-REVIEW/packet
python3 -m http.server 4191 --bind 127.0.0.1 \
  --directory renders/YOUR-NEW-REVIEW/packet
```

Serve only the packet, never the repository or batch root. Do not broaden review
permission or publish audio by preparing a form. The packager verifies freeze
identity, declared scope, candidate/pair assignments, blank CSVs and five audio
hashes before writing. Source credits/instructions are preserved and escaped as
text. Existing output folders, answered/changed forms, corrupt audio, symlinked
files, path escapes and missing licensed-source credits are rejected. The output
manifest is written last; interrupted preparation must be retained and retried
in a different fresh directory. This is hash checking, not a signed rights audit.

## Evidence

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Packaging and preservation | PASS | [21 checks](evidence/listening-review/packaging-tests.log): identities, permissions, blanks, bounds, corruption, symlinks and existing-output protection |
| Project test integration | PASS | [CMake/CTest](evidence/listening-review/tests.log): new listening-review suite plus existing tooling/response-summary suite, 2/2 affected suites |
| Chromium / WebKit form workflow | PASS | [Chromium](evidence/listening-review/chromium.json), [WebKit](evidence/listening-review/webkit.json): five workflow checks each |
| Page identity / useful content / console / interaction | PASS | Five players, blank required controls, invalid reviewer-code rejection, incomplete-export denial, two downloads, no unexpected app errors or external requests |
| Synthetic CSV round trip | PASS | Temporary UI-only scores parsed by existing summary; quoted Unicode/newlines retained; formula-like notes escaped; fixture responses deleted afterward |
| Real frozen packet | PASS | [Two-browser play/seek](evidence/listening-review/real-packet-browser.json), untouched form; muted automation is not listening |
| Mobile/desktop visual inspection | PASS | 390×844 and 1440×1000; readable labels, no horizontal overflow |
| Waveform differences | PASS | [Five copied file hashes](evidence/listening-review/packet.json) equal frozen originals exactly: maximum/RMS PCM difference zero; no audio generation or processing |
| Event-frame comparison | NOT RUN | No renderer/planner change or new render; previous portability evidence remains separate |
| Existing study forms | PASS | [Study state](evidence/listening-review/study-state.json): all 483 rows blank; zero actual ratings/pairs |
| Formal listeners / independence / musical quality | NOT RUN | No fabricated reviewer, response, quality score or M1 advancement |
| Hosted providers / phone / publication | NOT RUN | Local loopback only; paused work stays paused |
| Full specification | PARTIAL | Model/live/device/release gates and actual quality evidence remain open |

[Environment](evidence/listening-review/environment.json): actual Apple M5,
macOS 26.7.1, project Python 3.14.6 for CTest, Python 3.15.0 for CLI/browser
fixtures, Node 22.23.1; exact browser versions retained above. No new dependency,
core change or modification to `~/mlx-env` was needed. The master specification,
provided synthetic speech fixture and private owner source retain their hashes.

The frontend testing skill guided browser validation. The Browser plugin's
required execution tool was unavailable after discovery, so the existing
Playwright installation was used under the local-test authorization.

Retained failures: the first run waited on ambiguous select labels, corrected
with explicit accessible names and bounded test timeouts; Chromium exposed an
invalid HTML pattern under current regex rules, fixed with an explicit hyphen
alternative. WebKit rejected audio from the test server without Content-Length;
adding the accurate length fixed the fixture server. The real loopback Python
server already supplied it. [Pattern failure](evidence/listening-review/initial-pattern.log),
[media failure](evidence/listening-review/initial-media.log) are retained. CSP was
not weakened; screenshot-only WebKit stylesheet warnings remain separately recorded.

Screenshots: [desktop](evidence/listening-review/chromium-desktop.png),
[mobile introduction](evidence/listening-review/chromium-mobile.png),
[mobile ratings](evidence/listening-review/candidate-mobile.png).
