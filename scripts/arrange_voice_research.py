#!/usr/bin/env python3
"""Local research only: arrange consented speech into a previously generated bed.

Uses existing native-engine crop metadata. No network, inference or app integration.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import wave
import numpy as np

RATE = 48000
SCENES = ("instrumental-first", "fragment-pickup", "late-hook")


def digest(path):
    path = Path(path)
    if not path.is_file() or path.stat().st_size > 16 * 1024**2:
        raise ValueError("Expected a local input no larger than 16 MiB")
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def read_pcm(path, seconds):
    path = Path(path)
    if not path.is_file() or not 44 <= path.stat().st_size <= 16 * 1024**2:
        raise ValueError("Expected a local WAV no larger than 16 MiB")
    with wave.open(str(path), "rb") as wav:
        channels, width, rate, frames, compression, _ = wav.getparams()
        if channels not in (1, 2) or width != 2 or rate != RATE or compression != "NONE":
            raise ValueError("Expected mono/stereo PCM16 at 48 kHz")
        if not seconds[0] <= frames / rate <= seconds[1]:
            raise ValueError("Audio duration outside supported bounds")
        raw = wav.readframes(frames)
        if len(raw) != frames * channels * 2:
            raise ValueError("Truncated WAV")
    pcm = np.frombuffer(raw, dtype="<i2").reshape(-1, channels).astype(np.float64) / 32768
    if np.sqrt(np.mean(pcm**2)) < 1e-5:
        raise ValueError("Silent or effectively silent input")
    return np.repeat(pcm, 2, axis=1) if channels == 1 else pcm


def read_crops(score_path, source_path, frames):
    path = Path(score_path)
    if path.stat().st_size > 1024**2:
        raise ValueError("Crop metadata exceeds 1 MiB")
    score = json.loads(path.read_text())
    source = score.get("source", {})
    if (source.get("sha256") != digest(source_path) or source.get("kind") != "recorded"
            or source.get("consent_confirmed") is not True or score.get("sample_rate") != RATE
            or source.get("processed_frames") != frames):
        raise ValueError("Crop metadata must match this consented source and sample rate")
    clips = score.get("voice_clips")
    if not isinstance(clips, list) or not 1 <= len(clips) <= 32:
        raise ValueError("Expected 1–32 bounded source crops")
    seen = set()
    for clip in clips:
        a, b, ident = (clip.get(k) for k in ("start_frame", "end_frame", "id"))
        if any(type(x) is not int for x in (a, b, ident)) or ident < 0 or ident in seen or not 0 <= a < b <= frames:
            raise ValueError("Invalid crop bounds or duplicate crop ID")
        seen.add(ident)
    if not any(c["start_frame"] == 0 and c["end_frame"] == frames for c in clips):
        raise ValueError("A complete clean source crop is required")
    return clips


def make_events(bed, source_frames, clips, bpm, seed, scene):
    if not math.isfinite(bpm) or not 50 <= bpm <= 180 or type(seed) is not int or not 0 <= seed <= 2**32-1:
        raise ValueError("Invalid tempo or seed")
    if scene not in SCENES:
        raise ValueError("Unknown arrangement")
    beat = RATE * 60 / bpm
    end_limit = len(bed) - RATE // 2
    clean = next(c for c in clips if c["start_frame"] == 0 and c["end_frame"] == source_frames)
    # shortcut: the grid uses the requested model BPM, not verified beat transcription.
    first, last = ((6, 11) if scene == "late-hook" else (3, 8))
    starts = [round(i * 2 * beat) for i in range(first, last)]
    starts = [s for s in starts if s + source_frames + 4 * beat < end_limit]
    if not starts:
        raise ValueError("No room for a clean hook and response")
    energy = np.r_[0., np.cumsum(np.mean(bed**2, axis=1))]
    rng = np.random.default_rng(seed)
    rng.shuffle(starts)
    hook = min(starts, key=lambda s: (energy[s+source_frames] - energy[s]) / source_frames)
    events = [{"start_frame": hook, "clip_id": clean["id"], "clean": True, "gain": 1.0}]
    fragments = [c for c in clips if .18 * RATE <= c["end_frame"] - c["start_frame"] <= 1.1 * RATE]
    if fragments:
        rng.shuffle(fragments)
        positions = [hook + source_frames + round(k * beat) for k in (2, 5, 9)]
        if scene == "fragment-pickup":
            positions.insert(0, round(beat / 2))
        for i, start in enumerate(positions):
            clip = fragments[i % min(2, len(fragments))]
            length = clip["end_frame"] - clip["start_frame"]
            if start + length <= end_limit and all(
                start + length + .15 * RATE <= e["start_frame"] or
                start >= e["start_frame"] + next(c["end_frame"]-c["start_frame"] for c in clips if c["id"]==e["clip_id"]) + .15 * RATE
                for e in events
            ):
                events.append({"start_frame": start, "clip_id": clip["id"], "clean": False, "gain": .8 if i % 2 else .65})
    return sorted(events, key=lambda e: e["start_frame"])


def render_stems(bed, source, clips, events, voice_gain, duck=True):
    voice = np.zeros_like(bed)
    envelope = np.ones(len(bed))
    for event in events:
        clip = next(c for c in clips if c["id"] == event["clip_id"])
        start = event["start_frame"]
        part = source[clip["start_frame"]:clip["end_frame"]].copy()
        edge = min(RATE // 100, len(part) // 2)
        fade = np.sin(np.linspace(0, np.pi/2, edge))**2
        part[:edge] *= fade[:, None]
        part[-edge:] *= fade[::-1, None]
        stop = start + len(part)
        if start < 0 or stop > len(bed):
            raise ValueError("Voice event outside output bounds")
        voice[start:stop] += part * voice_gain * event["gain"]
        if duck:
            depth = 10 ** ((-9 if event["clean"] else -5) / 20)
            before, after = max(0, start - int(.08 * RATE)), min(len(bed), stop + int(.3 * RATE))
            down = 1 - (1-depth) * np.sin(np.linspace(0, np.pi/2, start-before))**2
            up = depth + (1-depth) * np.sin(np.linspace(0, np.pi/2, after-stop))**2
            envelope[before:start] = np.minimum(envelope[before:start], down)
            envelope[start:stop] = np.minimum(envelope[start:stop], depth)
            envelope[stop:after] = np.minimum(envelope[stop:after], up)
    backing = bed * envelope[:, None]
    ending = np.cos(np.linspace(0, np.pi/2, int(.35 * RATE)))**2
    ending[-1] = 0
    backing[-len(ending):] *= ending[:, None]
    voice[-len(ending):] *= ending[:, None]
    return backing, voice


def write_pcm(path, pcm):
    if not np.isfinite(pcm).all() or np.max(np.abs(pcm)) >= 1:
        raise ValueError("Refusing nonfinite or clipped output")
    encoded = np.rint(pcm * 32768)
    if np.min(encoded) <= -32768 or np.max(encoded) >= 32767:
        raise ValueError("Refusing full-scale quantized samples")
    with wave.open(str(path), "wb") as wav:
        wav.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
        wav.writeframes(encoded.astype("<i2").tobytes())


def arrange(source_path, score_path, bed_path, output, bpm, seed, scene, consent=False):
    if not consent:
        raise ValueError("Explicit local-processing consent is required")
    source_hash, bed_hash, score_hash = digest(source_path), digest(bed_path), digest(score_path)
    source, bed = read_pcm(source_path, (2, 5)), read_pcm(bed_path, (20, 40))
    clips = read_crops(score_path, source_path, len(source))
    events = make_events(bed, len(source), clips, bpm, seed, scene)
    active = source[np.max(np.abs(source), axis=1) > .08 * np.max(np.abs(source))]
    voice_gain = min(.12 / np.sqrt(np.mean(active**2)), .65 / np.max(np.abs(source)))
    bed_gain = min(.08 / np.sqrt(np.mean(bed**2)), .65 / np.max(np.abs(bed)))
    bed *= bed_gain
    backing, voice = render_stems(bed, source, clips, events, voice_gain)
    clean = next(c for c in clips if c["start_frame"]==0 and c["end_frame"]==len(source))
    spacing = max(round(16 * RATE * 60 / bpm), len(source) + RATE)
    control_events = [{"start_frame": s, "clip_id": clean["id"], "clean": True, "gain": 1.0}
                      for s in range(0, len(bed)-len(source)-RATE//2, spacing)]
    control_bed, control_voice = render_stems(bed, source, clips, control_events, voice_gain, duck=False)
    gain = min(1., 10**(-2/20) / max(np.max(np.abs(backing+voice)), np.max(np.abs(control_bed+control_voice))))
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.mkdir()
    (output / ".partial").write_text("Unfinished research render; do not consume without complete.json\n")
    arrays = {"mix.wav": backing+voice, "backing.wav": backing, "voice.wav": voice,
              "control.wav": control_bed+control_voice}
    for name, pcm in arrays.items():
        write_pcm(output / name, pcm * gain)
    if digest(source_path) != source_hash or digest(bed_path) != bed_hash or digest(score_path) != score_hash:
        raise ValueError("Input changed during rendering; output remains incomplete")
    report = {"schema_version": 1, "research_only": True, "processing": "local", "consent_confirmed": True,
              "source_sha256": source_hash, "bed_sha256": bed_hash, "crop_metadata_sha256": score_hash,
              "sample_rate": RATE, "frames": len(bed), "bpm_requested": bpm, "beat_alignment_gate": "NOT RUN",
              "seed": seed, "arrangement": scene, "source_gain": float(voice_gain), "bed_gain": float(bed_gain),
              "shared_master_gain": float(gain), "voice_edge_fade_frames": RATE//100,
              "clips": clips, "events": events, "control_events": control_events,
              "listening_gate": "NOT RUN", "artifacts": {name: digest(output/name) for name in arrays}}
    (output / "complete.json").write_text(json.dumps(report, indent=2) + "\n")
    (output / ".partial").unlink()
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("source", "score", "bed", "output"):
        parser.add_argument("--"+name, type=Path, required=True)
    parser.add_argument("--bpm", type=float, required=True)
    parser.add_argument("--seed", type=int, default=4123)
    parser.add_argument("--arrangement", choices=SCENES, default=SCENES[0])
    parser.add_argument("--consent", action="store_true")
    args = parser.parse_args()
    arrange(args.source, args.score, args.bed, args.output, args.bpm, args.seed, args.arrangement, args.consent)
    print("PASS: local research render; listening and musical quality NOT RUN")
