#!/usr/bin/env python3
"""Prepare one blinded pilot block from three remixes and the fixed-loop control."""
import argparse
import array
import csv
import hashlib
import json
import math
from pathlib import Path
import random
import shutil
import sys
import wave
from verify_export import verify_export


def prepare(prefix, output, source_path, seed=4123, baseline_prefix=None, allow_legacy=False):
    if not allow_legacy:
        verify_export(prefix, ('hiphop', 'reggae', 'experimental'))
        verify_export(baseline_prefix or prefix, ('baseline',))
    output = Path(output)
    if output.exists() and any(output.iterdir()):
        raise ValueError("choose an empty listening directory to preserve existing responses")
    listener = output / "listener"
    audio, plans, identities = {}, {}, []
    for style in ("hiphop", "reggae", "experimental", "baseline"):
        selected = baseline_prefix if style=='baseline' and baseline_prefix else prefix
        path = Path(str(selected) + "." + style + ".wav")
        with wave.open(str(path), "rb") as f:
            if f.getsampwidth() != 2 or f.getnchannels() != 2:
                raise ValueError("expected stereo PCM16")
            rate = f.getframerate()
            if not 20 <= f.getnframes() / rate <= 40:
                raise ValueError("trial render must be 20..40 seconds")
            samples = array.array("h", f.readframes(f.getnframes()))
            if sys.byteorder != "little":
                samples.byteswap()
        rms = math.sqrt(sum(x * x for x in samples) / len(samples)) / 32768
        peak = max(abs(x) for x in samples) / 32768
        if rms == 0:
            raise ValueError("silent trial file")
        audio[style] = (rate, samples, rms, peak)
        plans[style] = json.loads(Path(str(selected) + "." + style + ".score.json").read_text())
        identities.append(hashlib.sha256(path.read_bytes()).hexdigest())
    source_ids = {p["source_asset_id"] for p in plans.values()}
    if len(source_ids) != 1:
        raise ValueError("all trial outputs must come from the same input")
    clip_id = next(iter(source_ids)).split(":")[-1][:16]
    if "sha256:" + hashlib.sha256(Path(source_path).read_bytes()).hexdigest() != next(iter(source_ids)):
        raise ValueError("source does not match the rendered trial")
    render_seeds = {p['seed'] for p in plans.values()}
    if len(render_seeds) != 1 or len({rate for rate, *_ in audio.values()}) != 1:
        raise ValueError('all trial outputs must use the same render seed and sample rate')
    # Include the assignment seed so a different shuffle cannot reuse answer codes.
    block_id = hashlib.sha256(('|'.join(identities)+f'|{seed}').encode()).hexdigest()[:24]
    # One common RMS target preserves level matching while retaining headroom.
    target = min(10 ** (-23 / 20), *(0.88 * rms / peak for _, _, rms, peak in audio.values()))
    styles = list(audio)
    random.Random(seed).shuffle(styles)
    key = {"seed": seed, "clip_id": clip_id, "block_id": block_id, "render_seed": next(iter(render_seeds)),
           "source_kind": plans["hiphop"]["source"]["kind"],
           "level_matching": "unweighted full-file RMS, not LUFS", "target_rms_dbfs": 20 * math.log10(target),
           "quality_gate": "NOT RUN", "codes": {}}
    listener.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, listener / "source.wav")
    with (listener / "responses.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["listener_id", "clip_id", "block_id", "code", "recognizable", "groove_1_5", "coherence_1_5",
                         "originality_1_5", "enjoyment_1_5", "would_share", "technical_failure", "notes"])
        for i, style in enumerate(styles):
            code = f"{block_id}-{chr(65+i)}"
            rate, original, rms, _ = audio[style]
            gain = target / rms
            samples = array.array("h", (max(-32767, min(32767, round(x * gain))) for x in original))
            if sys.byteorder != "little":
                samples.byteswap()
            path = listener / f"{code}.wav"
            with wave.open(str(path), "wb") as out:
                out.setparams((2, 2, rate, 0, "NONE", "not compressed"))
                out.writeframes(samples.tobytes())
            key["codes"][code] = {"strategy": style, "gain_db": 20 * math.log10(gain),
                                 "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
            writer.writerow(["", clip_id, block_id, code, "", "", "", "", "", "", "", ""])
    control = next(code for code, value in key["codes"].items() if value["strategy"] == "baseline")
    with (listener / "pairs.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["listener_id", "clip_id", "block_id", "left_code", "right_code", "preferred_code_or_tie", "notes"])
        generator = random.Random(seed + 1)
        for code in key["codes"]:
            if code != control:
                pair = [code, control]
                generator.shuffle(pair)
                writer.writerow(["", clip_id, block_id, *pair, "", ""])
    (output / "organizer-key.json").write_text(json.dumps(key, indent=2) + "\n")
    (listener / "INSTRUCTIONS.txt").write_text(
        "Listen to the provided source first, then the anonymized candidates in a randomized order.\n"
        "Use 1=poor through 5=excellent; use yes/no for recognition, share and technical failure.\n"
        "Do not inspect the organizer key until responses are complete. No ratings are prefilled.\n"
        "Keep recordings and responses local unless the participants permit sharing.\n")
    return key


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--renders", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=4123)
    parser.add_argument("--baseline-renders", type=Path, help="separate completed baseline export prefix")
    parser.add_argument("--legacy-export", action="store_true", help="explicitly accept retained exports predating completion records")
    args = parser.parse_args()
    result = prepare(args.renders, args.output, args.source, args.seed, args.baseline_renders, args.legacy_export)
    print(f"PASS: blinded pilot assets prepared in {args.output / 'listener'}")
    print("NOT RUN: human listening and M1 quality gate")
