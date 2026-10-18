#!/usr/bin/env python3
"""Compare actual plans/event frames and PCM; never infer Mac execution from Linux."""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import sys
import wave


def load_audio(path):
    with wave.open(str(path), "rb") as f:
        if f.getsampwidth() != 2 or f.getnchannels() != 2 or f.getcomptype() != "NONE":
            raise ValueError("expected stereo PCM16")
        frames, rate = f.getnframes(), f.getframerate()
        raw = f.readframes(frames)
    if len(raw) != frames * 4:
        raise ValueError("truncated PCM")
    pcm = array.array("h", raw)
    if sys.byteorder != "little":
        pcm.byteswap()
    return rate, frames, pcm


def structural_plan(score):
    # Platform-libm differences in estimated pitch/confidence/gain are measured
    # separately. Decisions and timing, including the selected key, must agree.
    result = {key: score[key] for key in ("schema_version", "seed", "source_asset_id", "sample_rate",
            "tempo_milli_bpm", "ticks_per_quarter", "time_signature", "target_bars", "tail_ms",
            "strategy", "key", "mix", "sections", "voice_clips", "voice_events", "tracks")}
    result['tempo_changes'] = score.get('tempo_changes', [])
    return result


def compare(reference, candidate):
    a = json.loads(Path(str(reference) + ".score.json").read_text())
    b = json.loads(Path(str(candidate) + ".score.json").read_text())
    if structural_plan(a) != structural_plan(b):
        raise ValueError("musical/source/clip decisions differ")
    if Path(str(reference) + ".events.tsv").read_bytes() != Path(str(candidate) + ".events.tsv").read_bytes():
        raise ValueError("compiled instrument event frames differ")
    rate_a, frames_a, pcm_a = load_audio(Path(str(reference) + ".wav"))
    rate_b, frames_b, pcm_b = load_audio(Path(str(candidate) + ".wav"))
    if (rate_a, frames_a) != (rate_b, frames_b):
        raise ValueError("sample rate or output duration differs")
    maximum, squares = 0, 0
    for x, y in zip(pcm_a, pcm_b):
        difference = abs(x - y)
        maximum = max(maximum, difference)
        squares += difference * difference
    peak_error = maximum / 32768
    rms_error = math.sqrt(squares / max(len(pcm_a), 1)) / 32768
    if peak_error > 0.001 or rms_error > 0.0001:
        raise ValueError(f"PCM error outside tolerance: max={peak_error}, rms={rms_error}")
    return {"status": "PASS", "sample_rate": rate_a, "frames": frames_a,
            "event_frames": "PASS", "plan_decisions": "PASS",
            "maximum_pcm_error": peak_error, "rms_pcm_error": rms_error,
            "byte_identical_wav": hashlib.sha256(Path(str(reference) + ".wav").read_bytes()).digest()
            == hashlib.sha256(Path(str(candidate) + ".wav").read_bytes()).digest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, required=True, help="prefix before .hiphop etc.")
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--candidate-metadata", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--styles", nargs="+", choices=("hiphop","reggae","experimental","baseline","club","funk","call_response","hybrid"),
                        default=("hiphop","reggae","experimental"))
    args = parser.parse_args()
    metadata = json.loads(args.candidate_metadata.read_text()) if args.candidate_metadata else {}
    results = {}
    for style in args.styles:
        try:
            results[style] = compare(Path(str(args.reference) + "." + style), Path(str(args.candidate) + "." + style))
        except (ValueError, OSError, KeyError) as error:
            results[style] = {"status": "FAIL", "error": str(error)}
    passed = all(r["status"] == "PASS" for r in results.values())
    apple_m5 = (metadata.get("system") == "Darwin" and metadata.get("machine") == "arm64"
                and "Apple M5" in metadata.get("cpu_brand", ""))
    report = {"comparisons": results, "candidate_environment": metadata,
              "comparison_gate": "PASS" if passed else "FAIL",
              "apple_m5_gate": ("PASS" if passed else "FAIL") if apple_m5 else "NOT RUN",
              "tolerances": {"maximum_pcm_error": 0.001, "rms_pcm_error": 0.0001},
              "listening_gate": "NOT RUN"}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
