# Pro performance console — 2026-10-23

The owner accepted Academy and requested a substantially stronger Pro deck without reducing Basic. Academy acceptance is recorded in [the owner receipt](evidence/academy-release/owner-product-acceptance.json); it does not assert new measured learning, accessibility or physical-device results.

## Delivered

Basic retains its existing two decks, personal-track loading, jog seeking, speed, cue, track repeat, EQ, tone, echo and mixer. Its deck layout and Basic/Pro access policy remain intact. At the owner’s request, the playback-permission checkbox and its gate are removed from Basic, Pro and Academy. Loading and playback need no attestation prompt; playback still begins only on an explicit Play action. Separate microphone, recording and device-storage controls remain in place. Academy retains four hot cues and its existing lesson console.

Pro and the free sample-only Pro demo now have a distinct modular console: separate deck housings, illuminated digital jog displays, stacked real track waveforms, colored performance pads and pre-fader channel meters. The shared Mac studio uses the same implementation.

| Pro addition | Actual behavior |
| --- | --- |
| Two full-track waveforms | Peaks from decoded audio, cue/loop markers, playhead and remaining time; click or keyboard seek |
| Eight hot cues per deck | Set, recall and Shift-clear; optional snapping of new cues to the manual beat grid |
| Four pad modes | Hot cue, beat loop, beat roll and forward/backward beat jump; eight sizes from ⅛ to 16 beats |
| Manual beat grids | Set the first beat, nudge by 10 ms; looping and grid alignment use the declared origin |
| Loop editing | Halve/double the loop and move it one beat; reject regions outside the track |
| Hold reverse | Real backward audio through the existing DSP; release normally or return to the uninterrupted timeline with Slip enabled |
| Tempo-linked echo | Quarter-, half- or one-beat spacing, adjusted for playback speed within the existing effect range |
| Set recovery | Saves eight cues, grid origin, quantizing and echo division; still reads legacy four-cue scenes and preserves hidden cues if an eight-cue set is reopened in a four-pad lesson |

Existing Pro scratching, key lock, advanced effects, sampler, instruments, recording, saved scenes, partner music and MIDI controls remain. New transport/effect operations use the existing audio graph and transport automation, rather than a separate playback engine. Track-repeat state follows buffered transport changes so a beat loop cannot leave a stale whole-track repeat enabled.

## Verification

Automated playback was muted. Paid UI state was supplied by a controlled access-response fixture; there was no purchase, production database write or new paid service.

| Gate | Result | Evidence |
| --- | --- | --- |
| Web unit regressions | PASS | 151 tests, including fractional loops, grid snapping, loop resizing, waveform bins, recovery validation, native playback and replay |
| Chromium and WebKit Pro behavior | PASS | Eight cues, quantized seek, grid editing, loop resize, fractional rolls, changing roll sizes, forward/backward jumps, reverse/slip, tempo echo and actual IndexedDB save/restore |
| Playback prompt removal | PASS | No checkbox in browser or Mac source app; personal, sample and Academy playback work directly |
| Basic/demo/access regressions | PASS | Real included/local-track playback; sample pads/phrase; paid/revoked UI fixtures; Chromium offline Basic/demo |
| Responsive and accessibility | PASS | 390/900/1600/1920 px, fullscreen, automated WCAG checks and desktop/mobile screenshot inspection |
| Academy regression | PASS | Both engines load the free lesson, retain four cues, play a course track and stop |
| Mac app | PASS | Local Electron app, two tracks, new Pro surface/eight cues/waveform, sandbox/permission boundaries, sampler, WAV/source replay, relaunch, settings and partner fixture |
| TypeScript and public studio preparation | PASS | Site typecheck, secret/bundle audit and audited offline/studio build |
| Human listening and physical MIDI/headphones | NOT RUN | No new audible or physical-device qualification |
| Website and updated signed Mac distribution | NOT RUN | No deployment, installer replacement, notarization or release publication |

Two desktop replay runs (one concurrent, one isolated) detected two clock-timestamp discontinuities and correctly refused exact reconstruction. The final isolated Mac run passed with zero discontinuities. Both failures are retained; their cause is unconfirmed and timestamp anomalies alone do not prove audible sample loss. This intermittent diagnostic is already documented in the v1 release report; no recorder-engine fix or zero-glitch certification is claimed here.

Machine-readable receipts and screenshots are under [evidence/pro-deck-expansion](evidence/pro-deck-expansion). Reproduce from the repository root:

```sh
node apps/site/scripts/prepare-studio.mjs
node --test apps/web/tests/*.test.js
node apps/site/tests/pro-deck-browser.mjs
node apps/site/tests/studio-access-browser.mjs
npm --prefix apps/desktop-pro test
npm --prefix apps/desktop-pro run test:app
npm --prefix apps/site run typecheck
```

The in-app browser runtime was unavailable; the owner's previously authorized local Playwright fallback was used. Desktop tests use an isolated local profile and synthetic/sample audio with speaker output muted.

## Deliberate limits

The beat grid and BPM are manual, not automatic beat/downbeat detection. Enable waveform/beat controls while the deck is paused; the existing advanced decode limit is five minutes and 128 MiB per track, while ordinary playback still accepts tracks up to twenty minutes. Echo divisions outside 100–800 ms revert to manual timing with a message. Quantizing snaps stored cue positions and waveform seeks; it does not schedule every button press onto a future beat. The waveform lanes show whole tracks, not a phase-locked scrolling beat view.

No four-deck mixer, automatic stem separation or expanded physical-controller mapping is claimed. The published Mac download remains its previous signed release until a separately authorized release; the new console is available in localhost and the local shared Mac app.
