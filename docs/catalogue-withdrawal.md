# Catalogue withdrawal and moderation recovery

2026-10-18. **Local implementation: PASS. W11 and full specification: PARTIAL.**

Four reproducible lifecycle defects were fixed:

1. Withdrawn/rejected tracks still occupied playlist capacity but disappeared
   from the page, leaving no way to remove them. A private playlist now returns
   only the existing track ID for each unavailable entry and shows a generic
   removable placeholder. No withdrawn title, credit, description or audio is
   exposed. Removing the placeholder frees a slot, including in a full playlist.
2. Reports kept withdrawn tracks in a review queue where no decision could be
   applied. The actionable queue now includes only submitted/approved tracks.
   Concerns remain stored and reappear if the owner submits the track again.
3. A new report could arrive after the reviewer loaded the page and be silently
   resolved by that stale decision. Reports now change the review revision under
   the same owner lock. Stale decisions return 409 and require a refreshed queue.
4. Only ten report reasons were displayed, but a decision resolved every report.
   Decisions now resolve the exact ten displayed reasons in deterministic order.
   Each decision changes the revision, preventing a repeated stale screen from
   clearing the next batch. Unseen concerns remain pending; a rejected/withdrawn
   track's concerns are retained for any future resubmission.

Reporter and track-owner rows are locked in stable order. `FOR NO KEY UPDATE`
serializes writes while permitting foreign-key references, preventing reciprocal
reports or simultaneous reviewer/report activity from deadlocking. Existing
private save/quota/delete behavior retains its transaction boundary. No schema,
dependency, engine, audio fixture or source recording changed.

## Reproduction and evidence

The tests failed before each corresponding fix; the retained logs are
[withdrawal/playlist](evidence/catalogue-withdrawal/before.log),
[stale review](evidence/catalogue-withdrawal/stale-review-before.log) and
[unseen report batch](evidence/catalogue-withdrawal/report-batch-before.log).
Run the site checks with Node 22 and the isolated local database/outbox/files
as described in [the README](../apps/site/README.md). Catalogue browser checks use
only temporary synthetic reviewer accounts; no real publication or permissions
review is performed. The full account regression also preserves local studio music.

| Gate | Status | Evidence / boundary |
| --- | --- | --- |
| Unit / PostgreSQL / local object tests | PASS | [33 checks](evidence/catalogue-withdrawal/tests.log), including full playlist recovery, archived concerns, stale review, eleven reports, reciprocal reports and concurrent decision/report |
| Build / types / bundle audit | PASS | [Build](evidence/catalogue-withdrawal/build.log), [types](evidence/catalogue-withdrawal/types.log), [bundle](evidence/catalogue-withdrawal/bundle.json) |
| Catalogue browser workflow | PASS | Eleven checks each in [Chromium](evidence/catalogue-withdrawal/chromium.json) and [WebKit](evidence/catalogue-withdrawal/webkit.json) |
| Account / private audio regression | PASS | Ten checks each in [Chromium](evidence/catalogue-withdrawal/account-chromium.json) and [WebKit](evidence/catalogue-withdrawal/account-webkit.json) |
| Page identity / meaningful content / overlay / console | PASS | Real account, catalogue, review and playlist navigation; no unexpected console errors in final runs |
| Responsive interaction / screenshot inspection | PASS | 1440×1000 and 390×844; generic unavailable entry can be removed without exposing its former metadata |
| Waveform preservation | PASS | Served synthetic test WAV equals uploaded bytes, max/RMS difference zero; generated account-test WAV also preserved |
| Event-frame comparison | NOT RUN | No DSP/scheduling changes; existing studio bundle unchanged |
| Hosted moderation / R2 / auth providers / deployment | NOT RUN | Local execution only |
| Musical quality / human listening / phone | NOT RUN | These fixes provide no new perceptual or device evidence |
| Overall specification | PARTIAL | Existing quality, learned-model, live/device and production gates remain open |

Environment: Apple M5/macOS 26.7.1, PostgreSQL 16.14, Node 22.23.1,
Next.js 16.4.2, Playwright 1.61.1. Exact browser versions are in the JSON.
The Browser plugin's required execution tool was unavailable after discovery;
repository Playwright was used under the existing local-validation authorization.
The frontend testing and React skills guided validation; no new browser dependency.

The initial WebKit account run recorded navigation/prefetch access-control errors;
its [log](evidence/catalogue-withdrawal/account-webkit-initial.log) is retained.
A rapid catalogue rerun correctly hit the signup limiter ([attempt](evidence/catalogue-withdrawal/rate-limit-attempt.log)); no limit was bypassed or weakened.
An [intermediate run](evidence/catalogue-withdrawal/intermediate-old-cases.json)
contained only the previous eight case labels and is excluded from final coverage.
The catalogue browser command now disables loader/compile caches, and final
reports were independently checked for all eleven case labels per browser.
Final runs retain exact expected negative-test
HTTP errors separately, and still reject unexpected app errors. Existing screenshot
CSP warnings remain narrowly recorded during capture; CSP is unchanged.

No hosted moderation staffing, response time or recall of downloaded copies is
promised. Private owner recordings, the supplied speech fixture, master spec and
`~/mlx-env` are preserved. Temporary users/reviewers are removed after validation.

Screenshots: [mobile](evidence/catalogue-withdrawal/chromium-mobile.png),
[desktop](evidence/catalogue-withdrawal/webkit-desktop.png).
