#!/usr/bin/env python3
"""Render the local owner-only research comparison; never uploads recordings."""
import argparse
import csv
import json
from pathlib import Path
import random
import subprocess
import sys
import tempfile
from urllib.parse import quote
import numpy as np
from arrange_voice_research import RATE, arrange, digest, read_pcm
from inspect_wav import inspect
from review_cloud_music import loudness

CASES = (("club-seed-7441", "instrumental-first"), ("club-seed-7442", "fragment-pickup"),
         ("club-lm-7441", "late-hook"), ("hiphop-seed-4123", "instrumental-first"),
         ("hiphop-jazz", "fragment-pickup"), ("hiphop-lm-4123", "late-hook"))


def prepare(source, score, trial, output, consent):
    if not consent:
        raise ValueError("Explicit local-processing consent is required")
    source, score, trial, output = map(Path, (source, score, trial, output))
    batch = json.loads((trial/"batch.json").read_text())
    cases = {case["name"]:case for case in batch["cases"] if case["status"]=="PASS"}
    for name, _ in CASES:
        case = cases[name]
        if Path(case["file"]).name != case["file"] or digest(trial/case["file"]) != case["sha256"]:
            raise ValueError("Bed provenance mismatch")
    source_hash = digest(source)
    output.mkdir(parents=True)
    review = output/"review"
    review.mkdir()
    evidence = {"processing":"local", "research_only":True, "source_sha256":source_hash,
                "python":sys.version, "numpy":np.__version__, "listening_gate":"NOT RUN", "cases":[]}
    cards, key, rows = [], {}, []
    for index, (name, scene) in enumerate(CASES, 1):
        case = cases[name]
        folder = output/name
        report = arrange(source,score,trial/case["file"],folder,case["bpm"],case["seed"],scene,consent=True)
        mix, backing, voice = (read_pcm(folder/f,(20,40)) for f in ("mix.wav","backing.wav","voice.wav"))
        src = read_pcm(source,(2,5))
        clean = next(e for e in report["events"] if e["clean"])
        start, edge = clean["start_frame"], report["voice_edge_fade_frames"]
        expected = src[edge:-edge]*report["source_gain"]*report["shared_master_gain"]
        clean_error = float(np.max(np.abs(voice[start+edge:start+len(src)-edge]-expected)))
        reconstruction = float(np.max(np.abs(mix-backing-voice)))
        assert clean_error <= .5/32768+1e-12 and reconstruction <= 1/32768+1e-12
        assert np.all(mix[-1]==0)
        technical = {f:inspect(folder/f) for f in ("mix.wav","backing.wav","voice.wav","control.wav")}
        assert all(m["full_scale_samples"]==0 for m in technical.values())
        levels = {"arranged":loudness(folder/"mix.wav"),"control":loudness(folder/"control.wav"),
                  "instrumental":loudness(trial/case["file"])}
        assert levels["arranged"]["true_peak_dbfs"] <= -1 and levels["control"]["true_peak_dbfs"] <= -1
        target = min(-22., *(v["lufs"]-v["true_peak_dbfs"]-2 for v in levels.values()))
        order = ["arranged","control"]
        random.Random(8200+index).shuffle(order)
        pair = f"pair-{index}"
        key[pair] = {"case":name,"A":order[0],"B":order[1]}
        players = []
        matched = {}
        for label, kind in (("A",order[0]),("B",order[1]),("instrumental","instrumental")):
            origin = trial/case["file"] if kind=="instrumental" else folder/("mix.wav" if kind=="arranged" else "control.wav")
            dest = review/f"{pair}-{label}.wav"
            gain = target-levels[kind]["lufs"]
            subprocess.run(["ffmpeg","-v","error","-n","-i",str(origin),"-af",f"volume={gain}dB",
                            "-c:a","pcm_s16le",str(dest)],check=True,timeout=30)
            measured = loudness(dest)
            assert abs(measured["lufs"]-target)<=.2 and measured["true_peak_dbfs"]<=-1.8
            matched[label] = {**measured,"sha256":digest(dest),"gain_db":gain}
            player = f'<p>{label}</p><audio controls preload="metadata" aria-label="Pair {index} {label}" src="{dest.name}"></audio><a href="{dest.name}" download>Download {label}</a>'
            players.append(f'<details><summary>Instrumental only</summary>{player}</details>' if kind=="instrumental" else player)
        first = min(e["start_frame"] for e in report["events"])/RATE
        coverage = sum(next(c["end_frame"]-c["start_frame"] for c in report["clips"] if c["id"]==e["clip_id"]) for e in report["events"])/len(mix)
        evidence["cases"].append({"name":name,"plan":report,"measurements":technical,"loudness":levels,
                                  "matched":matched,"first_voice_event_seconds":first,"voice_event_fraction":coverage,
                                  "clean_hook_maximum_pcm_error":clean_error,"stem_reconstruction_maximum_pcm_error":reconstruction})
        cards.append(f'<section><h2>Pair {index} · {"Club" if name.startswith("club") else "Hip-hop"}</h2>'+"".join(players)+"</section>")
        rows.append([pair,"","","","","","",""])
    # Re-render a real case independently; identical files also establish exact PCM/event repeatability.
    with tempfile.TemporaryDirectory(prefix="jamloom-voice-repeat-") as temp:
        name, scene = CASES[0]
        c = cases[name]
        repeated = arrange(source,score,trial/c["file"],Path(temp)/"repeat",c["bpm"],c["seed"],scene,consent=True)
        original = evidence["cases"][0]["plan"]
        assert repeated["events"]==original["events"] and repeated["artifacts"]==original["artifacts"]
    assert digest(source)==source_hash
    evidence["determinism"] = {"status":"PASS","events_identical":True,"four_wav_hashes_identical":True,
                               "maximum_pcm_difference":0,"rms_pcm_difference":0}
    (output/"evidence.json").write_text(json.dumps(evidence,indent=2)+"\n")
    (output/"organizer-key.json").write_text(json.dumps(key,indent=2)+"\n")
    with (review/"responses.csv").open("w",newline="") as f:
        writer=csv.writer(f)
        writer.writerow(["pair","preferred_A_B_tie_neither","instrument_realism_1_5","groove_1_5","voice_amount_too_much_right_too_little","voice_recognizable_yes_no","timestamp","notes"])
        writer.writerows(rows)
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · voice and space</title><style>
body{font:18px/1.6 system-ui;max-width:1050px;margin:32px auto;padding:0 24px;background:#111b20;color:#e9f0eb}
h1{font-size:42px;line-height:1.15}h2{font-size:22px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
section{padding:22px;background:#213039;border:1px solid #41545b;border-radius:12px}audio{width:100%}a{color:#98e8b4}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}details{margin-top:18px}</style>
<h1>Your voice. Room for the music.</h1><p>Six private comparisons using your recording and the new instrumentals.
Each pair uses the same music: one version arranges the voice into hooks and responses, the other repeats the full recording.
A/B order varies. Playback levels are matched.</p><p>Start with the three club pairs. Listen for natural entrances, clear words,
groove and enough space without voice. Each pair also has an instrumental-only option. Nothing plays automatically.</p>
<p>This is an informal owner audition, not the formal quality study. Your recording was processed locally.</p>
<p><a download="responses.csv" href="data:text/csv;charset=utf-8,'''+quote((review/"responses.csv").read_text(),safe="")+'''">Download blank listening notes</a></p><main>'''+"".join(cards)+'''</main>
<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    assert page.count("<audio ")==18
    (review/"index.html").write_text(page)
    print("PASS: six local voice/control pairs, six instrumentals, clean-hook/stem/level/repeatability checks")
    print("NOT RUN: musical quality, word intelligibility, beat alignment and formal blinded evaluation")
    return evidence


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ("source","score","trial","output"):
        parser.add_argument("--"+name,type=Path,required=True)
    parser.add_argument("--consent",action="store_true")
    args=parser.parse_args()
    prepare(args.source,args.score,args.trial,args.output,args.consent)
