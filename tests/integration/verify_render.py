#!/usr/bin/env python3
"""End-to-end executable, score, WAV, seed and failure-path checks."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from inspect_wav import inspect


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--renderer", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    executable = args.renderer.resolve()
    gates = {}

    def run(name, *options, good=True):
        prefix = args.output / name
        result = subprocess.run([str(executable), "--output", str(prefix), *options],
                                capture_output=True, text=True, timeout=60)
        if (result.returncode == 0) != good:
            raise AssertionError(f"unexpected CLI exit: {result.stdout}\n{result.stderr}")
        return prefix

    first = run("m0a", "--block-size", "512")
    repeat = run("repeat", "--block-size", "257")
    changed = run("changed", "--seed", "4124")
    measured = inspect(first.with_suffix(".wav"))
    score = json.loads(first.with_suffix(".score.json").read_text())
    report = json.loads(first.with_suffix(".report.json").read_text())
    assert score["schema_version"] == "1.0-m0a"
    assert score["source_asset_id"] is None
    assert score["seed"] == 4123 and score["time_signature"] == [4, 4]
    assert score["sample_rate"] == 48000 and score["ticks_per_quarter"] == 960
    bar_ticks = 4 * score["ticks_per_quarter"] * score["time_signature"][0] // score["time_signature"][1]
    total_ticks = score["target_bars"] * bar_ticks
    # Independent integer formula, round half upward.
    den = score["ticks_per_quarter"] * score["tempo_milli_bpm"]
    music_frames = (total_ticks * 60000 * score["sample_rate"] + den // 2) // den
    tail_frames = (score["tail_ms"] * score["sample_rate"] + 500) // 1000
    assert measured["frames"] == music_frames + tail_frames == 556800
    assert report["music_frames"] == music_frames
    assert report["total_frames"] == measured["frames"]
    sections_end = 0
    for section in score["sections"]:
        assert section["start_bar"] == sections_end and section["bars"] > 0
        sections_end += section["bars"]
    assert sections_end == score["target_bars"]
    assert [t["instrument"] for t in score["tracks"]] == ["piano", "bass", "drums"]
    starts = []
    note_count = 0
    for track in score["tracks"]:
        assert track["events"]
        starts.append({n["start_tick"] for n in track["events"]})
        for note in track["events"]:
            assert 0 <= note["start_tick"] < total_ticks
            assert 0 < note["duration_ticks"] <= total_ticks - note["start_tick"]
            assert 1 <= note["velocity"] <= 127
            note_count += 1
    assert starts[0] != starts[1] and starts[1] != starts[2]
    assert report["events"] == 2 * note_count
    gates["score_contract_and_independent_tracks"] = "PASS"
    gates["independent_duration_and_pcm_decode"] = "PASS"
    assert measured["full_scale_samples"] == 0
    assert 0.02 < measured["peak_linear"] <= 10 ** (score["mix"]["master_target_peak_dbfs"] / 20)
    assert measured["last_100ms_peak"] == 0
    assert measured["first_nonzero_frame"] < 480
    assert abs(measured["dc_left"]) < 0.005 and abs(measured["dc_right"]) < 0.005
    assert -45 < measured["rms_dbfs_left"] < -6
    assert abs(measured["rms_dbfs_left"] - measured["rms_dbfs_right"]) < 4
    assert report["nonfinite_samples"] == 0 and report["technical_render"] == "PASS"
    assert abs(measured["peak_linear"] - report["peak_linear"]) < 0.00005
    gates["decoded_audio_headroom_balance_dc_and_tail"] = "PASS"
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    assert digest(first.with_suffix(".wav")) == digest(repeat.with_suffix(".wav"))
    assert digest(first.with_suffix(".score.json")) == digest(repeat.with_suffix(".score.json"))
    assert digest(first.with_suffix(".wav")) != digest(changed.with_suffix(".wav"))
    gates["same_seed_and_block_size_wav_sha256"] = "PASS"
    gates["different_seed_changes_output"] = "PASS"
    run("rate44100", "--sample-rate", "44100", "--block-size", "113")
    alternative = inspect((args.output / "rate44100").with_suffix(".wav"))
    assert alternative["sample_rate"] == 44100 and alternative["frames"] == 511560
    gates["44100hz_end_to_end"] = "PASS"
    for options in (("--block-size", "0"), ("--sample-rate", "0"), ("--seed", "-1"),
                    ("--block-size", "65537"), ("--seed", "4294967296"),
                    ("--seed", "12garbage"), ("--unknown", "1")):
        run("invalid", *options, good=False)
    missing = subprocess.run([str(executable), "--seed"], capture_output=True, timeout=5)
    assert missing.returncode != 0
    # A regular file used as a parent directory must fail rather than report success.
    blocker = args.output / "not_a_directory"
    blocker.write_text("fixture")
    failure = subprocess.run([str(executable), "--output", str(blocker / "render")],
                             capture_output=True, timeout=5)
    assert failure.returncode != 0
    gates["invalid_cli_and_unwritable_destination"] = "PASS"
    gates["human_listening"] = "NOT RUN"
    gates["macos_portability"] = "NOT RUN"
    evidence = {"project": "Jamloom", "milestone": "M0a", "gates": gates,
                "decoded_wav": measured, "engine_report": report,
                "notes_per_track": {t["instrument"]: len(t["events"]) for t in score["tracks"]}}
    (args.output / "validation.json").write_text(json.dumps(evidence, indent=2, allow_nan=False) + "\n")
    for gate, status in gates.items():
        print(f"{status}: {gate}")
    print(f"Evidence: {args.output / 'validation.json'}")


if __name__ == "__main__":
    main()
