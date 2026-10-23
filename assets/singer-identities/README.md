# Jamloom synthetic singer references

Four six-second speech excerpts synthesized with the pinned Apache-2.0
[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987)
stock voices. These are original generated reference assets, not customer or
favorite-track recordings. `manifest.json` binds each excerpt to its original
source file; original preparation and owner comparisons are retained in
`docs/vocal-identity.md` and `docs/song-follow-through.md`.

The excerpt is byte-identical to the reference WAV used by the approved
six-second conversion recipe. Pitch and timing come from the new song.
Owner approval covers the recorded comparisons, not every future output.

The separate converter is Seed-VC at commit
`51383efd921027683c89e5348211d93ff12ac2a8` (GPL-3.0). The worker retains its full
unmodified source and LICENSE under `build-style-training/seed-vc`. Model
revisions, hashes and declared licenses are in
`assets/manifests/vocal-identity-models.json`. The converter is a subprocess;
no model/source code is included in browser bundles or client downloads.
