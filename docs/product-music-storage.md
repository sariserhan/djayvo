# Product music storage — 2026-10-22

**PASS:** implementation, local integration checks, real R2 uploads and playback.
**NOT RUN:** production migrations/deployment and hosted generation activation.

## Object layout and access

The existing private `jamloom-audio` bucket stores new finished music at
`<product>/<visibility>/<id>/<sha256>.wav`. Supported products are `music-dna`,
`improvise`, `dj-studio`, `live-dj` and `academy`; visibility is public or private.
Folders appear when they contain files; no empty buckets or placeholder files
are required. Temporary source/upload objects retain the `uploads/` prefix and
its existing expiry policy. Historical `masters/<id>.wav` objects stay readable
and removable without copying or deleting existing recordings.

The prefix records the creation choice, not authorization. The bucket has no
public object access. Public feeds require sharing permission (and existing
catalogue review where applicable); private playback requires the owner.
Withdrawal prevents new public grants while retaining owner playback. Existing
grants expire rather than being instantly revoked: 60 seconds for user music,
15 minutes for curated examples. A private file is never made public merely
because its object path contains `public`.

New library saves record their product and final key. Browser improvisation
sessions passed to the library and generated improvisation outputs use
`improvise`; ordinary file imports default to `dj-studio`. The shared save API
accepts the other validated product values. Legacy interrupted saves recover
using their original keys. Offline browser generation is still local until
the user explicitly saves online; this does not silently upload recordings.

Music DNA completion writes and reads back the checksum-bound WAV, stores its
key/hash/length and plan in Postgres, then settles credits and marks it complete.
Storage failures leave completion pending; retry uses the same job/bytes.
After a stopped worker, cancellation can release held credits. While the final
save is in progress, cancellation reports that boundary rather than falsely
claiming a refund. Hosted reads use stored receipts, independent of Mac files.
Favorites and full notes remain owner-only; public metadata omits the list.
Hosted generation itself remains unavailable.

## Earlier songs

All nine completed examples were already in the manifest; no rejected or failed
take was added. Their **207,360,396 bytes** are now uploaded to R2 under
`music-dna/public/`. Every uploaded WAV was downloaded and checksum-verified;
range reads pass and the objects have no temporary-upload expiry.

Example listing and signed playback no longer require a local singer or account
database. Local singer previews retain the existing style/receipt validation
and feedback controls. Hosted example feedback is hidden until its hosted
persistence is available. The homepage uses the same gallery and audio route.

The allowlisted manifest is the only way to obtain a curated-example grant.
Unknown IDs, plan/input requests and mutations do not use that public path.
No favorite input files, user recordings, private jobs or model files were
uploaded. [Cloudflare's official SDK guidance](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
was consulted because Context7 was unavailable; existing installed SDK and
storage helpers were reused.

## Verification and deployment

| Check | Result |
|---|---|
| Nine R2 uploads, complete download checksums, ranges, no expiry | PASS, real provider |
| Actual built page with no singer/DB: nine cards, muted playback, seek, download, unsigned denial | PASS, Chromium/WebKit at 1280/390/320 |
| Private/public authorization, redacted metadata, withdrawal, storage failure/retry/cancellation | PASS, isolated real Postgres with a storage fixture |
| Shared library product paths, legacy recovery/read/deletion, public catalogue checks | PASS, isolated real Postgres/disk |
| Authenticated public/private credit UI and feed refresh | PASS, Chromium/WebKit; synthetic worker |
| Unit / DB-output / library checks | PASS, 66 / 10 / 21 tests |
| Production build with TypeScript and public bundle audit | PASS |
| Production database audit | PASS, read-only; existing migration checksums match |
| Production writes, deployment, new music generation/listening | NOT RUN |

[Receipts and screenshots](evidence/product-music-storage/).
R2-only preview: <http://127.0.0.1:4248/music-dna>.

Before deployment, apply **0013_audio_duration**, **0015_taste_metadata_size**,
**0016_dna_songs** and **0017_music_storage** through the approved migration
process. The current production ledger has 13 applied migrations, including
0014; the four above are pending. The new library writer requires 0017.
Production has the four R2 variable names configured, but sensitive values
cannot be exported by the CLI for credential comparison. Verify deployed
playback after the GitHub-driven deployment. No environment variable was changed.

The public coming-soon gate remains on. An authorized owner preview can use the
new example route after deployment; visitors do not get public Music DNA access
until that gate is intentionally changed. Storage readiness does not enable
the hosted singer, paid credits or public generation.

Reproduce example preparation from `apps/site` with Node 22:

```sh
node --import tsx scripts/dna-examples-r2.ts --bucket jamloom-audio
# Upload only the allowlisted, validated completed examples; safe to rerun:
node --import tsx scripts/dna-examples-r2.ts --bucket jamloom-audio --apply --report /tmp/dna-r2.json
node tests/dna-r2-browser.mjs
```

The browser check expects a production build on port 4248, R2 credentials,
`JAMLOOM_COMING_SOON=false`, empty `JAMLOOM_DNA_SINGER_ROOT`, and no account DB.
New user-song storage can be rehearsed locally with
`JAMLOOM_DNA_CREDITS_SANDBOX=true` and `JAMLOOM_DNA_R2_ENABLED=true`; those flags
do not enable hosted compute. Production schema changes and launch remain
separate actions.
