#!/usr/bin/env python3
"""Exercise source-driven styles, input decoding, preserved hook, stems and bounds."""
import argparse
import array
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from inspect_wav import inspect
from make_fixture import make_signal


def pcm(path):
    with wave.open(str(path), "rb") as f:
        result = array.array("h", f.readframes(f.getnframes()))
        if sys.byteorder != "little":
            result.byteswap()
        return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--renderer", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    fixture = args.output / "synthetic.wav"
    make_signal(fixture)
    executable = str(args.renderer.resolve())
    gates = {}

    def run(prefix, source=fixture, options=(), success=True, permission="--synthetic-fixture"):
        command = [executable, "--input", str(source), "--output", str(args.output / prefix),
                   "--sample-rate", "16000"]
        if permission:
            command += [permission]
        result = subprocess.run([*command, *options], capture_output=True, text=True, timeout=120)
        assert (result.returncode == 0) == success, result.stdout + result.stderr

    run("three", options=("--style", "all", "--stems", "--block-size", "512"))
    run("repeat", options=("--style", "all", "--block-size", "113"))
    measurements, plans = {}, {}
    for style in ("hiphop", "reggae", "experimental"):
        prefix = args.output / f"three.{style}"
        audio_path = Path(str(prefix) + ".wav")
        score = json.loads(Path(str(prefix) + ".score.json").read_text())
        plans[style] = score
        measured = inspect(audio_path)
        measurements[style] = measured
        assert 20 <= measured["duration_seconds"] <= 40
        assert measured["full_scale_samples"] == 0 and measured["peak_dbfs"] <= -1
        assert measured["last_100ms_peak"] == 0
        assert score["schema_version"] == "1.0-remix" and score["strategy"] == style
        assert score["source"]["sha256"] == hashlib.sha256(fixture.read_bytes()).hexdigest()
        assert score["source"]["kind"] == "synthetic" and score["source"]["consent_confirmed"] is False
        clips = score["voice_clips"]
        for clip in clips:
            assert 0 <= clip["start_frame"] < clip["end_frame"] <= score["source"]["processed_frames"]
        clean = [e for e in score["voice_events"] if e["clean"]]
        assert clean and clean[0]["start_tick"] == 0 and clean[0]["rate"] == 1 and not clean[0]["reverse"]
        assert len(score["tracks"]) == 3 and all(t["events"] for t in score["tracks"])
        denominator = score["tempo_milli_bpm"] * 960
        music_frames = (score["target_bars"] * 3840 * 16000 * 60000 + denominator // 2) // denominator
        assert measured["frames"] == music_frames + score["tail_ms"] * 16
        other = args.output / f"repeat.{style}.wav"
        assert hashlib.sha256(audio_path.read_bytes()).digest() == hashlib.sha256(other.read_bytes()).digest()
        for stem in ("piano", "bass", "drums", "vocals"):
            path = Path(str(prefix) + f".{stem}.wav")
            with wave.open(str(path), "rb") as f:
                assert f.getnframes() == measured["frames"] and f.getframerate() == 16000
            assert any(pcm(path)), f"silent {stem} stem"
    gates["three_complete_decoded_20_to_40_second_remixes"] = "PASS"
    gates["same_source_sha256_and_bounded_sample_clips"] = "PASS"
    gates["stereo_instrument_and_vocal_stems"] = "PASS"
    gates["same_seed_different_block_wav_determinism"] = "PASS"
    gates["all_styles_clipping_and_final_tail"] = "PASS"
    source_pcm = pcm(fixture)
    vocal = pcm(args.output / "three.hiphop.vocals.wav")
    gain = 10 ** (-3 / 20) * plans["hiphop"]["analysis"]["normalization_gain"] * 2 ** -0.5
    errors = [abs(vocal[2 * i] / 32768 - source_pcm[i] / 32768 * gain)
              for i in range(100, len(source_pcm) - 100)]
    assert max(errors) < 2 / 32768
    gates["clean_hook_matches_original_waveform_with_gain_and_edge_fades"] = "PASS"
    assert len({s["tempo_milli_bpm"] for s in plans.values()}) == 3
    signatures = {tuple((e["start_tick"], e["note"]) for e in p["tracks"][2]["events"])
                  for p in plans.values()}
    assert len(signatures) == 3
    gates["independently_distinct_rhythm_and_arrangement_strategies"] = "PASS"
    shifted = args.output / "shifted.wav"
    make_signal(shifted, shifted=True)
    run("shifted", shifted, ("--style", "hiphop"))
    other = json.loads((args.output / "shifted.hiphop.score.json").read_text())
    assert other["analysis"]["onsets"] != plans["hiphop"]["analysis"]["onsets"]
    assert other["voice_events"] != plans["hiphop"]["voice_events"]
    assert other["tracks"][0]["events"] != plans["hiphop"]["tracks"][0]["events"]
    gates["changed_input_rhythm_changes_chops_and_instrument_response"] = "PASS"
    run("control", options=("--style", "baseline"))
    run("shifted-control", shifted, ("--style", "baseline"))
    control = json.loads((args.output / "control.baseline.score.json").read_text())
    shifted_control = json.loads((args.output / "shifted-control.baseline.score.json").read_text())
    assert control["tracks"] == shifted_control["tracks"]
    assert control["strategy"] == "baseline" and all(e["clean"] for e in control["voice_events"])
    gates["input_independent_repeated_loop_comparison_control"] = "PASS"

    def container(payload, codec, channels, bits, extra=b""):
        block = channels * bits // 8
        fmt = struct.pack("<HHIIHH", codec, channels, 16000, 16000 * block, block, bits)
        body = b"WAVE" + b"fmt " + struct.pack("<I", 16) + fmt + extra + b"data" + struct.pack("<I", len(payload)) + payload
        return b"RIFF" + struct.pack("<I", len(body)) + body

    for bits, codec, channels in ((24, 1, 2), (32, 1, 1), (32, 3, 2)):
        payload = bytearray()
        for x in source_pcm:
            for channel in range(channels):
                value = x / 32768 * (1 if channel == 0 else 0.8)
                if codec == 3:
                    payload.extend(struct.pack("<f", value))
                else:
                    payload.extend(round(value * (2 ** (bits - 1) - 1)).to_bytes(bits // 8, "little", signed=True))
        path = args.output / f"format-{codec}-{bits}.wav"
        path.write_bytes(container(payload, codec, channels, bits, b"JUNK\x01\x00\x00\x00x\x00"))
        run(f"format-{codec}-{bits}", path, ("--style", "hiphop", "--sample-rate", "8000"))
    gates["pcm24_pcm32_float32_stereo_and_odd_metadata_chunk"] = "PASS"
    invalids = {
        "truncated": fixture.read_bytes()[:-1],
        "silence": container(bytes(16000 * 3 * 2), 1, 1, 16),
        "nan": container(struct.pack("<f", float("nan")) * 48000, 3, 1, 32),
        "unsupported": container(bytes(16000 * 3 * 2), 7, 1, 16),
        "short": container(bytes(1000 * 2), 1, 1, 16),
        "chunk-overflow": fixture.read_bytes()[:40] + b"\xff\xff\xff\xff" + fixture.read_bytes()[44:],
    }
    for name, payload in invalids.items():
        path = args.output / f"bad-{name}.wav"
        path.write_bytes(payload)
        run("rejected", path, success=False)
    run("no-consent", success=False, permission=None)
    run("style", options=("--style", "unknown"), success=False)
    run("block", options=("--block-size", "0"), success=False)
    gates["silence_corruption_nan_format_duration_and_permission_rejections"] = "PASS"
    # Protect both a direct source path and a hard link used as a stem output.
    target = args.output / "protect.hiphop.vocals.wav"
    target.write_bytes(fixture.read_bytes())
    original_hash = hashlib.sha256(target.read_bytes()).hexdigest()
    run("protect", target, ("--style", "hiphop", "--stems"), success=False)
    assert hashlib.sha256(target.read_bytes()).hexdigest() == original_hash
    link = args.output / "hardlink.hiphop.wav"
    if link.exists():
        link.unlink()
    os.link(fixture, link)
    run("hardlink", options=("--style", "hiphop"), success=False)
    gates["source_not_overwritten_including_stems_and_hardlinks"] = "PASS"
    gates["human_recording_and_recognizability"] = "NOT RUN"
    gates["human_musical_quality_and_audible_style_difference"] = "NOT RUN"
    gates["apple_m5_portability"] = "NOT RUN"
    result = {"project": "Djayvo", "milestones": ["M0b", "M0c"], "fixture": "original procedural signal",
              "gates": gates, "measurements": measurements, "maximum_clean_hook_pcm_error": max(errors)}
    (args.output / "validation.json").write_text(json.dumps(result, indent=2) + "\n")
    for name, status in gates.items():
        print(f"{status}: {name}")


if __name__ == "__main__":
    main()
