"""Local research regression checks; synthetic tones are not listening evidence."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
import wave
from unittest.mock import patch
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from arrange_voice_research import RATE, SCENES, arrange, digest, make_events, read_crops, read_pcm, write_pcm


class VoiceResearch(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source_path, self.bed_path, self.score_path = (self.root/name for name in ("source.wav", "bed.wav", "score.json"))
        source = .12 * np.sin(np.arange(3*RATE)[:, None] * 2*np.pi*180/RATE) * np.ones((1,2))
        bed = .08 * np.sin(np.arange(30*RATE)[:, None] * 2*np.pi*80/RATE) * np.ones((1,2))
        bed[7*RATE:13*RATE] *= .15
        write_pcm(self.source_path, source)
        write_pcm(self.bed_path, bed)
        self.clips = [{"id":0,"start_frame":0,"end_frame":3*RATE},
                      {"id":1,"start_frame":RATE,"end_frame":int(1.6*RATE)},
                      {"id":2,"start_frame":2*RATE,"end_frame":int(2.6*RATE)}]
        self.score = {"source":{"sha256":digest(self.source_path),"kind":"recorded","consent_confirmed":True,"processed_frames":len(source)},
                      "sample_rate":RATE,"voice_clips":self.clips}
        self.score_path.write_text(json.dumps(self.score))

    def run_arrangement(self, name="out", **kwargs):
        return arrange(self.source_path,self.score_path,self.bed_path,self.root/name,92,4123,
                       kwargs.get("scene",SCENES[0]),consent=kwargs.get("consent",True))

    def test_consent_and_crop_provenance_fail_closed(self):
        with self.assertRaises(ValueError):
            self.run_arrangement(consent=False)
        self.assertFalse((self.root/"out").exists())
        self.score["source"]["sha256"] = "wrong"
        self.score_path.write_text(json.dumps(self.score))
        with self.assertRaises(ValueError):
            self.run_arrangement()
        self.assertFalse((self.root/"out").exists())

    def test_crop_overrun_and_missing_complete_hook_rejected(self):
        for clips in ([{**self.clips[0],"end_frame":3*RATE+1}],self.clips[1:]):
            self.score["voice_clips"] = clips
            self.score_path.write_text(json.dumps(self.score))
            with self.assertRaises(ValueError):
                read_crops(self.score_path,self.source_path,3*RATE)

    def test_failed_write_cannot_publish_a_complete_render(self):
        with patch("arrange_voice_research.write_pcm", side_effect=OSError("Disk full")):
            with self.assertRaises(OSError):
                self.run_arrangement()
        self.assertTrue((self.root/"out"/".partial").exists())
        self.assertFalse((self.root/"out"/"complete.json").exists())

    def test_preserves_hook_stems_timing_and_determinism(self):
        report = self.run_arrangement()
        repeated = self.run_arrangement("repeat")
        self.assertEqual(report["artifacts"], repeated["artifacts"])
        self.assertEqual(report["events"], repeated["events"])
        mix, backing, voice = (read_pcm(self.root/"out"/name,(30,30)) for name in ("mix.wav","backing.wav","voice.wav"))
        self.assertLessEqual(np.max(np.abs(mix-backing-voice)),1/32768)
        clean = next(e for e in report["events"] if e["clean"])
        source = read_pcm(self.source_path,(3,3))
        start, edge = clean["start_frame"],report["voice_edge_fade_frames"]
        expected = source[edge:-edge] * report["source_gain"] * report["shared_master_gain"]
        self.assertLessEqual(np.max(np.abs(voice[start+edge:start+len(source)-edge]-expected)),.5/32768+1e-12)
        self.assertTrue(np.all(voice[:clean["start_frame"]]==0))
        self.assertTrue(np.all(mix[-1]==0))
        self.assertFalse((self.root/"out"/".partial").exists())
        before = digest(self.root/"out"/"mix.wav")
        with self.assertRaises(FileExistsError):
            self.run_arrangement()
        self.assertEqual(before,digest(self.root/"out"/"mix.wav"))

    def test_content_changes_hook_placement_and_scenes_leave_space(self):
        bed = read_pcm(self.bed_path,(30,30))
        events = make_events(bed,3*RATE,self.clips,92,4123,SCENES[0])
        changed = np.full_like(bed,.08)
        changed[4*RATE:7*RATE] *= .01
        other = make_events(changed,3*RATE,self.clips,92,4123,SCENES[0])
        self.assertNotEqual(next(e["start_frame"] for e in events if e["clean"]),next(e["start_frame"] for e in other if e["clean"]))
        for scene in SCENES:
            events = make_events(bed,3*RATE,self.clips,92,4123,scene)
            self.assertEqual(sum(e["clean"] for e in events),1)
            previous_end = 0
            for e in events:
                self.assertGreaterEqual(e["start_frame"],previous_end)
                crop = next(c for c in self.clips if c["id"]==e["clip_id"])
                previous_end = e["start_frame"]+crop["end_frame"]-crop["start_frame"]
                self.assertLessEqual(previous_end,len(bed)-RATE//2)
            self.assertLessEqual(len(events),5)

    def test_rejects_invalid_tempo_silence_and_quantization_wrap(self):
        oversized = self.root/"oversized.wav"
        with oversized.open("wb") as file:
            file.truncate(16*1024**2+1)
        with self.assertRaises(ValueError):
            digest(oversized)
        bed = read_pcm(self.bed_path,(30,30))
        for bpm in (float("nan"),float("inf"),0,181):
            with self.assertRaises(ValueError):
                make_events(bed,3*RATE,self.clips,bpm,4123,SCENES[0])
        write_pcm(self.root/"silence.wav",np.zeros((3*RATE,2)))
        with self.assertRaises(ValueError):
            read_pcm(self.root/"silence.wav",(2,5))
        with self.assertRaises(ValueError):
            write_pcm(self.root/"overflow.wav",np.full((100,2),.999999))

    def test_constant_offsets_rejected_per_channel_before_export(self):
        for index, levels in enumerate(((0,), (.5,), (-.5,), (.5,.5), (.5,-.5))):
            with self.subTest(levels=levels):
                with wave.open(str(self.source_path), "wb") as wav:
                    wav.setparams((len(levels),2,RATE,0,"NONE","not compressed"))
                    wav.writeframes(np.tile(np.array(levels)*32768,(3*RATE,1)).astype("<i2").tobytes())
                self.score["source"]["sha256"] = digest(self.source_path)
                self.score_path.write_text(json.dumps(self.score))
                with self.assertRaisesRegex(ValueError, "silent"):
                    self.run_arrangement(f"offset-{index}")
                self.assertFalse((self.root/f"offset-{index}").exists())

    def test_offset_signal_is_preserved_and_one_active_channel_is_enough(self):
        pcm = np.full((3*RATE,2), -.5)
        pcm[:,0] += .02*np.sin(np.arange(3*RATE)*2*np.pi*220/RATE)
        write_pcm(self.source_path,pcm)
        before = digest(self.source_path)
        decoded = read_pcm(self.source_path,(2,5))
        np.testing.assert_array_equal(decoded,np.rint(pcm*32768)/32768)
        self.assertEqual(digest(self.source_path),before)


if __name__ == "__main__":
    unittest.main()
