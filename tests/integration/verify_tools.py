#!/usr/bin/env python3
"""Check portability comparisons and blinded packaging without human observations."""
import array
import csv
import hashlib
import json
import math
from pathlib import Path
import shutil
import sys
import tempfile
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from compare_portability import compare, load_audio
from make_fixture import make_signal
from prepare_listening import prepare
from verify_export import verify_export


def rejects(function):
    try:
        function()
    except ValueError:
        return
    raise AssertionError("invalid tool input accepted")


def main():
    with tempfile.TemporaryDirectory(prefix="djayvo-tools-") as folder:
        root = Path(folder)
        source = root / "source.wav"
        make_signal(source, 8000)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        plan = {"schema_version": "1.0-remix", "seed": 4123, "source_asset_id": f"sha256:{digest}",
                "sample_rate": 8000, "tempo_milli_bpm": 96000, "ticks_per_quarter": 960,
                "time_signature": [4, 4], "target_bars": 8, "tail_ms": 2000,
                "mix": {"instrument_room_mix": 0.18},
                "key": {"tonic_midi": 57, "mode": "minor"}, "sections": [], "voice_clips": [],
                "voice_events": [{"start_tick": 0}], "tracks": [], "source": {"kind": "synthetic"}}
        prefix = root / "test"
        for i, style in enumerate(("hiphop", "reggae", "experimental", "baseline")):
            stem = Path(str(prefix) + "." + style)
            plan["strategy"] = style
            Path(str(stem) + ".score.json").write_text(json.dumps(plan))
            Path(str(stem) + ".events.tsv").write_text("frame\tkind\n0\ton\n")
            samples = array.array("h")
            for frame in range(176000):
                x = round(3276 * (i + 1) * math.sin(2 * math.pi * 220 * frame / 8000))
                samples.extend((x, x))
            if sys.byteorder != "little":
                samples.byteswap()
            with wave.open(str(stem) + ".wav", "wb") as f:
                f.setparams((2, 2, 8000, 0, "NONE", "not compressed"))
                f.writeframes(samples.tobytes())
        a = Path(str(prefix) + ".hiphop")
        b = root / "candidate"
        for extension in (".wav", ".score.json", ".events.tsv"):
            shutil.copyfile(str(a) + extension, str(b) + extension)
        assert compare(a, b)["maximum_pcm_error"] == 0
        changed = json.loads(Path(str(b) + ".score.json").read_text())
        changed['tempo_changes'] = [{'start_tick': 960, 'tempo_milli_bpm': 120000}]
        Path(str(b) + ".score.json").write_text(json.dumps(changed))
        rejects(lambda: compare(a, b))
        shutil.copyfile(str(a) + ".score.json", str(b) + ".score.json")
        changed = json.loads(Path(str(b) + ".score.json").read_text())
        changed["voice_events"][0]["start_tick"] += 1
        Path(str(b) + ".score.json").write_text(json.dumps(changed))
        rejects(lambda: compare(a, b))
        shutil.copyfile(str(a) + ".score.json", str(b) + ".score.json")
        changed = json.loads(Path(str(b) + ".score.json").read_text())
        changed["mix"]["instrument_room_mix"] = 0.24
        Path(str(b) + ".score.json").write_text(json.dumps(changed))
        rejects(lambda: compare(a, b))
        shutil.copyfile(str(a) + ".score.json", str(b) + ".score.json")
        Path(str(b) + ".events.tsv").write_text("changed")
        rejects(lambda: compare(a, b))
        shutil.copyfile(str(a) + ".events.tsv", str(b) + ".events.tsv")
        with wave.open(str(b) + ".wav", "wb") as f:
            f.setparams((2, 2, 8000, 0, "NONE", "not compressed"))
            f.writeframes(bytes(176000 * 4))
        rejects(lambda: compare(a, b))
        rejects(lambda: prepare(prefix, root / "incomplete", source))
        artifacts=[]
        for style in ('hiphop','reggae','experimental','baseline'):
            Path(str(prefix)+f'.{style}.report.json').write_text('{}')
            for ext in ('wav','score.json','report.json','events.tsv'):
                suffix=f'.{style}.{ext}';data=Path(str(prefix)+suffix).read_bytes()
                artifacts.append({'suffix':suffix,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        completion={'schema_version':'1.0-export','status':'complete','source_sha256':digest,'artifacts':artifacts}
        marker=Path(str(prefix)+'.complete.json');marker.write_text(json.dumps(completion))
        assert len(verify_export(prefix)['artifacts'])==16
        key = prepare(prefix, root / "pilot", source)
        assert key["quality_gate"] == "NOT RUN" and len(key["codes"]) == 4
        assert hashlib.sha256((root / "pilot/listener/source.wav").read_bytes()).hexdigest() == digest
        levels = []
        for code, value in key["codes"].items():
            path = root / "pilot/listener" / f"{code}.wav"
            _, _, samples = load_audio(path)
            levels.append(math.sqrt(sum(x * x for x in samples) / len(samples)))
            assert hashlib.sha256(path.read_bytes()).hexdigest() == value["sha256"]
        assert max(levels) - min(levels) < 1
        with (root / "pilot/listener/responses.csv").open() as f:
            rows = list(csv.DictReader(f))
        assert len(rows) == 4 and all(r["enjoyment_1_5"] == "" and r["listener_id"] == "" for r in rows)
        with (root / "pilot/listener/pairs.csv").open() as f:
            pairs = list(csv.DictReader(f))
        assert len(pairs) == 3 and all(r["preferred_code_or_tie"] == "" for r in pairs)
        assert all(r['block_id'] == key['block_id'] for r in rows+pairs)
        shuffled = prepare(prefix, root / 'reshuffled', source, seed=4124)
        assert set(key['codes']).isdisjoint(shuffled['codes']), 'different assignments reused answer codes'
        repeated = prepare(prefix, root / 'repeated', source)
        assert key == repeated, 'same block/assignment is not reproducible'
        # A new rendered seed must also get distinct IDs with the same shuffle seed.
        wav = Path(str(prefix)+'.hiphop.wav')
        original_wav = wav.read_bytes()
        raw = bytearray(original_wav);raw[44:46] = (100).to_bytes(2, 'little');wav.write_bytes(raw)
        changed_audio = prepare(prefix, root / 'changed-audio', source, allow_legacy=True)
        assert set(key['codes']).isdisjoint(changed_audio['codes'])
        score = Path(str(prefix)+'.baseline.score.json')
        original_score = score.read_text()
        altered = json.loads(original_score);altered['seed'] += 1;score.write_text(json.dumps(altered))
        rejects(lambda: prepare(prefix, root / 'mixed-seeds', source, allow_legacy=True))
        wav.write_bytes(original_wav);score.write_text(original_score)
        rejects(lambda: prepare(prefix, root / "pilot", source))
        changed=json.loads(marker.read_text());changed['artifacts'][0]['suffix']='../../outside.wav'
        marker.write_text(json.dumps(changed));rejects(lambda: verify_export(prefix))
        marker.write_text(json.dumps(completion))
        report=Path(str(prefix)+'.hiphop.report.json');report.write_text('[]')
        rejects(lambda: verify_export(prefix))
        print("PASS: comparison equality, changed decision/frame/audio rejection, blind codes, RMS matching, source hash and empty responses")
        print("NOT RUN: human observations and actual Mac execution")


if __name__ == "__main__":
    main()
