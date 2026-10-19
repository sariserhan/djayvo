# MIDI instrument input

2026-10-18. Local MIDI input connects a keyboard or pads to the existing shared
C++/WASM instrument rack. This increment implements part of DJ06; physical
controller validation and the full professional studio remain open.

## Use

Open <http://localhost:3000/studio/dj.html>, choose **Enable instruments**, then
**Enable MIDI** and select one input. The browser may request device permission.
Play while the page is focused. **Disable MIDI** closes the selected port and
releases its notes. Disconnecting a controller releases its held/sustained notes;
reconnecting requires explicit input selection. Computer keys and touch work
without MIDI permission. Unsupported browsers show that fallback.

- All channels except channel 10 play the selected instrument, using incoming
  note velocity. Piano range is A0–C8; guitar retains E2–G5. Computer-keyboard
  octave and velocity controls do not transpose or override MIDI notes.
- Channel 10 uses the chosen acoustic/electronic kit: kick 36, snare 38, closed
  hat 42, open hat 46. Clap 39, rim 37, low tom 41 and shaker 70 always use the
  original percussion patch. Other notes are ignored.
- CC64 sustains only its MIDI channel. The screen Sustain button controls
  computer/touch notes independently. CC123 releases held notes subject to the
  pedal; CC121 resets that channel's pedal and releases deferred notes. CC120
  releases that channel's held/deferred notes through the engine release envelope.
  It is not a hard output mute; effects tails remain as documented for the rack.
- Switching input releases MIDI voices without stopping computer/touch notes or
  decks. Patch changes, All notes off, window blur, hidden page and audio interruption
  retain existing instrument panic behavior. Events arriving while unfocused or
  hidden are ignored. Page exit disables MIDI; it does not automatically re-enable.

Only a user click requests MIDI access, without SysEx or software synth access.
One input is opened; no output is opened, no MIDI is transmitted, and no device
identifiers/names or performances are persisted/uploaded. Permission cancellation,
late permission grants, failed opens and late port opens cannot silently reactivate
a disabled input. The app's existing public-asset builder includes this module in
the bounded offline cache. Browser permission support is still required offline.

The [Web MIDI specification](https://www.w3.org/TR/webmidi/) defines the secure-context
request and input-port lifecycle. Context7 was unavailable in this session, so the
primary specification was consulted. There is no new dependency or native-core
change. No pitch bend, aftertouch, program changes, MIDI clock, transport mapping,
custom MIDI learn or MIDI recording/export is implemented. Those controls are ignored.
Input messages go to the existing next-render-block worklet path, not a new
sample-frame scheduler; USB-to-speaker latency is unmeasured.

## Verification

The flow under test is DJ workspace → prepare instruments → enable/select MIDI
→ notes/pedal/drums → switch/disconnect/disable → cached playback after server closure.
The Browser plugin's required execution tool was unavailable, so the existing
repository Playwright workflow was used. Synthetic ports exercise the real
instrument worklet and measured PCM; they do not certify physical hardware or
Web MIDI support in a browser that lacks it. Physical output is muted downstream
of the test meter.

Results and limitations are recorded in [the receipt](evidence/midi-input/summary.json).
Commands:

```sh
sh scripts/web_build.sh
npm --prefix apps/web test
node apps/web/tests/dj.mjs
DJAYVO_BROWSER=webkit node apps/web/tests/dj.mjs
node apps/site/scripts/prepare-studio.mjs
# Restart the local Next server when introducing a new public filename.
node apps/web/tests/midi-site.mjs
python3 scripts/verify_web_bundle.py
```

Physical MIDI keyboard/pads, controller-specific behavior, device round-trip
latency, actual Linux browser and venue endurance are **NOT RUN**. Automated
output energy and command checks do not establish musical quality or reference
similarity. Existing protected recordings and the master specification are unchanged.

| Gate | Status | Evidence |
| --- | --- | --- |
| Build and bounded public/offline bundle | PASS | Existing WASM files are byte-identical to the preceding validated build; new module cached |
| Unit checks | PASS | 23/23, including malformed/unsupported MIDI messages, both note-off forms and channel boundaries |
| DJ browser flow and regressions | PASS | 33 checks each in Chromium 149 and WebKit 26.5; synthetic ports, actual worklet PCM |
| Prepared A/C regressions | PASS | 17 checks per browser, including generation, real audio, cancellation and offline reload |
| Permission and port lifecycle | PASS | Denial/retry, late grant/open cancellation, input switching, unplug/reconnect, blur and disable |
| Offline MIDI adapter | PASS | Real server closed before cached reload; synthetic input produces and releases real audio |
| Integrated site / visible UI | PASS | `/studio/` on localhost:3000, 1440×1000 and 390×844; page identity/content, no overflow or app errors; screenshots inspected |
| Physical controller and permission prompt | NOT RUN | No physical MIDI keyboard/pad claim; browser tests replace the API with synthetic ports |
| Browser-native MIDI support | PARTIAL | Chromium exposes the API; tested WebKit does not. WebKit synthetic tests establish app behavior, not native support |
| Native Mac/Linux execution this increment | NOT RUN | Shared C++ unchanged; previous exact event/PCM evidence retained in prepared-session report |
| Live MIDI event-frame agreement / waveform comparison | NOT RUN | Dispatch is immediate to the next available render block; no physical timing or waveform-equality claim |
| Hardware latency, Linux browser and venue endurance | NOT RUN | Remain separate physical/platform gates |
| Musical quality / full specification | PARTIAL | Technical implementation progresses; new formal listening NOT RUN |

The first MIDI audio assertion incorrectly relied on a display meter that can
lag by 100 ms. The test now waits for fresh audio-buffer energy before asserting
output. Both final browser runs pass. WebKit's screenshot stylesheet warnings
are captured separately; application console errors still fail the suite and
CSP was not relaxed. No native test or past quality gate has been relabeled as
newly executed.
