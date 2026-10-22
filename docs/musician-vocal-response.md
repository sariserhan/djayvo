# Musician voice and contextual sung responses

**Owner clarification: required behavior; implementation NOT RUN.** The previous
[voice-led audition](voice-led-review.md) misunderstood the requested feature.
Adding the user's recorded voice to an instrumental does not fulfill this request.
The owner wants a separate musician voice that sings a playful, contextual reply.
This clarification does not constitute a listening score for the previous mixes.

## Two distinct roles

- **User source:** the actual submitted sound/phrase. Preserve its identity;
  choose whether to play it once, twice or as a short rhythmic loop. Placement
  and repetition should fit the phrase and music, rather than always using the
  same intro or repeating throughout the song.
- **Musician:** a separate, original, human-sounding singing voice. It creates
  new melodic lyrics that respond to what the user said, develops the musical
  idea and adds light, context-appropriate humor. It is not the user's voice
  pitched into notes or a clone of the reference performer.

The reference to Mr. Wobbles describes the interaction: sample a sound, build
rhythm around it, then contribute a musician's own sung response. It does not
request his exact vocal identity or reproduction of his recordings.

## Voice and genre variety

The owner additionally requests multiple original singing voices: sometimes
female, sometimes male, with performances in reggae, hip-hop and other genres.
Fresh runs should develop different musical ideas, not repeat one song with a
different singer. Voice selection and genre are separate choices; neither voice
type is restricted to one genre.

Vary the contextual lyric reply, melodic contour, rhythmic delivery, source-loop
placement/count, instrument roles, musical structure and ending. Keep each
performance coherent and relevant to the input. A changed random seed, timbre
or backing alone does not establish creative variety. Do not force an unrelated
joke or constant voice/style changes just to create a difference.

For the same source phrase, audition at least three meaningfully different
performances covering male and female voices and both reggae and hip-hop.
Evaluate lyric relevance, natural vocal delivery and audible compositional
differences. "Always unique and creative" is the product aim, not a verified
guarantee. Reliable vocalist control and creative diversity remain NOT RUN.

## Owner's example

User input: **“I have a question.”**

Possible performance, adapting timing and melody to the actual source:

1. Play the user's phrase; optionally repeat or chop “a question” on the rhythm.
2. Bring in the groove and leave room for a separate singer to enter.
3. Musician sings: “You have a question, I wanna know / What is your question?
   What is your question? / Yeah, yeah…”
4. Develop the response with musical variation, occasional source callbacks,
   instrumental answers and an intentional ending.

These lyrics illustrate the owner's request, not a universal template. Different
input needs a relevant response. Transcription uncertainty must not silently
turn into fabricated statements attributed to the user. The original recording
remains a distinct audio source even if a generated singer repeats its words.

## Actual gap and next implementation

The current local research arranger only schedules existing source crops and
ducks a prerecorded backing. The recent adapter trial learned from six audio
clips with broad instrumental conditioning; it did not train semantic lyric
response, a vocalist or a vocal-performance director. Its comparison explicitly
used `instrumental=True`, `[Instrumental]` lyrics and “No vocals” prompts.

The pinned ACE-Step source includes lyric-conditioned song generation, making
it a candidate for an initial sung-response experiment. That capability does
not establish natural vocals, reliable word timing, a consistent singer across
generations, or alignment with the separate user sample. These require actual
audio evidence. A new training run is not automatically necessary to test
pretrained singing. No new cloud rental/upload is authorized by the completed
previous trial.

Implement the distinct source and musician roles, contextual lyric/structure
planning and vocal generation, then assemble and audition actual audio. Keep
speech intelligible, avoid singer/source collisions, vary repetition with the
rhythm and preserve the original source separately. A spoken TTS track or
pitch-shifted user clip does not satisfy the singing requirement. Do not label
new lyrics, a prompt or a valid plan as a completed vocal performance.

Acceptance requires listening to an actual example with both voices: recognizable
source, intelligible and relevant sung reply, natural rhythm/melody, appropriate
humor and clear musical development. Production promotion remains unapproved.
