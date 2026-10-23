# Music DNA / Improvise follow-through — 2026-10-23

Owner scope: resolve generation failures, integrate the natural singer conversion,
expand distinct singers, execute a consented feedback research trial, and connect
external playlists. SoundCloud was explicitly deferred because of its paid access.
Website deployment remains owner-controlled; no new paid compute is used here.

## Current execution

| Work | Status | Evidence / limit |
|---|---|---|
| Lyric formatting | PASS, five-request regression | Structured lyric arrays produce canonical section headings and exact chorus returns. Czech, Korean, Latin, Urdu and Chinese all produced full audio; ten takes verified in R2. Only Chinese passes style so far; style failures remain separately open. |
| Style mismatch | PARTIAL, confirmed checker error | The owner explicitly identifies the new German backing as jazz, while screen v1 rejects it. Uniform genre prompts, isolated backing and two music-model variants did not resolve that false rejection. Existing thresholds remain; no failed candidate was promoted. |
| Singer integration | PARTIAL | `scripts/vocal_identity.py` connected to the existing singer CLI, off by default. The 120-second CLI render/convert/check passes in 830 seconds from a prepared plan; full-song listening and whole website timing remain open. Two owner-accepted male identities; the two new female auditions sound natural but like the same singer to the owner, so neither expands the automatic pool. |
| Feedback learning | PASS, local research execution | Owner explicitly consented to local research. 33 original accepted song plans, 11 list groups/genres and 33 languages; 23 training / 10 held-out examples. The known Turkish grammar error is excluded. No favorite audio or artist names in model data; research never changes the serving model. Completed 100 QLoRA steps on the local GPU. Held-out loss improved from 1.381 to 0.659; adapter remains unpromoted. [Result](evidence/song-follow-through/research-result.json). |
| YouTube | PASS locally | Public/unlisted preview and catalogue matching implemented. Owner configured the key; real 50-item provider request and live Chromium/WebKit preview/clear checks PASS. Real bulk matching found five exact matches among the first 20 entries, leaving ambiguous items for manual review. Production configuration is separate. |
| Spotify | NOT RUN | Developer access and permission for this AI use are unestablished; no API calls or content ingestion. |
| SoundCloud | NOT RUN, deferred by owner | No paid access or integration attempted. |

## Playlist behavior and configuration

Set server-only `YOUTUBE_API_KEY` in `apps/site/.env.local` for a project with
YouTube Data API v3 enabled. Production configuration is separate. The connection
loads at most the first 50 entries of a public or unlisted playlist, excludes
unavailable videos, and links each title back to YouTube. Private account/library
access is not implemented. The preview lives only in the active tab. “Find song”
searches the existing iTunes catalogue; only a separately confirmed catalogue
entry enters the durable favorites list. The original YouTube title cannot be
added by the preview's custom-name fallback. Bulk matching compares the first 20 entries against catalogue results and preselects only unique exact title/artist token matches; ambiguous entries require manual selection. Duplicate favorites are skipped and the 20-favorite cap is enforced. No YouTube audio is fetched.

The server rebuilds the fixed Google endpoint from a validated playlist ID;
rejects arbitrary hosts, credentials, ports and schemes; uses no response cache,
a timeout, bounded output and a per-process quota guard. This guard is not a
shared fleet quota. API keys and provider error bodies never reach the browser.

Official documentation checked on 2026-10-23 (Context7 unavailable):
[YouTube playlistItems.list](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list),
[YouTube policies](https://developers.google.com/youtube/terms/developer-policies),
[Spotify policy](https://developer.spotify.com/policy),
[SoundCloud API terms](https://developers.soundcloud.com/docs/api/terms-of-use).
Spotify's AI restrictions prevent treating ordinary developer credentials as
permission for AI ingestion. SoundCloud remains deferred, regardless of future
credential availability.

## Research consent

Owner statement: “Yes, use my feedback for local research.” This applies to the
previously accepted original gallery song plans, not a fabricated customer
rating cohort. `renders/music-dna-training/owner-review.json` binds consent to
all five source-file hashes for each song. Only owner-reviewed, technically
accepted original songs enter this cohort. Same favorite-list groups never
cross the split. Training checks current consent throughout execution, removes
training data afterward and invalidates adapters after consent withdrawal.

Candidate text loss is an engineering measurement, not proof of musical or
listener-preference improvement. A serving-model change needs separate evidence.

The first training attempt was stopped for memory pressure, with its failed-run
record preserved. The replacement computes the same masked loss in checkpointed
128-token vocabulary chunks while retaining the full song context. Numerical loss
and gradient comparison passes. The completed run used a peak 4.36 GB of Metal
memory, ran 100 steps and evaluated every held-out example. Source consent stayed
current throughout; the adapter is retained only as a research candidate. The same
group-held-out cohort supplies periodic validation and final evaluation; there is
no separate third test cohort, and 33 songs cannot establish broad musical gains.

## Style-check investigation

The explicit owner label is bound to audio SHA-256
`c0dbbabab04353d94c16714767553bbd6579d018031be7ee3b298c5d4c610560`.
It establishes jazz backing for this recording, not German pronunciation or a
general classifier calibration set. Both concrete arrangement trials (German jazz
and Finnish country) remain stored, along with their original screen failures.
The other twelve planned replacement renders were cancelled before execution
because a confirmed checker error calls for checker evaluation first.

[Experiment receipts](evidence/song-follow-through/screen-experiments.json) bind
the models, conversion and separated backing. Uniform prompts still rejected the
approved jazz recording. The published
[music-specific CLAP model](https://huggingface.co/laion/larger_clap_music)
produced nearly indistinguishable low scores; its repository has an
[unresolved report of similar behavior](https://huggingface.co/laion/larger_clap_music/discussions/2).
A separate local conversion of the original checkpoint loaded all learned
parameters but also failed the jazz and accepted heavy-rock controls. Neither
candidate replaces the working checker. This remains an open quality gate;
loosening thresholds until these examples pass would not establish correctness.

## Singer qualification

The owner finds both “Jazz · new female singer” auditions natural, but hears
the same singer in different tones. Both remain excluded from automatic casting.
Four further synthetic targets were prepared locally and compared with the pinned
speaker encoder. The failed pair was already farther apart than the new pairs;
this metric cannot establish perceived singer distinctness. No additional singer
is counted or promoted from that comparison. A separate research comparison
uses the original two female targets with six-second excerpts and stronger
conditioning guidance (1.2 instead of 0.7), on the same original jazz performance.
Both the reference duration and guidance change; this tests the resulting sound
and does not isolate either parameter as the cause. Both 30-second takes completed in 161 and 171 seconds and are stored in R2.
Human distinctness and naturalness are NOT RUN for this revised pair.
[Guidance experiment](evidence/song-follow-through/stronger-guidance.json).
Automatic casting is unchanged.
[Research receipt](evidence/song-follow-through/contrasting-voice-research.json).

The first two-minute identity test exceeded the 720-second conversion limit;
its unfinished output is preserved. Long target speech consumed about half the
model context. The bounded retry uses the first six seconds of the same pinned
synthetic target, records that excerpt hash and retains the original timeout.
It completed a fresh 120-second song, passed the automated style screen and
published to R2 in 830.175 seconds (13 minutes 50 seconds), excluding lyric
drafting and the whole website transaction. This leaves little margin before
the 900-second website deadline. Full-song listening remains NOT RUN.
[Qualification receipt](evidence/song-follow-through/singer-qualification.json).
The website deadline remains 15 minutes. This is still a local research path:
`JAMLOOM_VOCAL_IDENTITY_ENABLED` stays unset/off, CUDA does not select these
identities, and no hosted singer package has been released.

## Verification

Implementation commits: playlists `9f3dab7`, `c196c4d`; lyric repair/research `298dbe8`; checker evidence `27e8b87`; gated singer conversion `aeb3173`. Site tests (80), production build/type checks and
client secret audit PASS, including a fresh build with the real server-only YouTube key configured. Live YouTube delivery, desktop Chromium/mobile WebKit
preview and clear behavior PASS; real bulk matching found five exact matches
among twenty candidates. The remaining titles require manual catalogue review.
The portable `apps/site/tests/playlist-browser.mjs` additionally verifies disabled-connection handling, exact-match review, duplicate/capacity behavior, repeated search restoration and scoped accessibility in both engines. Run it with `JAMLOOM_TEST_URL=http://127.0.0.1:4235 node apps/site/tests/playlist-browser.mjs`.
All 31 DNA contract tests pass in the singer environment. Singer contracts (8), identity lifecycle/mixing/opt-in checks (5) and worker boundaries (8) also pass. Pure-system Python
passes 30 and skips the optional tokenizer check. The collection now contains 152 R2-backed songs. The full-length singer test and
both revised auditions pass muted Chromium/WebKit playback, seeking and range
requests. No database migration was
needed. No website push/deployment or new paid compute occurred.
