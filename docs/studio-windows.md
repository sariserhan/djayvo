# Detachable Performance Studio tools

2026-10-23. Local implementation and software qualification; no publication.

Open `/studio/dj.html`, choose **Arrange your workspace**, then detach any of:
Full deck (both decks, mixer and Pro waveforms), Keys & instruments, Rhythm pads,
Sampler, Voice response and Headphones. There is also a detach button beside each
tool. Several windows can remain open together. Drag their operating-system title
bars and resize them normally. Each has Show studio and Return to studio buttons;
closing it also returns its controls. Return all tools restores the complete workspace.

The original controls and handlers move into same-origin windows. There is one
session and one audio engine. Deck media elements remain in the main document to
avoid interrupting their decoders. Cross-window lookup keeps transport, instruments,
effects, recording, recovery, MIDI bindings and Academy highlights connected.
Waveforms, meters and platters continue drawing in a visible window. Held notes and
scratch/reverse gestures release on focus loss. Moving between studio windows keeps
instrument recording and the sequencer running; leaving all studio windows retains
the interruption rules. Microphone recording still requires its existing permission. Hiding its controls,
including returning them into a hidden studio tab, cancels capture and pending
permission requests; another visible tool does not keep hidden capture alive.

Basic and Pro demo restrictions apply inside every window, including captured events
and dynamic disabled states. Layout controls themselves are available in Basic.
The native Mac preview permits only the fixed local detached-tool page; arbitrary
new windows, external navigation, webviews and Node access remain blocked. It keeps
its existing sandbox, license and microphone boundaries.

## Verification

| Gate | Result |
| --- | --- |
| Web unit tests | PASS, 152 tests; includes empty URL/hash lookup regression and updated DOM fixtures |
| Desktop policy/license tests | PASS, 3 tests, including narrow child-window URL policy |
| Chromium and WebKit on localhost:4235 | PASS, three simultaneous windows; native/buffered muted playback, mixer, keys, pads, eight-cue controls, instrument WAV capture/download and sequencer across windows |
| Window lifecycle | PASS, both nested detach/return orders, individual close, return all, parent reload cleanup and popup-block recovery |
| Access | PASS, Basic restricted controls remain disabled; synthetic clicks cannot bypass the gate after detachment |
| Rendered UI | PASS, meaningful page identity/content, no page exceptions, detached deck accessibility scan and screenshots, mobile 390px without page overflow |
| Native Mac preview | PASS, three concurrent windows, actual window focus and held-note release, changed native window bounds, shared mixer/playback, independent close/return, sandbox and blocked arbitrary child window |
| Microphone visibility | PASS, simulated permission requests cancel and release their tracks when the voice window is hidden or returned into a hidden owner tab |
| Existing Pro and access regressions | PASS, Chromium/WebKit Pro controls, recovery, fullscreen, Academy smoke, Basic/demo/paid fixtures and Chromium offline access |
| TypeScript and public asset/secret audit | PASS |
| Fresh installer, website deployment, physical MIDI/headphones and listening | NOT RUN; not needed to claim local window implementation |

Browser evidence: `/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-windows-DU0hIU/`
contains the report and Chromium/WebKit deck, keys and mobile screenshots. Pro regression receipt: `/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-pro-deck-ElnNqw/`;
access/offline regression receipt: `/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-studio-access-xScL9r/`.
Native receipt and screenshot: `/var/folders/fq/152jbfw16276cgngg15zvh780000gn/T/jamloom-window-app-LvNWmp/`.

An intermediate WebKit run timed out at initial native Play, before detachment;
the subsequent complete run passed. This is not a new zero-glitch audio claim.
Native testing also saw the existing production Aurowall catalogue return 503;
local track playback and window checks pass, and the catalogue availability message
remains explicit. No hosted-service fix or website deployment is claimed here.

Reproduce with Node 22:

```sh
npm --prefix apps/site run studio:prepare
node --test apps/web/tests/*.test.js
npm --prefix apps/desktop-pro test
node apps/site/tests/studio-windows-browser.mjs
node apps/desktop-pro/tests/windows.mjs
node apps/site/tests/pro-deck-browser.mjs
node apps/site/tests/studio-access-browser.mjs
npm --prefix apps/site run typecheck
npm --prefix apps/site run audit:bundle
```

All automated audio output is muted. The native test disables Playwright's focus
emulation while checking real BrowserWindow focus, so it exercises actual blur
rather than pretending every window is focused.

## Limits

Keep the main studio open: closing or reloading it ends the session and closes its
tool windows. Reloading a tool returns the controls to the main studio. Browsers can
block popups or choose tabs instead; the app requests desktop windows and explains
how to retry a blocked request. Mobile browsers do not provide the same desktop
window arrangement. Window positions are not saved across sessions. No new audio
engine, dependency, database migration or paid service is introduced.

Platform references: [browser popup behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/open),
[DOM adoption](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode),
and [Electron child-window policy](https://www.electronjs.org/docs/latest/api/web-contents#contentssetwindowopenhandlerhandler).
Context7 tools were unavailable; these primary references were used instead.
The Browser skill's required runtime tool was unavailable; local Playwright fallback
was already authorized by the owner.
