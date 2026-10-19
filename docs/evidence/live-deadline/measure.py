"""Compare fresh native/WASM evidence and export the ten-second stress program."""
import array
import hashlib
import json
import pathlib
import sys
import wave

root = pathlib.Path(__file__).resolve().parents[3]
mac = root / "renders/live-deadline-20261019/mac-detailed"
linux = root / "renders/arrangement-linux/live-deadline-20261019/linux"
evidence = root / "docs/evidence/live-deadline"
output = root / "renders/live-deadline-20261019/live-stress.wav"
assert not output.exists() and not (evidence / "measurements.json").exists()
assert sys.byteorder == "little"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


protected = json.loads((root / "docs/evidence/active-vocals/final-build.json").read_text())
for name, expected in protected["preserved_sha256"].items():
    assert digest(root / name) == expected, name
assert digest(root / "build-mac/libdjayvo_core.a") == protected["build_and_evidence_sha256"]["build-mac/libdjayvo_core.a"]
assert mac.with_suffix(".f32").read_bytes() == linux.with_suffix(".f32").read_bytes()
assert mac.with_suffix(".tsv").read_bytes() == linux.with_suffix(".tsv").read_bytes()
pcm = array.array("f", mac.with_suffix(".f32").read_bytes())
assert len(pcm) == 48000 * 10 * 2
wasm = json.loads((evidence / "wasm.json").read_text())
assert wasm["pcm_sha256"] == digest(mac.with_suffix(".f32"))
assert wasm["event_trace_sha256"] == digest(mac.with_suffix(".tsv"))
reports = {"mac": json.loads(mac.with_suffix(".json").read_text()),
           "linux": json.loads(linux.with_suffix(".json").read_text()), "wasm": wasm}
for name, report in reports.items():
    assert report["virtual_seconds"] == 600 and report["repeats"] == 60
    assert report["blocks"] == 225000 and report["max_active"] == 32
    assert report["events_per_repeat"] == 320 and report["quiet_blocks"] == 11100
    assert report["peak"] == max(abs(x) for x in pcm)
    if name != "wasm":
        assert report["callback_allocations"] == 0
samples = array.array("h", (round(x * 32767) for x in pcm))
with output.open("xb") as file:
    with wave.open(file, "wb") as wav:
        wav.setparams((2, 2, 48000, 0, "NONE", "not compressed"))
        wav.writeframes(samples.tobytes())
with wave.open(str(output), "rb") as wav:
    assert wav.getnframes() == 480000 and wav.readframes(480000) == samples.tobytes()
receipt = {"signal_checks": "PASS", "event_frame_agreement": "PASS",
           "native_wasm_max_difference": 0, "native_wasm_rms_difference": 0,
           "native_pcm_sha256": digest(mac.with_suffix(".f32")),
           "event_trace_sha256": digest(mac.with_suffix(".tsv")),
           "playable_wav": str(output.relative_to(root)), "wav_sha256": digest(output),
           "protected_sha256": protected["preserved_sha256"],
           "initial_mac_deadline_misses": json.loads((evidence / "mac-initial.json").read_text())["blocks_over_deadline"],
           "detailed_deadline_misses": {name: report["blocks_over_deadline"] for name, report in reports.items()},
           "hardware_latency": "NOT RUN", "musical_quality": "NOT RUN"}
(evidence / "measurements.json").write_text(json.dumps(receipt, indent=2) + "\n")
for name, report in reports.items():
    if name != "wasm":
        (evidence / f"{name}-detailed.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(receipt, indent=2))
