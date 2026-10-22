# Additional singer styles — 2026-10-22

The local studio now offers **23 styles**, each available with either voice or
Surprise me. The owner's eleven additions are wired into the same lyric planner,
singer generator and integrated source arranger. No new model or dependency is
needed. “DJ” means a club arrangement with a build, breakdown and drop.

| Added style | Requested BPM | Musical direction |
|---|---:|---|
| EDM | 128 | Supersaw chords, rising build, anthemic hook and drop |
| DJ | 126 | Looping club groove, filtered build, short hook and drop |
| Lo-fi | 78 | Dusty drums, mellow jazz piano, soft bass and intimate singing |
| Jazz | 112 | Swing, upright bass, acoustic piano and saxophone answers |
| Blues | 90 | Shuffle, twelve-bar harmony, guitar bends and organ |
| Rap | 92 | Rhythmic verses, varied flow, internal rhymes and a sung hook |
| Chill | 76 | Spacious percussion, floating pads and relaxed melody |
| Indie | 106 | Jangly guitars, loose drums and conversational vocals |
| Techno | 132 | Driving kick, sequenced bass and sparse repeated vocal hook |
| Synthwave | 100 | Analog arpeggios, gated drums and nostalgic melody |
| Country | 110 | Acoustic guitar, pedal steel and storytelling vocals |

The existing twelve styles remain available. Every new style has a source-sample
rhythm, including triplet placement for jazz and blues. The planner receives the
musical description; rap uses a dedicated performance instruction instead of the
legato singing instruction. These are model directions, not guaranteed musical
outcomes. Existing saved plans and recordings remain intact. Default CLI drafting
still selects at most four candidates and a validated plan still allows at most
twelve cases; the catalogue size does not increase the generation budget.

- **PASS — technical:** Eight [tests](evidence/singer-styles/tests.log), covering
  all 46 voice/style plans, labels/arrangement coverage, bounded tempos/patterns,
  rap delivery, consent, pipeline flow and deterministic audio assembly.
- **PASS — local browser:** All 23 styles plus Surprise me selected in Chromium
  and WebKit, with 320/375 px layout checks and no page errors.
  [Results](evidence/singer-styles/browser.json), [replay](evidence/singer-styles/browser.mjs).
- **NOT RUN — new-style audio and listening:** This increment expands controls
  and prompts. No new songs were rendered or auditioned for these eleven styles.
  The [previous integrated render evidence](integrated-singer.md) remains separate.
- **NOT RUN — publication/production promotion:** No deployment, training,
  cloud upload or paid compute. Physical and formal quality gates remain open.

Open <http://127.0.0.1:4198/>; restart with
`.venv-singer/bin/python scripts/singer_studio.py` if needed.
