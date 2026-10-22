# Studio recording-length fix — 2026-10-22

**Superseded behavior:** [The current studio](meaning-singer.md) accepts short/long recordings and treats sampling as optional from the start. This report preserves the preceding implementation and evidence.

The owner reported a repeated “record 2 to 5 seconds” error despite making a
short recording. Both failed jobs stopped before lyric generation. The decoder
capped input at **5.001 seconds**, but the next validator required **at most
5.000 seconds**. A recording slightly over five seconds was therefore always
rejected, and the UI replaced every failure with the same recording advice.

The retained browser recordings were 5.22 and 6.00 seconds including quiet at the
edges. Local preparation now accepts up to 15 seconds for inspection, keeps an
exact original copy, and removes edge quiet only when the audible span fits within
five seconds. It never takes the first five seconds blindly. The downstream song
pipeline still receives 2–5 seconds. Continuous sound longer than five seconds,
very short clips, silence, invalid files and recordings over the inspection limit
receive specific messages. Size, consent, decode timeout and source validation
remain enforced. No shared engine or model input limit changed.

The two actual failed recordings now prepare as **4.11 and 5.00 seconds**. Both
original hashes are retained. Each new job saves the selected frame range and
original/prepared duration and hashes in private `input.json`; original recordings
and transcripts are not added to Git. Preparation errors explain the recording
problem. Later failures name the stage (lyrics, singing, analysis or arrangement)
and tell the user to retry without recording again. Private failure metadata
contains only stage and exception type, without subprocess output or transcripts.

- **PASS — actual failed inputs:** [both recordings](evidence/studio-input-fix/actual-recordings.json).
- **PASS — nine scoped tests:** exact 2/5-second inputs, 5.001/5.22/6/15-second
  quiet overrun, original/crop PCM preservation, continuous overlong speech,
  too-short/too-long/silent inputs, model-stage error handling and existing studio
  flow and plans. [Test log](evidence/studio-input-fix/tests.log).
- **PASS — actual browser retry:** The retained 5.22-second failed recording was
  uploaded to the restarted studio, prepared as 4.11 seconds, and completed a new
  30-second song through the real local models. The UI reports the quiet trim;
  consent messaging, no autoplay, muted playback/seek, exclusive playback and
  320/375 px layouts pass. [Browser evidence](evidence/studio-input-fix/studio-browser.json).
  Existing waveform-reload abort warnings are recorded separately.
- **NOT RUN — musical quality and new microphone capture:** this fixes preparation
  and reporting; it does not establish creative quality or physical recording
  behavior. Existing captured microphone audio is used for the regression.

Local studio: <http://127.0.0.1:4198/>. Refresh after the server restart.
No publication, upload, paid compute or changes to previous render evidence.
