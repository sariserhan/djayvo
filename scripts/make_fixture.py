#!/usr/bin/env python3
"""Create a labeled synthetic input; never records a person or microphone."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
import wave


def make_signal(path, rate=16000, shifted=False):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    samples = []
    centers = [0.12, 0.48, 0.83, 1.32, 1.57, 2.16, 2.42, 2.79]
    if shifted:
        centers = [0.22, 0.64, 0.98, 1.42, 1.94, 2.14, 2.60]
    for n in range(rate * 3):
        t = n / rate
        value = 0
        for j, center in enumerate(centers):
            age = t - center
            if 0 <= age < 0.19:
                envelope = math.sin(math.pi * age / 0.19) ** 2
                value += envelope * (0.31 * math.sin(2 * math.pi * (165 + j % 3 * 33) * age)
                                     + 0.09 * math.sin(2 * math.pi * 495 * age))
        samples.append(max(-32767, min(32767, round(value * 32767))))
    with wave.open(str(path), "wb") as out:
        out.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        out.writeframes(struct.pack(f"<{len(samples)}h", *samples))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("renders/fixtures/synthetic-signal.wav"))
    parser.add_argument("--speech-tool", type=Path)
    parser.add_argument("--speech-data", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    text = "Say anything. Make music. This is Djayvo."
    tool_version = None
    if args.speech_tool:
        command = [str(args.speech_tool)]
        if args.speech_data:
            command += [f"--path={args.speech_data}"]
        command += ["-D", "-v", "en-us", "-s", "170", "-w", str(args.output), text]
        subprocess.run(command, check=True, timeout=30)
        tool_version = subprocess.run([*command[:1], *([f"--path={args.speech_data}"] if args.speech_data else []), "--version"],
                                      check=True, capture_output=True, text=True).stdout.strip()
        kind = "synthetic_speech"
    else:
        make_signal(args.output)
        kind = "original_procedural_signal"
    with wave.open(str(args.output), "rb") as audio:
        duration = audio.getnframes() / audio.getframerate()
    if not 2 <= duration <= 5:
        raise ValueError(f"fixture duration {duration:.3f}s is outside 2..5 seconds")
    provenance = {"kind": kind, "is_human_recording": False, "microphone_used": False,
                  "text": text if args.speech_tool else None, "creator": "Djayvo synthetic fixture generator",
                  "sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
                  "duration_seconds": duration, "tool_version": tool_version,
                  "tool_linked_into_engine": False,
                  "rights_note": "Original input text/signal; local synthetic test output. No human speaker or cloned identity.",
                  "tool_license": "GPL-3.0-or-later (eSpeak NG); optional external developer executable" if args.speech_tool else "Original project code",
                  "license_source": "https://github.com/espeak-ng/espeak-ng#license-information" if args.speech_tool else None}
    args.output.with_suffix(".provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(provenance, indent=2))


if __name__ == "__main__":
    main()
