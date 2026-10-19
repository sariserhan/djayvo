"""Verify captured audio and callback telemetry; retain failures as explicit gates."""
import array
import csv
import hashlib
import json
import pathlib
import sys
import wave

root = pathlib.Path(__file__).resolve().parents[3]
prefix = root / "renders/audio-callback-20261019/mac"
reference = root / "renders/live-deadline-20261019/mac-detailed"
evidence = root / "docs/evidence/audio-callback"
output = prefix.parent / "captured-instruments.wav"
assert not output.exists() and not (evidence / "measurements.json").exists()
assert sys.byteorder == "little"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


report = json.loads(prefix.with_suffix(".json").read_text())
pcm = prefix.with_suffix(".f32").read_bytes()
expected = reference.with_suffix(".f32").read_bytes()
assert pcm == expected * 6
assert report["captured_frames"] == 60 * 48000 and report["commands"] == 1920
assert report["max_pcm_difference"] == report["rms_pcm_difference"] == report["active_at_end"] == 0
with prefix.with_suffix(".tsv").open() as file:
    rows = list(csv.DictReader(file, delimiter="\t"))
assert len(rows) == report["callbacks"]
assert sum(int(row["events"]) for row in rows) == 1920
assert sum(int(row["cpp_allocations"]) for row in rows) == report["cpp_callback_allocations"]
assert sum(int(row["frames"]) for row in rows) >= 60 * 48000
cursor = 0
with reference.with_suffix(".tsv").open() as file:
    events = list(csv.DictReader(file, delimiter="\t"))
event_frames = [repeat * 480000 + int(event["frame"]) for repeat in range(6) for event in events]
next_event = 0
for row in rows:
    assert int(row["captured_frame"]) == cursor
    end = cursor + min(int(row["frames"]), 60 * 48000 - cursor)
    first_event = next_event
    while next_event < len(event_frames) and event_frames[next_event] < end:
        assert event_frames[next_event] >= cursor
        next_event += 1
    assert int(row["events"]) == next_event - first_event
    cursor = end
assert cursor == 60 * 48000
assert next_event == 1920
times = [(int(r["end_ticks"]) - int(r["begin_ticks"])) * report["host_tick_us"] for r in rows]
assert sum(t > 1e6 * int(r["frames"]) / 48000 for t, r in zip(times, rows)) == report["callback_deadline_misses"]
assert max(times) == report["callback_max_us"]
gaps = [i for i in range(1, len(rows)) if abs(float(rows[i]["sample_time"]) - float(rows[i-1]["sample_time"]) - int(rows[i-1]["frames"])) > .5]
assert len(gaps) == report["sample_time_gaps"]
times.sort()
samples = array.array("f", pcm[:len(expected)])
assert max(abs(x) for x in samples) == report["peak"]
wav_pcm = array.array("h", (round(x * 32767) for x in samples))
with output.open("xb") as file:
    with wave.open(file, "wb") as wav:
        wav.setparams((2, 2, 48000, 0, "NONE", "not compressed"))
        wav.writeframes(wav_pcm.tobytes())
with wave.open(str(output), "rb") as wav:
    assert wav.getnframes() == 480000 and wav.readframes(480000) == wav_pcm.tobytes()
protected = json.loads((root / "docs/evidence/active-vocals/final-build.json").read_text())
for name, sha in protected["preserved_sha256"].items():
    assert digest(root / name) == sha
assert digest(root / "build-mac/libdjayvo_core.a") == protected["build_and_evidence_sha256"]["build-mac/libdjayvo_core.a"]
result = {
    "signal": "PASS", "command_count": "PASS", "event_frame_agreement": "PASS", "captured_frames": 2880000,
    "cpp_allocation_gate": "PASS" if not report["cpp_callback_allocations"] else "FAIL",
    "sample_timestamp_gate": "PASS" if not report["missing_timestamps"] and not gaps else "FAIL",
    "observed_callback_deadline_gate": "PASS" if not report["callback_deadline_misses"] else "FAIL",
    "route_start_end_gate": "PASS" if report["default_device_unchanged"] else "FAIL",
    "device_transport_fourcc": int(report["device_transport"]).to_bytes(4, "big").decode("ascii", errors="replace"),
    "callback_frames": sorted({int(r["frames"]) for r in rows}),
    "callback_us": {f"p{q}": times[(len(times)-1)*q//100] for q in [50, 95, 99, 100]},
    "first_last_sample_time_span_seconds": (float(rows[-1]["sample_time"]) + int(rows[-1]["frames"]) - float(rows[0]["sample_time"])) / 48000,
    "max_pcm_difference": 0, "rms_pcm_difference": 0,
    "captured_pcm_sha256": digest(prefix.with_suffix(".f32")),
    "callback_trace_sha256": digest(prefix.with_suffix(".tsv")),
    "reference_event_sha256": digest(reference.with_suffix(".tsv")),
    "playable_wav": str(output.relative_to(root)), "wav_sha256": digest(output),
    "protected_sha256": protected["preserved_sha256"],
    "browser_audio_worklet": "NOT RUN", "speaker_loopback": "NOT RUN", "microphone_round_trip": "NOT RUN",
    "musical_quality": "NOT RUN", "venue_readiness": "PARTIAL",
}
(evidence / "measurements.json").write_text(json.dumps(result, indent=2) + "\n")
(evidence / "run.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(result, indent=2))
