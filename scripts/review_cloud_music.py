#!/usr/bin/env python3
"""Measure the retrieved trial and prepare local, level-matched listening copies."""
import array
import hashlib
import html
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import wave
from inspect_wav import inspect

ROOT = Path("renders/cloud-trial-20261018")
EVIDENCE = Path("docs/evidence/cloud-music-trial")


def loudness(path):
    run = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True, check=True)
    summary = run.stderr[run.stderr.rfind("Summary:"):]
    return {key: float(re.search(pattern, summary).group(1)) for key, pattern in (
        ("lufs", r"I:\s+([-\d.]+) LUFS"), ("true_peak_dbfs", r"Peak:\s+([-\d.]+) dBFS"))}


def difference(left, right):
    samples = []
    formats = []
    for path in (left, right):
        with wave.open(str(path), "rb") as wav:
            formats.append(wav.getparams()[:4])
            pcm = array.array("h", wav.readframes(wav.getnframes()))
            if sys.byteorder != "little":
                pcm.byteswap()
            samples.append(pcm)
    assert formats[0] == formats[1], "Comparison formats differ"
    maximum = energy = same = 0
    for a, b in zip(*samples):
        delta = a - b
        maximum = max(maximum, abs(delta))
        energy += delta * delta
        same += delta == 0
    return {"maximum_pcm_difference": maximum / 32768,
            "rms_pcm_difference": math.sqrt(energy / len(samples[0])) / 32768,
            "equal_sample_fraction": same / len(samples[0])}


def main():
    report = json.loads((ROOT / "batch.json").read_text())
    cases = [case for case in report["cases"] if case["status"] == "PASS"]
    assert cases, "No successful cases to review"
    review = ROOT / "review"
    review.mkdir()  # Preserve any previous listening copies.
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    measurements = []
    cards = []
    for case in cases:
        path = ROOT / case["file"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == case["sha256"], "Transfer mismatch"
        technical = inspect(path)
        assert technical["full_scale_samples"] == 0 and 29 <= technical["duration_seconds"] <= 31
        before = loudness(path)
        gain = min(-22 - before["lufs"], -2 - before["true_peak_dbfs"])
        destination = review / path.name
        subprocess.run(["ffmpeg", "-v", "error", "-n", "-i", str(path), "-af", f"volume={gain}dB",
                        "-c:a", "pcm_s16le", str(destination)], check=True)
        after = loudness(destination)
        assert after["true_peak_dbfs"] <= -1.8 and after["lufs"] <= -21.8
        measurements.append({"name": case["name"], "technical": technical, "original": before,
                             "gain_db": gain, "review": after})
        label = html.escape(case["name"].replace("-", " "))
        cards.append(f'<article><h2>{label}</h2><audio controls preload="metadata" aria-label="{label}" src="{path.name}"></audio>'
                     f'<p>{"Planning LM enabled" if case["thinking"] else "Direct text conditioning"} · seed {case["seed"]}</p>'
                     f'<details><summary>Musical brief</summary><p>{html.escape(case["caption"])}</p></details>'
                     f'<a download href="../{path.name}">Download original</a></article>')
    comparisons = {}
    for a, b in (("hiphop-seed-4123", "hiphop-repeat-4123"), ("hiphop-seed-4123", "hiphop-seed-4124"),
                 ("hiphop-seed-4123", "hiphop-seed-4125"), ("club-seed-7441", "club-seed-7442")):
        if (ROOT / (a + ".wav")).exists() and (ROOT / (b + ".wav")).exists():
            comparisons[a + " vs " + b] = difference(ROOT / (a + ".wav"), ROOT / (b + ".wav"))
    (EVIDENCE / "measurements.json").write_text(json.dumps({"files": measurements, "comparisons": comparisons,
        "listening_gate": "NOT RUN", "event_frame_agreement": "NOT RUN: audio model emits no engine event trace"}, indent=2) + "\n")
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Djayvo · GPU music trial</title><style>
body{font:18px/1.6 system-ui;max-width:1100px;margin:32px auto;padding:0 24px;background:#111b20;color:#e9f0eb}
h1{font-size:42px;line-height:1.15}h2{font-size:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
article{padding:22px;background:#213039;border:1px solid #41545b;border-radius:12px}audio{width:100%}a{color:#98e8b4}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style><h1>New music, different takes.</h1>
<p>Original 30-second instrumental sketches from the rented GPU. Start with the three hip-hop seeds and two club seeds.
Then compare the planning-LM versions. No voice recording or reference audio was sent to the cloud.</p>
<p>Playback copies target −22 LUFS with peak headroom; downloads preserve the original level.
Judge instrument realism, groove, variation, transitions and endings. Automated checks do not establish musical quality.
This is an informal audition, not the formal blinded quality gate.</p><main>''' + "".join(cards) + '''</main><script>
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)
</script></html>'''
    assert page.count("<audio ") == len(cases)
    (review / "index.html").write_text(page)
    print(f"PASS: verified {len(cases)} transferred files; listening NOT RUN")


if __name__ == "__main__":
    main()
