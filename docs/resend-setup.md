# Jamloom email setup

2026-10-19 local. The owner supplied `RESEND_API_KEY` in ignored
`apps/site/.env.local` and confirmed that Resend shows **jamloom.com: Verified**.
Only **contact@jamloom.com** and **support@jamloom.com** receive mail. Other
addresses, including **hello**, **info** and **alert**, are sending-only.

Current account verification/reset mail uses:

All app mail now also receives the [shared responsive HTML/plain-text template](email-templates.md),
including the Jamloom logo, website palette and receiving-mailbox footer.

```dotenv
EMAIL_FROM="Jamloom <hello@jamloom.com>"
EMAIL_REPLY_TO=support@jamloom.com
```

These settings were added to the local environment (the existing values were
absent) and the production template. Existing secrets and the local email outbox
were preserved. Add the same settings plus the Resend sending key to Vercel
Production when deploying. Hosted environments must omit local outbox settings.
`alert@jamloom.com` is reserved for future notifications; no alert sender or
notification workflow was introduced by this change. General enquiries go to
contact; support handles replies and help. Do not direct users to sending-only
mailboxes for support, privacy or misuse reports.

The HTTP mail adapter now includes Resend's `reply_to` field. The configuration
accepts one bare mailbox and rejects whitespace/header injection or recipient
lists. Reply-To is optional for backward compatibility; Jamloom's production
template explicitly sets support. Retry identity includes the entire outgoing
payload so changing sender/reply routing cannot collide with an earlier request.

## Evidence and gates

| Gate | Result | Evidence/limit |
| --- | --- | --- |
| Local credential presence | PASS | Resend key is present; no secret values exposed or committed. |
| Sending domain verification | PASS (owner-observed) | Owner reports **Verified** in Resend. Not independently established through the API. |
| Automated domain inspection | PARTIAL | Read-only `GET /domains` returned HTTP 401 `restricted_api_key`; the supplied send-only key cannot list domains. No broader key requested. |
| Sender/Reply-To wiring and regressions | PASS | 11 unit tests: payload routing, deterministic retries, changed-routing identity, optional-field compatibility and invalid-header rejection. [Log](evidence/resend-setup/unit.log) |
| Production build, typecheck and client-secret audit | PASS | [Build](evidence/resend-setup/build.log), [TypeScript](evidence/resend-setup/typecheck.log), [16-file secret audit](evidence/resend-setup/bundle-audit.log). |
| Real send, inbox delivery and user reply | NOT RUN | No emails sent during configuration checks. |
| Vercel deployment and complete hosted signup/reset | NOT RUN | Local development still uses the existing private outbox. |
| Overall email readiness | PARTIAL | Wiring complete and domain owner-confirmed; delivery/hosted workflow untested. |

The master specification, database, recordings and R2 settings are unchanged.
Provider verification does not prove inbox placement or receiving-mailbox routing.

Official references: [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[domain inspection](https://resend.com/docs/api-reference/domains/list-domains).
