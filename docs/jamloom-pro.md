## Pro v1 completion — 2026-10-22

**PASS: $49 one-time licensing, sandbox checkout/refunds, sampler replay and signed 1.0.0 candidate. PARTIAL: release and qualification.** Basic stays free. Mac activation and web offline access are bounded to 30 days and preserve local music. Public distribution/update, hosted validation, hour-long completion and Pro speaker listening are still being checked; MIDI/headphones are unavailable and unplug remains deferred. [Current report](pro-v1-release.md). Earlier preview notes below are historical.

# Jamloom Basic and Pro — 2026-10-22

**PASS, local implementation. PARTIAL, release readiness.** The owner designated the existing Live DJ companion Basic and free, and requested a professional deck shared between the website and desktop. No price, checkout, entitlement enforcement or public Pro release is activated.

## Editions

| Basic — free | Pro — local preview |
| --- | --- |
| Existing native two-source Live DJ, scratch/reverse/loops, FX and microphone sampler | Complete shared Performance Studio, local tracks and Aurowall catalogue integration |
| Existing Mac download and signed Sparkle updates preserved | Machined platter rims, rotating vinyl, raised rotary EQ/FX, pitch/channel faders and lit cue pads |
| Source capture remains native and consented | A/B decks plus existing generated C, instruments, sequencer, MIDI, cue routing, saved scenes/recovery, master/stem recording |
| Settings identifies the free edition and opens installed Pro | Eight custom sample pads, trim/pitch/loop/level, four consented local banks, native Settings and guarded updates |

The Pro visual treatment uses layered CSS and the existing accessible controls. It is not a separate 3D engine. Keyboard, MIDI and saved-set control identities remain intact. The website and desktop use the same sources and audio engine; new desktop assets are packaged locally rather than depending on a website iframe. Linked account/marketing pages open externally. Existing service-dependent features retain their service requirements.

## Audio, privacy and persistence

Electron 45 preserves Web MIDI and selectable audio outputs used by the browser studio. Renderer sandbox and context isolation are on; Node integration is off. A secure `jamloom://studio` origin serves the audited bundle and retains device-local IndexedDB through upgrades. Microphone, MIDI and output selection use explicit native permission prompts; startup is stopped. Native Basic system capture remains a separate app. No renderer receives Basic process-capture PCM.

The only desktop network proxy is GET to the fixed Jamloom Aurowall catalogue and track endpoints, with bounded responses, no credentials and no redirects. Storage credentials remain on the server. Settings can disable catalogue access. The real configured catalogue returned 72 tracks, and an EDM track loaded and produced signal through the desktop proxy with physical sound muted. This used the existing local backend in a verification process. **The production catalogue is still behind the product launch gate; ordinary Pro catalogue access needs the authorized matching website release.** Local files work independently.

Custom samples are limited to eight mono/stereo files of up to 8 MB and 30 seconds each. Trim boundaries receive short fades. Explicit consent is required for loading and separately for persistent bank storage. Revoking playback permission stops and clears memory; deleting saved banks is a separate action. Bank restore is paused and atomic; scenes do not silently include banks. Master WAV and instrument stems include sampler audio and the source inventory includes its hashes. **Control replay cannot reproduce sampler triggers yet and rejects such inventories explicitly.** Existing non-sampler replay remains supported.

## Desktop updates

Pro uses its own bundle identifier and Squirrel feed; Basic retains its existing identity and Sparkle feed. Automatic checks/downloads are off by default. Active decks, instruments, sampling and recording block update checks/install actions. Downloaded updates install on quit or explicit Install; quit warns to save work. The Pro feed is not published and a real Pro version-to-version upgrade is **NOT RUN**. No purchase or paid activation is required for this local owner preview.

## Verification

- **PASS:** 142 web/desktop unit checks; website production build, typecheck and 42 site tests.
- **PASS:** full existing DJ suite in Chromium and WebKit, including generated PCM, transport, effects, instruments, recovery and exports.
- **PASS:** Pro layout at 1920/1440/820/390/320 CSS pixels, expanded wide layout, keyboard knobs, reduced motion and zero scoped accessibility violations in Chromium/WebKit.
- **PASS:** actual Electron permissions, dual-track signal, spinning platters, rotary control, offline AudioWorklet, sampler bank persistence after real quit/relaunch, native WAV download and source fingerprints; physical output muted.
- **PASS:** Basic Swift tests (16 pass; two optional fixtures skipped), download page/launch gates and accessibility.
- **PASS:** real Aurowall catalogue/storage playback through the local backend; public access remains gated.
- **NOT RUN:** Pro public release, hosted Pro CI, paid entitlement/payment flows, published Pro update/upgrade, real MIDI controller/headphone routing and new human listening. Previously deferred hardware unplug remains deferred.

Reports and screenshots: [evidence](evidence/jamloom-pro/). Failed timing and transient notarization attempts remain in ignored local logs/renders; they are not represented as passes.

## Signed owner preview

**PASS:** Pro 0.1.0 for Apple silicon/macOS 14.2+, Developer ID signature, Apple notarization `5e4e0af0-1261-4b29-8992-82be42fd156b`, stapling and Gatekeeper. Installed at `/Applications/Jamloom Pro.app`. Local website preview: `http://127.0.0.1:4240/studio/dj.html` (owner-only loopback process). The actual packaged app passed the desktop suite. [Verification report](evidence/jamloom-pro/report.json), [console](evidence/jamloom-pro/console.png), [Settings](evidence/jamloom-pro/settings.png).

Installer ZIP: `dist/releases/pro-0.1.0-nRzTbG/Jamloom-Pro-0.1.0-macOS.zip`; [SHA-256](evidence/jamloom-pro/sha256.txt). This is a local owner preview, not a published product. The update feed remains unpublished.

## Run and maintain

From the repository root:

```sh
npm --prefix apps/desktop-pro ci
npm --prefix apps/desktop-pro run prepare:studio
npm --prefix apps/desktop-pro start
npm --prefix apps/desktop-pro test
npm --prefix apps/desktop-pro run test:app
npm --prefix apps/desktop-pro run package
```

For a signed build set `JAMLOOM_SIGN_IDENTITY` to the existing Developer ID Application identity. The package is written to a unique `dist/releases/pro-0.1.0-*` directory. Notarize the ZIP separately using the existing `jamloom-live-notary` Keychain profile, staple the app, validate it with Gatekeeper, and recreate the ZIP. Keeping signing and notarization separate allows a network retry without rebuilding or losing the signed candidate. Never publish the local preview automatically. The hosted macOS workflow now builds and checks Pro when an authorized push occurs.

The installed public Basic 0.4.0 remains unchanged. New Basic edition labels are source changes for its next release. Product release remains subject to the existing authorization and quality gates.
