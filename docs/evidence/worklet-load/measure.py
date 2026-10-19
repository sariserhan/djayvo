"""Independently check retained worklet PCM/telemetry and export audition WAVs."""
import array
import collections
import hashlib
import json
import math
import pathlib
import sys
import wave

root = pathlib.Path(__file__).resolve().parents[3]
reference = root / "renders/live-deadline-20261019/mac-detailed"
destination = pathlib.Path(sys.argv[1])
assert sys.byteorder == "little" and not destination.exists()
expected = reference.with_suffix(".f32").read_bytes()
trace = [list(map(int, line.split())) for line in reference.with_suffix(".tsv").read_text().splitlines()[1:]]
command_frames = [repeat * 480000 + row[0] for repeat in range(6) for row in trace]
assert len(expected) == 480000 * 8 and len(command_frames) == 1920


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


runs = []
for argument in sys.argv[2:]:
    folder = pathlib.Path(argument).resolve()
    report = json.loads((folder / "result.json").read_text())
    pcm = (folder / "capture.f32").read_bytes()
    assert len(pcm) == len(expected) * 6
    assert report["hashes"]["reference_pcm"] == digest(reference.with_suffix(".f32"))
    assert report["hashes"]["event_trace"] == digest(reference.with_suffix(".tsv"))
    exact = pcm == expected * 6
    samples = array.array("f", pcm[:len(expected)])
    assert all(math.isfinite(value) for value in array.array("f", pcm))
    if exact:
        maximum = rms = 0
    else:
        differences = [a - b for a, b in zip(array.array("f", pcm), array.array("f", expected * 6))]
        maximum = max(map(abs, differences))
        rms = math.sqrt(sum(value * value for value in differences) / len(differences))
    times = array.array("d", (folder / "timestamps.f64").read_bytes())
    durations = array.array("d", (folder / "durations.f64").read_bytes())
    assert len(times) == len(durations) == 22500
    assert all(math.isfinite(value) for value in times) and all(math.isfinite(value) for value in durations)
    gaps = sum(b - a != 128 for a, b in zip(times, times[1:]))
    assert gaps == report["capture"]["timestampGaps"]
    commands = folder / "commands.u32"
    commands_exact = list(array.array("I", commands.read_bytes())) == command_frames if commands.exists() else None
    wav_path = folder / "captured-instruments.wav"
    wav_pcm = array.array("h", (round(value * 32767) for value in samples)).tobytes()
    with wav_path.open("xb") as output:
        with wave.open(output, "wb") as wav:
            wav.setparams((2, 2, 48000, 0, "NONE", "not compressed"))
            wav.writeframes(wav_pcm)
    with wave.open(str(wav_path), "rb") as wav:
        assert wav.getnframes() == 480000 and wav.readframes(480000) == wav_pcm
    stats = report.get("playbackStats")
    run = {
        "artifacts": str(folder.relative_to(root)), "browser": report["browser"], "version": report["version"],
        "runner": report.get("runner"), "wall_seconds": report["wallSeconds"], "frames": 2880000, "blocks": 22500,
        "signal": "PASS" if exact else "FAIL", "max_pcm_difference": maximum, "rms_pcm_difference": rms,
        "peak": max(map(abs, samples)), "command_count": report["engine"]["commands"],
        "command_frames": "NOT RUN" if commands_exact is None else "PASS" if commands_exact else "FAIL",
        "independent_counter": "PASS" if report["capture"]["counterGaps"] == 0 and report["capture"]["lastCounter"] == 2880000 else "FAIL",
        "timestamp_gaps": gaps, "timestamp_continuity": "PASS" if gaps == 0 else "PARTIAL",
        "browser_reported_underruns": "NOT RUN" if stats is None else "PASS" if stats["underrunEvents"] == stats["underrunDuration"] == 0 else "FAIL",
        "playback_stats": stats, "reported_base_latency_seconds": report["baseLatency"],
        "reported_output_latency_seconds": report["outputLatency"], "physical_latency": "NOT RUN",
        "render_clock": report["engine"]["clock"], "coarse_duration_ms_counts": dict(sorted(collections.Counter(durations).items())),
        "coarse_wall_max_ms": max(durations), "coarse_readings_over_quantum": sum(value > 128000 / 48000 for value in durations),
        "coarse_wall_threshold_screen": "FAIL" if any(value > 128000 / 48000 for value in durations) else "PASS",
        "largest_coarse_readings": [{"frame": i * 128, "program_frame": i * 128 % 480000,
                                     "milliseconds": durations[i], "commands": command_frames.count(i * 128)}
                                    for i in sorted(range(len(durations)), key=lambda i: durations[i], reverse=True)[:5]],
        "strict_128_frame_deadline": "PARTIAL", "worklet_allocations": "NOT RUN",
        "playable_wav": str(wav_path.relative_to(root)), "wav_sha256": digest(wav_path),
        "file_sha256": {name: digest(folder / name) for name in ["result.json", "capture.f32", "timestamps.f64", "durations.f64"] + (["commands.u32"] if commands.exists() else [])},
    }
    assert report["engine"]["commands"] == 1920 and report["engine"]["active"] == 0
    assert report["sampleRate"] == 48000 and not report["errors"] and not report["externalRequests"]
    runs.append(run)

protected = json.loads((root / "docs/evidence/active-vocals/final-build.json").read_text())["preserved_sha256"]
for name, sha in protected.items():
    assert digest(root / name) == sha
assert runs
result = {"runs": runs, "protected_sha256": protected,
          "listening": "NOT RUN", "microphone_round_trip": "NOT RUN", "venue_readiness": "PARTIAL",
          "clock_limit": "Date.now is a coarse non-monotonic wall clock. Counts are diagnostic, not a precise CPU or deadline certificate."}
with destination.open("x") as output:
    output.write(json.dumps(result, indent=2) + "\n")
assert all(run["signal"] == run["independent_counter"] == "PASS" and run["command_frames"] != "FAIL" for run in runs)
print(f"PASS: {len(runs)} retained worklet captures; protected inputs unchanged; listening NOT RUN")
