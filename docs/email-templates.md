# Responsive Jamloom email templates

2026-10-19. All app-generated email now passes through one shared HTML/plain-text
renderer in `apps/site/lib/email-template.ts`. Both existing account flows
(verification and password reset) use the layout and explicit action buttons.
Messages without an action still receive the same logo, content layout and footer;
future notifications must use `sendEmail` rather than calling Resend directly.
No new notification triggers or marketing campaigns were introduced.

## Design and behavior

The template follows the website's `apps/web/style.css`: charcoal `#101211`,
panel `#191c19`, text `#f0f3eb`, muted `#a5aca2`, border `#303830`, and lime
`#c3ef69`. It reuses the waveform PNG and live-text Jamloom wordmark, with system
font fallbacks. The name and all essential content stay readable with images off.

Fluid presentation tables, a 600px maximum content width, inline styles and an
Outlook conditional wrapper provide the email layout. A small-screen media query
reduces spacing. Content has no fixed height or clipping container: short screens
scroll, long text and token URLs wrap. Buttons have at least a 44px target height.
The footer links only to existing receiving mailboxes (support/contact) and the
app origin. No invented legal pages, postal address or unsubscribe flow.

Resend receives both `html` and `text`, with the existing support Reply-To and
payload-based idempotency. The private local outbox captures the same rendered
HTML/plain text, so local previews exercise the actual sending path. Plain-text
auth links remain compatible with the existing browser/account test helpers.
User-facing strings are escaped; action URLs must match the configured app
origin and cannot contain embedded credentials. No tracking pixels or web-font
dependencies were added. The logo uses the existing deployed `/studio/icon-192.png`
asset; its public deployment is still a release check.

## Reproduce and preview

```sh
npm test
npm --prefix apps/site run test:email-browser
npm run build
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
python3 -m http.server 4295 --bind 127.0.0.1 --directory docs/evidence/email-templates/previews
```

Open http://127.0.0.1:4295/ for verification, reset and long-content previews.
These contain **fake tokens and sample messages only**. The browser script
captures both actual auth callbacks using a fake transport; it makes no provider
or database calls. Preview image paths are local copies of the unchanged logo;
real emails use an absolute URL at the configured app origin. No email was sent.

## Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Shared sender, both auth callbacks and plain text | PASS | 13 site tests, including actual callback outbox capture and Resend payload assertions. [Log](evidence/email-templates/unit.log) |
| Escaping and action URL validation | PASS | HTML injection escaped, foreign/script/credential-bearing action URLs rejected. |
| Responsive browser rendering | PASS | 54 cases: three templates × nine conditions × Chromium/WebKit. Widths 200, 320, 390, 768, 812, 1440; heights 300–1024; long content, 200% text, blocked images and head styles removed. No horizontal overflow; footer reachable and action target preserved. [Results and versions](evidence/email-templates/browser.json) |
| Visual inspection | PASS | Inspected [mobile verification](evidence/email-templates/verify-mobile.png) and [desktop reset](evidence/email-templates/reset-desktop.png); matching palette/logo, readable body and footer. Other captures: [desktop verification](evidence/email-templates/verify-desktop.png), [mobile reset](evidence/email-templates/reset-mobile.png). |
| Production build | PASS | [Build](evidence/email-templates/build.log) |
| TypeScript / client-secret audit | PASS | [Typecheck](evidence/email-templates/typecheck.log), [audit](evidence/email-templates/bundle-audit.log) |
| Actual Gmail, Outlook and Apple Mail inbox rendering | NOT RUN | Browser rendering does not establish email-client sanitization, Outlook Word layout or forced dark-mode behavior. |
| Provider send, inbox/reply delivery and hosted logo retrieval | NOT RUN | No messages sent or deployment changed. |
| Overall email release readiness | PARTIAL | Templates validated locally; real email-client/delivery gates remain. |

The initial blocked-image case failed because the browser reused an already
decoded image. The test now uses a distinct blocked URL to exercise the intended
fallback. [Initial failure](evidence/email-templates/initial-cached-image.log);
[successful rerun](evidence/email-templates/browser.log). Preview port 4195 was
occupied; its process was left intact and the preview uses 4295.

No master-specification, music-engine, recording, database, provider or credential
changes. [Responsive email guidance](https://templates.mailchimp.com/development/responsive-email/)
and [Resend HTML/plain-text API](https://resend.com/docs/api-reference/emails/send-email)
were consulted; no new runtime dependency was necessary.
