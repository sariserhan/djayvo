#!/usr/bin/env python3
"""Pinned-model research batch, run from the ACE-Step checkout; no input audio."""
import hashlib
import json
import os
from pathlib import Path
import platform
import random
import time

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["ACESTEP_DISABLE_TQDM"] = "1"
import numpy as np
import soundfile as sf
import torch
from acestep.handler import AceStepHandler
from acestep.llm_inference import LLMHandler
from acestep.inference import GenerationParams, GenerationConfig, generate_music

OUT = Path("/workspace/results")
HIPHOP = "Instrumental hip hop, 92 BPM, swung acoustic drum break with ghost notes, warm electric bass, expressive Rhodes chords, short muted guitar responses. Intimate dry drums, spacious keys, strong rhythmic pocket. Begin with a bass pickup, develop a memorable motif, change the drum fill halfway, finish with a resolved chord. No vocals."
CLUB = "Instrumental dark bass club track, 140 BPM with a heavy half-time groove, punchy kick and snapping snare, deep syncopated sub bass answering gritty modulated bass phrases, crisp shuffled percussion and eerie spacious pads. Restrained atmospheric opening, tension building into a forceful bass drop, a brief stripped-down break, then a changed bass return and deliberate ending. Tight low end, textured live-feeling percussion, space between phrases. No vocals."
CASES = [
    ("hiphop-seed-4123", HIPHOP, 92, 4123, False),
    ("hiphop-seed-4124", HIPHOP, 92, 4124, False),
    ("hiphop-seed-4125", HIPHOP, 92, 4125, False),
    ("hiphop-repeat-4123", HIPHOP, 92, 4123, False),
    ("hiphop-jazz", "Instrumental jazz boom bap, 86 BPM, brushed snare and dusty kick, upright bass, expressive acoustic piano with extended chords, subtle tenor sax responses. Loose human swing, warm room ambience, a short piano-only break and a musical ending. No vocals.", 86, 5221, False),
    ("hiphop-halftime", "Instrumental modern hip hop, 140 BPM with a half-time feel, deep sliding 808 bass, dry rimshot, intricate hi-hat rolls with rests, sparse plucked nylon guitar and atmospheric electric piano. Minimal opening, a contrasting drum variation halfway, spacious clean mix and a resolved ending. No vocals.", 140, 6331, False),
    ("club-seed-7441", CLUB, 140, 7441, False),
    ("club-seed-7442", CLUB, 140, 7442, False),
    ("hiphop-lm-4123", HIPHOP, 92, 4123, True),
    ("club-lm-7441", CLUB, 140, 7441, True),
]


def main():
    OUT.mkdir(exist_ok=True)
    torch.set_num_threads(4)
    report = {"code_revision": "ca1e85fe9430179831e6bc6be790c332190a3866",
              "weights_revision": "19671f406d603126926c1b7e2adc169acbcade22",
              "python": platform.python_version(), "torch": torch.__version__,
              "cuda": torch.version.cuda, "gpu": torch.cuda.get_device_name(),
              "cases": [], "quality_gate": "NOT RUN"}

    def save():
        (OUT / "batch.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")

    start = time.monotonic()
    dit, lm = AceStepHandler(), LLMHandler()
    status, ok = dit.initialize_service(project_root=str(Path.cwd()), config_path="acestep-v15-turbo",
                                       device="cuda", compile_model=False, use_mlx_dit=False)
    assert ok, status
    report["dit_initialization_seconds"] = time.monotonic() - start
    save()
    lm_ready = False
    for name, caption, bpm, seed, thinking in CASES:
        record = {"name": name, "caption": caption, "bpm": bpm, "seed": seed, "thinking": thinking}
        report["cases"].append(record)
        try:
            if thinking and not lm_ready:
                start = time.monotonic()
                status, ok = lm.initialize(checkpoint_dir=str(Path.cwd() / "checkpoints"),
                    lm_model_path="acestep-5Hz-lm-1.7B", backend="pt", device="cuda")
                assert ok, status
                lm_ready = True
                report["lm_initialization_seconds"] = time.monotonic() - start
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            torch.cuda.manual_seed_all(seed)
            params = GenerationParams(caption=caption, bpm=bpm, duration=30, seed=seed,
                instrumental=True, lyrics="[Instrumental]", inference_steps=8,
                thinking=thinking, use_cot_metas=thinking, use_cot_caption=thinking,
                use_cot_language=thinking, use_cot_lyrics=False)
            record["parameters"] = params.to_dict()
            config = GenerationConfig(batch_size=1, audio_format="wav", use_random_seed=False, seeds=[seed])
            torch.cuda.reset_peak_memory_stats()
            torch.cuda.synchronize()
            start = time.monotonic()
            result = generate_music(dit, lm, params, config, save_dir=str(OUT / "raw" / name))
            torch.cuda.synchronize()
            record["generation_seconds"] = time.monotonic() - start
            record["peak_allocated_gib"] = torch.cuda.max_memory_allocated() / 2**30
            record["peak_reserved_gib"] = torch.cuda.max_memory_reserved() / 2**30
            assert result.success, result.error
            assert len(result.audios) == 1, "Expected exactly one output"
            audio = result.audios[0]
            source = Path(audio["path"])
            pcm, rate = sf.read(source, always_2d=True, dtype="float32")
            assert pcm.shape[1] == 2 and 29 <= len(pcm)/rate <= 31, "Unexpected duration or channels"
            assert np.isfinite(pcm).all() and 0.001 < np.max(np.abs(pcm)) < 1, "Invalid, silent or clipped output"
            destination = OUT / (name + ".wav")
            sf.write(destination, pcm, rate, subtype="PCM_16")
            record.update(status="PASS", file=destination.name, sample_rate=rate, frames=len(pcm),
                sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),
                source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                peak=float(np.max(np.abs(pcm))), rms=float(np.sqrt(np.mean(pcm**2))),
                actual_parameters=audio.get("params"), lm_metadata=result.extra_outputs.get("lm_metadata"))
        except Exception as exc:
            record.update(status="FAIL", error=str(exc))
        save()
        print(json.dumps({k: record[k] for k in ("name", "status", "generation_seconds", "error") if k in record}), flush=True)
    assert all(r["status"] == "PASS" for r in report["cases"]), "Some batch cases failed; inspect batch.json"


if __name__ == "__main__":
    main()
