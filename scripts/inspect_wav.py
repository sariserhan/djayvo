#!/usr/bin/env python3
"""Independently decode PCM16 with Python's standard library; no engine imports."""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import wave


def inspect(path):
    path = Path(path)
    with wave.open(str(path), "rb") as wav:
        channels, width, rate, frames, compression, _ = wav.getparams()
        if channels != 2 or width != 2 or compression != "NONE":
            raise ValueError("expected uncompressed stereo PCM16")
        raw = wav.readframes(frames)
        if len(raw) != frames * 4 or wav.readframes(1):
            raise ValueError("truncated audio or unexpected trailing frames")
    header = path.read_bytes()[:44]
    if header[:4] != b"RIFF" or header[8:12] != b"WAVE":
        raise ValueError("invalid RIFF header")
    if struct.unpack_from("<I", header, 4)[0] + 8 != path.stat().st_size:
        raise ValueError("RIFF size disagrees with file length")
    if path.stat().st_size != 44 + frames * 4:
        raise ValueError("file length disagrees with PCM payload")
    samples = array.array("h", raw)
    if sys.byteorder != "little":
        samples.byteswap()
    left, right = samples[::2], samples[1::2]

    def db(value):
        return 20 * math.log10(value) if value > 0 else -300.0

    def rms(values):
        return math.sqrt(sum(x * x for x in values) / max(len(values), 1)) / 32768

    peak = max((abs(x) for x in samples), default=0) / 32768
    first = next((i // 2 for i, x in enumerate(samples) if x), None)
    last = next((frames - 1 - i // 2 for i, x in enumerate(reversed(samples)) if x), None)
    step = max((abs(channel[i] - channel[i - 1]) for channel in (left, right)
                for i in range(1, frames)), default=0) / 32768
    return {
        "file": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "format": "PCM16 stereo little-endian", "sample_rate": rate,
        "frames": frames, "duration_seconds": frames / rate,
        "peak_linear": peak, "peak_dbfs": db(peak),
        "rms_dbfs_left": db(rms(left)), "rms_dbfs_right": db(rms(right)),
        "dc_left": sum(left) / max(frames, 1) / 32768,
        "dc_right": sum(right) / max(frames, 1) / 32768,
        "full_scale_samples": sum(x <= -32768 or x >= 32767 for x in samples),
        "first_nonzero_frame": first, "last_nonzero_frame": last,
        "max_adjacent_sample_step": step,
        "last_100ms_peak": max((abs(x) for x in samples[-rate // 10 * 2:]), default=0) / 32768,
        "loudness_method": "unweighted RMS; not integrated LUFS",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wav", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    result = inspect(args.wav)
    text = json.dumps(result, indent=2, allow_nan=False) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(text)
    print(text, end="")
