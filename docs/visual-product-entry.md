# Visual product entry — 2026-10-22

**PASS, local implementation and rendered verification.** No deployment,
ad purchase or new music generation. This improves product discovery; real
visitor comprehension and conversion have not been measured.

The homepage now begins with five visible actions: **Learn to DJ**, **Mix
tracks**, **Remix a sound**, **Make a song**, and **Mix live audio**. Selecting
an action changes the product preview and its destination. All five fit in
the tested initial 1280/390/320-pixel-wide viewports at 900 pixels tall.

Music DNA opens with a concrete favorites-to-song example: Soundgarden,
AC/DC and Metallica lead to the existing Concrete Roots song. The example is
labelled, uses the real saved audio, starts paused, and has an explicit
**Hear this song** control. Product availability stays visible. Switching
previews stops its audio; the existing homepage collection and two-deck demo
remain available.

The shared five product descriptions shrink from 143 to 51 words (64%).
Feature lists and release/setup details remain accessible through expandable
sections. Each product still has its own homepage section and preview.
The coming-soon page also gets shorter copy and visual product choices,
without changing its access gates or enabling unreleased products.

Product pages follow the same approach: Music DNA puts the search first;
Academy shows the real lesson preview; DJ Studio shows a deck preview;
Improvisation gives three short steps; Live DJ puts its working controls
before the expandable Pro promotion. Prices, permissions, hardware notes,
sharing conditions, feedback, language controls and recording tools remain.

## Verification

Local URL: <http://127.0.0.1:4247/>. Chromium and WebKit, desktop 1280 and mobile
390/320 widths. The Browser plugin execution tool remains unavailable;
existing isolated Playwright tests were used with muted playback.

| Check | Result |
|---|---|
| Five choices, live preview switching and destinations | PASS |
| Real example playback, stopped initial state, stop on switching | PASS |
| All five product entry routes, optional details and search ordering | PASS |
| Responsive screenshots, no horizontal overflow, no page errors | PASS |
| Axe checks for the new showcase and coming-soon surface | PASS, zero violations |
| Coming-soon visual content | PASS, actual response rendered as a local fixture |
| Existing generation prompt, prices, cancellation, homepage players | PASS, both browsers; generation transport fixture |
| Favorites/search/save/feedback-related controls | PASS, both browsers; existing fixture regression |
| Site tests, build and public-bundle audit | PASS, 62 tests |
| Deployment, novice usability study, conversion experiment | NOT RUN |

[Receipts and screenshots](evidence/visual-product-entry/).
Reproduce with Node 22 from `apps/site`:
`node --import tsx tests/visual-products-browser.mjs`,
`node tests/dna-prompt-home-browser.mjs`, `node tests/taste-browser.mjs`,
`npm test`, `npm run build`, and `npm run audit:bundle`.
The visual test checks one real existing example; it does not generate songs
or measure new musical quality. No product completion/release gate changed.
