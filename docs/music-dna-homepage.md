# Music DNA generation prompt and homepage — 2026-10-22

**PASS, local implementation and browser checks.** No deployment, production
migration, paid inference or new song generation was performed.

The flow is **Music DNA → Make my music → choose public/private and credits →
Generate song**. Pricing and sharing controls no longer occupy the initial
favorites form. Public starts at 1 credit and private at 2. Public permission
remains explicit, each attempt asks again, and a higher quote needs a second
confirmation. Opening or dismissing the dialog does not reserve credits.
Escape/Cancel closes the prompt and returns focus to the trigger. Pending
metadata work can be cancelled; existing job cancellation and refunds remain.

The homepage now includes all nine existing Music DNA examples and a live
public Music DNA collection. The public collection refreshes every minute while
visible and on returning to the page; successful new songs and withdrawals
therefore appear without editing the homepage. Private songs remain excluded.
The existing catalogue feed continues to show reviewed public saves from DJ
Studio, AI Improvisation and the other studios through their shared Cloud
library save flow. Selecting public does not bypass upload completion, consent
or the existing review for user-supplied recordings.

Homepage players pause each other. The mini-deck still permits both of its
channels to play together; starting a song pauses both deck channels. Starting
a deck pauses other music. The homepage sharing copy now explains DNA pricing.
Accessible link names use visible text, and the mobile prompt keeps its actions
readable and reachable without horizontal scrolling.

## Validation

Environment: <http://127.0.0.1:4247>, Chromium and WebKit, widths 1280/390/320.
The Browser skill was read, but its required execution tool was unavailable
in tool discovery. Existing isolated Playwright workflows were used; playback
was muted. Real account testing uses its own loopback server and disposable
Postgres database, local verification emails and synthetic worker audio.

| Check | Result |
|---|---|
| Page identity, content, runtime health | PASS; expected page titles and content, no page errors or framework failure |
| Prompt, keyboard dismissal, focus, consent and cost confirmation | PASS; opening does not submit; a 3-credit quote waits for acceptance; one confirmed request creates one song |
| Homepage samples and audio controls | PASS; nine real existing examples; sample, public catalogue and mini-deck playback switch cleanly |
| Private/public account boundary | PASS; real auth and ledger; private excluded from homepage; withdrawal disappears on refresh |
| Layout and accessibility | PASS; desktop and mobile screenshots, no horizontal overflow, zero axe violations |
| Favorites, feedback and recovery regressions | PASS; Chromium/WebKit picker and feedback, interrupted/rejected/unavailable generation checks |
| Existing public catalogue boundary | PASS; 13 real Postgres tests, including pending/private/withdrawn/deleted exclusions |
| Site tests, build and bundle audit | PASS; 62 tests and completed production build |

Run from `apps/site`: `node tests/dna-prompt-home-browser.mjs`,
`node tests/taste-browser.mjs`, `node tests/taste-recovery-browser.mjs`, and
`node tests/dna-feedback-browser.mjs`. For the real account/ledger checks use
`JAMLOOM_TEST_DATABASE_URL` pointing to a disposable loopback Postgres
administrator and `node --import tsx tests/dna-commerce-browser.mjs`.

[Receipts and screenshots](evidence/music-dna-homepage/) preserve the evidence.
This verifies the local interface and sharing boundaries. Hosted audio delivery,
credit purchasing and wider musical acceptance remain as recorded in the
[credit implementation](music-dna-sharing-credits.md); no production completion
is implied.
